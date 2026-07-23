/* ============================================================
   FS — محرّك سيستم المبيعات
   تتبّع + تخزين + تجميع أرقام + تحكّم الأونر
   يشتغل من غير سيرفر (localStorage) — ولو حطيت endpoint بيبعت هناك كمان
   ============================================================ */
(function (w) {
  "use strict";

  var K = {
    ev: "fsys.events.v1",
    ord: "fsys.orders.v1",
    rev: "fsys.reviews.v1",
    cus: "fsys.customers.v1",
    loy: "fsys.loyalty.v1",
    ctl: "fsys.control.v1",
    seed: "fsys.seeded.v1",
    cart: "fsys.cart.v1",
    cid: "fsys.cid.v1",
    theme: "fsys.theme.v1"
  };

  /* ---------------- تخزين ---------------- */
  function get(k, d) {
    try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
    catch (e) { return d; }
  }
  function set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { return false; }
  }

  /* ---------------- بث لحظي بين التابات ---------------- */
  var chan = null;
  try { chan = new BroadcastChannel("fsys"); } catch (e) { }
  function emit(type, data) {
    if (chan) { try { chan.postMessage({ type: type, data: data }); } catch (e) { } }
  }
  function onMsg(fn) {
    if (chan) chan.onmessage = function (e) { fn(e.data || {}); };
    w.addEventListener("storage", function (e) {
      if (e.key === K.ev || e.key === K.ord || e.key === K.ctl) fn({ type: "sync" });
    });
  }

  /* ---------------- فهرسة المنيو ---------------- */
  var ITEMS = [];       // كل الأصناف مسطّحة
  var BYNAME = {};
  function buildIndex() {
    ITEMS = []; BYNAME = {};
    (w.MENU.sections || []).forEach(function (s) {
      (s.cats || []).forEach(function (c) {
        (c.items || []).forEach(function (it) {
          var price = it.p != null ? it.p
            : (it.s || []).filter(function (x) { return x != null; })[0] || 0;
          var rec = {
            n: it.n, price: price, raw: it,
            sec: s.id, secTitle: s.title, cat: c.id, catTitle: c.title,
            sized: !!s.sized && !!it.s, isNew: !!c.isNew
          };
          ITEMS.push(rec);
          if (!BYNAME[it.n]) BYNAME[it.n] = rec;
        });
      });
    });
  }

  /* ---------------- عشوائية ثابتة (نفس الأرقام كل مرة) ---------------- */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }
  function rngFrom(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------------- وزن الشعبية (بيخلق long-tail حقيقي) ---------------- */
  function weightOf(rec) {
    var S = w.SALES.badges;
    var base = (hash(rec.n) % 1000) / 1000;      // 0..1 ثابت لكل صنف
    var W = Math.pow(base, 3) * 12 + 0.06;        // أغلب الأصناف ضعيفة، وشوية أقوياء
    if (S.hot.indexOf(rec.n) > -1) W += 9;
    if (S.chef.indexOf(rec.n) > -1) W += 4;
    if (S.profit.indexOf(rec.n) > -1) W += 3;
    if (rec.isNew) W += 1.5;
    if (rec.sec === "extras") W *= 0.35;          // الإضافات بتتشاف أقل كصفحة
    if (rec.price > 70) W *= 0.25;                // العائلي أقل طلبًا
    return W;
  }

  function pickWeighted(rnd, pool, totalW) {
    var r = rnd() * totalW, acc = 0;
    for (var i = 0; i < pool.length; i++) {
      acc += pool[i].w;
      if (r <= acc) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /* ---------------- توليد بيانات العرض (٣٠ يوم) ---------------- */
  var HOUR_W = [.2,.1,.05,.05,.05,.05,.1,.3,.6,.8,1,1.6,2.4,3.2,2.8,1.9,1.8,2.4,3.4,4.6,5,4.4,3,1.2];
  var DOW_W  = [1,.85,.85,.9,1.15,1.45,1.35];  // الأحد..السبت

  function seedDemo(days) {
    days = days || 30;
    var pool = ITEMS.map(function (r) { return { r: r, w: weightOf(r) }; });
    var totalW = pool.reduce(function (a, b) { return a + b.w; }, 0);
    var rnd = rngFrom(20260722);
    var NAMES = ["فهد", "سلطان", "عبدالله", "محمد", "خالد", "نورة", "سارة", "العنود", "ريم", "مشعل"];
    var evs = [], orders = [], reviews = [], customers = [];
    var now = new Date(); now.setMinutes(0, 0, 0);
    var addonsOf = function (sec) { return w.SALES.addons[sec] || w.SALES.addons._default; };

    for (var d = days - 1; d >= 0; d--) {
      var day = new Date(now.getTime() - d * 86400000);
      var dowW = DOW_W[day.getDay()];
      var visits = Math.round((44 + rnd() * 26) * dowW);
      for (var v = 0; v < visits; v++) {
        // اختيار ساعة حسب توزيع الذروة
        var hTot = HOUR_W.reduce(function (a, b) { return a + b; }, 0);
        var hr = 0, acc = 0, rr = rnd() * hTot;
        for (var i = 0; i < 24; i++) { acc += HOUR_W[i]; if (rr <= acc) { hr = i; break; } }
        var t = new Date(day); t.setHours(hr, Math.floor(rnd() * 60), 0, 0);
        if (t > now) continue;
        var ts = t.getTime();
        var vid = "v" + ts + "_" + v;

        evs.push({ t: ts, e: "visit", vid: vid, demo: 1 });
        if (rnd() < 0.23) continue;              // فتح وخرج من غير ما يفتح صنف

        // مشاهدات أصناف
        var views = 1 + Math.floor(rnd() * 4);
        var seen = [];
        for (var k = 0; k < views; k++) {
          var pick = pickWeighted(rnd, pool, totalW).r;
          seen.push(pick);
          evs.push({ t: ts + k * 40000, e: "item_view", vid: vid, n: pick.n, sec: pick.sec, p: pick.price, demo: 1 });
        }

        // إضافة للسلة
        if (rnd() < 0.34 && seen.length) {
          var main = seen[Math.floor(rnd() * seen.length)];
          var lines = [{ n: main.n, p: main.price, q: 1, sec: main.sec }];
          evs.push({ t: ts + 200000, e: "add_cart", vid: vid, n: main.n, sec: main.sec, p: main.price, demo: 1 });

          // الأب-سيل اتعرض
          evs.push({ t: ts + 205000, e: "upsell_shown", vid: vid, n: main.n, demo: 1 });
          var upRev = 0;
          if (rnd() < 0.41) {                       // قبِل الاقتراح
            var pr = (w.SALES.pairings[main.sec] || w.SALES.pairings._default);
            var sug = BYNAME[pr[Math.floor(rnd() * pr.length)]];
            if (sug) {
              lines.push({ n: sug.n, p: sug.price, q: 1, sec: sug.sec, up: 1 });
              upRev += sug.price;
              evs.push({ t: ts + 210000, e: "upsell_accept", vid: vid, n: sug.n, p: sug.price, demo: 1 });
            }
          }
          // إضافات مدفوعة
          var adRev = 0;
          if (rnd() < 0.30) {
            var ads = addonsOf(main.sec);
            var ad = ads[Math.floor(rnd() * ads.length)];
            adRev += ad.p;
            lines.push({ n: "إضافة " + ad.n, p: ad.p, q: 1, sec: main.sec, addon: 1 });
            evs.push({ t: ts + 215000, e: "addon_add", vid: vid, n: ad.n, p: ad.p, demo: 1 });
          }

          // إرسال الطلب
          if (rnd() < 0.62) {
            var total = lines.reduce(function (a, l) { return a + l.p * l.q; }, 0);
            var oid = "D" + (1001 + orders.length);
            var omode = rnd() < .5 ? "محلي" : (rnd() < .6 ? "توصيل" : "سفري");
            orders.push({
              id: oid, t: ts + 260000, lines: lines, total: total,
              up: upRev, addon: adRev,
              mode: omode,
              table: omode === "محلي" ? 1 + Math.floor(rnd() * w.SALES.order.tables) : null,
              demo: 1
            });
            evs.push({ t: ts + 260000, e: "order", vid: vid, v: total, up: upRev, ad: adRev, demo: 1 });

            // تقييم
            if (rnd() < 0.22) {
              var st = rnd() < 0.78 ? 5 : (rnd() < 0.6 ? 4 : (rnd() < .6 ? 3 : 2));
              reviews.push({
                t: ts + 900000, stars: st, demo: 1,
                note: st <= 3 ? ["الطلب تأخر شوي", "البطاطس وصلت باردة", "الطلب كان ناقص صنف"][Math.floor(rnd() * 3)] : "",
                sent: st >= 4 ? "google" : "owner"
              });
            }
            // بيانات عميل
            if (rnd() < 0.18) {
              customers.push({
                t: ts + 300000, demo: 1,
                phone: "05" + [0, 3, 5, 6][Math.floor(rnd() * 4)] + String(Math.floor(rnd() * 10000000)).padStart(7, "0"),
                name: NAMES[Math.floor(rnd() * 10)],
                spent: total
              });
            }
          }
        }
      }
    }
    evs.sort(function (a, b) { return a.t - b.t; });
    orders.sort(function (a, b) { return a.t - b.t; });
    // حالات الأوردرات التجريبية: كلها اتسلمت، وشوية ملغية، وآخر اتنين لسه شغالين عشان الصفحة تبان حية
    orders.forEach(function (o) {
      o.status = rnd() < 0.02 ? "cancel" : "done";
      o.seen = true;
      if (rnd() < 0.4) {
        o.name = NAMES[Math.floor(rnd() * 10)];
        o.phone = "05" + [0, 3, 5, 6][Math.floor(rnd() * 4)] + String(Math.floor(rnd() * 10000000)).padStart(7, "0");
      }
      if (o.mode === "توصيل") o.addr = ["حي النرجس — شارع أنس بن مالك", "حي الياسمين — طريق الملك عبدالعزيز", "حي الملقا — شارع الثمامة", "حي قرطبة — الدائري الشرقي"][Math.floor(rnd() * 4)];
    });
    if (orders.length > 1) {
      orders[orders.length - 1].status = "new";
      orders[orders.length - 2].status = "prep";
    }
    set(K.ev, evs); set(K.ord, orders); set(K.rev, reviews); set(K.cus, customers);
    set(K.seed, { v: 3, at: Date.now(), days: days });
  }

  /* ---------------- تتبّع حقيقي ---------------- */
  /* معرّف الزيارة: بيتجدّد كل جلسة عشان القمع يتحسب صح */
  function cid() {
    var c = null;
    try { c = sessionStorage.getItem(K.cid); } catch (e) { }
    if (!c) {
      c = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { sessionStorage.setItem(K.cid, c); } catch (e) { }
    }
    return c;
  }
  function track(e, payload) {
    var row = Object.assign({ t: Date.now(), e: e, vid: cid() }, payload || {});
    var evs = get(K.ev, []);
    evs.push(row);
    if (evs.length > 20000) evs = evs.slice(-20000);
    set(K.ev, evs);
    emit("event", row);
    var url = w.SALES.endpoint;
    if (url) {
      try {
        var b = new Blob([JSON.stringify(row)], { type: "text/plain;charset=UTF-8" });
        navigator.sendBeacon(url, b);
      } catch (err) { }
    }
    return row;
  }
  function pushOrder(order) {
    if (!order.status) order.status = "new";
    if (order.seen == null) order.seen = false;
    var o = get(K.ord, []); o.push(order); set(K.ord, o);
    track("order", { v: order.total, up: order.up, ad: order.addon });
    emit("order", order);
  }
  function setOrderStatus(id, st) {
    var o = get(K.ord, []), hit = null;
    o.forEach(function (x) { if (x.id === id) { x.status = st; x.seen = true; hit = x; } });
    if (hit) { set(K.ord, o); emit("order_update", hit); }
    return hit;
  }
  function markAllSeen() {
    var o = get(K.ord, []), dirty = false;
    o.forEach(function (x) { if (!x.seen) { x.seen = true; dirty = true; } });
    if (dirty) set(K.ord, o);
    return dirty;
  }
  function pushReview(r) { var a = get(K.rev, []); a.push(r); set(K.rev, a); emit("review", r); }
  function pushCustomer(c) { var a = get(K.cus, []); a.push(c); set(K.cus, a); emit("customer", c); }

  /* ---------------- تحكّم الأونر ---------------- */
  function control() {
    return Object.assign({
      soldOut: [],          // أسماء أصناف نفدت
      prices: {}            // { "اسم الصنف": سعر جديد }
    }, get(K.ctl, {}));
  }
  function saveControl(c) { set(K.ctl, c); emit("control", c); }

  /* ---------------- التجميع (أرقام اللوحة) ---------------- */
  function agg(days, includeDemo) {
    days = days || 30;
    var since = Date.now() - days * 86400000;
    var evs = get(K.ev, []).filter(function (r) { return r.t >= since && (includeDemo || !r.demo); });
    var ords = get(K.ord, []).filter(function (r) { return r.t >= since && (includeDemo || !r.demo); });
    var revs = get(K.rev, []).filter(function (r) { return r.t >= since && (includeDemo || !r.demo); });
    var cus = get(K.cus, []).filter(function (r) { return r.t >= since && (includeDemo || !r.demo); });

    // الملغي مش بيتحسب في الإيراد ولا عدد الأوردرات
    var act = ords.filter(function (x) { return (x.status || "done") !== "cancel"; });

    var o = {
      days: days, events: evs.length,
      visits: 0, itemViews: 0, addCart: 0, orders: act.length,
      revenue: 0, upRevenue: 0, addonRevenue: 0,
      upShown: 0, upAccept: 0,
      byHour: new Array(24).fill(0),
      byDow: new Array(7).fill(0),
      byDay: {},
      viewsByItem: {}, ordersByItem: {}, revByItem: {},
      viewsBySection: {}, revBySection: {},
      reviews: revs, customers: cus, orderList: ords
    };
    var vViewed = {}, vCarted = {}, vAll = {};

    evs.forEach(function (r) {
      if (r.vid) {
        vAll[r.vid] = 1;
        if (r.e === "item_view") vViewed[r.vid] = 1;
        if (r.e === "add_cart") vCarted[r.vid] = 1;
      }
      var d = new Date(r.t);
      if (r.e === "visit") {
        o.visits++;
        o.byHour[d.getHours()]++;
        o.byDow[d.getDay()]++;
        var key = d.toISOString().slice(0, 10);
        o.byDay[key] = (o.byDay[key] || 0) + 1;
      }
      else if (r.e === "item_view") {
        o.itemViews++;
        o.viewsByItem[r.n] = (o.viewsByItem[r.n] || 0) + 1;
        if (r.sec) o.viewsBySection[r.sec] = (o.viewsBySection[r.sec] || 0) + 1;
      }
      else if (r.e === "add_cart") o.addCart++;
      else if (r.e === "upsell_shown") o.upShown++;
      else if (r.e === "upsell_accept") o.upAccept++;
    });

    act.forEach(function (od) {
      o.revenue += od.total || 0;
      o.upRevenue += od.up || 0;
      o.addonRevenue += od.addon || 0;
      (od.lines || []).forEach(function (l) {
        o.ordersByItem[l.n] = (o.ordersByItem[l.n] || 0) + (l.q || 1);
        o.revByItem[l.n] = (o.revByItem[l.n] || 0) + (l.p * (l.q || 1));
        if (l.sec) o.revBySection[l.sec] = (o.revBySection[l.sec] || 0) + (l.p * (l.q || 1));
      });
    });

    // القمع بالزوار المختلفين مش بعدد الأحداث
    o.fVisits = Math.max(o.visits, Object.keys(vAll).length);
    o.fViewed = Object.keys(vViewed).length;
    o.fCarted = Object.keys(vCarted).length;

    o.avgTicket = o.orders ? Math.round(o.revenue / o.orders) : 0;
    o.upRate = o.upShown ? Math.round(o.upAccept / o.upShown * 100) : 0;
    o.convRate = o.visits ? Math.round(o.orders / o.visits * 100) : 0;
    o.perDayVisits = Math.round(o.visits / days);
    o.perDayRevenue = Math.round(o.revenue / days);

    // ترتيب الأصناف
    o.top = Object.keys(o.viewsByItem)
      .map(function (n) {
        return {
          n: n, views: o.viewsByItem[n],
          orders: o.ordersByItem[n] || 0,
          rev: o.revByItem[n] || 0,
          price: (BYNAME[n] && BYNAME[n].price) || 0,
          sec: (BYNAME[n] && BYNAME[n].secTitle) || ""
        };
      })
      .sort(function (a, b) { return b.views - a.views; });

    // الأصناف الميتة: صفر مشاهدة وصفر طلب
    o.dead = ITEMS.filter(function (r) {
      return !o.viewsByItem[r.n] && !o.ordersByItem[r.n];
    }).map(function (r) {
      return { n: r.n, price: r.price, sec: r.secTitle, cat: r.catTitle };
    });

    // اتشاف كتير ومحدش طلبه = مشكلة سعر / وصف / صورة
    o.leak = o.top.filter(function (r) { return r.views >= 8 && r.orders / r.views < 0.06; })
      .sort(function (a, b) { return b.views - a.views; }).slice(0, 8);

    o.topRev = Object.keys(o.revByItem).map(function (n) {
      return { n: n, rev: o.revByItem[n], q: o.ordersByItem[n] || 0 };
    }).sort(function (a, b) { return b.rev - a.rev; });

    return o;
  }

  /* ---------------- مساعدات ---------------- */
  function money(v) { return Math.round(v).toLocaleString("en-US"); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  w.FS = {
    K: K, get: get, set: set, emit: emit, onMsg: onMsg,
    items: function () { return ITEMS; }, byName: function (n) { return BYNAME[n]; },
    buildIndex: buildIndex, seedDemo: seedDemo, track: track,
    pushOrder: pushOrder, pushReview: pushReview, pushCustomer: pushCustomer,
    setOrderStatus: setOrderStatus, markAllSeen: markAllSeen,
    control: control, saveControl: saveControl, agg: agg,
    money: money, esc: esc, cid: cid,
    ensureSeed: function () {
      var s = get(K.seed, null);
      if (!s || s.v !== 3) {   // نسخة بيانات قديمة → إعادة توليد بالهيكل الجديد
        [K.ev, K.ord, K.rev, K.cus, K.ctl].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) { } });
        buildIndex(); seedDemo(30);
      } else buildIndex();
    },
    reset: function () { Object.keys(K).forEach(function (k) { if (k !== "theme") localStorage.removeItem(K[k]); }); }
  };
})(window);
