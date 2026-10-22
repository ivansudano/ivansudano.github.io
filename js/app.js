(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const IG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>';
const TT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 2h-3.2v13.4a2.900 2.900 0 1 1-2.900-2.900c.3 0 .6 0 .8.100V9.300a6.200 6.200 0 1 0 5.300 6.100V8.600a7.800 7.800 0 0 0 4.400 1.400V6.800a4.600 4.600 0 0 1-4.400-4.800z"/></svg>';
const hdl = u => String(u || '').replace(/[?#].*$/, '').replace(/\/$/, '').split('/').pop().replace(/^@/, '');
const ARROW = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const ICO = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  macchine: '<path d="M4 17h16M3.5 13l2-5h13l2 5v4h-17zM7.5 13h.01M16.5 13h.01"/>',
  ritratti: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-4 3-6 7-6s7 2 7 6"/>',
  natura: '<path d="M3 19l6-10 4 6 2-3 6 7z"/><circle cx="17" cy="6" r="1.5"/>',
  architettura: '<path d="M5 21V5l7-2 7 2v16M3 21h18M9 9h2M13 9h2M9 13h2M13 13h2M10 21v-4h4v4"/>',
  street: '<path d="M12 21s-6-5.500-6-10a6 6 0 0 1 12 0c0 4.500-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>',
  tutte: '<rect x="4" y="4" width="7" height="7" rx="1.500"/><rect x="13" y="4" width="7" height="7" rx="1.500"/><rect x="4" y="13" width="7" height="7" rx="1.500"/><rect x="13" y="13" width="7" height="7" rx="1.500"/>',
  cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>'
};
const ico = k => `<svg class="mi" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k] || ICO.cam}</svg>`;

let D = null, byId = {}, view = $('#view');

async function load() {
  const r = await fetch('data/photos.json', {cache: 'no-cache'});
  D = await r.json();
  byId = Object.fromEntries(D.photos.map(p => [p.id, p]));
}
const catPhotos = id => D.photos.filter(p => p.category === id);
const photoFocus = p => p && p.focus ? `style="--focus:${esc(p.focus)}"` : '';
const coverOf = (cat, sub) => {
  let p = null;
  if (sub) { p = byId[sub.cover] || D.photos.find(x => x.category === cat.id && x.sub === sub.id); }
  else p = byId[cat.cover] || catPhotos(cat.id)[0];
  return p;
};

/* ---------- chrome ---------- */
function chrome() {
  const s = D.site;
  const links = [['#/', 'Home', 'home', ''], ...D.categories.map(c => [`#/c/${c.id}`, c.name, c.id, catPhotos(c.id).length]), ['#/c/all', 'Tutte le foto', 'tutte', D.photos.length]];
  $('#menu').innerHTML = links.map(([h, t, k, n]) => `<a href="${h}" data-nav>${ico(k)}<span class="ml">${esc(t)}</span>${n !== '' ? `<span class="mc">${n}</span>` : ''}</a>`).join('') +
    `<div class="m-social"><a href="${esc(s.instagram)}" target="_blank" rel="noopener">${IG}<span>Instagram</span></a><a href="${esc(s.tiktok)}" target="_blank" rel="noopener">${TT}<span>TikTok</span></a></div>`;
  $('#social').innerHTML =
    `<a href="${esc(s.instagram)}" target="_blank" rel="noopener" aria-label="Instagram @${esc(hdl(s.instagram))}">${IG}</a>` +
    `<a href="${esc(s.tiktok)}" target="_blank" rel="noopener" aria-label="TikTok @${esc(hdl(s.tiktok))}">${TT}</a>`;
  $('#copy').textContent = `© ${new Date().getFullYear()} ${s.name} · @${hdl(s.instagram)}`;
  $('#flinks').innerHTML = `<a href="${esc(s.instagram)}" target="_blank" rel="noopener">Instagram</a> &nbsp;·&nbsp; <a href="${esc(s.tiktok)}" target="_blank" rel="noopener">TikTok</a>`;
}
function markNav(hash) {
  document.querySelectorAll('#menu a[data-nav]').forEach(a => {
    const h = a.getAttribute('href');
    a.classList.toggle('on', h === hash || (h !== '#/' && hash.startsWith(h + '/')));
  });
}
const menu = $('#menu'), burger = $('#burger');
function toggleMenu(open) {
  menu.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
  document.body.classList.toggle('lock', open);
}
burger.onclick = () => toggleMenu(!menu.classList.contains('open'));
menu.addEventListener('click', e => { if (e.target.closest('a')) toggleMenu(false); });

const nav = $('#nav'); let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  nav.classList.toggle('solid', y > 40);
  nav.classList.toggle('hide', y > lastY && y > 400 && !menu.classList.contains('open') && !$('#lb').classList.contains('open'));
  lastY = y;
  const hi = $('.hero-bg'); if (hi && y < innerHeight && innerWidth > 700) hi.style.transform = `translateY(${y * .18}px)`;
}, {passive: true});

