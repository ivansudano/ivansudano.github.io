(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = s => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
const app = $('#app'), dlg = $('#dlg');
const KEY = 'ivan_admin_cfg';
const ICON = {
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
};

let cfg = null, data = null, pending = {}, removed = [], tab = 'foto', filter = 'all', dirty = false;
let up = {cat: '', sub: '', title: ''};

/* ---------- storage ---------- */
function loadCfg() { try { return JSON.parse(localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || 'null'); } catch { return null; } }
function saveCfg(c, remember) {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(c)); } catch {}
}
function clearCfg() { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch {} }

/* ---------- github ---------- */
async function gh(path, opt = {}) {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    method: opt.method || 'GET',
    headers: {'Authorization': `Bearer ${cfg.token}`, 'Accept': opt.accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(opt.body ? {'Content-Type': 'application/json'} : {})},
    body: opt.body ? JSON.stringify(opt.body) : undefined, cache: 'no-store'
  });
  if (!r.ok) {
    let m = ''; try { m = (await r.json()).message; } catch {}
    const e = new Error(m || r.statusText); e.status = r.status; throw e;
  }
  return opt.raw ? r.text() : r.json();
}
const gerr = e => e.status === 401 ? 'Token non valido o scaduto.' : e.status === 403 ? 'Il token non ha i permessi (serve "Contents: Read and write").' : e.status === 404 ? 'Repository o file non trovato. Controlla nome repo e token.' : e.message;

/* ---------- toast / overlay ---------- */
let tt;
function toast(m, bad) { const t = $('#toast'); t.textContent = m; t.className = 'toast show' + (bad ? ' bad' : ''); clearTimeout(tt); tt = setTimeout(() => t.className = 'toast', 3600); }
function overlay(html) { let o = $('.ov'); if (!html) { o && o.remove(); return; } if (!o) { o = document.createElement('div'); o.className = 'ov'; document.body.append(o); } o.innerHTML = `<div>${html}</div>`; }

