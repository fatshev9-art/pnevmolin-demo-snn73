/* Общий скрипт v3: меню и мега-меню, шторка на телефоне, поиск, появление блоков, оглавление,
   копирование почты, корзина с нижней панели, вид списка и поиск на странице категории. Без библиотек. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = window.matchMedia('(min-width: 1180px)');
  var hoverable = window.matchMedia('(hover: hover)');
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  /* ---------- шапка: тень при прокрутке ---------- */
  var head = $('.masthead');
  if (head) {
    var stuck = function () { head.classList.toggle('is-stuck', (window.scrollY || root.scrollTop) > 8); };
    window.addEventListener('scroll', stuck, { passive: true });
    stuck();
  }

  /* ---------- меню ---------- */
  var nav = $('#nav');
  var burger = $('.burger');
  if (nav) {
    nav.classList.add('is-js');
    var tops = $$('.nav__item > button.nav__top[aria-controls]', nav);
    var openBtn = null;
    var timer = 0;
    var panelOf = function (btn) { return doc.getElementById(btn.getAttribute('aria-controls')); };
    var itemOf = function (btn) { return btn.closest('.nav__item'); };
    var isCat = function (btn) { return btn.classList.contains('nav__cat'); };

    var close = function (btn, focus) {
      if (!btn) return;
      btn.setAttribute('aria-expanded', 'false');
      itemOf(btn).classList.remove('is-open');
      if (isCat(btn)) doc.body.classList.remove('mega-open');
      if (openBtn === btn) openBtn = null;
      if (focus) btn.focus();
    };
    var open = function (btn) {
      if (openBtn && openBtn !== btn) close(openBtn);
      btn.setAttribute('aria-expanded', 'true');
      itemOf(btn).classList.add('is-open');
      if (isCat(btn) && desk.matches) doc.body.classList.add('mega-open');
      openBtn = btn;
    };
    var toggle = function (btn) { if (btn.getAttribute('aria-expanded') === 'true') close(btn); else open(btn); };

    tops.forEach(function (btn) {
      btn.addEventListener('click', function () { clearTimeout(timer); toggle(btn); });
      var item = itemOf(btn);
      if (!isCat(btn)) {
        item.addEventListener('mouseenter', function () {
          if (!desk.matches || !hoverable.matches) return;
          clearTimeout(timer);
          timer = setTimeout(function () { open(btn); }, 120);
        });
        item.addEventListener('mouseleave', function () {
          if (!desk.matches || !hoverable.matches) return;
          clearTimeout(timer);
          timer = setTimeout(function () { if (openBtn === btn) close(btn); }, 160);
        });
      }
    });

    doc.addEventListener('click', function (e) {
      if (openBtn && desk.matches && !e.target.closest('.nav__item.is-open')) close(openBtn);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (openBtn && (desk.matches || !nav.classList.contains('is-open'))) { close(openBtn, true); return; }
      if (nav.classList.contains('is-open')) drawer(false, true);
    });

    /* мега-меню: разделы слева */
    var mega = $('.mega', nav);
    if (mega) {
      var roots = $$('.mega__root', mega);
      var pick = function (btn) {
        roots.forEach(function (b) {
          var on = b === btn;
          b.setAttribute('aria-expanded', on ? 'true' : 'false');
          var pane = doc.getElementById(b.getAttribute('aria-controls'));
          if (pane) pane.hidden = !on;
        });
      };
      var rTimer = 0;
      roots.forEach(function (b) {
        b.addEventListener('click', function () {
          pick(b);
          if (!desk.matches) {
            mega.classList.add('is-drill');
            var pane = doc.getElementById(b.getAttribute('aria-controls'));
            var back = pane && $('[data-mega-back]', pane);
            if (back) back.focus();
          }
        });
        b.addEventListener('mouseenter', function () {
          if (!desk.matches || !hoverable.matches) return;
          clearTimeout(rTimer);
          rTimer = setTimeout(function () { pick(b); }, 80);
        });
        b.addEventListener('mouseleave', function () { clearTimeout(rTimer); });
        b.addEventListener('focus', function () { if (desk.matches) pick(b); });
      });
      $$('[data-mega-back]', mega).forEach(function (b) {
        b.addEventListener('click', function () {
          mega.classList.remove('is-drill');
          var cur = roots.filter(function (r) { return r.getAttribute('aria-expanded') === 'true'; })[0];
          if (cur) cur.focus();
        });
      });
    }

    /* шторка на телефоне и планшете */
    var drawer = function (state, focusBurger) {
      nav.classList.toggle('is-open', state);
      doc.body.classList.toggle('menu-open', state);
      if (burger) burger.setAttribute('aria-expanded', state ? 'true' : 'false');
      if (state) {
        var first = $('.nav__top', nav);
        if (first) setTimeout(function () { first.focus(); }, 60);
      } else {
        if (openBtn) close(openBtn);
        if (mega) mega.classList.remove('is-drill');
        if (focusBurger && burger) burger.focus();
      }
    };
    if (burger) burger.addEventListener('click', function () { drawer(!nav.classList.contains('is-open')); });
    $$('[data-nav-close]', nav).forEach(function (b) { b.addEventListener('click', function () { drawer(false, true); }); });
    var onMode = function () { if (desk.matches && nav.classList.contains('is-open')) drawer(false); };
    if (desk.addEventListener) desk.addEventListener('change', onMode); else if (desk.addListener) desk.addListener(onMode);
  }

  /* ---------- корзина с нижней панели и шторки, счётчик ---------- */
  var rqToggle = $('[data-rq-toggle]');
  $$('[data-rq-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      if (nav && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); doc.body.classList.remove('menu-open'); }
      if (rqToggle) rqToggle.click();
    });
  });
  var rqCount = $('[data-rq-count]');
  var mbarCount = $('[data-mbar-count]');
  if (rqCount && mbarCount && 'MutationObserver' in window) {
    var sync = function () { var n = parseInt(rqCount.textContent, 10) || 0; mbarCount.textContent = n ? String(n) : ''; };
    new MutationObserver(sync).observe(rqCount, { childList: true, characterData: true, subtree: true });
    sync();
  }

  /* ---------- поиск: артикулы и названия каталога, разделы сайта ---------- */
  var box = $('#search');
  if (box) {
    var input = $('#search-q', box);
    var res = $('[data-search-res]', box);
    var hint = $('[data-search-hint]', box);
    var logo = $('a.logo[href]');
    var base = logo ? logo.getAttribute('href') : '/';
    if (base.slice(-1) !== '/') base += '/';
    var me = $('script[src*="assets/js/site.js"]');
    var liteUrl = me ? me.getAttribute('src').replace(/assets\/js\/site\.js.*$/, 'assets/catalog-lite.json') : '';
    var lite = null, loading = false, pages = null, lastFocus = null, cursor = -1;
    var rootNames = {};
    $$('.mega__root').forEach(function (b) { rootNames[b.getAttribute('data-root')] = (b.querySelector('span') || b).textContent.trim(); });
    var norm = function (s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[‐-―-]/g, '-').trim(); };
    var compact = function (s) { return norm(s).replace(/[\s\-–—_.]/g, ''); };
    var collectPages = function () {
      var seen = {};
      pages = [];
      $$('.nav a[href], .foot a[href], .topline a[href]').forEach(function (a) {
        var h = a.getAttribute('href');
        var t = (a.querySelector('b') || a).textContent.replace(/\s+/g, ' ').trim();
        if (!h || h.indexOf('mailto:') === 0 || h.charAt(0) === '#' || !t || seen[h]) return;
        seen[h] = 1;
        pages.push({ t: t, h: h, n: norm(t) });
      });
    };
    var load = function () {
      if (lite || loading || !liteUrl || !window.fetch) return;
      loading = true;
      fetch(liteUrl).then(function (r) { return r.ok ? r.json() : []; }).then(function (data) {
        lite = (data || []).map(function (p) { return { s: p.sku, n: p.name, c: p.category, p: p.path, k: compact(p.sku), m: norm(p.name) }; });
        run();
      }).catch(function () { lite = []; });
    };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var run = function () {
      var q = norm(input.value);
      cursor = -1;
      if (q.length < 2) { res.innerHTML = ''; hint.hidden = false; return; }
      if (!pages) collectPages();
      var words = q.split(/\s+/).filter(Boolean);
      var cq = compact(q);
      var out = [];
      (lite || []).forEach(function (p) {
        if (out.length >= 8) return;
        var hit = (cq.length >= 3 && p.k.indexOf(cq) !== -1) || words.every(function (w) { return p.m.indexOf(w) !== -1; });
        if (hit) out.push('<li><a href="' + esc(base + p.p) + '"><span>' + esc(p.n) + '</span><em>' + esc(p.s) + '</em>' + (rootNames[p.c] ? '<small>' + esc(rootNames[p.c]) + '</small>' : '') + '</a></li>');
      });
      var pg = 0;
      pages.forEach(function (p) {
        if (pg >= 6) return;
        if (words.every(function (w) { return p.n.indexOf(w) !== -1; })) { pg++; out.push('<li><a href="' + esc(p.h) + '"><span>' + esc(p.t) + '</span><small>Раздел сайта</small></a></li>'); }
      });
      if (!out.length) out.push(lite ? '<li class="search__hint">Ничего не нашли. Проверьте артикул или напишите нам на почту.</li>' : '<li class="search__hint">Загружаем каталог…</li>');
      res.innerHTML = out.join('');
      hint.hidden = true;
    };
    var openSearch = function (e) {
      if (e) e.preventDefault();
      lastFocus = doc.activeElement;
      if (nav && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); doc.body.classList.remove('menu-open'); }
      $$('[data-search-open][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      box.hidden = false;
      doc.body.style.overflow = 'hidden';
      load();
      setTimeout(function () { input.focus(); }, 30);
    };
    var closeSearch = function () {
      box.hidden = true;
      doc.body.style.overflow = '';
      $$('[data-search-open][aria-expanded]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', openSearch); });
    $$('[data-search-close]', box).forEach(function (b) { b.addEventListener('click', closeSearch); });
    box.addEventListener('click', function (e) { if (e.target === box) closeSearch(); });
    input.addEventListener('input', run);
    box.addEventListener('keydown', function (e) {
      var links = $$('a', res);
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!links.length) return;
        e.preventDefault();
        cursor = e.key === 'ArrowDown' ? Math.min(links.length - 1, cursor + 1) : Math.max(0, cursor - 1);
        links.forEach(function (a, i) { a.classList.toggle('is-on', i === cursor); });
        links[cursor].scrollIntoView({ block: 'nearest' });
      }
      if (e.key === 'Enter' && cursor >= 0 && links[cursor]) { e.preventDefault(); window.location.href = links[cursor].href; }
    });
  }

  /* ---------- появление блоков при прокрутке ---------- */
  var rv = $$('.rv');
  if (rv.length && !reduce && 'IntersectionObserver' in window) {
    root.classList.add('js-reveal');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) {
      var sibs = el.parentNode ? Array.prototype.indexOf.call(el.parentNode.children, el) : 0;
      el.style.transitionDelay = Math.min(sibs, 6) * 40 + 'ms';
      io.observe(el);
    });
    // всё, что уже на экране при загрузке, показываем сразу
    requestAnimationFrame(function () {
      rv.forEach(function (el) { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in'); });
    });
  }

  /* ---------- оглавление: текущий раздел и прогресс чтения ---------- */
  var tocLinks = $$('.toc__list a');
  var prose = $('.prose');
  if (tocLinks.length && prose && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[decodeURIComponent(a.hash.slice(1))] = a; });
    var heads = $$('h2[id]', prose).filter(function (h) { return map[h.id]; });
    var setActive = function (id) { tocLinks.forEach(function (a) { a.classList.toggle('is-active', a === map[id]); }); };
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-15% 0px -70% 0px' });
    heads.forEach(function (h) { tio.observe(h); });
    var bar = $('.toc__prog i');
    if (bar) {
      var prog = function () {
        var r = prose.getBoundingClientRect();
        var total = r.height - window.innerHeight * 0.6;
        var p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        bar.style.width = (p * 100).toFixed(1) + '%';
      };
      window.addEventListener('scroll', prog, { passive: true });
      prog();
    }
    var box2 = $('.toc__box');
    if (box2 && window.matchMedia('(max-width: 900px)').matches) box2.open = false;
  }

  /* ---------- вкладки карточки товара: текущий блок ---------- */
  var ptabs = $$('.ptabs a');
  if (ptabs.length && 'IntersectionObserver' in window) {
    var pmap = {};
    ptabs.forEach(function (a) { pmap[a.hash.slice(1)] = a; });
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) ptabs.forEach(function (a) { a.classList.toggle('is-active', a === pmap[en.target.id]); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    $$('.pblock[id]').forEach(function (s) { if (pmap[s.id]) pio.observe(s); });
  }

  /* ---------- категория: вид списка и поиск на странице ---------- */
  var grid = $('.clayout .pgrid');
  var view = $('[data-view]');
  if (grid && view) {
    view.hidden = false;
    var setView = function (v) {
      grid.classList.toggle('is-list', v === 'list');
      $$('button', view).forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'); });
      try { localStorage.setItem('wpg-view', v); } catch (e) { /* хранилище недоступно */ }
    };
    $$('button', view).forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-v')); }); });
    try { if (localStorage.getItem('wpg-view') === 'list') setView('list'); } catch (e) { /* хранилище недоступно */ }
  }
  var cfind = $('[data-cfind]');
  if (grid && cfind) {
    var empty = $('[data-cfind-empty]');
    cfind.addEventListener('input', function () {
      var q = cfind.value.toLowerCase().replace(/ё/g, 'е').trim();
      var shown = 0;
      $$('li[data-q]', grid).forEach(function (li) {
        var on = !q || li.getAttribute('data-q').replace(/ё/g, 'е').indexOf(q) !== -1;
        li.hidden = !on;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  }

  /* ---------- копирование почты ---------- */
  $$('.js-copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      var status = btn.parentNode ? btn.parentNode.querySelector('.copy-status') : null;
      var done = function (ok) { if (status) status.textContent = ok ? 'Адрес скопирован' : 'Не получилось, скопируйте вручную: ' + text; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      else done(false);
    });
  });
})();