/* ---------- reveal / lazy ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -6% 0px'});
function arm(root) {
  root.querySelectorAll('.ph').forEach((el, i) => { el.style.transitionDelay = (i % 6) * 70 + 'ms'; io.observe(el); });
  root.querySelectorAll('img[data-ld]').forEach(img => {
    const done = () => img.classList.add('ld');
    img.complete && img.naturalWidth ? done() : img.addEventListener('load', done, {once: true});
  });
}

/* ---------- views ---------- */
function home() {
  const s = D.site;
  const cats = D.categories.filter(c => catPhotos(c.id).length);
  const n = cats.length;
  const cards = cats.map((c, i) => {
    let cls = '';
    if (n === 5 && i < 2) cls = 'w3';
    else if (n !== 5) {
      const rest = n - 2, k = i - 2;
      if (n >= 2 && i < 2 && n % 3 !== 0) cls = 'w3';
      else if (n === 1) cls = 'w6';
      else if (i >= 2 && rest % 3 === 1 && k === rest - 1) cls = 'w6';
      else if (i >= 2 && rest % 3 === 2 && k >= rest - 2) cls = 'w3';
    }
    const p = coverOf(c);
    return `<a class="card ${cls}" href="#/c/${c.id}" ${photoFocus(p)}>
      <img src="${esc(p.thumb)}" srcset="${esc(p.thumb)} 800w, ${esc(p.src)} 2200w" sizes="(max-width:700px) 50vw, 33vw" alt="${esc(c.name)}" loading="lazy">
      <div class="txt"><div><h3>${esc(c.name)}</h3><div class="n">${catPhotos(c.id).length} FOTO</div></div><span class="arr">${ARROW}</span></div></a>`;
  }).join('');
  const projs = [];
  D.categories.forEach(c => (c.subs || []).forEach(sb => { const l = D.photos.filter(p => p.category === c.id && p.sub === sb.id); if (l.length) projs.push({c, sb, l, p: coverOf(c, sb)}); }));
  const projHtml = projs.length ? `<section class="block" id="progetti" style="padding-top:0"><div class="wrap"><div class="head"><h2>Progetti</h2><span class="meta">Serie e storie</span></div><div class="projects">` +
    projs.map(({c, sb, l, p}) => `<a class="proj" href="#/c/${c.id}/${sb.id}" ${photoFocus(p)}><div class="pic"><img src="${esc(p.thumb)}" srcset="${esc(p.thumb)} 800w, ${esc(p.src)} 2200w" sizes="(max-width:900px) 100vw, 50vw" alt="${esc(sb.name)}" loading="lazy"></div>
      <div class="info"><span class="eyebrow">${esc(c.name)} · ${l.length} foto</span><h3>${esc(sb.name)}</h3>${sb.description ? `<p>${esc(sb.description)}</p>` : ''}<span class="go">Guarda il progetto →</span></div></a>`).join('') +
    `</div></div></section>` : '';
  view.innerHTML = `
  <section class="hero">
    <div class="hero-bg"><img class="hero-img on" alt="" fetchpriority="high"><img class="hero-img" alt=""></div>
    <div class="wrap hero-inner">
      <span class="eyebrow">@${esc(hdl(s.instagram))}</span>
      <div class="ht"><h1></h1><p class="tag"></p></div>
      <div class="cta"><a class="btn" href="#portfolio" data-scroll>Esplora il portfolio ${ARROW}</a><a class="btn ghost" href="#/c/all">Tutte le foto</a></div>
      <div class="dots" role="tablist" aria-label="Presentazione"></div>
    </div><div class="cue"></div>
  </section>
  <section class="block" id="portfolio"><div class="wrap"><div class="head"><h2>Portfolio</h2><span class="meta">${D.photos.length} fotografie</span></div><div class="cats">${cards}</div></div></section>
  ${projHtml}
  <section class="block" id="contatti" style="padding-top:0"><div class="wrap about">
    <div><span class="eyebrow">Chi sono</span><h2>${esc(s.aboutTitle || 'Dietro l\'obiettivo')}</h2><p>${esc(s.about || '')}</p></div>
    <div class="links">
      <a href="${esc(s.instagram)}" target="_blank" rel="noopener"><span>Instagram<small>@${esc(hdl(s.instagram))}</small></span>${IG}</a>
      <a href="${esc(s.tiktok)}" target="_blank" rel="noopener"><span>TikTok<small>@${esc(hdl(s.tiktok))}</small></span>${TT}</a>
    </div></div></section>`;
  startHero();
  const sc = view.querySelector('[data-scroll]');
  sc.onclick = e => { e.preventDefault(); $('#portfolio').scrollIntoView({behavior: 'smooth'}); };
  document.title = `${s.name} · Fotografia`;
  arm(view);
}

