/* ============================================================
   واجهة العميل — منيو بيبيع
   ============================================================ */
(function () {
  "use strict";
  var M = window.MENU, S = window.SALES, E = FS.esc, $ = function (id) { return document.getElementById(id); };
  var CUR = M.brand.currency || "ج";
  var SZ = ["S", "M", "L"];

  var lowHTML = null;
  var RATE_LB = ["", "سيئ", "مو حلو", "عادي", "حلو", "ممتاز"];
  var myRating = 0, myRevT = 0;

  var cart = FS.get(FS.K.cart, []);
  var cur = null;                    // الصنف المفتوح دلوقتي
  var mode = S.order.modes[0];

  /* ---------- دفع ---------- */
  var payId = "cash", payRef = "";   // "cash" = يدفع عند الاستلام

  /* ---------- حماية ---------- */
  var pageT = Date.now();            // نقيس كم قعد على الصفحة قبل ما يرسل
  var qTable = null, qKeyOk = false; // الطاولة جاية من QR أو لا
  (function readQR() {
    try {
      var q = new URLSearchParams(location.search);
      var t = q.get("t"), k = q.get("k");
      if (t && FS.tableOk(t, k)) { qTable = t; qKeyOk = true; }
    } catch (e) { }
  })();

  /* ---------- أدوات ---------- */
  function toast(msg) {
    var t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 1900);
  }
  function ctl() { return FS.control(); }
  function isOut(n) { return ctl().soldOut.indexOf(n) > -1; }
  function priceOf(rec) {
    var o = ctl().prices[rec.n];
    return o != null ? o : rec.price;
  }
  function badgeOf(n) {
    if (S.badges.hot.indexOf(n) > -1) return { c: "chip-hot", t: "الأكثر طلبًا" };
    if (S.badges.chef.indexOf(n) > -1) return { c: "chip-chef", t: "ترشيح الشيف" };
    return null;
  }

  /* ---------- سبلاش ---------- */
  function splash() {
    var w = "FRIENDS", h = $("splashWord");
    h.innerHTML = w.split("").map(function (c, i) {
      return '<span style="animation-delay:' + (0.25 + i * 0.06) + 's">' + c + "</span>";
    }).join("");
    setTimeout(function () { $("splash").classList.add("gone"); }, 1750);
  }

  /* ---------- الرئيسية ---------- */
  function renderCombos() {
    $("combos").innerHTML = S.combos.map(function (c) {
      return '<div class="combo" onclick="App.addCombo(\'' + c.id + '\')">' +
        '<div class="ph"><img src="' + E(c.img) + '" alt=""></div>' +
        '<div class="bd"><b>' + E(c.n) + "</b><p>" + E(c.d) + "</p>" +
        '<div class="pr"><span class="new">' + c.p + "</span><span class='old'>" + c.was + "</span>" +
        '<span class="sv">وفّر ' + (c.was - c.p) + " " + CUR + "</span></div></div></div>";
    }).join("");
  }
  function renderPops() {
    var list = S.badges.hot.concat(S.badges.chef).map(function (n) { return FS.byName(n); })
      .filter(Boolean).slice(0, 10);
    $("pops").innerHTML = list.map(function (r, i) {
      return '<div class="pop" onclick="App.openItem(\'' + E(r.n).replace(/'/g, "&#39;") + '\')">' +
        '<div class="rk">' + (i + 1) + "</div><b>" + E(r.n) + "</b>" +
        '<div class="p">' + priceOf(r) + " " + CUR + "</div></div>";
    }).join("");
  }
  function renderSections() {
    $("sections").innerHTML = M.sections.map(function (s) {
      var count = (s.cats || []).reduce(function (a, c) { return a + (c.items || []).length; }, 0);
      return '<div class="sec" onclick="App.openSection(\'' + E(s.id) + '\')">' +
        '<img src="' + E(s.img) + '" alt=""><div class="ov"></div>' +
        '<div class="tx"><b>' + E(s.title) + "</b><span>" + count + " صنف</span></div></div>";
    }).join("");
  }
  function renderQuickNav() {
    $("quicknav").innerHTML = M.sections.map(function (s) {
      return '<div class="qchip" onclick="App.openSection(\'' + E(s.id) + '\')">' +
        E(s.title) + "</div>";
    }).join("");
  }
  function renderFoot() {
    $("phones").innerHTML = (M.brand.phones || []).map(function (p) {
      return '<a href="tel:' + E(p) + '">' + E(p) + "</a>";
    }).join("");
    $("addr").textContent = M.brand.address || "";
  }

  /* ---------- بحث ---------- */
  function norm(s) {
    return String(s).replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .replace(/[ًٌٍَُِّْ]/g, "").toLowerCase().trim();
  }
  function search(q) {
    var res = $("searchRes"), body = $("homeBody");
    if (!q || norm(q).length < 2) { res.innerHTML = ""; body.classList.remove("hidden"); return; }
    body.classList.add("hidden");
    var nq = norm(q);
    var hits = FS.items().filter(function (r) { return norm(r.n).indexOf(nq) > -1; }).slice(0, 40);
    FS.track("search", { q: q, hits: hits.length });
    res.innerHTML = '<div class="catblock" style="margin-top:14px">' +
      '<div class="ch"><span class="bar"></span><b>نتائج البحث</b><span class="cnt">' + hits.length + " صنف</span></div>" +
      '<div class="cat">' +
      (hits.length ? hits.map(itemRow).join("") : '<div class="empty">ما فيه صنف بهذا الاسم</div>') +
      "</div></div>";
  }

  /* ---------- صف صنف ---------- */
  function itemRow(r) {
    var out = isOut(r.n), b = badgeOf(r.n), tags = "";
    if (b) tags += '<span class="chip ' + b.c + '">' + b.t + "</span>";
    if (r.isNew) tags += '<span class="chip chip-new">جديد</span>';
    if (out) tags += '<span class="chip chip-out">نفد</span>';
    var pz;
    if (r.sized) {
      pz = '<div class="sz">' + r.raw.s.map(function (p, i) {
        return p == null ? "" : "<i><s>" + SZ[i] + "</s><b>" + p + "</b></i>";
      }).join("") + "</div>";
    } else {
      pz = '<div class="one">' + priceOf(r) + '<span class="cur">' + CUR + "</span></div>";
    }
    return '<div class="item' + (out ? " out" : "") + '" onclick="App.openItem(\'' +
      E(r.n).replace(/'/g, "&#39;") + '\')">' +
      '<div class="nm"><b>' + E(r.n) + "</b>" +
      (r.raw.d ? "<p>" + E(r.raw.d) + "</p>" : "") +
      (tags ? '<div class="tags">' + tags + "</div>" : "") + "</div>" +
      '<div class="pz">' + pz + "</div>" +
      (out ? "" : '<div class="plusbtn">+</div>') + "</div>";
  }

  /* ---------- عرض قسم ---------- */
  var curSec = null;
  function openSection(id) {
    var s = M.sections.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    curSec = s;
    FS.track("section", { sec: id });
    $("home").classList.add("hidden");
    $("secview").classList.add("on");

    var count = (s.cats || []).reduce(function (a, c) { return a + (c.items || []).length; }, 0);
    $("svBanner").innerHTML =
      '<img src="' + E(s.img) + '" alt=""><div class="ov"></div>' +
      '<button class="back" onclick="App.home()">رجوع</button>' +
      '<span class="cnt">' + count + " صنف · " + s.cats.length + " أقسام</span>" +
      '<div class="tx"><h2>' + E(s.title) + "</h2><p>" + E(s.desc || "") + "</p></div>";

    $("tabs").innerHTML = s.cats.map(function (c, i) {
      return '<button data-cat="' + E(c.id) + '" class="' + (i === 0 ? "on" : "") +
        '" onclick="App.goCat(\'' + E(c.id) + '\',this)">' + E(c.title) + "</button>";
    }).join("");
    $("svBody").innerHTML = s.cats.map(catBlock).join("");
    window.scrollTo(0, 0);
  }
  /* كل فئة في بلوك واضح: هيدر بعدّاد + صفوف مفصولة */
  function catBlock(c) {
    var items = FS.items().filter(function (r) { return r.cat === c.id; });
    return '<div class="catblock" id="cat-' + E(c.id) + '">' +
      '<div class="ch"><span class="bar"></span><b>' + E(c.title) + "</b>" +
      (c.isNew ? '<span class="chip chip-new">جديد</span>' : "") +
      '<span class="cnt">' + items.length + " صنف</span></div>" +
      '<div class="cat">' + items.map(itemRow).join("") + "</div></div>";
  }
  function goCat(id, btn) {
    [].forEach.call($("tabs").children, function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    var el = $("cat-" + id);
    if (el) window.scrollTo({ top: el.offsetTop - 116, behavior: "smooth" });
  }
  /* التاب بيتظلل لوحده مع السكرول */
  function spy() {
    if (!curSec || !$("secview").classList.contains("on")) return;
    var y = window.scrollY + 132, active = null;
    curSec.cats.forEach(function (c) {
      var el = $("cat-" + c.id);
      if (el && el.offsetTop <= y) active = c.id;
    });
    if (!active) active = curSec.cats[0].id;
    // آخر الصفحة = آخر فئة (الفئات القصيرة في الآخر مش بتوصل لنقطة التفعيل)
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10)
      active = curSec.cats[curSec.cats.length - 1].id;
    [].forEach.call($("tabs").children, function (b) {
      var on = b.getAttribute("data-cat") === active;
      if (on && !b.classList.contains("on"))
        b.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      b.classList.toggle("on", on);
    });
  }
  function home() {
    $("secview").classList.remove("on");
    $("home").classList.remove("hidden");
    $("q").value = ""; search("");
    window.scrollTo(0, 0);
  }

  /* ---------- شيت الصنف ---------- */
  function openSheet(id) {
    $("back").classList.add("show");
    $(id).classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeAll() {
    $("back").classList.remove("show");
    ["isheet", "csheet", "done", "loy"].forEach(function (i) { $(i).classList.remove("show"); });
    document.body.style.overflow = "";
  }

  function openItem(name) {
    var r = FS.byName(name);
    if (!r || isOut(name)) { if (r) toast("هذا الصنف نفد حاليًا"); return; }
    FS.track("item_view", { n: r.n, sec: r.sec, p: priceOf(r) });

    cur = { rec: r, q: 1, sizeIx: null, addons: [], sug: [] };
    $("itName").textContent = r.n;
    $("itDesc").textContent = r.raw.d || (r.catTitle + " — " + r.secTitle);

    var b = badgeOf(r.n), tg = "";
    if (b) tg += '<span class="chip ' + b.c + '">' + b.t + "</span>";
    if (r.isNew) tg += '<span class="chip chip-new">جديد</span>';
    $("itTags").innerHTML = tg;

    // الأحجام
    if (r.sized) {
      var avail = [];
      r.raw.s.forEach(function (p, i) { if (p != null) avail.push(i); });
      cur.sizeIx = avail[avail.length > 1 ? 1 : 0];
      $("szList").innerHTML = avail.map(function (i) {
        return '<button class="' + (i === cur.sizeIx ? "on" : "") + '" onclick="App.pickSize(' + i + ',this)">' +
          "<b>" + r.raw.s[i] + " " + CUR + "</b><span>حجم " + SZ[i] + "</span></button>";
      }).join("");
      $("szBlk").classList.remove("hidden");
    } else $("szBlk").classList.add("hidden");

    // الإضافات
    var ads = S.addons[r.sec] || S.addons._default;
    if (ads && ads.length && r.sec !== "extras") {
      $("adList").innerHTML = ads.map(function (a, i) {
        return '<div class="addon" onclick="App.tglAddon(' + i + ',this)">' +
          '<div class="bx">✓</div><span>' + E(a.n) + "</span><b>+" + a.p + " " + CUR + "</b></div>";
      }).join("");
      $("adBlk").classList.remove("hidden");
    } else $("adBlk").classList.add("hidden");

    // يتحلى مع
    var pr = (S.pairings[r.sec] || S.pairings._default)
      .map(function (n) { return FS.byName(n); })
      .filter(function (x) { return x && x.n !== r.n && !isOut(x.n); });
    if (pr.length) {
      FS.track("upsell_shown", { n: r.n });
      $("sgList").innerHTML = pr.map(function (x, i) {
        return '<div class="s" onclick="App.tglSug(' + i + ',this)"><b>' + E(x.n) + "</b><i>+" + priceOf(x) + " " + CUR + "</i></div>";
      }).join("");
      cur.prPool = pr;
      $("sgBlk").classList.remove("hidden");
    } else { cur.prPool = []; $("sgBlk").classList.add("hidden"); }

    $("qtyV").textContent = "1";
    calcItem();
    openSheet("isheet");
  }
  function pickSize(i, el) {
    cur.sizeIx = i;
    [].forEach.call($("szList").children, function (b) { b.classList.remove("on"); });
    el.classList.add("on"); calcItem();
  }
  function tglAddon(i, el) {
    var ads = S.addons[cur.rec.sec] || S.addons._default, a = ads[i];
    var ix = cur.addons.indexOf(i);
    if (ix > -1) cur.addons.splice(ix, 1);
    else { cur.addons.push(i); FS.track("addon_add", { n: a.n, p: a.p }); }
    el.classList.toggle("on"); calcItem();
  }
  function tglSug(i, el) {
    var ix = cur.sug.indexOf(i);
    if (ix > -1) cur.sug.splice(ix, 1);
    else { cur.sug.push(i); FS.track("upsell_accept", { n: cur.prPool[i].n, p: priceOf(cur.prPool[i]) }); }
    el.classList.toggle("on"); calcItem();
  }
  function qty(d) {
    cur.q = Math.max(1, cur.q + d);
    $("qtyV").textContent = cur.q; calcItem();
  }
  function itemBase() {
    return cur.rec.sized ? cur.rec.raw.s[cur.sizeIx] : priceOf(cur.rec);
  }
  function calcItem() {
    var ads = S.addons[cur.rec.sec] || S.addons._default;
    var t = itemBase();
    cur.addons.forEach(function (i) { t += ads[i].p; });
    t *= cur.q;
    cur.sug.forEach(function (i) { t += priceOf(cur.prPool[i]); });
    $("itTot").textContent = FS.money(t);
    cur.total = t;
  }

  /* ---------- السلة ---------- */
  function saveCart() { FS.set(FS.K.cart, cart); paintFab(); }
  function cartCount() { return cart.reduce(function (a, l) { return a + l.q; }, 0); }
  function cartSub() { return cart.reduce(function (a, l) { return a + l.p * l.q; }, 0); }
  function paintFab() {
    var n = cartCount();
    $("cartN").textContent = n;
    $("cartT").textContent = FS.money(cartSub());
    $("cartfab").classList.toggle("show", n > 0);
  }
  function addToCart() {
    var ads = S.addons[cur.rec.sec] || S.addons._default;
    var base = itemBase(), names = [];
    cur.addons.forEach(function (i) { base += ads[i].p; names.push(ads[i].n); });
    cart.push({
      n: cur.rec.n + (cur.rec.sized ? " (" + SZ[cur.sizeIx] + ")" : ""),
      p: base, q: cur.q, sec: cur.rec.sec, sizeIx: cur.sizeIx,
      addons: names, addonV: names.length ? base - itemBase() : 0
    });
    FS.track("add_cart", { n: cur.rec.n, sec: cur.rec.sec, p: base, q: cur.q });
    cur.sug.forEach(function (i) {
      var x = cur.prPool[i];
      cart.push({ n: x.n, p: priceOf(x), q: 1, sec: x.sec, addons: [], up: 1 });
      FS.track("add_cart", { n: x.n, sec: x.sec, p: priceOf(x), q: 1, up: 1 });
    });
    saveCart(); closeAll();
    toast("انضاف للسلة");
  }
  function addCombo(id) {
    var c = S.combos.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    cart.push({ n: c.n, p: c.p, q: 1, sec: "combo", addons: [], combo: 1, parts: c.parts });
    FS.track("add_cart", { n: c.n, sec: "combo", p: c.p, q: 1, combo: 1 });
    saveCart(); toast("انضاف الكومبو — وفرت " + (c.was - c.p) + " " + CUR);
  }
  function rmLine(i) { cart.splice(i, 1); saveCart(); renderCart(); }

  function openCart() {
    if (!cart.length) { toast("سلتك فاضية"); return; }
    FS.track("cart_open", { n: cartCount(), v: cartSub() });
    renderCart(); openSheet("csheet");
  }
  function renderCart() {
    if (!cart.length) { closeAll(); return; }
    $("cLines").innerHTML = cart.map(function (l, i) {
      var sub = l.addons && l.addons.length ? "مع " + l.addons.join(" + ") :
        (l.combo ? l.parts.join(" + ") : (l.up ? "إضافة مقترحة" : ""));
      return '<div class="line"><div class="nm"><b>' + E(l.n) + (l.q > 1 ? " ×" + l.q : "") + "</b>" +
        (sub ? "<span>" + E(sub) + "</span>" : "") + "</div>" +
        '<div class="pp">' + FS.money(l.p * l.q) + " " + CUR + "</div>" +
        '<div class="rm" onclick="App.rmLine(' + i + ')">✕</div></div>';
    }).join("");

    // اقتراح أخير قبل الإرسال
    var have = cart.map(function (l) { return l.n; });
    var pool = S.badges.profit.map(function (n) { return FS.byName(n); })
      .filter(function (x) { return x && have.indexOf(x.n) < 0 && !isOut(x.n); }).slice(0, 6);
    if (pool.length) {
      FS.track("upsell_shown", { at: "cart" });
      $("cUpList").innerHTML = pool.map(function (x) {
        return '<div class="s" onclick="App.quickAdd(\'' + E(x.n).replace(/'/g, "&#39;") + '\')">' +
          "<b>" + E(x.n) + "</b><i>+" + priceOf(x) + " " + CUR + "</i></div>";
      }).join("");
      $("cUpsell").classList.remove("hidden");
    } else $("cUpsell").classList.add("hidden");

    var sub = cartSub(), del = mode === "توصيل" ? S.order.deliveryFee : 0;
    $("cSub").textContent = FS.money(sub);
    $("cDelRow").classList.toggle("hidden", !del);
    $("cDel").textContent = del;
    $("cTot").textContent = FS.money(sub + del);

    $("modes").innerHTML = S.order.modes.map(function (m) {
      return '<button class="' + (m === mode ? "on" : "") + '" onclick="App.setMode(\'' + m + '\')">' + m + "</button>";
    }).join("");
    $("tableBlk").classList.toggle("hidden", mode !== "محلي");
    $("addrBlk").classList.toggle("hidden", mode !== "توصيل");
    var opt = mode === "محلي";
    $("nameHint").textContent = opt ? "(اختياري)" : "(مطلوب)";
    $("phoneHint").textContent = opt
      ? "(اختياري — بدونه ما في أختام ولاء)"
      : "(مطلوب — للتواصل)";
    if (!$("tableNo").options.length) {
      var o = "";
      for (var i = 1; i <= S.order.tables; i++) o += "<option>" + i + "</option>";
      $("tableNo").innerHTML = o;
    }
    renderPay();
    // جاي من QR الطاولة؟ إذًا الرقم مقفول — ما يختاره بيده
    if (qKeyOk) {
      $("tableNo").value = qTable;
      $("tableNo").disabled = true;
      $("tableHint").textContent = "طاولة " + qTable + " — مقروءة من الـQR";
      $("tableHint").classList.remove("hidden");
    } else {
      $("tableNo").disabled = false;
      $("tableHint").classList.add("hidden");
    }
  }
  /* ---------- طرق الدفع ---------- */
  var P = S.payment || { on: false, methods: [] };
  function payMethod() {
    if (payId === "cash") return null;
    return (P.methods || []).filter(function (m) { return m.id === payId; })[0] || null;
  }
  function renderPay() {
    if (!P.on || !(P.methods || []).length) { $("payBlk").classList.add("hidden"); return; }
    $("payBlk").classList.remove("hidden");

    var opts = [{ id: "cash", n: P.cashLabel || "كاش عند الاستلام" }].concat(P.methods);
    $("payModes").innerHTML = opts.map(function (m) {
      return '<button class="' + (m.id === payId ? "on" : "") + '" onclick="App.setPay(\'' +
        E(m.id) + '\')">' + E(m.n) + "</button>";
    }).join("");

    var m = payMethod();
    if (!m) { $("payBox").innerHTML = ""; return; }

    var total = cartSub() + (mode === "توصيل" ? S.order.deliveryFee : 0);
    var len = P.refLen || 6;
    $("payBox").innerHTML =
      '<div class="paybox">' +
      '<div class="ph">' + E(m.hint || "") + "</div>" +
      '<div class="prow"><span class="k">حوّل على</span>' +
      '<b class="v mono">' + E(m.to) + "</b>" +
      '<button class="cpy" onclick="App.copyPay(\'' + E(m.to).replace(/'/g, "&#39;") + '\')">نسخ</button></div>' +
      '<div class="prow"><span class="k">المبلغ بالضبط</span>' +
      '<b class="v mono">' + FS.money(total) + " " + CUR + "</b>" +
      '<button class="cpy" onclick="App.copyPay(\'' + total + '\')">نسخ</button></div>' +
      '<div class="field" style="margin-top:12px"><label>آخر ' + len + ' أرقام من رقم العملية</label>' +
      '<input id="cRef" type="tel" inputmode="numeric" maxlength="12" placeholder="' +
      new Array(len + 1).join("0") + '" value="' + E(payRef) + '" oninput="App.onRef(this.value)"></div>' +
      '<div class="pnote">اطمن — الطلب ما يتجهّز إلا لما المطعم يشوف المبلغ وصل فعلًا</div>' +
      "</div>";
  }
  function setPay(id) { payId = id; renderPay(); }
  function onRef(v) { payRef = String(v || "").replace(/\D/g, ""); }
  function copyPay(t) {
    var s = String(t);
    try {
      navigator.clipboard.writeText(s).then(function () { toast("اننسخ"); },
        function () { toast(s); });
    } catch (e) { toast(s); }
  }

  function quickAdd(n) {
    var x = FS.byName(n); if (!x) return;
    cart.push({ n: x.n, p: priceOf(x), q: 1, sec: x.sec, addons: [], up: 1 });
    FS.track("upsell_accept", { n: x.n, p: priceOf(x), at: "cart" });
    FS.track("add_cart", { n: x.n, sec: x.sec, p: priceOf(x), q: 1, up: 1 });
    saveCart(); renderCart(); toast("انضاف");
  }
  function setMode(m) { mode = m; renderCart(); }

  /* ---------- إرسال الأوردر للسيستم ---------- */
  var sending = false;
  function sendOrder() {
    if (sending) return;
    var name = $("cName").value.trim(), phone = $("cPhone").value.trim(), addr = $("cAddr").value.trim();
    var phoneOk = /^05[0-9]{8}$/.test(phone);

    // صالة: الترابيزة كفاية. تيك أواي/دليفري: محتاجين نوصلّك
    if (mode !== "محلي") {
      if (!name) { toast("اكتب اسمك"); $("cName").focus(); return; }
      if (!phoneOk) { toast("اكتب رقم جوال صحيح يبدأ بـ 05"); $("cPhone").focus(); return; }
    } else if (phone && !phoneOk) {
      toast("رقم الجوال غير صحيح — 10 أرقام تبدأ بـ 05"); $("cPhone").focus(); return;
    }
    if (mode === "توصيل" && !addr) { toast("اكتب العنوان"); $("cAddr").focus(); return; }

    var sub = cartSub(), del = mode === "توصيل" ? S.order.deliveryFee : 0;
    var total = sub + del;

    /* دفع مقدم؟ لازم رقم العملية — بدونه ما في شي نطابق فيه */
    var pm = payMethod(), len = P.refLen || 6;
    if (pm && payRef.length < len) {
      toast("اكتب آخر " + len + " أرقام من رقم العملية");
      var rf = $("cRef"); if (rf) rf.focus();
      return;
    }

    /* الحارس: يرد قبل ما الطلب يُسجّل أصلًا */
    var g = FS.guardOrder({
      phone: phone, mode: mode, total: total,
      dwellSec: (Date.now() - pageT) / 1000,
      trap: !!$("cNick").value,
      tableOk: qKeyOk
    });
    if (!g.ok) { toast(g.msg); return; }

    sending = true;
    var upV = cart.filter(function (l) { return l.up; }).reduce(function (a, l) { return a + l.p * l.q; }, 0);
    var adV = cart.reduce(function (a, l) { return a + (l.addonV || 0) * l.q; }, 0);
    var oid = "F" + String(Date.now()).slice(-5);
    var needsOk = g.flags.length > 0;

    FS.pushOrder({
      id: oid, t: Date.now(), lines: cart.slice(), total: total,
      off: 0, offLb: "", del: del, up: upV, addon: adV,
      mode: mode, table: mode === "محلي" ? $("tableNo").value : null,
      name: name, phone: phone, addr: mode === "توصيل" ? addr : "",
      /* الطلب المدفوع ينتظر تأكيد المبلغ — وما يحتاج طابور التأكيد الثاني */
      status: pm ? "paywait" : (needsOk ? "confirm" : "new"),
      pay: pm ? { m: pm.id, n: pm.n, to: pm.to, ref: payRef } : null,
      flags: g.flags, qr: qKeyOk ? 1 : 0
    });
    if (phone) {
      FS.pushCustomer({ t: Date.now(), phone: phone, name: name, spent: total });
      FS.set(FS.K.myph, phone);
    }

    cart = []; saveCart();
    payId = "cash"; payRef = "";
    closeAll();
    showDone(oid, total, needsOk, pm);
    setTimeout(function () { sending = false; }, 900);
  }

  /* ---------- شاشة النجاح: تقييم + ولاء ---------- */
  function showDone(oid, total, needsOk, pm) {
    $("dOid").textContent = oid;
    $("doneHead").textContent = pm ? "طلبك وصلنا" : (needsOk ? "طلبك وصلنا" : "تم استلام طلبك");
    $("doneSub").textContent = pm
      ? "نراجع تحويل " + pm.n + " الحين — أول ما نتأكد المبلغ وصل يبدأ التجهيز على طول"
      : (needsOk
        ? "بنكلّمك الحين نأكّد الطلب معك وبعدها يبدأ التحضير"
        : "طلبك وصل للكاشير وبيبدأ تحضيره على طول");
    $("rateBlk").classList.remove("hidden");
    if (lowHTML == null) lowHTML = $("lowBlk").innerHTML;
    $("lowBlk").innerHTML = lowHTML;
    $("lowBlk").classList.add("hidden");
    $("rateHint").textContent = "اضغط على النجمة وتقدر تغيّرها بأي وقت";
    myRating = 0; myRevT = 0;
    $("rateVal").textContent = "";
    $("mapsBtn").classList.add("hidden");
    $("stars").innerHTML = [1, 2, 3, 4, 5].map(function (i) {
      return '<button class="star" onclick="App.rate(' + i + ')" aria-label="' + i + '">' +
        '<span class="ic">★</span><span class="no">' + i + "</span></button>";
    }).join("");

    // الولاء — الختم ما ينحط الحين، ينحط لما الطلب يتسلّم فعلًا
    var C = FS.loyCfg(), ph = (FS.get(FS.K.myph, "") || "").trim();
    var card = FS.loyCard(ph);
    paintStamps("stampsRow", card.n);
    if (!C.on) $("stampBlk").classList.add("hidden");
    else {
      $("stampBlk").classList.remove("hidden");
      $("stampMsg").textContent = !ph
        ? "خلّ رقمك مع الطلب عشان تجمّع أختام وتحصل على " + C.reward
        : (total < C.minOrder
          ? "الطلب أقل من " + C.minOrder + " " + CUR + " — ما يحصل على ختم"
          : "ختمك ينحط أول ما تستلم طلبك — باقي لك " +
            Math.max(1, C.goal - card.n) + " وتحصل على " + C.reward);
    }

    setTimeout(function () { openSheet("done"); }, 350);
    FS.track("order_done", { v: total, confirm: needsOk ? 1 : 0 });
  }
  function paintStamps(id, n) {
    var goal = FS.loyCfg().goal, h = "";
    for (var i = 0; i < goal; i++) h += "<i class='" + (i < n ? "on" : "") + "'>" + (i < n ? "★" : i + 1) + "</i>";
    $(id).innerHTML = h;
  }
  function rate(n) {
    myRating = n;
    [].forEach.call($("stars").children, function (b, i) {
      b.classList.toggle("on", i < n);
      b.classList.toggle("peak", i === n - 1);
    });
    $("rateVal").textContent = RATE_LB[n];
    $("rateVal").style.color = n >= S.review.threshold ? "var(--green)"
      : (n >= 3 ? "var(--gold)" : "var(--red)");

    // يعدّل نفس التقييم بدل ما يضيف واحد جديد
    var good = n >= S.review.threshold;
    var revs = FS.get(FS.K.rev, []), hit = null;
    for (var i = 0; i < revs.length; i++) if (revs[i].t === myRevT) hit = revs[i];
    if (hit) { hit.stars = n; hit.sent = good ? "google" : "owner"; if (good) hit.note = ""; }
    else {
      myRevT = Date.now();
      hit = { t: myRevT, stars: n, note: "", sent: good ? "google" : "owner" };
      revs.push(hit);
    }
    FS.set(FS.K.rev, revs);
    FS.emit("review", hit);
    FS.track("review", { stars: n });

    if (lowHTML == null) lowHTML = $("lowBlk").innerHTML;
    if (!good && $("lowBlk").innerHTML !== lowHTML) $("lowBlk").innerHTML = lowHTML;
    $("mapsBtn").classList.toggle("hidden", !good);
    $("lowBlk").classList.toggle("hidden", good);
    $("rateHint").textContent = good
      ? "شكرًا لك — تقدر تعدّل تقييمك بأي وقت"
      : "نعتذر منك — قل لنا وش صار";
  }
  /* الزرار = ضغطة مباشرة من المستخدم فمش هيتبلوك زي الفتح التلقائي */
  function openMaps() {
    FS.track("google_review_click", { stars: myRating });
    var u = S.review.googleUrl;
    if (u.indexOf("REPLACE") < 0) window.open(u, "_blank", "noopener");
    else toast("(في النسخة الفعلية يفتح تقييم قوقل ماب)");
  }
  /* الشكوى بتروح للوحة الأونر مباشرة — مش لجوجل */
  function sendComplaint() {
    var note = $("rNote").value.trim();
    if (!note) { toast("اكتب ملاحظتك أول"); $("rNote").focus(); return; }
    var revs = FS.get(FS.K.rev, []), hit = null;
    for (var i = 0; i < revs.length; i++) if (revs[i].t === myRevT) hit = revs[i];
    if (!hit && revs.length) hit = revs[revs.length - 1];
    if (hit) { hit.note = note; FS.set(FS.K.rev, revs); FS.emit("review", hit); }
    FS.track("complaint", { note: note });
    $("lowBlk").innerHTML = "<div style='padding:12px;color:var(--txt2);font-size:13.5px;text-align:center'>وصلت ملاحظتك لصاحب المطعم مباشرة</div>";
  }

  /* ---------- كرت الولاء — مربوط برقم الجوال مو بالجوال نفسه ---------- */
  function openLoyalty() {
    paintLoyalty();
    openSheet("loy");
  }
  function paintLoyalty() {
    var C = FS.loyCfg(), ph = (FS.get(FS.K.myph, "") || "").trim();
    $("loyPhone").value = ph;
    var card = FS.loyCard(ph), rw = ph ? FS.liveRewards(ph) : [];
    $("loyN").textContent = (ph ? card.n : 0) + "/" + C.goal;
    paintStamps("loyStamps", ph ? card.n : 0);

    if (!ph) {
      $("loyMsg").innerHTML = "اكتب رقم جوالك فوق عشان نجيب كرتك.<br>" +
        "الأختام مربوطة بالرقم مو بالجهاز — لو غيّرت جوال كرتك معك.";
    } else {
      $("loyMsg").innerHTML =
        "الختم ينحط لما تستلم طلبك فعلًا — مو وقت الإرسال.<br>" +
        "الحد الأدنى للطلب " + C.minOrder + " " + CUR + "، وختم واحد باليوم.<br>" +
        "كمّل " + C.goal + " أختام وتحصل على " + E(C.reward) + "." +
        (card.total ? "<br><b>إجمالي طلباتك المحسوبة: " + card.total + "</b>" : "");
    }

    // كود الهدية: يُحرق عند الكاشير — لقطة الشاشة ما لها فايدة بعدها
    $("loyReward").innerHTML = rw.length
      ? rw.map(function (r) {
        return '<div class="rwcode"><span class="lb">كود هديتك — اعرضه للكاشير</span>' +
          '<b class="cd mono">' + E(r.code) + "</b>" +
          '<span class="hint">يُصرف مرة وحدة بس، صالح ' + C.codeLife + " يوم</span></div>";
      }).join("")
      : "";
  }
  function loyLookup() {
    var p = $("loyPhone").value.trim();
    if (!p) { toast("اكتب رقمك أول"); return; }
    FS.set(FS.K.myph, p);
    paintLoyalty();
  }

  /* ---------- ثيم ---------- */
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", cur);
    FS.set(FS.K.theme, cur);
  }

  /* ---------- بدء ---------- */
  function init() {
    document.documentElement.setAttribute("data-theme", FS.get(FS.K.theme, "dark"));
    FS.ensureSeed();
    splash();
    renderCombos(); renderPops(); renderSections(); renderQuickNav(); renderFoot();
    paintFab();
    FS.track("visit", { ref: document.referrer || "" });

    $("q").addEventListener("input", function (e) { search(e.target.value); });
    window.addEventListener("scroll", function () {
      $("topbar").classList.toggle("solid", window.scrollY > 20);
      spy();
    }, { passive: true });
    // لو الأونر غيّر حاجة من اللوحة — يتحدث فورًا
    FS.onMsg(function (m) {
      if (m.type === "control") {
        if (curSec) openSection(curSec.id); else { renderPops(); }
      }
      // الإدارة علّمت الطلب «تم التسليم» → الختم نزل عند العميل لحظيًا
      if (m.type === "loyalty" || m.type === "order_update" || m.type === "sync") {
        if ($("loy").classList.contains("show")) paintLoyalty();
        if ($("done").classList.contains("show")) {
          var c = FS.loyCard((FS.get(FS.K.myph, "") || "").trim());
          paintStamps("stampsRow", c.n);
        }
      }
    });
  }

  window.App = {
    home: home, openSection: openSection, goCat: goCat, openItem: openItem,
    pickSize: pickSize, tglAddon: tglAddon, tglSug: tglSug, qty: qty,
    addToCart: addToCart, addCombo: addCombo, rmLine: rmLine, quickAdd: quickAdd,
    openCart: openCart, setMode: setMode, sendOrder: sendOrder,
    setPay: setPay, onRef: onRef, copyPay: copyPay,
    rate: rate, openMaps: openMaps, sendComplaint: sendComplaint,
    openLoyalty: openLoyalty, loyLookup: loyLookup,
    toggleTheme: toggleTheme, closeAll: closeAll
  };
  document.addEventListener("DOMContentLoaded", init);
})();
