/* Скин D «Шильдик»: панель каталога слева (drill-down), первый экран с лентой переключения, подбор с вкладками,
   лента оснастки, фильтры, вид и сортировка на странице категории, выноски на странице товара, нижняя панель
   телефона. Ванильный JS, без библиотек; без нужного элемента на странице блок просто пропускается. */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = window.matchMedia('(max-width: 1023px)');
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* хранилище недоступно */ } }
  };
  var plural = function (n, a, b, c) {
    var m = n % 100, d = n % 10;
    return (m > 10 && m < 15) ? c : d === 1 ? a : (d > 1 && d < 5) ? b : c;
  };
  var ICON_CHEV = '<svg class="d-ic s" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 6 6 6-6 6"/></svg>';

  /* ---------- панель каталога слева (drill-down) ---------- */
  var dr = $('#d-dr');
  var scrim = $('[data-d-scrim]');
  var src = $('#d-src');
  if (dr && scrim && src) {
    var lv = $('[data-d-level]', dr);
    var titleEl = $('[data-d-title]', dr);
    var backBtn = $('[data-d-back]', dr);
    var closeBtn = $('[data-d-close]', dr);
    var openers = $$('[data-d-open]');
    var stack = [];
    var openFrom = null;
    var openRoot = '';
    var closeTimer = 0;

    var nodeOf = function (container) {
      return { title: container.getAttribute('data-title') || '', href: container.getAttribute('data-href') || '', list: container.querySelector(':scope > ul') };
    };
    var rootNode = function (name) {
      var c = $('[data-d-root="' + name + '"]', src);
      return c ? nodeOf(c) : null;
    };
    var textOf = function (li) {
      var a = li.querySelector(':scope > a');
      return a ? a.textContent.replace(/\s+/g, ' ').trim() : '';
    };
    var make = function (tag, cls, text) {
      var el = doc.createElement(tag);
      if (cls) el.className = cls;
      if (text) el.textContent = text;
      return el;
    };
    var render = function (dir) {
      var node = stack[stack.length - 1];
      titleEl.textContent = node.title;
      backBtn.hidden = stack.length <= 1;
      var wrap = make('div', 'd-lvl' + (dir && !reduce ? ' d-lvl--' + dir : ''));
      if (stack.length > 1 && node.href) {
        var all = make('a', 'd-it d-it--all');
        all.href = node.href;
        all.appendChild(make('span', 't', 'Весь раздел: ' + node.title));
        wrap.appendChild(all);
      }
      if (node.list) {
        Array.prototype.forEach.call(node.list.children, function (li) {
          var a = li.querySelector(':scope > a');
          if (!a) return;
          var sub = li.querySelector(':scope > ul');
          var count = a.getAttribute('data-n');
          var goto = a.getAttribute('data-goto');
          var item;
          if (sub || goto) {
            item = make('button', 'd-it');
            item.type = 'button';
            item.addEventListener('click', function () {
              if (goto) {
                var rn = rootNode(goto);
                if (rn) stack.push(rn);
              } else {
                stack.push({ title: textOf(li), href: a.href, list: sub });
              }
              render('f');
              focusLevel();
            });
          } else {
            item = make('a', 'd-it');
            item.href = a.href;
          }
          item.appendChild(make('span', 't', textOf(li)));
          if (count) item.appendChild(make('span', 'n d-num', count));
          var ic = make('span', 'c');
          if (sub || goto) ic.innerHTML = ICON_CHEV;
          item.appendChild(ic);
          wrap.appendChild(item);
        });
      }
      lv.innerHTML = '';
      lv.appendChild(wrap);
      lv.scrollTop = 0;
    };
    var focusLevel = function () {
      var first = $('.d-it', lv);
      (first || lv).focus();
    };
    var setExpanded = function (state) {
      openers.forEach(function (o) {
        var same = !state || (o.getAttribute('data-d-open') === openRoot);
        o.setAttribute('aria-expanded', state && same ? 'true' : 'false');
      });
    };
    var openDrawer = function (name, from) {
      var rn = rootNode(name);
      if (!rn) return false;
      clearTimeout(closeTimer);
      stack = [rn];
      openRoot = name;
      openFrom = from || null;
      render('');
      dr.hidden = false;
      scrim.hidden = false;
      void dr.offsetWidth;
      dr.classList.add('is-open');
      scrim.classList.add('is-open');
      body.classList.add('d-dr-open');
      setExpanded(true);
      setTimeout(focusLevel, reduce ? 0 : 60);
      return true;
    };
    var closeDrawer = function (focusBack) {
      if (dr.hidden) return;
      dr.classList.remove('is-open');
      scrim.classList.remove('is-open');
      body.classList.remove('d-dr-open');
      setExpanded(false);
      closeTimer = setTimeout(function () { dr.hidden = true; scrim.hidden = true; }, reduce ? 0 : 220);
      if (focusBack && openFrom && openFrom.focus) openFrom.focus();
    };
    openers.forEach(function (o) {
      o.setAttribute('role', 'button');
      o.setAttribute('aria-haspopup', 'dialog');
      o.setAttribute('aria-controls', 'd-dr');
      o.setAttribute('aria-expanded', 'false');
      o.addEventListener('click', function (e) {
        e.preventDefault();
        var name = o.getAttribute('data-d-open');
        if (!dr.hidden && openRoot === name) { closeDrawer(true); return; }
        if (!openDrawer(name, o)) window.location.href = o.getAttribute('href') || '/';
      });
    });
    backBtn.addEventListener('click', function () {
      if (stack.length > 1) { stack.pop(); render('b'); focusLevel(); }
    });
    closeBtn.addEventListener('click', function () { closeDrawer(true); });
    scrim.addEventListener('click', function () { closeDrawer(true); });
    doc.addEventListener('keydown', function (e) {
      if (dr.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(true); return; }
      if (e.key === 'Tab') {
        var f = $$('a[href], button:not([hidden])', dr).filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (doc.activeElement === first || doc.activeElement === lv)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    // поиск открывается своим окном: панель закрываем без возврата фокуса
    $$('[data-search-open]').forEach(function (b) { b.addEventListener('click', function () { closeDrawer(false); }); });
    $$('[data-rq-open], [data-rq-toggle]').forEach(function (b) { b.addEventListener('click', function () { closeDrawer(false); }); });
  }

  /* ---------- поиск: клавиша «/» открывает окно поиска ---------- */
  doc.addEventListener('keydown', function (e) {
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
    var t = e.target;
    if (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable)) return;
    var btn = $('[data-search-open]');
    if (btn) { e.preventDefault(); btn.click(); }
  });

  /* ---------- первый экран: слайды, подпись, лента ---------- */
  var hero = $('[data-d-hero]');
  if (hero) {
    var slides = $$('[data-d-slide]', hero);
    var dots = $$('[data-d-dot]', hero);
    var kick = $('[data-d-kicker]', hero), ttl = $('[data-d-ctitle]', hero);
    var cn = $('[data-d-cn]', hero), ck = $('[data-d-ck]', hero), cl = $('[data-d-clink]', hero);
    var cnt = $('[data-d-count]', hero);
    var cx = $('[data-d-cx]', hero), figs = $('[data-d-figs]', hero);
    var playBtn = $('[data-d-play]', hero);
    var interval = parseInt(hero.getAttribute('data-interval'), 10) || 7000;
    var auto = hero.getAttribute('data-autoplay') === '1' && !reduce && slides.length > 1;
    var cur = 0, timer = 0, stopped = false, hold = false;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var fallbackUrl = cl ? cl.getAttribute('href') : '';
    var show = function (i) {
      i = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle('on', k === i);
        if (k === i) s.removeAttribute('aria-hidden'); else s.setAttribute('aria-hidden', 'true');
      });
      dots.forEach(function (d, k) {
        d.classList.toggle('on', k === i);
        d.setAttribute('aria-pressed', k === i ? 'true' : 'false');
      });
      var s = slides[i];
      if (kick) kick.textContent = s.getAttribute('data-kicker') || '';
      if (ttl) ttl.textContent = s.getAttribute('data-title') || '';
      var n = parseInt(s.getAttribute('data-n'), 10) || 0;
      var k2 = parseInt(s.getAttribute('data-k'), 10) || 0;
      if (figs) figs.hidden = !n;
      if (cx) { cx.hidden = !!n; cx.textContent = (s.getAttribute('data-text') || '').slice(0, 100); }
      if (cn) cn.textContent = n.toLocaleString('ru-RU');
      if (ck) ck.textContent = String(k2);
      if (cl) cl.setAttribute('href', s.getAttribute('data-url') || fallbackUrl);
      if (cnt) cnt.textContent = pad(i + 1);
      cur = i;
    };
    var schedule = function () {
      clearTimeout(timer);
      if (!auto || stopped || hold) return;
      timer = setTimeout(function () { show(cur + 1); schedule(); }, interval);
    };
    dots.forEach(function (d, k) { d.addEventListener('click', function () { show(k); schedule(); }); });
    if (auto && playBtn) {
      playBtn.hidden = false;
      playBtn.addEventListener('click', function () {
        stopped = !stopped;
        playBtn.setAttribute('aria-label', stopped ? 'Включить автосмену' : 'Остановить автосмену');
        playBtn.innerHTML = stopped
          ? '<svg class="d-ic s" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg>'
          : '<svg class="d-ic s" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5v14M15 5v14"/></svg>';
        schedule();
      });
    }
    hero.addEventListener('mouseenter', function () { hold = true; clearTimeout(timer); });
    hero.addEventListener('mouseleave', function () { hold = false; schedule(); });
    hero.addEventListener('focusin', function () { hold = true; clearTimeout(timer); });
    hero.addEventListener('focusout', function () { hold = false; schedule(); });
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) clearTimeout(timer); else schedule(); });
    schedule();
  }

  /* ---------- подбор: вкладки «Комплект» и «Тяжение» ---------- */
  $$('[data-d-tabs]').forEach(function (box) {
    var tabs = $$('[data-d-tab]', box);
    var panes = $$('[data-d-pane]', box);
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        var name = t.getAttribute('data-d-tab');
        tabs.forEach(function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); });
        panes.forEach(function (p) { p.hidden = p.getAttribute('data-d-pane') !== name; });
      });
    });
  });

  /* ---------- лента: кнопки назад и вперёд ---------- */
  var rib = $('[data-d-ribbon]');
  if (rib) {
    $$('[data-d-rib]').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = parseInt(b.getAttribute('data-d-rib'), 10) || 1;
        rib.scrollBy({ left: dir * Math.max(240, rib.clientWidth * 0.7), behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------- корзина: счётчик в шильдике на главной ---------- */
  var cartN = $$('[data-d-cart-n]');
  var rqCount = $('[data-rq-count]');
  if (cartN.length && rqCount && 'MutationObserver' in window) {
    var syncCart = function () { var n = rqCount.textContent.trim() || '0'; cartN.forEach(function (el) { el.textContent = n; }); };
    new MutationObserver(syncCart).observe(rqCount, { childList: true, characterData: true, subtree: true });
    syncCart();
  }

  /* ---------- вопросы: открыт один ответ ---------- */
  $$('[data-d-faq]').forEach(function (box) {
    var all = $$('details', box);
    all.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        all.forEach(function (o) { if (o !== d) o.open = false; });
      });
    });
  });

  /* ---------- категория: фильтры, поиск, сортировка, вид ---------- */
  var catBox = $('[data-d-cat]');
  if (catBox) {
    var list = $('.d-cards', catBox);
    var items = list ? $$(':scope > li', list) : [];
    items.forEach(function (li, i) { li.setAttribute('data-i', String(i)); });
    var side = $('[data-d-filters]', catBox);
    var sel = {};
    var query = '';
    var shownEls = $$('[data-d-shown]');
    var shown2 = $('[data-d-shown2]');
    var wordEl = $('[data-d-word]');
    var total = shownEls.length ? parseInt(shownEls[0].textContent.replace(/\s/g, ''), 10) || items.length : items.length;
    var empty = $('[data-d-empty]', catBox);
    var badge = $('[data-d-fbadge]', catBox);
    var badge2 = $('[data-d-fbadge2]', catBox);
    var active = function () { var n = 0; Object.keys(sel).forEach(function (k) { n += Object.keys(sel[k]).length; }); return n; };
    var apply = function () {
      var vis = 0;
      items.forEach(function (li) {
        var ok = true;
        Object.keys(sel).forEach(function (k) {
          var vals = Object.keys(sel[k]);
          if (vals.length && !sel[k][li.getAttribute('data-' + k)]) ok = false;
        });
        if (ok && query) ok = (li.getAttribute('data-q') || '').replace(/ё/g, 'е').indexOf(query) !== -1;
        li.hidden = !ok;
        if (ok) vis++;
      });
      var filtered = active() > 0 || query !== '';
      var shownNow = filtered ? vis : total;
      shownEls.forEach(function (el) {
        var was = el.textContent;
        el.textContent = shownNow.toLocaleString('ru-RU');
        if (was !== el.textContent && !reduce) { el.classList.remove('d-roll'); void el.offsetWidth; el.classList.add('d-roll'); }
      });
      if (wordEl) wordEl.textContent = plural(shownNow, 'позиция', 'позиции', 'позиций');
      if (shown2) shown2.textContent = String(vis);
      if (empty) empty.hidden = vis > 0;
      if (list) list.hidden = vis === 0;
      var n = active();
      [badge, badge2].forEach(function (b) { if (b) { b.hidden = n === 0; b.textContent = String(n); } });
    };
    $$('.d-ck', catBox).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-f'), v = b.getAttribute('data-v');
        var on = b.getAttribute('aria-checked') !== 'true';
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        sel[k] = sel[k] || {};
        if (on) sel[k][v] = true; else delete sel[k][v];
        apply();
      });
    });
    var find = $('[data-d-find]', catBox);
    if (find) {
      find.addEventListener('input', function () { query = find.value.toLowerCase().replace(/ё/g, 'е').trim(); apply(); });
    }
    $$('[data-d-reset]', catBox).forEach(function (b) {
      b.addEventListener('click', function () {
        sel = {};
        query = '';
        if (find) find.value = '';
        $$('.d-ck', catBox).forEach(function (c) { c.setAttribute('aria-checked', 'false'); });
        apply();
      });
    });
    $$('[data-d-group]', catBox).forEach(function (g) {
      var t = $('.d-fgp__t', g), b = $('.d-fgp__b', g);
      t.addEventListener('click', function () {
        var open = t.getAttribute('aria-expanded') !== 'true';
        t.setAttribute('aria-expanded', open ? 'true' : 'false');
        b.hidden = !open;
        g.classList.toggle('shut', !open);
      });
    });
    // сортировка
    var sortEl = $('[data-d-sort]', catBox);
    if (sortEl && list) {
      sortEl.addEventListener('change', function () {
        var mode = sortEl.value;
        var arr = items.slice();
        var cmp = {
          '': function (a, b) { return (+a.getAttribute('data-i')) - (+b.getAttribute('data-i')); },
          sku: function (a, b) { return a.getAttribute('data-sku').localeCompare(b.getAttribute('data-sku'), 'ru', { numeric: true }); },
          name: function (a, b) { return a.getAttribute('data-name').localeCompare(b.getAttribute('data-name'), 'ru'); },
          n: function (a, b) {
            var x = parseFloat(a.getAttribute('data-n')), y = parseFloat(b.getAttribute('data-n'));
            if (isNaN(x) && isNaN(y)) return 0;
            if (isNaN(x)) return 1;
            if (isNaN(y)) return -1;
            return x - y;
          }
        }[mode] || null;
        if (!cmp) return;
        arr.sort(cmp);
        arr.forEach(function (li) { list.appendChild(li); });
      });
    }
    // вид
    var viewBtns = $$('[data-d-view]', catBox);
    var setView = function (v) {
      if (list) { list.classList.toggle('is-rows', v === 'rows'); list.classList.toggle('is-cmp', v === 'cmp'); }
      viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-d-view') === v ? 'true' : 'false'); });
      store.set('wpg-d-view', v);
    };
    viewBtns.forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-d-view')); }); });
    var savedView = store.get('wpg-d-view');
    if (savedView === 'rows' || savedView === 'cmp') setView(savedView);
    // сворачивание колонки
    var foldBtns = $$('[data-d-fold]', catBox);
    var fopen = $('[data-d-fopen]', catBox), fshut = $('[data-d-fshut]', catBox);
    var setFold = function (shut) {
      catBox.classList.toggle('is-fold', shut);
      if (fopen) fopen.hidden = shut;
      if (fshut) fshut.hidden = !shut;
      foldBtns.forEach(function (b) { b.setAttribute('aria-expanded', b.closest('[data-d-fshut]') ? (shut ? 'false' : 'true') : (shut ? 'false' : 'true')); });
      store.set('wpg-d-fold', shut ? '1' : '0');
    };
    foldBtns.forEach(function (b) { b.addEventListener('click', function () { var shut = !catBox.classList.contains('is-fold'); setFold(shut); var t = shut ? $('[data-d-fshut] [data-d-fold]', catBox) : $('[data-d-fopen] [data-d-fold]', catBox); if (t) t.focus(); }); });
    if (store.get('wpg-d-fold') === '1' && !mobile.matches && side) setFold(true);
    // шторка фильтров на телефоне
    var sheetBtn = $('[data-d-sheet]', catBox);
    if (sheetBtn && side) {
      var setSheet = function (on) {
        side.classList.toggle('is-sheet', on);
        body.classList.toggle('d-sheet-open', on);
        sheetBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
        if (on) { var f = $('.d-fgp__t', side) || $('[data-d-sheet-close]', side); if (f) f.focus(); } else sheetBtn.focus();
      };
      sheetBtn.addEventListener('click', function () { setSheet(!side.classList.contains('is-sheet')); });
      $$('[data-d-sheet-close]', side).forEach(function (b) { b.addEventListener('click', function () { setSheet(false); }); });
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('is-sheet')) setSheet(false); });
      doc.addEventListener('click', function (e) { if (side.classList.contains('is-sheet') && !e.target.closest('.d-fside') && !e.target.closest('[data-d-sheet]')) setSheet(false); });
    }
  }

  /* ---------- товар: выноски и строки характеристик связаны ---------- */
  var draw = $('[data-d-draw]');
  if (draw) {
    var cos = $$('[data-d-co]', draw);
    var rowOf = function (i) { return doc.getElementById('d-spec-' + i); };
    var mark = function (i, on) {
      var row = rowOf(i);
      if (row) row.classList.toggle('on', on);
      cos.forEach(function (c) { if (c.getAttribute('data-d-co') === String(i)) c.classList.toggle('on', on); });
      var idx = cos.map(function (c) { return c.getAttribute('data-d-co'); }).indexOf(String(i));
      if (idx >= 0) draw.setAttribute('data-on', on ? String(idx + 1) : '');
    };
    cos.forEach(function (c) {
      var i = c.getAttribute('data-d-co');
      c.addEventListener('mouseenter', function () { mark(i, true); });
      c.addEventListener('mouseleave', function () { mark(i, false); });
      c.addEventListener('focus', function () { mark(i, true); });
      c.addEventListener('blur', function () { mark(i, false); });
      c.addEventListener('click', function () {
        var row = rowOf(i);
        if (!row) return;
        row.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        mark(i, true);
        setTimeout(function () { mark(i, false); }, 1600);
      });
    });
    $$('[data-d-row]').forEach(function (r) {
      var i = r.getAttribute('data-d-row');
      if (!cos.some(function (c) { return c.getAttribute('data-d-co') === i; })) return;
      r.addEventListener('mouseenter', function () { mark(i, true); });
      r.addEventListener('mouseleave', function () { mark(i, false); });
    });
  }

  /* ---------- нижняя панель телефона: прячется при прокрутке вниз ---------- */
  var mbar = $('.d-mbar');
  if (mbar) {
    var lastY = window.scrollY || 0;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY || 0;
        if (mobile.matches) {
          if (y > lastY + 8 && y > 160) body.classList.add('d-nav-hidden');
          else if (y < lastY - 8 || y < 120) body.classList.remove('d-nav-hidden');
        } else {
          body.classList.remove('d-nav-hidden');
        }
        lastY = y;
        ticking = false;
      });
    }, { passive: true });
  }
})();
