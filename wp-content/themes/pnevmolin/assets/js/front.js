/* Главная v3: слайдер (10 слайдов, кроссфейд, сегменты с прогрессом), подбор по трассе, калькулятор тягового усилия. Без библиотек. */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* ---------- слайдер ---------- */
  var hero = doc.querySelector('.hero');
  var slides = hero ? Array.prototype.slice.call(hero.querySelectorAll('.slide')) : [];
  if (hero && slides.length > 1) {
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.js-dot'));
    var counter = hero.querySelector('.js-count');
    var ct = hero.querySelector('.js-ct');
    var cx = hero.querySelector('.js-cx');
    var live = hero.querySelector('.hero__live');
    var playBtn = hero.querySelector('.js-play');
    var interval = parseInt(hero.getAttribute('data-interval'), 10) || 7000;
    var autoplay = hero.getAttribute('data-autoplay') === '1' && !reduce;
    var current = 0, timer = 0, userStopped = false, hovering = false, focused = false;

    hero.style.setProperty('--interval', interval + 'ms');
    slides.forEach(function (sl, k) {
      if (k !== 0) sl.setAttribute('aria-hidden', 'true');
    });
    // второй слайд открываем заранее, когда страница уже загружена
    window.addEventListener('load', function () { setTimeout(function () { if (slides[1]) slides[1].hidden = false; }, 1500); });

    var show = function (i, announce) {
      i = (i + slides.length) % slides.length;
      if (i === current) return;
      var next = slides[i];
      next.hidden = false;
      void next.offsetWidth;
      slides[(i + 1) % slides.length].hidden = false;
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      next.classList.add('is-active');
      next.removeAttribute('aria-hidden');
      dots.forEach(function (d, k) { if (k === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
      current = i;
      if (counter) counter.textContent = pad(i + 1);
      if (ct) {
        ct.textContent = next.getAttribute('data-title') || '';
        var url = next.getAttribute('data-url');
        if (url) ct.setAttribute('href', url);
      }
      if (cx) cx.textContent = next.getAttribute('data-text') || '';
      if (announce && live) live.textContent = next.getAttribute('aria-label') || '';
      restartBar();
    };
    var isPlaying = function () { return autoplay && !userStopped; };
    var restartBar = function () {
      hero.classList.remove('hero--playing');
      if (isPlaying()) { void hero.offsetWidth; hero.classList.add('hero--playing'); }
    };
    var schedule = function () {
      clearTimeout(timer);
      var paused = hovering || focused;
      hero.classList.toggle('hero--paused', paused);
      if (!isPlaying() || paused) return;
      timer = setTimeout(function () { show(current + 1, false); schedule(); }, interval);
    };
    var stop = function () {
      userStopped = true;
      clearTimeout(timer);
      hero.classList.remove('hero--playing');
      if (playBtn) { playBtn.classList.add('is-paused'); playBtn.setAttribute('aria-label', 'Запустить автопрокрутку'); }
    };
    var go = function (i) { show(i, true); stop(); };

    var prev = hero.querySelector('.js-prev');
    var nextBtn = hero.querySelector('.js-next');
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d) { d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-index'), 10)); }); });
    hero.addEventListener('keydown', function (e) {
      if (e.target.closest('a, input, select')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    });

    if (autoplay && playBtn) {
      playBtn.hidden = false;
      playBtn.addEventListener('click', function () {
        if (userStopped) {
          userStopped = false;
          playBtn.classList.remove('is-paused');
          playBtn.setAttribute('aria-label', 'Остановить автопрокрутку');
          restartBar();
          schedule();
        } else {
          stop();
        }
      });
      hero.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
      hero.addEventListener('pointerleave', function () { hovering = false; restartBar(); schedule(); });
      hero.addEventListener('focusin', function () { focused = true; schedule(); });
      hero.addEventListener('focusout', function (e) { if (!hero.contains(e.relatedTarget)) { focused = false; restartBar(); schedule(); } });
      doc.addEventListener('visibilitychange', function () { if (doc.hidden) clearTimeout(timer); else schedule(); });
      restartBar();
      schedule();
    }

    // свайп на сенсорных экранах
    var sx = null, sy = null;
    hero.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { sx = e.clientX; sy = e.clientY; } });
    hero.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(current + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- подбор по трассе ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-pick]'), function (box) {
    box.classList.add('is-js');
    var cBtns = Array.prototype.slice.call(box.querySelectorAll('[data-pick-c]'));
    var wLists = Array.prototype.slice.call(box.querySelectorAll('[data-pick-w-of]'));
    var outs = Array.prototype.slice.call(box.querySelectorAll('[data-pick-out]'));
    var setOut = function (key) {
      outs.forEach(function (o) { o.classList.toggle('is-on', o.getAttribute('data-pick-out') === key); });
    };
    var setWhere = function (btn) {
      var list = btn.closest('[data-pick-w-of]');
      Array.prototype.forEach.call(list.querySelectorAll('[data-pick-w]'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      setOut(btn.getAttribute('data-pick-w'));
    };
    cBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var g = btn.getAttribute('data-pick-c');
        cBtns.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
        wLists.forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('data-pick-w-of') === g); });
        var list = box.querySelector('[data-pick-w-of="' + g + '"]');
        var sel = list && (list.querySelector('[aria-pressed="true"]') || list.querySelector('[data-pick-w]'));
        if (sel) setWhere(sel);
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll('[data-pick-w]'), function (btn) {
      btn.addEventListener('click', function () { setWhere(btn); });
    });
  });

  /* ---------- калькулятор тягового усилия (оценка) ---------- */
  Array.prototype.forEach.call(doc.querySelectorAll('[data-calc]'), function (box) {
    var get = function (k) { return box.querySelector('[data-k="' + k + '"]'); };
    var out = box.querySelector('.js-calc-out');
    var hint = box.querySelector('.js-calc-hint');
    var num = function (el) {
      var v = ((el && el.value) || '').replace(/\s/g, '').replace(',', '.');
      return v === '' ? NaN : Number(v);
    };
    var fail = function (text) {
      out.textContent = '0,00';
      out.classList.add('is-empty');
      hint.textContent = text;
    };
    var calc = function () {
      var w = num(get('w')), L = num(get('l')), mu = num(get('mu')), turns = num(get('t'));
      var bad = [], empty = [];
      if (isNaN(w)) empty.push('массу 1 м'); else if (!(w > 0 && w < 200)) bad.push('массу 1 м (до 200 кг)');
      if (isNaN(L)) empty.push('длину'); else if (!(L > 0 && L <= 20000)) bad.push('длину (до 20 000 м)');
      if (isNaN(mu) || !(mu > 0 && mu <= 1.5)) bad.push('условия протяжки');
      if (isNaN(turns) || turns < 0) turns = 0;
      if (bad.length || empty.length) {
        fail(bad.length ? 'Проверьте: ' + bad.join(', ') + '.' : 'Заполните: ' + empty.join(', ') + '.');
        return;
      }
      var T = mu * w * 9.81 * L * Math.exp(mu * turns * Math.PI / 2);
      if (!isFinite(T)) { fail('Параметры выходят за пределы этой оценки: нужен отдельный расчёт трассы.'); return; }
      out.classList.remove('is-empty');
      out.textContent = (T / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
      if (!reduce) { out.classList.remove('is-pulse'); void out.offsetWidth; out.classList.add('is-pulse'); }
      hint.textContent = 'Прямой участок ' + L.toLocaleString('ru-RU') + ' м, поворотов по 90°: ' + turns + '. Сравните с допустимым тяжением кабеля.';
    };
    box.addEventListener('input', calc);
    box.addEventListener('change', calc);
    calc();
  });
})();
