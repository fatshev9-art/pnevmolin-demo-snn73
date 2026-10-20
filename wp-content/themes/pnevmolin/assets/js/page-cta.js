/* Страницы-тексты: призывы внутри текста, блок «Техника по теме», плавающая панель на компьютере.
   Ванильный JS, без форм, сервера и внешних запросов. Каталог читается из assets/catalog-lite.json той же темы.
   Адрес темы берётся из src этого скрипта, адрес сайта из ссылки логотипа: так он работает и в WordPress,
   и в статической копии на подпути, без перегенерации страниц. Подключается после request.js. */
(function () {
  'use strict';

  /* ================= определение темы страницы (чистая логика, её же гоняют из Node) ================= */

  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function tokens(s) { return norm(s).split(/[^a-zа-я0-9]+/).filter(Boolean); }

  // Основа слова: «ролик» значит «начинается с», «=vl» значит «слово целиком», «*лебед» значит «встречается внутри».
  function hasStem(toks, stems) {
    for (var i = 0; i < toks.length; i++) {
      for (var j = 0; j < stems.length; j++) {
        var st = stems[j];
        var c = st.charAt(0);
        if (c === '=') { if (toks[i] === st.slice(1)) return true; }
        else if (c === '*') { if (toks[i].indexOf(st.slice(1)) !== -1) return true; }
        else if (toks[i].indexOf(st) === 0) return true;
      }
    }
    return false;
  }
  function first(table, toks) {
    for (var i = 0; i < table.length; i++) if (hasStem(toks, table[i][1])) return table[i][0];
    return '';
  }

  // Что продаёт страница: вид техники.
  var KIND = [
    ['winch', ['*lebed', '*лебед', 'shpil', 'шпил']],
    ['roller', ['rolik', 'ролик', 'rastrub', 'раструб']],
    ['pusher', ['tolkat', 'толкат']],
    ['rigging', ['chul', 'чул', 'vertly', 'вертлюг', 'golovk', 'головк', 'razryv', 'разрыв', 'tros', 'трос', 'kanat', 'канат',
      'osnast', 'оснаст', 'takelazh', 'такелаж', 'smazk', 'смазк', 'lubrik', 'лубрикант']]
  ];
  // Где работают: техническая сцена. Порядок важен: оптика раньше труб, трубы раньше каналов.
  var TECH = [
    ['vols', ['vols', 'волс', 'optic', 'оптическ', 'оптик', 'zaduv', 'задув', 'mikrokabel', 'микрокабел', 'mikrotrub', 'микротруб',
      'pnevmo', 'пневмо', 'volokonn', 'волоконн']],
    ['vl', ['=vl', '=вл', '=lep', '=лэп', '=sip', '=сип', 'provod', 'провод', 'opor', 'опор', 'vozdush', 'воздуш', 'tormozn', 'тормозн']],
    ['water', ['podvod', 'подвод', 'reki', 'реки', 'reku', 'реку', 'vodn', 'водн']],
    ['cold', ['nizkikh', 'низких', 'temperatur', 'температур', 'moroz', 'мороз', 'zimn', 'зимн']],
    ['pipes', ['trub', 'труб', 'gnb', 'гнб', 'kanalizats', 'канализац', 'kolodts', 'колодц', 'skvazhin', 'скважин']],
    ['structures', ['kanal', 'канал', 'estakad', 'эстакад', 'lotk', 'lotok', 'лотк', 'лоток', 'tonnel', 'тоннел',
      'kollektor', 'коллектор', 'sooruzhen', 'сооружен']],
    ['trench', ['transhe', 'транше']]
  ];
  // Контекст страницы: раздел сайта. Порядок: доставка, сервис, обучение, расчёты, отрасли, о компании.
  var CTX = [
    ['delivery', ['dostavk', 'доставк']],
    ['service', ['servis', 'сервис', 'remont', 'ремонт', 'zapchast', 'запчаст', 'arend', 'аренд', 'obsluzh', 'обслуж', 'ekspluat', 'эксплуат']],
    ['training', ['obuchen', 'обучен', 'kurs', 'курс', 'instruktazh', 'инструктаж', 'baza', 'база', 'znaniy', 'знани', 'glossar', 'глоссар',
      'oshibk', 'ошибк', 'bezopasn', 'безопасн', 'normativ', 'норматив']],
    ['calc', ['raschet', 'расчет', 'dopustim', 'допустим', 'radius', 'радиус', 'podbor', 'подбор', 'vybor', 'выбор', 'dannye', 'данные',
      'komplekt', 'комплект', 'tipovye', 'типовые']],
    ['industry', ['=otrasli', '=отрасли']],
    ['company', ['kompan', 'компан', 'istori', 'истори', 'garanti', 'гаранти', 'vakans', 'вакан', '=faq', 'sertifikat', 'сертификат',
      'vystavk', 'выставк']]
  ];
  // Эти контексты задают текст призывов сами; техническая сцена и расчёты уступают им дорогу не всегда (см. sceneOf).
  var CORE = { delivery: 1, service: 1, training: 1, industry: 1, company: 1 };
  var ORDER = ['winch', 'roller', 'pusher', 'rigging'];

  function kindsOf(toks) {
    var out = [];
    for (var i = 0; i < KIND.length; i++) if (hasStem(toks, KIND[i][1])) out.push(KIND[i][0]);
    return out;
  }

  // info: {slug, h1, ancestors[], crumbs[]}. Источники по убыванию веса: слаг, h1, предки в адресе, крошки.
  function detect(info) {
    var srcs = [tokens(info.slug), tokens(info.h1), tokens((info.ancestors || []).join(' ')), tokens((info.crumbs || []).join(' '))];
    var ctx = '';
    var tech = '';
    var i;
    for (i = 0; i < srcs.length && !ctx; i++) ctx = first(CTX, srcs[i]);
    for (i = 0; i < srcs.length && !tech; i++) tech = first(TECH, srcs[i]);
    // Вид техники: сначала из слага. Из h1 только если у страницы нет технической сцены (в h1 про трубы часто мельком названы «лебёдка и оснастка»)
    // или страница из сервиса и обучения, где техника в h1 как раз предмет.
    var kinds = kindsOf(srcs[0]);
    if (!kinds.length && (!tech || CORE[ctx])) kinds = kindsOf(srcs[1]);
    var scene = 'general';
    if (ctx && CORE[ctx]) scene = ctx;
    else if (tech) scene = tech;
    else if (kinds.length === 1) scene = kinds[0];
    else if (ctx) scene = ctx;
    return { scene: scene, ctx: ctx, tech: tech, kinds: kinds, slugTokens: srcs[0] };
  }

  /* ---------- подбор товаров ---------- */

  // Комплекты под техническую сцену: [вид, предпочтение]. s: подкатегория, n: слово в названии.
  var SETS = {
    trench: [['winch', { s: 'dizel' }], ['roller', { n: /линейн/ }], ['pusher']],
    pipes: [['winch', { s: 'elektr' }], ['roller', { n: /вводн/ }], ['pusher']],
    structures: [['winch', { s: 'elektr' }], ['roller', { n: /углов|линейн/ }], ['pusher']],
    vl: [['winch', { s: 'dizel' }], ['roller'], ['rigging', { n: /вертлюг/ }]],
    vols: [['winch', { s: 'elektr' }], ['roller', { n: /вводн/ }], ['rigging', { n: /чуло|головк/ }]],
    water: [['winch', { s: 'dizel' }], ['roller'], ['rigging', { n: /разрывн/ }]],
    cold: [['winch', { s: 'dizel' }], ['pusher'], ['rigging']]
  };
  var GENERIC = [['winch'], ['roller'], ['pusher']];
  // Слова слага, уточняющие подбор внутри вида.
  var SLUG_PREF = {
    winch: [['dizel', { s: 'dizel' }], ['benzin', { s: 'benzin' }], ['=elektricheskie', { s: 'elektr' }], ['elektrolebed', { s: 'elektr' }]],
    roller: [['uglov', { n: /углов/ }], ['lineyn', { n: /линейн/ }], ['vvod', { n: /вводн/ }], ['lotk', { n: /линейн/ }]],
    rigging: [['chul', { n: /чуло/ }], ['vertly', { n: /вертлюг/ }], ['golovk', { n: /головк/ }], ['razryv', { n: /разрывн/ }],
      ['tros', { n: /канат/ }], ['kanat', { n: /канат/ }]]
  };

  function hash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }
  function prodKind(p) {
    return kindsOf(tokens(p.category))[0] || kindsOf(tokens(p.name))[0] || 'other';
  }
  function matches(p, pref) {
    if (!pref) return true;
    if (pref.s) return norm(p.subcategory + ' ' + p.category).indexOf(pref.s) !== -1;
    if (pref.n) return pref.n.test(norm(p.name));
    return true;
  }
  function ofKind(all, kind, pref) {
    var list = all.filter(function (p) { return prodKind(p) === kind; });
    if (pref) {
      var f = list.filter(function (p) { return matches(p, pref); });
      if (f.length) return f;
    }
    return list;
  }
  // Старт внутри ряда зависит от страницы и вида: разные страницы показывают разные позиции, одна страница всегда одни и те же.
  function start(seed, kind, n) { return n ? hash(seed + '|' + kind) % n : 0; }
  function pickOne(all, kind, pref, used, seed) {
    var list = ofKind(all, kind, pref);
    var s = start(seed, kind, list.length);
    for (var i = 0; i < list.length; i++) {
      var p = list[(s + i) % list.length];
      if (!used[p.sku]) { used[p.sku] = 1; return p; }
    }
    return null;
  }
  // Три позиции одного вида вразброс по ряду (разные мощности), с досыпкой из остального.
  function pickFocus(all, kind, pref, used, seed) {
    var list = ofKind(all, kind, pref);
    var whole = ofKind(all, kind, null);
    var out = [];
    var L = list.length;
    var s = start(seed, kind, L);
    var step = Math.max(1, Math.floor(L / 3));
    var i;
    for (i = 0; i < L && out.length < 3; i++) {
      var p = list[(s + i * step) % L];
      if (!used[p.sku]) { used[p.sku] = 1; out.push(p); }
    }
    for (i = 0; i < whole.length && out.length < 3; i++) {
      var q = whole[(start(seed, kind, whole.length) + i) % whole.length];
      if (!used[q.sku]) { used[q.sku] = 1; out.push(q); }
    }
    return out;
  }

  function prefFromSlug(kind, slugTokens, tech) {
    var table = SLUG_PREF[kind] || [];
    for (var i = 0; i < table.length; i++) if (hasStem(slugTokens, [table[i][0]])) return table[i][1];
    if (tech && SETS[tech]) {
      for (var j = 0; j < SETS[tech].length; j++) if (SETS[tech][j][0] === kind) return SETS[tech][j][1] || null;
    }
    return null;
  }

  // Возвращает {mode: focus|set|mix, kind, items[]}.
  function choose(all, d, seed) {
    var used = {};
    var items = [];
    var mode = 'set';
    var kind = '';
    var i;
    var kinds = d.kinds;
    if (d.scene === 'company' || d.scene === 'delivery' || (d.scene === 'service' && !kinds.length) || (d.scene === 'training' && !kinds.length && !d.tech)) {
      mode = 'mix';
      var shift = seed % ORDER.length;
      for (i = 0; i < 3; i++) {
        var one = pickOne(all, ORDER[(shift + i) % ORDER.length], null, used, seed + i);
        if (one) items.push(one);
      }
    } else if (kinds.length === 1) {
      mode = 'focus';
      kind = kinds[0];
      items = pickFocus(all, kind, prefFromSlug(kind, d.slugTokens, d.tech), used, seed);
    } else {
      var slots;
      if (kinds.length >= 2) {
        slots = kinds.slice(0, 3).map(function (k) { return [k, prefFromSlug(k, d.slugTokens, d.tech)]; });
        for (i = 0; i < ORDER.length && slots.length < 3; i++) {
          if (kinds.indexOf(ORDER[i]) === -1) slots.push([ORDER[i], null]);
        }
      } else {
        slots = SETS[d.tech] || GENERIC;
      }
      for (i = 0; i < slots.length; i++) {
        var s = pickOne(all, slots[i][0], slots[i][1], used, seed + i);
        if (s) items.push(s);
      }
    }
    for (i = 0; i < all.length && items.length < 3; i++) {
      var r = all[(seed + i) % all.length];
      if (!used[r.sku]) { used[r.sku] = 1; items.push(r); }
    }
    return { mode: mode, kind: kind, items: items };
  }

  /* ---------- тексты призывов: e после второго раздела, m в середине, z в конце ---------- */

  var COPY = {
    general: {
      e: ['Есть вопрос по этой теме?', 'Опишите трассу и кабель в письме: подскажем, какая техника подойдёт и что стоит проверить заранее.'],
      m: ['Не уверены, что подойдёт именно эта схема?', 'Пришлите длину, диаметр кабеля и повороты. По этим данным видно, хватит ли усилия и сколько роликов ставить.'],
      z: ['Разберём вашу трассу по цифрам', 'Напишите вводные по шаблону письма: вернём подборку техники с артикулами и вопросами, которые стоит закрыть до заказа.']
    },
    trench: {
      e: ['Какая лебёдка нужна под вашу траншею', 'Длина участка, масса и диаметр кабеля задают усилие. Пришлите эти цифры, и подскажем модель лебёдки и число линейных роликов.'],
      m: ['Траншея с поворотами или перепадами?', 'Углы, спуски в котлованы и переходы под дорогами меняют схему расстановки. Опишите трассу, прикинем, где нужны угловые ролики.'],
      z: ['Соберём комплект для раскатки в траншею', 'Лебёдка, ролики и оснастка: подберём по длине и кабелю и пришлём список с артикулами, чтобы заказать одним письмом.']
    },
    pipes: {
      e: ['Затяжка в трубу: что посчитать заранее', 'Диаметр и длина трубы, число изгибов и запас по усилию определяют лебёдку и вводные устройства. Напишите, какая у вас труба.'],
      m: ['Труба после ГНБ или с изгибами в колодцах?', 'Трение растёт с каждым поворотом. Пришлите схему перегона, прикинем усилие и подскажем, где поставить вводной ролик и разрывное звено.'],
      z: ['Подберём технику под вашу трубу', 'Укажите диаметр и длину перегона, тип кабеля и число колодцев. Ответим подборкой с артикулами.']
    },
    structures: {
      e: ['Протяжка по каналу, лотку или тоннелю', 'В стеснённых местах решают габариты лебёдки и шаг роликов. Расскажите, где проходит трасса и как к ней подобраться.'],
      m: ['Мало места и много поворотов', 'Угловые ролики и компактная лебёдка не всегда помещаются в колодец или на эстакаду. Пришлите размеры, подберём то, что войдёт.'],
      z: ['Подберём технику под вашу трассу в сооружении', 'Напишите длину, высоту прокладки и условия доступа. Вернём подборку техники с артикулами.']
    },
    vl: {
      e: ['Раскатка провода на опорах', 'Тяжение, длина пролёта и марка провода определяют лебёдку, блоки на траверсы и оснастку. Опишите линию письмом.'],
      m: ['Нужен подбор под участок воздушной линии?', 'Пришлите марку провода, длину анкерного участка и число опор: прикинем усилие и состав техники.'],
      z: ['Соберём комплект для раскатки на воздушной линии', 'Лебёдка, ролики и оснастка под ваш провод: подберём и пришлём список с артикулами.']
    },
    vols: {
      e: ['Прокладка оптики: с чего начать подбор', 'Тип кабеля, диаметр защитной трубы и длина перегона показывают, чем затягивать оптику: малой лебёдкой или задувкой.'],
      m: ['Длинный перегон или много колодцев?', 'Пришлите схему трассы и данные кабеля. Подскажем, где нужны вводные ролики и какая оснастка защитит оптику.'],
      z: ['Подберём технику под ваш участок ВОЛС', 'Напишите длину, диаметр трубы и тип кабеля. Ответим подборкой с артикулами.']
    },
    water: {
      e: ['Переход через водную преграду', 'Здесь важны запас по усилию и защита кабеля от перегрузки. Расскажите про ширину преграды, способ прокладки и кабель.'],
      m: ['Тянуть по дну или в трубе под руслом?', 'Схема определяет силу тяги и оснастку. Пришлите данные перехода, поможем выбрать лебёдку и разрывное звено.'],
      z: ['Подберём технику под ваш переход', 'Укажите длину, способ прокладки и параметры кабеля. Вернём подборку с артикулами.']
    },
    cold: {
      e: ['Работа зимой: что менять в комплекте', 'Мороз меняет и кабель, и привод лебёдки. Напишите температуру на объекте и тип кабеля, подскажем, на что смотреть.'],
      m: ['Кабель на морозе тянется иначе', 'Пришлите марку кабеля и ожидаемую температуру. Подскажем, какой запас по усилию и какая оснастка нужны.'],
      z: ['Подготовим комплект к зимней протяжке', 'Опишите трассу и условия работ. Вернём подборку техники с артикулами.']
    },
    winch: {
      e: ['Какая лебёдка подойдёт вам', 'Усилие, длина каната и привод выбирают по трассе и кабелю. Пришлите вводные, назовём подходящие модели из каталога.'],
      m: ['Хватит ли усилия на вашей трассе?', 'Длина, повороты и масса кабеля складываются в тяговое усилие. Пришлите цифры, проверим запас и подскажем модель.'],
      z: ['Подберём лебёдку под ваши данные', 'Напишите вводные по шаблону письма. Вернём модели с артикулами и уточняющие вопросы.']
    },
    roller: {
      e: ['Сколько роликов ставить на вашу трассу', 'Шаг, радиус поворота и вес кабеля определяют тип и число роликов. Пришлите схему трассы письмом.'],
      m: ['Повороты на трассе: чем вести кабель', 'Угловые ролики держат радиус изгиба. Напишите угол и диаметр кабеля, подскажем модель.'],
      z: ['Подберём ролики под вашу трассу', 'Укажите длину, повороты и кабель. Вернём список роликов с артикулами и подсказками по расстановке.']
    },
    pusher: {
      e: ['Нужен ли толкатель на вашей трассе', 'Толкатель подаёт кабель с торца и снимает нагрузку с троса. Опишите длину трассы и кабель, подскажем, стоит ли брать.'],
      m: ['Какое усилие подачи брать', 'Оно зависит от диаметра кабеля, длины трубы и числа изгибов. Пришлите вводные, посчитаем запас.'],
      z: ['Подберём толкатель под ваш кабель', 'Напишите вводные по шаблону письма. Вернём модели с артикулами.']
    },
    rigging: {
      e: ['Какая оснастка нужна для вашего кабеля', 'Чулок, головка, вертлюг и разрывное звено подбирают по диаметру кабеля и усилию. Напишите данные, подскажем набор.'],
      m: ['Чем соединить кабель с канатом', 'Способ крепления зависит от конструкции кабеля и нагрузки. Пришлите тип и диаметр кабеля, подскажем решение.'],
      z: ['Соберём набор оснастки под вашу протяжку', 'Укажите кабель и усилие. Вернём список с артикулами.']
    },
    calc: {
      e: ['Пришлите данные трассы, посчитаем вместе', 'Расчёт усилия и подбор техники начинаются с четырёх вводных: длина, диаметр кабеля, повороты и условия работ.'],
      m: ['Нет всех данных? Это нормально', 'Опишите, что известно. Подскажем, какие замеры сделать на объекте до заказа.'],
      z: ['Получите подбор по вашим цифрам', 'Заполните шаблон письма: вернём подборку техники с артикулами.']
    },
    service: {
      e: ['Нужна помощь с сервисом или запуском?', 'Опишите технику, её состояние и задачу. Подскажем, что делать: проверка, ремонт, запчасти или аренда на время проекта.'],
      m: ['Опишите проблему письмом', 'Модель, наработка и признак неисправности помогут понять, что нужно: диагностика, запчасти или замена узла.'],
      z: ['Напишите по сервису или аренде', 'Укажите технику и срок. Ответим по почте, что можно сделать.']
    },
    training: {
      e: ['Нужно обучить бригаду?', 'Напишите, сколько человек и на какой технике будут работать. Подскажем формат занятий и что стоит отработать.'],
      m: ['Вопрос по программе или формату', 'Расскажите, чем занимается бригада, и подскажем, какие темы взять первыми.'],
      z: ['Запросите программу обучения', 'Укажите технику и число участников. Вернём подходящий формат.']
    },
    industry: {
      e: ['Работаете в этой отрасли?', 'Опишите свои объекты и задачи: подберём технику, которая подходит для таких трасс.'],
      m: ['Типовой комплект под вашу отрасль', 'Назовите длину трасс и тип кабеля. Предложим комплект и покажем, что можно заказать сразу.'],
      z: ['Подберём технику для вашего объекта', 'Напишите вводные по шаблону письма. Вернём подборку с артикулами.']
    },
    delivery: {
      e: ['Нужна доставка в ваш город?', 'Напишите город и список техники: уточним условия и сроки поставки по почте.'],
      m: ['Условия доставки считаем по запросу', 'Город, состав заказа и удобный способ получения помогут назвать условия без лишней переписки.'],
      z: ['Запросите условия поставки', 'Укажите город, технику и количество. Ответим письмом.']
    },
    company: {
      e: ['Остались вопросы?', 'Расскажите, что нужно подобрать, проверить или узнать, и мы ответим по почте.'],
      m: ['Пишите на почту, ответим письмом', 'Опишите задачу своими словами: трасса, кабель, сроки. Остальное уточним.'],
      z: ['Расскажите о вашей задаче', 'Опишите задачу и приложите, что есть: схему, длину трассы, марку кабеля.']
    }
  };
  var CAP = { e: 'Вопрос по странице', m: 'Подбор по вашим данным', z: 'Следующий шаг' };
  var KIND_LABEL = { winch: 'лебёдки', roller: 'ролики', pusher: 'толкатели', rigging: 'оснастка' };
  var SCHEMA = { winch: 'winch', roller: 'roller', pusher: 'pipe', rigging: 'drum', other: 'drum' };

  var api = { norm: norm, tokens: tokens, detect: detect, choose: choose, hash: hash, prodKind: prodKind, COPY: COPY };
  if (typeof module === 'object' && module && module.exports) { module.exports = api; return; }

  /* ================= DOM ================= */

  var doc = document;
  var cur = doc.currentScript || doc.querySelector('script[src*="page-cta.js"]');
  var SRC = (cur && cur.src) || '';
  var prose = doc.querySelector('article.doc:not(.catalog) .prose');
  var h1El = doc.querySelector('.doc__h1');
  if (!prose || !h1El || doc.body.classList.contains('wpg-stub') || prose.hasAttribute('data-pcta')) return;
  prose.setAttribute('data-pcta', '1');

  var NS = 'http://www.w3.org/2000/svg';
  var panel = doc.getElementById('rq');
  var hasCart = !!panel && !!doc.querySelector('[data-rq-toggle]');
  var h1 = (h1El.textContent || '').replace(/\s+/g, ' ').trim();

  function mailtoAddr() {
    var a = doc.querySelector('a[href^="mailto:"]');
    return a ? a.getAttribute('href').slice(7).split('?')[0] : '';
  }
  var email = (panel && panel.getAttribute('data-email')) || mailtoAddr();
  if (!email) return;
  var brandEl = doc.querySelector('.logo__word');
  var brand = (panel && panel.getAttribute('data-brand')) || (brandEl ? brandEl.textContent.trim() : '');

  function themeBase() {
    try { return new URL('../../', SRC).href; } catch (e) { return ''; }
  }
  var THEME = themeBase();

  function siteBase() {
    // 1) ссылка логотипа на главную, 2) <base>, 3) адрес темы до /wp-content/ (канонический адрес не берём: в копии он ведёт на другой хост)
    var u = null;
    try {
      var logo = doc.querySelector('a.logo[href]');
      var base = doc.querySelector('base[href]');
      if (logo) u = new URL(logo.getAttribute('href'), location.href);
      else if (base) u = new URL(base.getAttribute('href'), location.href);
    } catch (e) { u = null; }
    if (!u) {
      var mm = THEME.match(/^(.*?)\/wp-content\//);
      return (mm ? mm[1] : location.origin) + '/';
    }
    return u.origin + (u.pathname.slice(-1) === '/' ? u.pathname : u.pathname + '/');
  }
  var BASE = siteBase();

  function pageInfo() {
    var basePath = '/';
    try { basePath = new URL(BASE).pathname; } catch (e) { basePath = '/'; }
    var path = location.pathname;
    var rel = path.indexOf(basePath) === 0 ? path.slice(basePath.length) : path.replace(/^\//, '');
    var segs = rel.split('/').filter(Boolean).map(function (s) { try { return decodeURIComponent(s); } catch (e) { return s; } });
    var crumbs = [];
    var items = doc.querySelectorAll('.crumbs li');
    for (var i = 1; i < items.length - 1; i++) crumbs.push(items[i].textContent || '');
    return { slug: segs[segs.length - 1] || '', ancestors: segs.slice(0, -1), h1: h1, crumbs: crumbs, path: segs.join('/') };
  }
  var info = pageInfo();
  var found = detect(info);
  var seed = hash(info.path || h1);
  var copy = COPY[found.scene] || COPY.general;

  /* ---------- письмо с заготовкой ---------- */
  function mailHref() {
    var lines = [
      'Здравствуйте!',
      '',
      'Пишу с сайта' + (brand ? ' «' + brand + '»' : '') + ': подскажите, пожалуйста, какое оборудование подойдёт под мою задачу.',
      '',
      'Длина трассы: ',
      'Кабель и диаметр: ',
      'Количество и радиус поворотов: ',
      'Город и условия поставки: ',
      'Контакт: '
    ];
    return 'mailto:' + email + '?subject=' + encodeURIComponent('Вопрос по странице: ' + h1) + '&body=' + encodeURIComponent(lines.join('\r\n'));
  }
  var MAIL = mailHref();

  /* ---------- сборка узлов ---------- */
  function mk(tag, cls, text) {
    var el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    return el;
  }
  function icon(d, sw) {
    var s = doc.createElementNS(NS, 'svg');
    s.setAttribute('class', 'i');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('focusable', 'false');
    var p = doc.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', sw || '1.6');
    s.appendChild(p);
    return s;
  }
  var ICON_MAIL = 'M3 5.5h18v13H3z M3.5 6l8.5 7 8.5-7';
  var ICON_PLUS = 'M12 5v14M5 12h14';
  var ICON_CLOSE = 'm5 5 14 14M19 5 5 19';
  var ICON_LIST = 'M6 4h12v16H6z M9.5 9h5M9.5 13h5M9.5 17h2.5';

  function mailBtn(label, cls) {
    var a = mk('a', 'btn btn--accent ' + (cls || ''));
    a.href = MAIL;
    a.appendChild(icon(ICON_MAIL));
    a.appendChild(mk('span', '', label));
    return a;
  }

  function buildCta(pos) {
    var c = copy[pos];
    var id = 'pcta-' + pos + '-t';
    var box = mk('div', 'pcta pcta--' + pos);
    box.setAttribute('role', 'group');
    box.setAttribute('aria-labelledby', id);
    var txt = mk('div', 'pcta__txt');
    txt.appendChild(mk('p', 'pcta__cap', CAP[pos]));
    var t = mk('p', 'pcta__t', c[0]);
    t.id = id;
    txt.appendChild(t);
    txt.appendChild(mk('p', 'pcta__p', c[1]));
    var act = mk('div', 'pcta__act');
    act.appendChild(mailBtn('Написать на email', 'pcta__btn'));
    if (pos === 'z' && hasCart) {
      var more = mk('a', 'btn btn--line pcta__btn', 'Смотреть каталог');
      more.href = BASE + 'katalog/';
      act.appendChild(more);
    }
    box.appendChild(txt);
    box.appendChild(act);
    return box;
  }

  function buildTech(res, all) {
    var sec = mk('section', 'ptech');
    sec.setAttribute('aria-labelledby', 'ptech-t');
    var h = mk('h3', 'ptech__t', 'Техника по теме');
    h.id = 'ptech-t';
    sec.appendChild(h);
    var lead = res.mode === 'focus'
      ? 'Позиции каталога: ' + (KIND_LABEL[res.kind] || 'техника') + '.'
      : (res.mode === 'mix' ? 'Три категории каталога.' : 'Позиции каталога под тему страницы.');
    sec.appendChild(mk('p', 'ptech__lead', lead + (hasCart ? ' Добавьте нужные в корзину и отправьте список одним письмом.' : '')));
    var ul = mk('ul', 'ptech__list');
    res.items.forEach(function (p) {
      var url = BASE + p.path;
      var li = mk('li', 'ptech__item');
      var fig = mk('div', 'ptech__fig');
      var fl = mk('a', 'ptech__figlink');
      fl.href = url;
      fl.tabIndex = -1;
      fl.setAttribute('aria-hidden', 'true');
      var img = doc.createElement('img');
      img.alt = '';
      img.width = 320;
      img.height = 240;
      img.loading = 'lazy';
      img.decoding = 'async';
      var schema = THEME + 'assets/img/schema-' + (SCHEMA[prodKind(p)] || 'drum') + '.svg';
      if (p.image) {
        var base480 = THEME + 'assets/img/' + p.image.replace(/\.webp$/, '-480.webp');
        var base960 = THEME + 'assets/img/' + p.image.replace(/\.webp$/, '-960.webp');
        img.src = base480;
        img.srcset = base480 + ' 480w, ' + base960 + ' 960w';
        img.sizes = '(max-width: 700px) 92vw, 320px';
        img.onerror = function () { img.onerror = null; img.removeAttribute('srcset'); img.className = 'fig-schema'; img.src = schema; };
      } else {
        img.className = 'fig-schema';
        img.src = schema;
      }
      fl.appendChild(img);
      fig.appendChild(fl);
      var body = mk('div', 'ptech__body');
      body.appendChild(mk('div', 'pcard__sku', p.sku));
      var nm = mk('div', 'ptech__name');
      var a = mk('a', '', p.name);
      a.href = url;
      nm.appendChild(a);
      body.appendChild(nm);
      li.appendChild(fig);
      li.appendChild(body);
      if (hasCart) {
        var act = mk('div', 'ptech__act');
        var b = mk('button', 'btn btn--accent btn--sm');
        b.type = 'button';
        b.setAttribute('data-rq-add', '');
        b.setAttribute('data-sku', p.sku);
        b.setAttribute('data-name', p.name);
        b.setAttribute('aria-label', 'В корзину: ' + p.name + ', артикул ' + p.sku);
        b.hidden = true;
        b.appendChild(icon(ICON_PLUS, '1.8'));
        b.appendChild(mk('span', '', 'В корзину'));
        act.appendChild(b);
        li.appendChild(act);
      }
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    if (hasCart) {
      var more = mk('a', 'more ptech__more', 'Весь каталог');
      more.href = BASE + (all.length ? all[0].path.split('/')[0] : 'katalog') + '/';
      sec.appendChild(more);
    }
    return sec;
  }

  /* ---------- места вставки: границы между разделами (перед очередным h2) ---------- */
  var heads = Array.prototype.filter.call(prose.children, function (el) { return el.tagName === 'H2'; });
  var N = heads.length;
  var techAnchor = null;
  var endAnchor = null;

  function putBefore(h2, node) { h2.parentNode.insertBefore(node, h2); }

  if (N >= 3) {
    putBefore(heads[2], buildCta('e'));
    if (N >= 6) {
      var midIdx = Math.max(Math.floor(N / 2), 5);
      putBefore(heads[midIdx], buildCta('m'));
      var techIdx = Math.max(midIdx + 2, Math.round(N * 0.75));
      if (techIdx <= N - 1) techAnchor = heads[techIdx];
    }
    var endCta = buildCta('z');
    prose.appendChild(endCta);
    endAnchor = endCta;
  }

  function placeTech(node) {
    if (techAnchor) putBefore(techAnchor, node);
    else if (endAnchor) prose.insertBefore(node, endAnchor);
    else prose.appendChild(node);
  }

  if (N >= 3) {
    // каталог не блокирует остальное: нет файла или нет сети, блок просто не появится
    var url = THEME + 'assets/catalog-lite.json';
    if (THEME && window.fetch) {
      window.fetch(url, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('catalog')); })
        .then(function (all) {
          if (!Array.isArray(all) || all.length < 3) return;
          var res = choose(all, found, seed);
          if (!res.items.length) return;
          placeTech(buildTech(res, all));
          if (typeof window.wpgRqRefresh === 'function') window.wpgRqRefresh();
        })
        .catch(function () { /* без каталога остаются призывы */ });
    }
  }

  /* ---------- плавающая панель (компьютер, от 1000 px) ---------- */
  var KEY_OFF = 'wpg_pcta_off';
  var closed = false;
  try { closed = window.sessionStorage.getItem(KEY_OFF) === '1'; } catch (e) { closed = false; }
  var mq = window.matchMedia ? window.matchMedia('(min-width: 1000px)') : null;

  if (mq && !closed) {
    var bar = mk('div', 'pbar');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Быстрые действия');
    var inner = mk('div', 'wrap pbar__in');
    inner.appendChild(mk('p', 'pbar__t', 'Опишите трассу, подберём технику'));
    inner.appendChild(mailBtn('Подобрать технику', 'btn--sm pbar__btn'));
    var cartNum = null;
    var cartBtn = null;
    if (hasCart) {
      cartBtn = mk('button', 'btn btn--line btn--sm pbar__btn pbar__cart');
      cartBtn.type = 'button';
      cartBtn.setAttribute('data-rq-toggle', '');
      cartBtn.setAttribute('aria-controls', 'rq');
      cartBtn.setAttribute('aria-haspopup', 'dialog');
      cartBtn.appendChild(icon(ICON_LIST));
      var lab = mk('span', '', 'Корзина (');
      cartNum = mk('span', '', '0');
      lab.appendChild(cartNum);
      lab.appendChild(doc.createTextNode(')'));
      cartBtn.appendChild(lab);
      inner.appendChild(cartBtn);
    }
    var x = mk('button', 'pbar__x');
    x.type = 'button';
    x.setAttribute('aria-label', 'Закрыть панель');
    x.appendChild(icon(ICON_CLOSE));
    inner.appendChild(x);
    bar.appendChild(inner);
    doc.body.appendChild(bar);

    // счётчик берём у кнопки корзины в шапке и следим за его изменениями
    var countSrc = doc.querySelector('[data-rq-count]');
    var syncCount = function () {
      if (!cartNum) return;
      var n = countSrc ? (countSrc.textContent || '0').trim() : '0';
      cartNum.textContent = n;
      cartBtn.setAttribute('aria-label', 'Корзина, позиций: ' + n);
    };
    if (cartNum) {
      syncCount();
      if (countSrc && window.MutationObserver) {
        new window.MutationObserver(syncCount).observe(countSrc, { childList: true, characterData: true, subtree: true });
      }
    }

    var footVisible = false;
    var ticking = false;
    var update = function () {
      var y = window.pageYOffset || doc.documentElement.scrollTop || 0;
      bar.classList.toggle('is-on', !closed && mq.matches && y > 700 && !footVisible);
    };
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { ticking = false; update(); });
    };
    var foot = doc.querySelector('.foot');
    if (foot && window.IntersectionObserver) {
      // подвал заходит в экран с запасом на высоту панели: панель к этому моменту уже убрана
      new window.IntersectionObserver(function (es) {
        footVisible = es[0].isIntersecting;
        update();
      }, { rootMargin: '0px 0px 96px 0px' }).observe(foot);
    }
    x.addEventListener('click', function () {
      closed = true;
      try { window.sessionStorage.setItem(KEY_OFF, '1'); } catch (e) { /* без хранилища панель вернётся после перезагрузки */ }
      update();
      var main = doc.getElementById('main');
      if (main && main.focus) main.focus({ preventScroll: true });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }
})();
