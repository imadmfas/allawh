// نظام الاشتراك في «اللوح المحاور»
// كلمة سر لكل صف، تفتح كتب الصف كلها، وترتبط بجهاز واحد حتى يسجّل الطالب الخروج.
// تستعمله البوابة وكل كتاب منشور على imadmfas.github.io:
//   import { gate } from 'https://imadmfas.github.io/allawh/access.js';
//   if (await gate({ grade: 's6-sci', lesson: 7 })) openLesson(7);
// الدروس 1..FREE مجانية دائمًا.

export const SUPABASE_URL = 'https://hdpydtkdecudxfquzixa.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_0toaCUQR517Y4Ocnb3px_w_cv20TdcA';
export const FREE = 5;
export const WHATSAPP = '9647812346562';
const RECHECK_MS = 6 * 3600e3;       // يعيد التحقق من الخادم كل ست ساعات
const OFFLINE_GRACE_MS = 7 * 86400e3; // بلا إنترنت يبقى الصف مفتوحًا أسبوعًا من آخر تحقق ناجح

export const GRADE_NAMES = {
  p1: 'الأول الابتدائي', p2: 'الثاني الابتدائي', p3: 'الثالث الابتدائي', p4: 'الرابع الابتدائي', p5: 'الخامس الابتدائي', p6: 'السادس الابتدائي',
  m1: 'الأول المتوسط', m2: 'الثاني المتوسط', m3: 'الثالث المتوسط',
  's4-sci': 'الرابع العلمي', 's4-lit': 'الرابع الأدبي', 's5-sci': 'الخامس العلمي', 's5-lit': 'الخامس الأدبي', 's6-sci': 'السادس العلمي', 's6-lit': 'السادس الأدبي',
};

const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const KEYS = 'allawh-keys'; // { grade: { code, ok_at } }

export function deviceId() {
  let id = ls.get('allawh-device', null);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''));
    ls.set('allawh-device', id);
  }
  return id;
}

function deviceLabel() {
  const u = navigator.userAgent;
  const os = /iPhone|iPad/.test(u) ? 'آيفون/آيباد' : /Android/.test(u) ? 'أندرويد' : /Mac/.test(u) ? 'ماك' : /Windows/.test(u) ? 'ويندوز' : 'جهاز';
  return os + ' — ' + new Date().toLocaleDateString('ar-IQ');
}

async function rpc(fn, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}

export const cleanCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const prettyCode = (c) => cleanCode(c).replace(/(.{4})(?=.)/g, '$1-');

export function myKeys() { return ls.get(KEYS, {}); }

// هل الصف مفتوح على هذا الجهاز؟ يتحقق من الخادم عند الحاجة.
export async function hasAccess(grade, { force = false } = {}) {
  const keys = myKeys(), k = keys[grade];
  if (!k) return false;
  const age = Date.now() - (k.ok_at || 0);
  if (!force && age < RECHECK_MS) return true;
  try {
    const res = await rpc('allawh_check', { p_code: k.code, p_device: deviceId() });
    if (res.ok) { keys[grade] = { ...k, ok_at: Date.now() }; ls.set(KEYS, keys); return true; }
    delete keys[grade]; ls.set(KEYS, keys); return false;
  } catch (e) {
    return age < OFFLINE_GRACE_MS; // انقطاع الشبكة: نعتمد آخر تحقق ناجح
  }
}

const ERR = {
  not_found: 'كلمة السر غير صحيحة. تأكد من كتابتها.',
  other_device: 'هذه الكلمة مفعّلة في جهاز آخر. سجّل الخروج منه أولًا، أو راسلنا على واتساب.',
  revoked: 'أُوقفت هذه الكلمة. راسلنا على واتساب.',
  expired: 'انتهت مدة هذه الكلمة.',
  too_many: 'محاولات كثيرة. حاول بعد ربع ساعة.',
  device: 'تعذّر تعريف الجهاز. حدّث الصفحة.',
  wrong_grade: 'هذه الكلمة لصف آخر: ',
  net: 'تعذّر الاتصال. تأكد من الإنترنت وحاول مرة أخرى.',
};

export async function activate(grade, code) {
  let res;
  try { res = await rpc('allawh_activate', { p_code: cleanCode(code), p_device: deviceId(), p_label: deviceLabel() }); }
  catch (e) { return { ok: false, msg: ERR.net }; }
  if (!res.ok) return { ok: false, msg: ERR[res.error] || ERR.not_found };
  const keys = myKeys();
  keys[res.grade] = { code: cleanCode(code), ok_at: Date.now() };
  ls.set(KEYS, keys);
  if (grade && res.grade !== grade) return { ok: false, msg: ERR.wrong_grade + (GRADE_NAMES[res.grade] || res.grade) + '. فُعّلت لذلك الصف.' };
  return { ok: true, grade: res.grade };
}

