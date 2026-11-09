import { STAGES, SUBJECTS, BRANCHES, GRADE1_PROGRESS_KEYS, WHATSAPP } from './data/catalog.js';
import { hasAccess, askCode, logout, myKeys, prettyCode, GRADE_NAMES, FREE } from './access.js';
import { hit, online } from './stats.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* ===== ملف الطالب ===== */
const AVATARS = [
  ['🦁', '#ffe8cc'], ['🐯', '#fff3bf'], ['🐼', '#e9ecef'], ['🦊', '#ffe3e3'], ['🐰', '#f3d9fa'], ['🐢', '#d3f9d8'],
  ['🦉', '#e5dbff'], ['🐬', '#d0ebff'], ['🐝', '#fff9db'], ['🦋', '#c5f6fa'], ['🚀', '#dbe4ff'], ['⭐', '#fff0f6'],
];
const PKEY = 'allawh-profile';
let profile = store.get(PKEY, null);

// مجموع النجوم من كل الكتب المنشورة على النطاق نفسه
function totalStars() {
  let n = 0;
  for (const k of GRADE1_PROGRESS_KEYS) {
    const pr = store.get(k, {});
    for (const x of Object.values(pr)) n += x && x.stars ? x.stars.length : 0;
  }
  return n;
}

function avHTML(i) { const [e, bg] = AVATARS[i] || AVATARS[0]; return `<span class="av" style="--b:${bg}">${e}</span>`; }

function paintMe() {
  const btn = $('#meBtn');
  if (!profile) { btn.hidden = true; return; }
  btn.hidden = false;
  $('#meName').textContent = profile.name;
  $('#meAv').outerHTML = avHTML(profile.av).replace('class="av"', 'class="av" id="meAv"');
  const s = totalStars();
  $('#meStars').textContent = s ? '★ ' + s.toLocaleString('ar-IQ') : '';
}

function openProfile() {
  const dlg = $('#profile');
  let pick = profile ? profile.av : -1;
  $('#pname').value = profile ? profile.name : '';
  $('#preset').hidden = !profile;
  const keys = Object.entries(myKeys());
  $('#psubs').innerHTML = keys.length ? '<b>الصفوف المفتوحة على هذا الجهاز:</b> ' + keys.map(([g, k]) => `${GRADE_NAMES[g] || g} <code dir="ltr">${prettyCode(k.code).slice(0, 4)}-…</code>`).join('، ') : '';
  const avs = $('#avs');
  avs.innerHTML = AVATARS.map((a, i) => `<button type="button" class="av" style="--b:${a[1]}" data-i="${i}" aria-pressed="${i === pick}" aria-label="صورة ${i + 1}">${a[0]}</button>`).join('');
  const check = () => { $('#pgo').disabled = !($('#pname').value.trim() && pick >= 0); };
  avs.onclick = (e) => {
    const b = e.target.closest('.av'); if (!b) return;
    pick = +b.dataset.i;
    avs.querySelectorAll('.av').forEach((x) => x.setAttribute('aria-pressed', x === b));
    check();
  };
  $('#pname').oninput = check;
  $('#pform').onsubmit = () => {
    profile = { name: $('#pname').value.trim(), av: pick, since: profile ? profile.since : Date.now() };
    store.set(PKEY, profile); paintMe();
  };
  $('#preset').onclick = () => {
    if (!confirm('هل تريد مسح ملف الطالب من هذا الجهاز؟')) return;
    store.del(PKEY); profile = null; dlg.close(); paintMe(); openProfile();
  };
  check();
  dlg.showModal();
}
$('#meBtn').onclick = openProfile;

/* ===== التنقل ===== */
const findStage = (id) => STAGES.find((s) => s.id === id);
const findGrade = (id) => { for (const s of STAGES) { const g = s.grades.find((x) => x.id === id); if (g) return [s, g]; } return []; };
const ar = (n) => n.toLocaleString('ar-IQ');

function crumbs(items) {
  return `<nav class="crumbs" aria-label="المسار"><a href="#/">الرئيسة</a>${items.map(([t, h]) => h ? `› <a href="${h}">${esc(t)}</a>` : `› <span>${esc(t)}</span>`).join('')}</nav>`;
}

function viewHome() {
  const hi = profile ? `أهلاً ${esc(profile.name)}، ` : '';
  return `
    <h1>${hi}اختر مرحلتك الدراسية</h1>
    <p class="lead">كتب المنهج العراقي دروسًا تفاعلية واختبارات، من الأول الابتدائي إلى السادس الإعدادي.</p>
    <div class="live"><span class="lv"><i class="dot"></i> المتصلون الآن: <b id="stOn">…</b></span><span class="lv" id="stTotWrap" hidden>👁️ عدد الزيارات: <b id="stTot"></b></span></div>
    <div class="grid" style="--min:280px;--h:220px">
      ${STAGES.map((s) => `
        <a class="tile" href="#/${s.id}" style="--c:${s.color}">
          <span class="big">${s.mark}</span>
          <b>${s.name}</b><span>${s.years}</span>
        </a>`).join('')}
    </div>`;
}

function readyCount(books) { return books.filter((b) => b.status === 'ready').length; }

