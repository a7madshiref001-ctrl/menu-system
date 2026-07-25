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
    $("phoneHint").textContent = opt ? "(اختياري — نرسل لك عروضنا)" : "(مطلوب — للتواصل)";
    if (!$("tableNo").options.length) {
      var o = "";
      for (var i = 1; i <= S.order.tables; i++) o += "<option>" + i + "</option>";
      $("tableNo").innerHTML = o;
    }
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

    sending = true;
    var sub = cartSub(), del = mode === "توصيل" ? S.order.deliveryFee : 0;
    var total = sub + del;
    var upV = cart.filter(function (l) { return l.up; }).reduce(function (a, l) { return a + l.p * l.q; }, 0);
    var adV = cart.reduce(function (a, l) { return a + (l.addonV || 0) * l.q; }, 0);
    var oid = "F" + String(Date.now()).slice(-5);

    FS.pushOrder({
      id: oid, t: Date.now(), lines: cart.slice(), total: total,
      off: 0, offLb: "", del: del, up: upV, addon: adV,
      mode: mode, table: mode === "محلي" ? $("tableNo").value : null,
      name: name, phone: phone, addr: mode === "توصيل" ? addr : ""
    });
    if (phone) FS.pushCustomer({ t: Date.now(), phone: phone, name: name, spent: total });

    cart = []; saveCart();
    closeAll();
    showDone(oid, total);
    setTimeout(function () { sending = false; }, 900);
  }

  /* ---------- شاشة النجاح: تقييم + ولاء ---------- */
  function showDone(oid, total) {
    $("dOid").textContent = oid;
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

    // الولاء
    var loy = FS.get(FS.K.loy, { n: 0 });
    loy.n = (loy.n || 0) + 1;
    var goal = S.loyalty.goal, reached = loy.n >= goal;
    if (reached) loy.n = 0;
    FS.set(FS.K.loy, loy);
    paintStamps("stampsRow", reached ? goal : loy.n);
    $("stampMsg").textContent = reached
      ? "كملت " + goal + " زيارات — " + S.loyalty.reward
      : "باقي لك " + (goal - loy.n) + " زيارات وتحصل على " + S.loyalty.reward;

    setTimeout(function () { openSheet("done"); }, 350);
    FS.track("order_done", { v: total });
  }
  function paintStamps(id, n) {
    var goal = S.loyalty.goal, h = "";
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

  function openLoyalty() {
    var loy = FS.get(FS.K.loy, { n: 0 });
    $("loyN").textContent = (loy.n || 0) + "/" + S.loyalty.goal;
    paintStamps("loyStamps", loy.n || 0);
    $("loyMsg").innerHTML = "مع كل طلب تجمع ختم. إذا كملت " + S.loyalty.goal + " أختام لك " + S.loyalty.reward;
    openSheet("loy");
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
    });
  }

  window.App = {
    home: home, openSection: openSection, goCat: goCat, openItem: openItem,
    pickSize: pickSize, tglAddon: tglAddon, tglSug: tglSug, qty: qty,
    addToCart: addToCart, addCombo: addCombo, rmLine: rmLine, quickAdd: quickAdd,
    openCart: openCart, setMode: setMode, sendOrder: sendOrder,
    rate: rate, openMaps: openMaps, sendComplaint: sendComplaint, openLoyalty: openLoyalty,
    toggleTheme: toggleTheme, closeAll: closeAll
  };
  document.addEventListener("DOMContentLoaded", init);
})();