export async function logout(grade) {
  const keys = myKeys(), k = keys[grade];
  if (!k) return { ok: true };
  try { await rpc('allawh_logout', { p_code: k.code, p_device: deviceId() }); }
  catch (e) { return { ok: false, msg: ERR.net }; }
  delete keys[grade]; ls.set(KEYS, keys);
  return { ok: true };
}

/* ===== نافذة طلب كلمة السر ===== */
const CSS = `
.alw-bg{position:fixed;inset:0;z-index:99999;background:rgba(27,42,74,.6);display:grid;place-items:center;padding:14px;font-family:'Naskh','Noto Naskh Arabic',serif;direction:rtl}
.alw{background:#fff;color:#1b2a4a;border-radius:24px;max-width:440px;width:100%;padding:24px;box-shadow:0 30px 80px rgba(0,0,0,.35);text-align:center;line-height:1.8}
.alw .lk{font-size:46px;line-height:1}
.alw h3{margin:6px 0 4px;font-size:24px}
.alw p{margin:0 0 12px;color:#5c6478;font-size:15px}
.alw input{width:100%;font:700 22px/1.4 monospace;letter-spacing:2px;text-align:center;padding:10px;border:2px solid #e4dfd2;border-radius:14px;direction:ltr;text-transform:uppercase}
.alw input:focus{outline:0;border-color:#1c7ed6}
.alw .er{min-height:24px;color:#c92a2a;font-size:14px;margin:8px 0}
.alw button{font:inherit;cursor:pointer;border:0;border-radius:14px;padding:10px 16px;font-size:18px;font-weight:700}
.alw .ok{width:100%;background:#2b8a3e;color:#fff;box-shadow:0 4px 0 #1e6b2f}
.alw .ok:disabled{opacity:.6}
.alw .row{display:flex;gap:8px;margin-top:10px}
.alw .row>*{flex:1}
.alw .wa{display:block;text-decoration:none;background:#25d366;color:#fff;border-radius:14px;padding:10px;font-weight:700}
.alw .no{background:#eceae3;color:#1b2a4a}`;

export function askCode(grade, { voluntary = false } = {}) {
  return new Promise((resolve) => {
    if (!document.getElementById('alw-css')) document.head.insertAdjacentHTML('beforeend', `<style id="alw-css">${CSS}</style>`);
    const name = GRADE_NAMES[grade] || '';
    const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('أريد الاشتراك في اللوح المحاور، صف: ' + name)}`;
    const bg = document.createElement('div');
    bg.className = 'alw-bg';
    bg.innerHTML = `<form class="alw">
      <div class="lk">🔒</div>
      <h3>${voluntary ? 'أدخل كلمة السر' : 'انتهت الدروس المجانية'}</h3>
      <p>${voluntary ? '' : 'الدروس الخمسة الأولى مجانية. '}لفتح كتب ${name} كلها أدخل كلمة السر.</p>
      <input name="c" placeholder="XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
      <div class="er" aria-live="polite"></div>
      <button class="ok">افتح</button>
      <div class="row"><a class="wa" href="${wa}" target="_blank" rel="noopener">اطلب كلمة سر</a><button type="button" class="no">لاحقًا</button></div>
    </form>`;
    document.body.appendChild(bg);
    const f = bg.querySelector('form'), inp = f.c, er = f.querySelector('.er'), ok = f.querySelector('.ok');
    inp.oninput = () => { const p = prettyCode(inp.value).slice(0, 14); if (p !== inp.value) inp.value = p; };
    const done = (v) => { bg.remove(); resolve(v); };
    f.querySelector('.no').onclick = () => done(false);
    f.onsubmit = async (e) => {
      e.preventDefault(); ok.disabled = true; er.textContent = '';
      const r = await activate(grade, inp.value);
      ok.disabled = false;
      if (r.ok) done(true); else er.textContent = r.msg;
    };
    setTimeout(() => inp.focus(), 50);
  });
}

// الدالة التي تستدعيها الكتب: lesson رقم الدرس في الكتاب ابتداءً من 1
export async function gate({ grade, lesson }) {
  if (lesson <= FREE) return true;
  if (await hasAccess(grade)) return true;
  return askCode(grade);
}