let cur = {list: [], label: ''};
function gallery(catId, subId, keepScroll) {
  const all = catId === 'all';
  const cat = all ? null : D.categories.find(c => c.id === catId);
  if (!all && !cat) return notFound();
  const groups = all ? D.categories.filter(c => catPhotos(c.id).length) : (cat.subs || []);
  const base = all ? D.photos : catPhotos(catId);
  const inGroup = p => !subId || (all ? p.category === subId : p.sub === subId);
  const list = base.filter(inGroup);
  const grp = groups.find(g => g.id === subId);
  const title = all ? 'Tutte le foto' : cat.name;
  const hrefFor = id => all ? `#/c/all${id ? '/' + id : ''}` : `#/c/${catId}${id ? '/' + id : ''}`;
  const cnt = g => all ? catPhotos(g.id).length : base.filter(p => p.sub === g.id).length;
  const chips = groups.length ? `<div class="chips"><a class="chip ${!subId ? 'on' : ''}" href="${hrefFor('')}">Tutte<sup>${base.length}</sup></a>` +
    groups.map(g => `<a class="chip ${subId === g.id ? 'on' : ''}" href="${hrefFor(g.id)}">${esc(g.name)}<sup>${cnt(g)}</sup></a>`).join('') + '</div>' : '<div style="height:30px"></div>';
  const subline = grp && grp.description ? grp.description : `${list.length} ${list.length === 1 ? 'fotografia' : 'fotografie'}`;
  const items = list.map((p, i) => `<button class="ph" data-i="${i}" style="aspect-ratio:${p.w}/${p.h};background:${esc(p.color)}" aria-label="${esc(p.title || 'Apri foto')}">
      <img data-ld src="${esc(p.thumb)}" width="${p.w}" height="${p.h}" alt="${esc(p.title || title)}" loading="lazy" decoding="async">${p.title ? `<span class="cap">${esc(p.title)}</span>` : ''}</button>`).join('');
  const head = `<a class="back" href="#/">← Portfolio</a><h1>${esc(grp && !all ? grp.name : title)}</h1><p class="sub">${esc(subline)}</p>`;
  if (keepScroll && $('.page')) {
    $('.page .headblk').innerHTML = head + chips;
    const g = $('.gallery'); g.innerHTML = items || '<p class="empty">Nessuna foto ancora.</p>';
  } else {
    view.innerHTML = `<section class="page fade-view"><div class="wrap"><div class="headblk">${head}${chips}</div><div class="gallery">${items || '<p class="empty">Nessuna foto ancora.</p>'}</div></div></section>`;
  }
  cur = {list, label: title};
  $('.gallery').onclick = e => { const b = e.target.closest('.ph'); if (b) openLB(+b.dataset.i); };
  document.title = `${grp && !all ? grp.name + ' · ' : ''}${title} · ${D.site.name}`;
  arm(view);
}
function notFound() {
  view.innerHTML = `<section class="page"><div class="wrap"><h1>Pagina non trovata</h1><p class="sub"><a href="#/" style="color:var(--accent)">Torna alla home</a></p></div></section>`;
}


