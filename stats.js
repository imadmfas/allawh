// عدّاد الزيارات والمتصلين الآن في «اللوح المحاور»
// الزيارات: كل فتح لصفحة من صفحات المنصة يُحسب (ولو تكرر). المتصلون: من فتح المنصة أو أحد كتبها في هذه اللحظة.
import { SUPABASE_URL, SUPABASE_KEY, deviceId } from './access.js';

export async function hit(page = 'hub') {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/allawh_hit`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_page: page }) });
    if (!r.ok) return null; return await r.json();
  } catch (e) { return null; }
}

// يتتبع وجود الزائر في قناة مشتركة ويستدعي onCount بعدد المتصلين كلما تغيّر
export async function online(page, onCount) {
  try {
    const { createClient } = await import('./vendor/supabase.js');
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const key = deviceId() + ':' + Math.random().toString(36).slice(2, 6);
    const ch = sb.channel('allawh-online', { config: { presence: { key } } });
    const count = () => onCount && onCount(Object.keys(ch.presenceState()).length);
    ch.on('presence', { event: 'sync' }, count).on('presence', { event: 'join' }, count).on('presence', { event: 'leave' }, count)
      .subscribe(async (status) => { if (status === 'SUBSCRIBED') { await ch.track({ page, at: Date.now() }); count(); } });
    return ch;
  } catch (e) { return null; }
}