/* ---------- login ---------- */
function guessRepo() {
  const h = location.hostname;
  if (h.endsWith('.github.io')) { const o = h.split('.')[0]; return `${o}/${location.pathname.split('/')[1] && location.pathname.split('/')[1] !== 'admin' ? location.pathname.split('/')[1] : o + '.github.io'}`; }
  return '';
}
function loginView(msg) {
  const c = cfg || {};
  app.innerHTML = `<div class="login"><form class="box" id="lf" autocomplete="off">
    <img src="../logo.png" alt="">
    <h1>Area admin</h1>
    <p class="hint">Questa pagina è pubblica, ma senza il tuo token personale non si può modificare nulla.</p>
    <label class="f"><span>Repository GitHub (utente/nome)</span><input type="text" id="repo" value="${esc(c.repo || guessRepo())}" placeholder="tuonome/tuonome.github.io" required></label>
    <label class="f"><span>Ramo</span><input type="text" id="branch" value="${esc(c.branch || 'main')}" required></label>
    <label class="f"><span>Token personale GitHub</span><input type="password" id="token" value="${esc(c.token || '')}" placeholder="github_pat_…" required></label>
    <label class="chk"><input type="checkbox" id="rem" checked><span>Ricordami su questo dispositivo (non farlo su computer condivisi)</span></label>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <button class="btn pri" style="width:100%">Entra</button>
    <details style="margin-top:20px"><summary class="hint" style="cursor:pointer">Come ottengo il token?</summary>
      <ol style="margin-top:10px"><li>Apri <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a></li>
      <li>Repository access → <b>Only select repositories</b> → scegli il repo del portfolio</li>
      <li>Permissions → Repository permissions → <b>Contents: Read and write</b></li>
      <li>Scadenza: scegli la più lunga (es. 1 anno), poi "Generate token" e incollalo qui</li></ol></details>
  </form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    const n = {repo: $('#repo').value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, ''), branch: $('#branch').value.trim(), token: $('#token').value.trim()};
    const btn = e.submitter || $('#lf button'); btn.disabled = true; btn.textContent = 'Controllo…';
    cfg = n;
    try {
      const r = await gh('');
      if (r.permissions && !r.permissions.push) throw Object.assign(new Error('Questo token può solo leggere il repository.'), {});
      await loadData();
      saveCfg(n, $('#rem').checked);
      render();
    } catch (er) { cfg = n; loginView(gerr(er)); }
  };
}
async function loadData() {
  const txt = await gh(`/contents/data/photos.json?ref=${encodeURIComponent(cfg.branch)}`, {accept: 'application/vnd.github.raw+json', raw: true});
  data = JSON.parse(txt); pending = {}; removed = []; dirty = false;
  up.cat = up.cat || data.categories[0]?.id || '';
}

/* ---------- helpers ---------- */
const catName = id => (data.categories.find(c => c.id === id) || {}).name || id;
const subName = (cid, sid) => ((data.categories.find(c => c.id === cid) || {subs: []}).subs.find(s => s.id === sid) || {}).name || '';
const thumbSrc = p => pending[p.id] ? pending[p.id].thumbUrl : `../${p.thumb}?v=${p._v || ''}`;
function mark() { dirty = true; updatePub(); }
function nChanges() { return Object.keys(pending).length + removed.length + (dirty ? 1 : 0); }
function updatePub() {
  const b = $('.pub'); if (!b) return;
  b.classList.toggle('show', dirty);
  const np = Object.keys(pending).length;
  $('#pubinfo').textContent = np ? `${np} nuove foto + modifiche non pubblicate` : 'Modifiche non pubblicate';
}
addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ---------- main view ---------- */
function render() {
  const np = Object.keys(pending).length;
  app.innerHTML = `
  <div class="top"><div class="wrap">
    <h1><img src="../logo.png" alt="">Admin</h1>
    <a class="btn sm" href="../" target="_blank">Vedi sito ↗</a>
    <button class="btn sm" id="logout">Esci</button>
  </div></div>
  <main class="wrap">
    <div class="tabs">
      <button class="tab ${tab === 'foto' ? 'on' : ''}" data-t="foto">Foto</button>
      <button class="tab ${tab === 'cat' ? 'on' : ''}" data-t="cat">Categorie e progetti</button>
      <button class="tab ${tab === 'profilo' ? 'on' : ''}" data-t="profilo">Profilo e social</button>
    </div>
    <div id="pane"></div>
  </main>
  <div class="pub ${dirty ? 'show' : ''}"><div class="wrap"><span id="pubinfo" class="hint"></span><span style="display:flex;gap:8px"><button class="btn" id="discard">Annulla modifiche</button><button class="btn pri" id="publish">Pubblica sul sito</button></span></div></div>`;
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
  $('#logout').onclick = () => { if (dirty && !confirm('Hai modifiche non pubblicate. Uscire comunque?')) return; clearCfg(); cfg = null; data = null; dirty = false; loginView(); };
  $('#publish').onclick = publish;
  $('#discard').onclick = async () => { if (!confirm('Annullare tutte le modifiche non pubblicate?')) return; try { await loadData(); render(); toast('Modifiche annullate'); } catch (e) { toast(gerr(e), true); } };
  updatePub();
  ({foto: paneFoto, cat: paneCat, profilo: paneProfilo})[tab]();
}

/* ---------- foto ---------- */
function subsOf(cid) { return (data.categories.find(c => c.id === cid) || {subs: []}).subs; }
function paneFoto() {
  const cats = data.categories;
  const subOpts = cid => `<option value="">— nessuno —</option>` + subsOf(cid).map(s => `<option value="${esc(s.id)}" ${s.id === up.sub ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  $('#pane').innerHTML = `
  <div class="up">
    <div class="row">
      <label class="f"><span>Categoria</span><select id="ucat">${cats.map(c => `<option value="${esc(c.id)}" ${c.id === up.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Progetto / sottocartella (facoltativo)</span><select id="usub">${subOpts(up.cat)}</select></label>
      <label class="f"><span>Titolo (facoltativo, per tutte)</span><input type="text" id="utitle" value="${esc(up.title)}" placeholder="es. Monza GT Open"></label>
    </div>
    <label class="drop" id="drop"><b>Trascina qui le foto</b>oppure tocca per sceglierle (anche più di una)<input type="file" id="files" accept="image/*" multiple hidden></label>
    <div class="prog" id="prog"><i></i></div>
    <p class="hint" style="margin-top:10px">Le foto vengono ridimensionate e compresse in automatico (circa 300 KB l'una). Poi premi “Pubblica sul sito”.</p>
  </div>
  <div class="bar">
    <select id="flt"><option value="all">Tutte le categorie</option>${cats.map(c => `<option value="${esc(c.id)}" ${filter === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <span class="hint" id="cnt"></span>
  </div>
  <div class="grid" id="grid"></div>`;
  $('#ucat').onchange = e => { up.cat = e.target.value; up.sub = ''; $('#usub').innerHTML = subOpts(up.cat); };
  $('#usub').onchange = e => up.sub = e.target.value;
  $('#utitle').oninput = e => up.title = e.target.value;
  $('#flt').onchange = e => { filter = e.target.value; drawGrid(); };
  const drop = $('#drop'), inp = $('#files');
  inp.onchange = () => { addFiles([...inp.files]); inp.value = ''; };
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));
  drawGrid();
}
function drawGrid() {
  const list = data.photos.filter(p => filter === 'all' || p.category === filter);
  $('#cnt').textContent = `${list.length} foto`;
  $('#grid').innerHTML = list.map(p => {
    const tags = [pending[p.id] ? '<span class="tag new">Nuova</span>' : '', data.site.hero === p.id ? '<span class="tag">Copertina home</span>' : '',
      (data.categories.find(c => c.id === p.category) || {}).cover === p.id ? '<span class="tag">Cover categoria</span>' : ''].join('');
    return `<div class="tile" data-id="${esc(p.id)}"><div class="im" data-edit><img src="${esc(thumbSrc(p))}" alt="" loading="lazy"><div class="tags">${tags}</div></div>
      <div class="meta">${esc(p.title) || '<span class="hint">senza titolo</span>'}<small>${esc(catName(p.category))}${p.sub ? ' · ' + esc(subName(p.category, p.sub)) : ''}</small></div>
      <div class="acts"><button class="ib" data-mv="-1" title="Sposta prima">${ICON.left}</button><button class="ib" data-edit title="Modifica">${ICON.edit}</button><button class="ib" data-mv="1" title="Sposta dopo">${ICON.right}</button><button class="ib del" data-del title="Elimina">${ICON.del}</button></div></div>`;
  }).join('') || '<p class="hint">Nessuna foto in questa categoria.</p>';
  $('#grid').onclick = e => {
    const t = e.target.closest('.tile'); if (!t) return; const id = t.dataset.id;
    if (e.target.closest('[data-edit]')) editPhoto(id);
    else if (e.target.closest('[data-del]')) delPhoto(id);
    else if (e.target.closest('[data-mv]')) movePhoto(id, +e.target.closest('[data-mv]').dataset.mv);
  };
}
function movePhoto(id, dir) {
  const vis = data.photos.filter(p => filter === 'all' || p.category === filter);
  const i = vis.findIndex(p => p.id === id), j = i + dir; if (j < 0 || j >= vis.length) return;
  const a = data.photos.indexOf(vis[i]), b = data.photos.indexOf(vis[j]);
  [data.photos[a], data.photos[b]] = [data.photos[b], data.photos[a]];
  mark(); drawGrid();
}
function delPhoto(id) {
  const p = data.photos.find(x => x.id === id); if (!p || !confirm(`Eliminare ${p.title ? '“' + p.title + '”' : 'questa foto'}? Sparirà dal sito dopo la pubblicazione.`)) return;
  data.photos = data.photos.filter(x => x.id !== id);
  if (pending[id]) { URL.revokeObjectURL(pending[id].thumbUrl); delete pending[id]; } else removed.push(p.src, p.thumb);
  data.categories.forEach(c => { if (c.cover === id) delete c.cover; c.subs.forEach(s => { if (s.cover === id) delete s.cover; }); });
  if (data.site.hero === id) data.site.hero = (data.photos[0] || {}).id || '';
  mark(); drawGrid();
}
function editPhoto(id) {
  const p = data.photos.find(x => x.id === id); if (!p) return;
  const src = pending[id] ? pending[id].fullUrl : `../${p.src}?v=${p._v || ''}`;
  const draw = () => {
    const subs = subsOf(p.category);
    const [fx, fy] = (p.focus || '50% 50%').split(' ').map(v => parseFloat(v));
    dlg.innerHTML = `<div class="dg"><div class="pv"><div class="pvw"><img id="pvimg" src="${esc(src)}" alt=""><div class="pin" style="left:${fx}%;top:${fy}%"></div></div></div>
    <form class="fm" method="dialog"><h3>Modifica foto</h3>
      <label class="f"><span>Titolo</span><input type="text" id="et" value="${esc(p.title)}"></label>
      <label class="f"><span>Categoria</span><select id="ec">${data.categories.map(c => `<option value="${esc(c.id)}" ${c.id === p.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <label class="f"><span>Progetto / sottocartella</span><select id="es"><option value="">— nessuno —</option>${subs.map(s => `<option value="${esc(s.id)}" ${s.id === p.sub ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
      <p class="hint" style="margin-bottom:10px">Tocca la foto per scegliere il punto che resta sempre visibile quando viene ritagliata (copertine e anteprime).</p>
      <div class="btns"><button type="button" class="btn sm" id="ecov">Usa come cover di “${esc(catName(p.category))}”</button><button type="button" class="btn sm" id="ehero">Usa come copertina della home</button><button type="button" class="btn sm" id="efr">Reimposta punto</button></div>
      <div class="btns" style="margin-top:22px;justify-content:flex-end"><button type="button" class="btn" id="ecl">Chiudi</button><button type="button" class="btn pri" id="eok">Salva</button></div>
    </form></div>`;
    $('#pvimg').onclick = e => { const r = e.target.getBoundingClientRect(); p.focus = `${Math.round((e.clientX - r.left) / r.width * 100)}% ${Math.round((e.clientY - r.top) / r.height * 100)}%`; keep(); draw(); };
    $('#efr').onclick = () => { delete p.focus; keep(); draw(); };
    $('#ec').onchange = e => { keep(); p.category = e.target.value; p.sub = ''; draw(); };
    $('#ecov').onclick = () => { keep(); data.categories.find(c => c.id === p.category).cover = p.id; toast('Cover categoria impostata'); };
    $('#ehero').onclick = () => { keep(); data.site.hero = p.id; toast('Copertina home impostata'); };
    $('#ecl').onclick = () => { keep(); dlg.close(); };
    $('#eok').onclick = () => { keep(); dlg.close(); };
  };
  const keep = () => { p.title = $('#et').value.trim(); p.sub = $('#es').value; mark(); };
  draw(); dlg.onclose = () => drawGrid(); dlg.showModal();
}

/* ---------- upload / image processing ---------- */
const toBlob = (c, t, q) => new Promise(r => c.toBlob(r, t, q));
async function scale(bmp, max, q) {
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height)), w = Math.round(bmp.width * r), h = Math.round(bmp.height * r);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, w, h);
  let b = await toBlob(c, 'image/webp', q); if (!b || b.type !== 'image/webp') b = await toBlob(c, 'image/jpeg', q);
  return {blob: b, w, h, c};
}
async function addFiles(files) {
  files = files.filter(f => f.type.startsWith('image/')); if (!files.length) return toast('Nessuna immagine valida', true);
  if (!up.cat) return toast('Crea prima una categoria', true);
  const bar = $('#prog'); bar.style.display = 'block'; const fill = bar.firstElementChild;
  let n = 0;
  for (const f of files) {
    try {
      const bmp = await createImageBitmap(f, {imageOrientation: 'from-image'});
      const full = await scale(bmp, 2200, .82), th = await scale(bmp, 800, .74);
      const px = document.createElement('canvas'); px.width = px.height = 1; const cx = px.getContext('2d'); cx.drawImage(th.c, 0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data, color = '#' + [...d.slice(0, 3)].map(v => v.toString(16).padStart(2, '0')).join('');
      const ext = full.blob.type === 'image/webp' ? 'webp' : 'jpg';
      const id = `${up.cat}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      pending[id] = {full: full.blob, thumb: th.blob, ext, thumbUrl: URL.createObjectURL(th.blob), fullUrl: URL.createObjectURL(full.blob)};
      data.photos.unshift({id, category: up.cat, sub: up.sub, title: up.title.trim(), src: `foto/${id}.${ext}`, thumb: `thumbs/${id}.${ext}`, w: full.w, h: full.h, color});
      bmp.close && bmp.close();
    } catch (e) { console.error(e); toast(`Non riesco a leggere ${f.name}`, true); }
    fill.style.width = (++n / files.length * 100) + '%';
  }
  setTimeout(() => { bar.style.display = 'none'; fill.style.width = 0; }, 500);
  mark(); drawGrid(); toast(`${n} foto pronte. Premi “Pubblica sul sito”.`);
}

/* ---------- categorie ---------- */
function paneCat() {
  const cs = data.categories;
  $('#pane').innerHTML = cs.map((c, ci) => {
    const n = data.photos.filter(p => p.category === c.id).length;
    return `<div class="cat" data-c="${esc(c.id)}"><div class="hd"><input type="text" data-cn value="${esc(c.name)}" aria-label="Nome categoria">
      <span class="hint">${n} foto</span><button class="ib" data-cu title="Su">${ICON.left.replace('M15 5l-7 7 7 7', 'M5 15l7-7 7 7')}</button><button class="ib" data-cd title="Giù">${ICON.right.replace('M9 5l7 7-7 7', 'M5 9l7 7 7-7')}</button><button class="ib del" data-cx title="Elimina categoria">${ICON.del}</button></div>
      <div class="hint" style="margin-bottom:6px">Progetti / sottocartelle</div>
      ${c.subs.map(s => `<div class="sub" data-s="${esc(s.id)}"><input type="text" data-sn value="${esc(s.name)}" aria-label="Nome progetto"><input type="text" data-sd value="${esc(s.description || '')}" placeholder="Breve descrizione (facoltativa)"><button class="ib del" data-sx title="Elimina progetto">${ICON.del}</button></div>`).join('') || '<p class="hint">Nessun progetto.</p>'}
      <div class="add"><input type="text" data-newsub placeholder="Nuovo progetto (es. Monza GT Open)"><button class="btn sm" data-addsub>Aggiungi progetto</button></div></div>`;
  }).join('') + `<div class="cat"><div class="add" style="margin:0"><input type="text" id="newcat" placeholder="Nuova categoria (es. Moto)"><button class="btn pri sm" id="addcat">Aggiungi categoria</button></div></div>`;
  const P = $('#pane');
  P.oninput = e => {
    const c = data.categories.find(x => x.id === e.target.closest('.cat')?.dataset.c); if (!c) return;
    if (e.target.matches('[data-cn]')) { c.name = e.target.value; mark(); }
    const sEl = e.target.closest('.sub'); if (sEl) { const s = c.subs.find(x => x.id === sEl.dataset.s); if (e.target.matches('[data-sn]')) s.name = e.target.value; if (e.target.matches('[data-sd]')) s.description = e.target.value; mark(); }
  };
  P.onclick = e => {
    const cEl = e.target.closest('.cat'); const c = cEl && data.categories.find(x => x.id === cEl.dataset.c);
    if (e.target.closest('#addcat')) { const v = $('#newcat').value.trim(); if (!v) return; let id = slug(v), k = 2; while (data.categories.some(x => x.id === id)) id = slug(v) + '-' + k++; data.categories.push({id, name: v, subs: []}); mark(); paneCat(); return; }
    if (!c) return;
    const i = data.categories.indexOf(c);
    if (e.target.closest('[data-cu]') && i > 0) { [data.categories[i - 1], data.categories[i]] = [data.categories[i], data.categories[i - 1]]; mark(); paneCat(); }
    else if (e.target.closest('[data-cd]') && i < data.categories.length - 1) { [data.categories[i + 1], data.categories[i]] = [data.categories[i], data.categories[i + 1]]; mark(); paneCat(); }
    else if (e.target.closest('[data-cx]')) { if (data.photos.some(p => p.category === c.id)) return toast('Sposta o elimina prima le foto di questa categoria', true); if (confirm(`Eliminare la categoria “${c.name}”?`)) { data.categories.splice(i, 1); mark(); paneCat(); } }
    else if (e.target.closest('[data-addsub]')) { const inp = cEl.querySelector('[data-newsub]'), v = inp.value.trim(); if (!v) return; let id = slug(v), k = 2; while (data.categories.some(x => x.subs.some(s => s.id === id))) id = slug(v) + '-' + k++; c.subs.push({id, name: v, description: ''}); mark(); paneCat(); }
    else if (e.target.closest('[data-sx]')) { const sid = e.target.closest('.sub').dataset.s; if (confirm('Eliminare il progetto? Le sue foto restano nella categoria.')) { c.subs = c.subs.filter(s => s.id !== sid); data.photos.forEach(p => { if (p.category === c.id && p.sub === sid) p.sub = ''; }); mark(); paneCat(); } }
  };
}

/* ---------- profilo ---------- */
function paneProfilo() {
  const s = data.site;
  const F = (k, l, ta) => `<label class="f"><span>${l}</span>${ta ? `<textarea data-k="${k}">${esc(s[k] || '')}</textarea>` : `<input type="text" data-k="${k}" value="${esc(s[k] || '')}">`}</label>`;
  $('#pane').innerHTML = `<div class="cat" style="max-width:640px">${F('name', 'Nome')}${F('headline', 'Titolo grande in home')}${F('tagline', 'Sottotitolo')}${F('aboutTitle', 'Titolo sezione “Chi sono”')}${F('about', 'Testo “Chi sono”', 1)}
    ${F('instagram', 'Link Instagram')}${F('tiktok', 'Link TikTok')}</div>`;
  $('#pane').oninput = e => { const k = e.target.dataset.k; if (k) { s[k] = e.target.value; mark(); } };
}

/* ---------- publish ---------- */
const b64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
async function publish() {
  if (!nChanges()) return;
  const btn = $('#publish'); btn.disabled = true;
  try {
    overlay('<h3>Pubblicazione…</h3><p class="hint" id="ovp">Preparo i file</p>');
    const say = t => { const e = $('#ovp'); if (e) e.textContent = t; };
    const br = encodeURIComponent(cfg.branch);
    const ref = await gh(`/git/ref/heads/${br}`); const parent = ref.object.sha;
    const pc = await gh(`/git/commits/${parent}`);
    const tree = []; const ids = Object.keys(pending); let i = 0;
    for (const id of ids) {
      const p = pending[id], ph = data.photos.find(x => x.id === id); say(`Carico foto ${++i} di ${ids.length}`);
      const [a, b] = await Promise.all([b64(p.full), b64(p.thumb)]);
      const [ba, bb] = await Promise.all([gh('/git/blobs', {method: 'POST', body: {content: a, encoding: 'base64'}}), gh('/git/blobs', {method: 'POST', body: {content: b, encoding: 'base64'}})]);
      tree.push({path: ph.src, mode: '100644', type: 'blob', sha: ba.sha}, {path: ph.thumb, mode: '100644', type: 'blob', sha: bb.sha});
    }
    removed.forEach(path => tree.push({path, mode: '100644', type: 'blob', sha: null}));
    say('Salvo l\'elenco foto');
    const clean = JSON.parse(JSON.stringify(data)); clean.photos.forEach(p => { delete p._v; });
    const jb = await gh('/git/blobs', {method: 'POST', body: {content: JSON.stringify(clean, null, 1), encoding: 'utf-8'}});
    tree.push({path: 'data/photos.json', mode: '100644', type: 'blob', sha: jb.sha});
    const nt = await gh('/git/trees', {method: 'POST', body: {base_tree: pc.tree.sha, tree}});
    const nc = await gh('/git/commits', {method: 'POST', body: {message: 'Aggiornamento portfolio dall\'area admin', tree: nt.sha, parents: [parent]}});
    await gh(`/git/refs/heads/${br}`, {method: 'PATCH', body: {sha: nc.sha}});
    Object.values(pending).forEach(p => { URL.revokeObjectURL(p.thumbUrl); URL.revokeObjectURL(p.fullUrl); });
    ids.forEach(id => { const ph = data.photos.find(x => x.id === id); if (ph) ph._v = Date.now(); });
    pending = {}; removed = []; dirty = false;
    overlay(`<h3>Pubblicato ✓</h3><p class="hint" style="margin-bottom:18px">Il sito si aggiorna in 1-2 minuti. Se non vedi subito le novità, ricarica la pagina.</p><button class="btn pri" id="ovok">OK</button>`);
    $('#ovok').onclick = () => { overlay(''); render(); };
  } catch (e) {
    overlay(''); btn.disabled = false; toast('Errore: ' + gerr(e), true);
  }
}

/* ---------- start ---------- */
(async () => {
  cfg = loadCfg();
  if (cfg && cfg.token) { try { await loadData(); render(); return; } catch (e) { loginView(gerr(e)); return; } }
  loginView();
})();
})();