/* ---------- home: foto casuali che cambiano da sole + testi di presentazione ---------- */
const HERO_TEXTS = [
  'Ivan Sudano | Fotografo, classe 2005.',
  'Fotografo dal 2022 | Da {anni} anni scatto ogni volta che posso.',
  'Auto, ritratti e natura | Con qualche scatto di architettura e street.',
  'Monza GT Open | Ho fotografato le gare da bordo pista.',
  'Lavoriamo insieme? | Scrivimi su Instagram per shooting e collaborazioni.'
];
let heroTimer = null, heroStop = null;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(Math.random() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; };
function stopHero() { clearTimeout(heroTimer); heroTimer = null; if (heroStop) { heroStop(); heroStop = null; } }
function startHero() {
  const root = $('.hero'); if (!root) return;
  const s = D.site;
  const lines = (Array.isArray(s.heroTexts) && s.heroTexts.length ? s.heroTexts : HERO_TEXTS).map(t => {
    const [a, ...b] = String(t).split('|'); const f = x => x.replace(/\{anni\}/g, Math.max(1, new Date().getFullYear() - 2022)).trim();
    return {h: f(a), p: f(b.join('|'))};
  });
  let land = D.photos.filter(p => p.w / p.h >= 1.3);
  if (land.length < 3) land = D.photos.slice();
  let queue = shuffle(land), qi = 0, last = null, ti = 0;
  const nextPhoto = () => { if (qi >= queue.length) { queue = shuffle(land); if (queue[0] === last && queue.length > 1) queue.push(queue.shift()); qi = 0; } last = queue[qi++]; return last; };
  const imgs = [...root.querySelectorAll('.hero-img')], ht = $('.ht', root), h1 = $('h1', ht), pt = $('.tag', ht), dots = $('.dots', root);
  let cur = 0;
  const setImg = (el, p) => { el.src = p.src; el.style.objectPosition = p.focus || '50% 50%'; };
  const setText = i => { h1.textContent = lines[i].h; pt.textContent = lines[i].p; dots.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i)); };
  dots.innerHTML = lines.length > 1 ? lines.map((_, i) => `<button role="tab" aria-label="Testo ${i + 1}"></button>`).join('') : '';
  setImg(imgs[0], nextPhoto()); setText(0);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const secs = Math.min(30, Math.max(4, Number(s.heroSeconds) || 8));
  let visible = true;
  const step = (toText) => {
    const p = nextPhoto(), nxt = imgs[1 - cur], pre = new Image();
    pre.onload = pre.onerror = () => {
      setImg(nxt, p); nxt.classList.add('on'); imgs[cur].classList.remove('on'); cur = 1 - cur;
      ht.classList.add('out');
      setTimeout(() => { ti = toText ?? (ti + 1) % lines.length; setText(ti); ht.classList.remove('out'); }, 450);
    };
    pre.src = p.src;
  };
  const loop = () => { heroTimer = setTimeout(() => { if (visible && !document.hidden) step(); loop(); }, secs * 1000); };
  dots.onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = [...dots.children].indexOf(b); clearTimeout(heroTimer); step(i); if (!reduce && lines.length) loop(); };
  const io2 = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, {threshold: .2}); io2.observe(root);
  heroStop = () => io2.disconnect();
  if (!reduce) loop();
}

/* ---------- router ---------- */
let lastCat = null;
function route() {
  stopHero();
  if (lbOpen()) closeLB(true);
  toggleMenu(false);
  const h = location.hash || '#/';
  const parts = h.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  markNav(parts[0] === 'c' ? `#/c/${parts[1]}` : '#/');
  if (parts[0] === 'c' && parts[1]) {
    const same = lastCat === parts[1] && $('.page');
    gallery(parts[1], parts[2], !!same);
    if (!same) scrollTo(0, 0);
    lastCat = parts[1];
  } else { lastCat = null; home(); scrollTo(0, 0); }
}
addEventListener('hashchange', route);