function viewStage(sid) {
  const s = findStage(sid); if (!s) return viewHome();
  return `${crumbs([[s.name]])}
    <h1>المرحلة ${s.name}</h1>
    <p class="lead">اختر صفّك.</p>
    <div class="grid" style="--min:220px">
      ${s.grades.map((g, i) => {
        const books = g.books || Object.values(g.branches).flatMap((x) => x.books);
        const r = readyCount(books);
        return `<a class="tile" href="#/${g.branches ? 'branch' : 'grade'}/${g.id}" style="--c:${s.color}">
          <span class="big">${ar(i + 1 + (sid === 'secondary' ? 3 : 0))}</span>
          ${g.exit ? '<span class="badge exit">امتحان وزاري</span>' : r ? `<span class="badge">${ar(r)} جاهز</span>` : ''}
          <b>${g.name}</b><span>${g.branches ? 'الفرعان العلمي والأدبي' : ar(g.books.length) + ' كتب'}</span>
        </a>`;
      }).join('')}
    </div>`;
}

function viewBranch(gid) {
  const [s, g] = findGrade(gid); if (!g || !g.branches) return viewHome();
  return `${crumbs([[s.name, '#/' + s.id], [g.name]])}
    <h1>${g.name}</h1>
    <p class="lead">اختر فرعك.</p>
    <div class="grid" style="--min:260px;--h:200px">
      ${Object.entries(g.branches).map(([k, br]) => `
        <a class="tile" href="#/grade/${g.id}/${k}" style="--c:${k === 'sci' ? '#0c8599' : '#a0522d'}">
          <span class="big">${k === 'sci' ? 'ع' : 'أ'}</span>
          ${readyCount(br.books) ? `<span class="badge">${ar(readyCount(br.books))} جاهز</span>` : ''}
          <b>الفرع ${BRANCHES[k]}</b><span>${ar(br.books.length)} كتب</span>
        </a>`).join('')}
    </div>`;
}

function cover(b, gradeName) {
  const sub = SUBJECTS[b.subject];
  const title = b.title || sub.name;
  const inner = `<div class="cover" style="--c:${sub.color}"><span class="mk">${sub.mark}</span><span class="ti">${esc(title)}</span><span class="gr">${esc(gradeName)}</span></div>
    <span class="st">${b.status === 'ready' ? 'افتح الكتاب' : 'قيد الإعداد'}</span>`;
  return b.status === 'ready'
    ? `<a class="book" href="${b.url}">${inner}</a>`
    : `<div class="book soon" aria-disabled="true">${inner}</div>`;
}

function viewGrade(gid, br) {
  const [s, g] = findGrade(gid); if (!g) return viewHome();
  const node = br ? g.branches[br] : g; if (!node) return viewHome();
  const name = g.name + (br ? ' — ' + BRANCHES[br] : '');
  const path = [[s.name, '#/' + s.id]];
  if (br) path.push([g.name, '#/branch/' + g.id]);
  path.push([br ? 'الفرع ' + BRANCHES[br] : g.name]);
  const playful = (g.style || s.style) === 'play';
  return `${crumbs(path)}
    <h1>كتب ${esc(name)}</h1>
    <p class="lead">${playful ? 'دروس على شكل مراحل وألعاب، وكل لعبة تمنحك نجمة.' : 'دروس وتجارب واختبار في نهاية كل فصل، ولا ينفتح الفصل التالي حتى تنجح فيه.'}${g.exit ? ' وفي هذا الصف أسئلة على نمط الامتحان الوزاري.' : ''}</p>
    <div class="sub" id="sub" data-grade="${br ? g.id + '-' + br : g.id}"></div>
    ${node.draft ? '<div class="note">قائمة الكتب في هذا الصف مسودة أولى، وستُراجَع على طبعة 2026.</div>' : ''}
    <div class="grid shelf">${node.books.map((b) => cover(b, name)).join('')}</div>`;
}

function route() {
  const p = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  let html;
  if (!p.length) html = viewHome();
  else if (p[0] === 'grade') html = viewGrade(p[1], p[2]);
  else if (p[0] === 'branch') html = viewBranch(p[1]);
  else html = viewStage(p[0]);
  app.innerHTML = html;
  window.scrollTo(0, 0);
  paintMe();
  paintSub();
}

async function paintSub() {
  const box = document.getElementById('sub'); if (!box) return;
  const grade = box.dataset.grade;
  const open = await hasAccess(grade);
  if (open) {
    box.className = 'sub on';
    box.innerHTML = `<span>✓ كتب هذا الصف مفتوحة كلها على هذا الجهاز.</span> <button type="button" id="subOut">تسجيل الخروج من كلمة السر</button>`;
    box.querySelector('#subOut').onclick = async () => {
      if (!confirm('بعد تسجيل الخروج تستطيع استعمال كلمة السر في جهاز آخر. هل تريد المتابعة؟')) return;
      const r = await logout(grade);
      if (!r.ok) alert(r.msg); paintSub();
    };
  } else {
    box.className = 'sub';
    box.innerHTML = `<span>الدروس ${ar(FREE)} الأولى من كل كتاب مجانية.</span> <button type="button" id="subIn">عندي كلمة سر</button>`;
    box.querySelector('#subIn').onclick = async () => { await askCode(grade, { voluntary: true }); paintSub(); };
  }
}

const STATS = { total: null, on: null };
function paintStats() {
  const on = document.getElementById('stOn'), tw = document.getElementById('stTotWrap'), t = document.getElementById('stTot');
  if (on) on.textContent = STATS.on == null ? '…' : STATS.on.toLocaleString('ar-IQ');
  if (tw) { tw.hidden = STATS.total == null; if (t && STATS.total != null) t.textContent = Number(STATS.total).toLocaleString('ar-IQ'); }
}
hit('hub').then((n) => { STATS.total = n; paintStats(); });
online('hub', (n) => { STATS.on = n; paintStats(); });
addEventListener('hashchange', () => setTimeout(paintStats, 0));
addEventListener('hashchange', route);
addEventListener('pageshow', paintMe);
$('#wa').href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent('ملاحظة على منصة اللوح المحاور: ');
route();
if (!profile) openProfile();
