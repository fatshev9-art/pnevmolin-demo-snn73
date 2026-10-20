/* Корзина: заказ уходит письмом на email. localStorage, выезжающая панель, mailto. Без форм, сервера и сторонних запросов. */
(function () {
  'use strict';

  var doc = document;
  var KEY = 'wpg_rq_v1';
  var MAX_ITEMS = 100;
  var MAX_QTY = 999;
  var panel = doc.getElementById('rq');
  if (!panel) return;

  var toggle = doc.querySelector('[data-rq-toggle]');
  var backdrop = doc.querySelector('[data-rq-backdrop]');
  var listEl = panel.querySelector('[data-rq-list]');
  var emptyEl = panel.querySelector('[data-rq-empty]');
  var sendEl = panel.querySelector('[data-rq-send]');
  var clearEl = panel.querySelector('[data-rq-clear]');
  var closeEl = panel.querySelector('[data-rq-close]');
  var liveEl = doc.querySelector('[data-rq-live]');
  var copyEl = panel.querySelector('[data-rq-copy]');
  var warnEl = panel.querySelector('[data-rq-warn]');
  var countEl = toggle ? toggle.querySelector('[data-rq-count]') : null;
  var email = panel.getAttribute('data-email') || '';
  var brand = panel.getAttribute('data-brand') || '';
  var items = [];
  var lastFocus = null;
  var liveTimer = 0;

  /* ---------- данные ---------- */
  function clean(raw) {
    var out = [];
    var seen = {};
    if (!Array.isArray(raw)) return out;
    raw.forEach(function (it) {
      if (!it || typeof it.sku !== 'string' || typeof it.name !== 'string') return;
      var sku = it.sku.trim().slice(0, 40);
      var qty = parseInt(it.qty, 10);
      if (!sku || seen[sku] || out.length >= MAX_ITEMS) return;
      if (!isFinite(qty) || qty < 1) qty = 1;
      seen[sku] = true;
      out.push({ sku: sku, name: it.name.trim().slice(0, 200), qty: Math.min(qty, MAX_QTY) });
    });
    return out;
  }
  function load() {
    try { return clean(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* хранилище недоступно: список живёт до перезагрузки */ }
  }
  function total() {
    return items.reduce(function (n, it) { return n + it.qty; }, 0);
  }
  function find(sku) {
    for (var i = 0; i < items.length; i++) if (items[i].sku === sku) return items[i];
    return null;
  }
  function announce(text) {
    if (!liveEl) return;
    liveEl.textContent = '';
    clearTimeout(liveTimer);
    liveTimer = setTimeout(function () { liveEl.textContent = text; }, 40);
  }

  /* ---------- письмо ---------- */
  function mailto() {
    var lines = ['Здравствуйте!', '', 'Заказ из корзины сайта. Прошу подтвердить наличие и условия поставки по позициям:', ''];
    items.forEach(function (it, i) {
      lines.push((i + 1) + '. ' + it.sku + ', ' + it.name + ', ' + it.qty + ' шт.');
    });
    lines.push('', 'Город и условия поставки: ', 'Контактное лицо и телефон: ');
    var subject = 'Заказ из корзины' + (brand ? ': ' + brand : '');
    return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  function listText() {
    var lines = [];
    items.forEach(function (it, i) { lines.push((i + 1) + '. ' + it.sku + ', ' + it.name + ', ' + it.qty + ' шт.'); });
    return lines.join('\n');
  }
  function copyText(text) {
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      doc.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(ta);
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  /* ---------- отрисовка ---------- */
  function mk(tag, cls, text) {
    var el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function stepBtn(act, sku, label, text, disabled) {
    var b = mk('button', 'rq__step', text);
    b.type = 'button';
    b.setAttribute('data-act', act);
    b.setAttribute('data-sku', sku);
    b.setAttribute('aria-label', label);
    if (disabled) b.setAttribute('aria-disabled', 'true');
    return b;
  }
  function render(focusKey) {
    while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
    items.forEach(function (it) {
      var li = mk('li', 'rq__item');
      var info = mk('div', 'rq__info');
      info.appendChild(mk('span', 'rq__sku', it.sku));
      info.appendChild(mk('span', 'rq__name', it.name));
      var qty = mk('div', 'rq__qty');
      qty.setAttribute('role', 'group');
      qty.setAttribute('aria-label', 'Количество: ' + it.name);
      qty.appendChild(stepBtn('dec', it.sku, it.qty <= 1 ? 'Убрать из корзины: ' + it.name : 'Уменьшить количество: ' + it.name, '−', false));
      var out = mk('output', 'rq__num', String(it.qty));
      out.setAttribute('aria-label', 'Количество ' + it.qty);
      qty.appendChild(out);
      qty.appendChild(stepBtn('inc', it.sku, 'Увеличить количество: ' + it.name, '+', it.qty >= MAX_QTY));
      var del = mk('button', 'rq__del');
      del.type = 'button';
      del.setAttribute('data-act', 'del');
      del.setAttribute('data-sku', it.sku);
      del.setAttribute('aria-label', 'Убрать из корзины: ' + it.name);
      del.textContent = 'Убрать';
      li.appendChild(info);
      li.appendChild(qty);
      li.appendChild(del);
      listEl.appendChild(li);
    });

    var n = items.length;
    emptyEl.hidden = n > 0;
    listEl.hidden = n === 0;
    clearEl.disabled = n === 0;
    if (copyEl) copyEl.hidden = n === 0;
    if (n) {
      sendEl.href = mailto();
      sendEl.removeAttribute('aria-disabled');
      if (warnEl) warnEl.hidden = sendEl.href.length < 1800;
    } else {
      sendEl.href = '#';
      sendEl.setAttribute('aria-disabled', 'true');
      if (warnEl) warnEl.hidden = true;
    }
    if (toggle) {
      toggle.hidden = false;
      toggle.classList.toggle('is-empty', n === 0);
      toggle.setAttribute('aria-label', 'Корзина, позиций: ' + n);
      if (countEl) countEl.textContent = String(n);
    }
    // кнопки «В корзину» на странице: после добавления вместо кнопки блок «− N +»
    Array.prototype.forEach.call(doc.querySelectorAll('[data-rq-add]'), function (b) {
      var sku = b.getAttribute('data-sku');
      var name = b.getAttribute('data-name') || '';
      var it = find(sku);
      var st = b.nextElementSibling && b.nextElementSibling.classList.contains('rq-stepper') ? b.nextElementSibling : null;
      if (!st) {
        st = mk('div', 'rq__qty rq-stepper');
        st.setAttribute('role', 'group');
        st.hidden = true;
        st.appendChild(stepBtn('dec', sku, '', '−', false));
        st.appendChild(mk('output', 'rq__num', '1'));
        st.appendChild(stepBtn('inc', sku, '', '+', false));
        b.parentNode.insertBefore(st, b.nextSibling);
      }
      if (it) {
        st.setAttribute('aria-label', 'В корзине: ' + name);
        var sb = st.querySelectorAll('.rq__step');
        sb[0].setAttribute('aria-label', it.qty <= 1 ? 'Убрать из корзины: ' + name : 'Уменьшить количество: ' + name);
        sb[1].setAttribute('aria-label', 'Увеличить количество: ' + name);
        if (it.qty >= MAX_QTY) sb[1].setAttribute('aria-disabled', 'true'); else sb[1].removeAttribute('aria-disabled');
        var num = st.querySelector('.rq__num');
        num.textContent = String(it.qty);
        num.setAttribute('aria-label', 'Количество ' + it.qty);
      }
      b.hidden = !!it;
      st.hidden = !it;
    });
    // возвращаем фокус на ту же кнопку после перерисовки списка
    if (focusKey && isOpen()) {
      var target = null;
      Array.prototype.forEach.call(listEl.querySelectorAll('button'), function (b) {
        if (b.getAttribute('data-act') + '|' + b.getAttribute('data-sku') === focusKey) target = b;
      });
      (target && target.getAttribute('aria-disabled') !== 'true' ? target : closeEl).focus();
    }
  }

  /* ---------- панель ---------- */
  function isOpen() { return panel.classList.contains('is-open'); }
  function open() {
    if (isOpen()) return;
    lastFocus = doc.activeElement;
    panel.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    doc.body.classList.add('rq-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
    closeEl.focus();
  }
  function close() {
    if (!isOpen()) return;
    panel.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    doc.body.classList.remove('rq-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (lastFocus && doc.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
    else if (toggle) toggle.focus();
  }
  function focusables() {
    return Array.prototype.filter.call(
      panel.querySelectorAll('a[href], button'),
      function (el) { return !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.hidden && el.offsetParent !== null; }
    );
  }

  /* ---------- действия ---------- */
  function add(sku, name) {
    var it = find(sku);
    if (it) {
      if (it.qty < MAX_QTY) it.qty += 1;
    } else if (items.length < MAX_ITEMS) {
      items.push({ sku: sku, name: name, qty: 1 });
    } else {
      announce('В корзине уже ' + MAX_ITEMS + ' позиций, добавить ещё нельзя');
      return;
    }
    save();
    render();
    announce('Добавлено в корзину: ' + name + '. Позиций в корзине: ' + items.length);
    if (toggle) {
      toggle.classList.remove('is-bump');
      void toggle.offsetWidth;
      toggle.classList.add('is-bump');
    }
  }
  function change(act, sku) {
    var it = find(sku);
    if (!it) return;
    var removed = false;
    if (act === 'inc' && it.qty < MAX_QTY) it.qty += 1;
    else if (act === 'dec' && it.qty > 1) it.qty -= 1;
    else if (act === 'dec' || act === 'del') { items = items.filter(function (x) { return x.sku !== sku; }); removed = true; }
    else return;
    save();
    render(removed ? '' : act + '|' + sku);
    announce(removed ? 'Убрано из корзины: ' + it.name : 'Количество ' + it.qty + ': ' + it.name);
    if (removed && isOpen()) (items.length ? panel.querySelector('.rq__del') || closeEl : closeEl).focus();
  }

  doc.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var addBtn = t.closest('[data-rq-add]');
    if (addBtn) {
      add(addBtn.getAttribute('data-sku'), addBtn.getAttribute('data-name'));
      return;
    }
    if (toggle && t.closest('[data-rq-toggle]')) {
      if (isOpen()) close(); else open();
      return;
    }
    if (t.closest('[data-rq-close]') || t.closest('[data-rq-backdrop]')) {
      close();
      return;
    }
    var act = t.closest('[data-act]');
    if (act && (panel.contains(act) || act.closest('.rq-stepper'))) {
      if (act.getAttribute('aria-disabled') !== 'true') {
        var inPage = !panel.contains(act);
        var actSku = act.getAttribute('data-sku');
        change(act.getAttribute('data-act'), actSku);
        if (inPage) {
          var back = find(actSku) ? act : doc.querySelector('[data-rq-add][data-sku="' + actSku + '"]');
          if (back && !back.hidden && back.focus) back.focus();
        }
      }
      return;
    }
    var cp = t.closest('[data-rq-copy]');
    if (cp) {
      var lab = cp.querySelector('span');
      copyText(listText()).then(function (done) {
        announce(done ? 'Список скопирован' : 'Не удалось скопировать список');
        if (lab) {
          lab.textContent = done ? 'Скопировано' : 'Не удалось';
          setTimeout(function () { lab.textContent = 'Скопировать список'; }, 1800);
        }
      });
      return;
    }
    if (t.closest('[data-rq-clear]')) {
      items = [];
      save();
      render();
      announce('Корзина очищена');
      closeEl.focus();
      return;
    }
    var send = t.closest('[data-rq-send]');
    if (send && panel.contains(send)) {
      if (!items.length || !email) e.preventDefault();
    }
  });

  doc.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    var f = focusables();
    if (!f.length) return;
    var first = f[0];
    var last = f[f.length - 1];
    if (e.shiftKey && (doc.activeElement === first || !panel.contains(doc.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (doc.activeElement === last || !panel.contains(doc.activeElement))) {
      e.preventDefault();
      first.focus();
    }
  });

  // синхронизация между вкладками
  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === null) {
      items = load();
      render();
    }
  });

  // Публичный вызов: перерисовать кнопки «В корзину» после динамической вставки (page-cta.js).
  window.wpgRqRefresh = function () { render(); };

  items = load();
  render();
})();