/* ---------- lightbox ---------- */
const lb = $('#lb'), img = $('#lbimg'), stage = $('#lbstage');
let idx = 0, pushed = false, tok = 0;
const lbOpen = () => lb.classList.contains('open');
function show(i, dir = 0) {
  const L = cur.list; if (!L.length) return;
  idx = (i + L.length) % L.length;
  const p = L[idx], my = ++tok;
  $('#lbcnt').textContent = `${idx + 1} / ${L.length}`;
  $('#lbttl').textContent = p.title || '';
  $('#lbcat').textContent = (D.categories.find(c => c.id === p.category) || {}).name || '';
  img.alt = p.title || '';
  lb.classList.add('loading');
  img.style.opacity = .0; img.classList.add('drag'); img.style.transform = dir ? `translateX(${dir * 60}px)` : 'none';
  const f = new Image(); f.decoding = 'async';
  f.onload = () => { if (my !== tok) return; img.src = p.src; lb.classList.remove('loading'); requestAnimationFrame(() => { img.classList.remove('drag'); img.style.opacity = 1; img.style.transform = 'none'; }); };
  f.onerror = f.onload;
  f.src = p.src;
  [1, -1].forEach(d => { const q = L[(idx + d + L.length) % L.length]; if (q) { const pre = new Image(); pre.src = q.src; } });
}
function openLB(i) {
  lb.classList.add('open'); document.body.classList.add('lock');
  history.pushState({lb: 1}, ''); pushed = true;
  show(i); $('#lbclose').focus({preventScroll: true});
}
function closeLB(fromRoute) {
  lb.classList.remove('open'); document.body.classList.remove('lock'); img.removeAttribute('src');
  if (pushed && !fromRoute) { pushed = false; history.back(); } else pushed = false;
}
addEventListener('popstate', () => { if (lbOpen()) { pushed = false; closeLB(true); } });
$('#lbclose').onclick = () => closeLB();
$('#lbprev').onclick = () => show(idx - 1, -1);
$('#lbnext').onclick = () => show(idx + 1, 1);
addEventListener('keydown', e => {
  if (!lbOpen()) return;
  if (e.key === 'Escape') closeLB(); else if (e.key === 'ArrowLeft') show(idx - 1, -1); else if (e.key === 'ArrowRight') show(idx + 1, 1);
});
// swipe: orizzontale = cambia foto, verso il basso = chiudi
let sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
stage.addEventListener('pointerdown', e => { drag = true; sx = e.clientX; sy = e.clientY; dx = dy = 0; img.classList.add('drag'); stage.setPointerCapture(e.pointerId); });
stage.addEventListener('pointermove', e => {
  if (!drag) return; dx = e.clientX - sx; dy = e.clientY - sy;
  if (Math.abs(dx) > Math.abs(dy)) img.style.transform = `translateX(${dx}px)`;
  else { img.style.transform = `translateY(${Math.max(0, dy)}px) scale(${1 - Math.min(Math.max(dy, 0) / 900, .2)})`; img.style.opacity = 1 - Math.min(Math.max(dy, 0) / 500, .6); }
});
const end = () => {
  if (!drag) return; drag = false; img.classList.remove('drag');
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  else if (dy > 110) closeLB();
  else { img.style.transform = 'none'; img.style.opacity = 1; }
};
stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
stage.addEventListener('click', e => { if (e.target === stage && Math.abs(dx) < 5) closeLB(); });


/* ---------- card "ultimo post Instagram": compare, resta un po' e scompare ---------- */
function igCard() {
  const ip = (D.site || {}).igPost || {};
  const p = byId[ip.photo];
  let host = ''; try { host = new URL(ip.url).hostname; } catch {}
  if (!ip.enabled || !p || !/(^|\.)instagram\.com$/.test(host)) return;
  try { if (sessionStorage.getItem('igcard') === (ip.url + p.id)) return; } catch {}
  const el = document.createElement('div'); el.className = 'igc'; el.setAttribute('role', 'complementary'); el.setAttribute('aria-label', 'Ultimo post su Instagram');
  el.innerHTML = `<a class="cv" href="${esc(ip.url)}" target="_blank" rel="noopener"><img src="${esc(p.thumb)}" alt=""><span class="tx"><span class="t">${IG} Ultimo post</span><span class="cp">${esc(ip.caption || 'Guarda il mio ultimo post su Instagram')}</span><span class="go">Apri su Instagram →</span></span></a><button class="x" aria-label="Chiudi">×</button><i class="bar"></i>`;
  document.body.append(el);
  const hide = () => { el.classList.remove('show'); try { sessionStorage.setItem('igcard', ip.url + p.id); } catch {} setTimeout(() => el.remove(), 900); };
  el.querySelector('.x').onclick = hide;
  el.querySelector('.bar').addEventListener('animationend', hide);
  setTimeout(() => requestAnimationFrame(() => el.classList.add('show')), 3500);
}

/* ---------- protezione base contro il salvataggio delle foto ---------- */
document.addEventListener('contextmenu', e => { if (e.target.closest('img,.ph,.card,.proj,.hero,.lb')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (e.target.tagName === 'IMG') e.preventDefault(); });

/* ---------- start ---------- */
load().then(() => { chrome(); route(); igCard(); }).catch(err => {
  view.innerHTML = '<section class="page"><div class="wrap"><h1>Ops</h1><p class="sub">Non riesco a caricare le foto. Riprova tra poco.</p></div></section>'; console.error(err);
});
})();
