/* ============================================================
   واجهة العميل — منيو بيبيع
   ============================================================ */
(function () {
  "use strict";
  var M = window.MENU, S = window.SALES, E = FS.esc, $ = function (id) { return document.getElementById(id); };
  var CUR = M.brand.currency || "ج";
  var SZ = ["S", "M", "L"];

  var cart = FS.get(FS.K.cart, []);
  var cur = null;                    // الصنف المفتوح دلوقتي
  var mode = S.order.modes[0];
  var rated = false;

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
    if (S.badges.hot.indexOf(n) > -1) return { c: "chip-hot", t: "🔥 الأكثر طلباً" };
    if (S.badges.chef.indexOf(n) > -1) return { c: "chip-chef", t: "👨‍🍳 ترشيح الشيف" };
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

  /* ---------- عرض اليوم ---------- */
  function offerTick() {
    var o = FS.offerLive(), bar = $("offerbar");
    if (!o) { bar.classList.add("hidden"); return; }
    $("offT").textContent = o.title;
    $("offB").textContent = o.body;
    bar.classList.remove("hidden");
    if (!o.active) {
      var h12 = o.from % 12 || 12;
      $("offCd").textContent = "يبدأ " + h12 + (o.from >= 12 ? "م" : "ص");
      return;
    }
    var ms = o.endsAt - Date.now();
    if (ms < 0) ms = 0;
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
    $("offCd").textContent = String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }
  function offerDiscount() {
    var o = FS.offerLive();
    if (!o || !o.active) return { amount: 0, label: "" };
    var amt = 0;
    cart.forEach(function (l) {
      if (l.sec === S.offer.applyTo.section && l.sizeIx === S.offer.applyTo.size)
        amt += l.p * l.q * (o.pct / 100);
    });
    return { amount: Math.round(amt), label: o.title + " (" + o.pct + "٪)" };
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
        '<div class="em">' + E(s.emoji || "") + "</div>" +
        '<div class="tx"><b>' + E(s.title) + "</b><span>" + count + " صنف</span></div></div>";
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
    res.innerHTML = '<div class="cat"><h3>نتايج البحث (' + hits.length + ")</h3>" +
      (hits.length ? hits.map(itemRow).join("") : '<div class="empty">مفيش صنف بالاسم ده 🤔</div>') + "</div>";
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
    $("svTitle").textContent = s.title;
    $("svDesc").textContent = s.desc || "";
    $("tabs").innerHTML = s.cats.map(function (c, i) {
      return '<button class="' + (i === 0 ? "on" : "") + '" onclick="App.goCat(\'' + E(c.id) + '\',this)">' + E(c.title) + "</button>";
    }).join("");
    $("svBody").innerHTML = s.cats.map(function (c) {
      var items = FS.items().filter(function (r) { return r.cat === c.id; });
      return '<div class="cat" id="cat-' + E(c.id) + '"><h3>' + E(c.title) +
        (c.isNew ? ' <span class="chip chip-new">جديد</span>' : "") + "</h3>" +
        items.map(itemRow).join("") + "</div>";
    }).join("");
    window.scrollTo(0, 0);
  }
  function goCat(id, btn) {
    [].forEach.call($("tabs").children, function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    var el = $("cat-" + id);
    if (el) window.scrollTo({ top: el.offsetTop - 116, behavior: "smooth" });
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
    if (!r || isOut(name)) { if (r) toast("الصنف ده نفد دلوقتي 🙏"); return; }
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
    toast("اتضاف للسلة ✓");
  }
  function addCombo(id) {
    var c = S.combos.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    cart.push({ n: c.n, p: c.p, q: 1, sec: "combo", addons: [], combo: 1, parts: c.parts });
    FS.track("add_cart", { n: c.n, sec: "combo", p: c.p, q: 1, combo: 1 });
    saveCart(); toast("الكومبو اتضاف ✓ وفّرت " + (c.was - c.p) + " " + CUR);
  }
  function rmLine(i) { cart.splice(i, 1); saveCart(); renderCart(); }

  function openCart() {
    if (!cart.length) { toast("السلة فاضية"); return; }
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

    var sub = cartSub(), off = offerDiscount(), del = mode === "دليفري" ? S.order.deliveryFee : 0;
    $("cSub").textContent = FS.money(sub);
    $("cOffRow").classList.toggle("hidden", off.amount <= 0);
    $("cOffLb").textContent = off.label;
    $("cOff").textContent = FS.money(off.amount);
    $("cDelRow").classList.toggle("hidden", !del);
    $("cDel").textContent = del;
    $("cTot").textContent = FS.money(sub - off.amount + del);

    $("modes").innerHTML = S.order.modes.map(function (m) {
      return '<button class="' + (m === mode ? "on" : "") + '" onclick="App.setMode(\'' + m + '\')">' + m + "</button>";
    }).join("");
    $("tableBlk").classList.toggle("hidden", mode !== "صالة");
    $("addrBlk").classList.toggle("hidden", mode !== "دليفري");
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
    saveCart(); renderCart(); toast("اتضاف ✓");
  }
  function setMode(m) { mode = m; renderCart(); }

  /* ---------- إرسال الطلب ---------- */
  function sendOrder() {
    var name = $("cName").value.trim(), phone = $("cPhone").value.trim();
    if (!name) { toast("اكتب اسمك 🙏"); $("cName").focus(); return; }
    if (mode === "دليفري" && !$("cAddr").value.trim()) { toast("اكتب العنوان"); $("cAddr").focus(); return; }

    var sub = cartSub(), off = offerDiscount(), del = mode === "دليفري" ? S.order.deliveryFee : 0;
    var total = sub - off.amount + del;
    var upV = cart.filter(function (l) { return l.up; }).reduce(function (a, l) { return a + l.p * l.q; }, 0);
    var adV = cart.reduce(function (a, l) { return a + (l.addonV || 0) * l.q; }, 0);
    var oid = "F" + String(Date.now()).slice(-5);

    var order = {
      id: oid, t: Date.now(), lines: cart.slice(), total: total, up: upV, addon: adV,
      mode: mode, table: mode === "صالة" ? $("tableNo").value : null,
      name: name, phone: phone, addr: $("cAddr").value.trim()
    };
    FS.pushOrder(order);
    if (phone) FS.pushCustomer({ t: Date.now(), phone: phone, name: name, spent: total });

    // نص الواتساب
    var txt = "*طلب جديد — مطعم فرندس*%0Aرقم الطلب: " + oid + "%0A—————%0A";
    cart.forEach(function (l) {
      txt += "• " + l.n + (l.q > 1 ? " ×" + l.q : "") + " — " + (l.p * l.q) + " " + CUR + "%0A";
      if (l.addons && l.addons.length) txt += "   (" + l.addons.join(" + ") + ")%0A";
    });
    txt += "—————%0A";
    if (off.amount) txt += "خصم " + off.label + ": −" + off.amount + " " + CUR + "%0A";
    if (del) txt += "توصيل: " + del + " " + CUR + "%0A";
    txt += "*الإجمالي: " + total + " " + CUR + "*%0A—————%0A";
    txt += "الاسم: " + name + "%0A";
    if (phone) txt += "الموبايل: " + phone + "%0A";
    txt += "النوع: " + mode + "%0A";
    if (mode === "صالة") txt += "ترابيزة رقم: " + $("tableNo").value + "%0A";
    if (mode === "دليفري") txt += "العنوان: " + $("cAddr").value.trim() + "%0A";

    window.open("https://wa.me/" + S.order.whatsapp + "?text=" + encodeURI(decodeURIComponent(txt)), "_blank");

    cart = []; saveCart();
    closeAll();
    showDone(oid, total);
  }

  /* ---------- شاشة النجاح: تقييم + كوبون + ولاء ---------- */
  function showDone(oid, total) {
    rated = false;
    $("dOid").textContent = oid;
    $("rateBlk").classList.remove("hidden");
    $("lowBlk").classList.add("hidden");
    $("couponBlk").classList.add("hidden");
    $("rateHint").textContent = "دوسة واحدة وتفرق معانا";
    $("stars").innerHTML = [1, 2, 3, 4, 5].map(function (i) {
      return '<button onclick="App.rate(' + i + ')">⭐</button>';
    }).join("");

    // الولاء
    var loy = FS.get(FS.K.loy, { n: 0 });
    loy.n = (loy.n || 0) + 1;
    var goal = S.loyalty.goal, reached = loy.n >= goal;
    if (reached) loy.n = 0;
    FS.set(FS.K.loy, loy);
    paintStamps("stampsRow", reached ? goal : loy.n);
    $("stampMsg").textContent = reached
      ? "🎉 كمّلت " + goal + " زيارات — " + S.loyalty.reward
      : "فاضلك " + (goal - loy.n) + " زيارات وتاخد " + S.loyalty.reward;

    setTimeout(function () { openSheet("done"); }, 350);
    FS.track("order_done", { v: total });
  }
  function paintStamps(id, n) {
    var goal = S.loyalty.goal, h = "";
    for (var i = 0; i < goal; i++) h += "<i class='" + (i < n ? "on" : "") + "'>" + (i < n ? "★" : i + 1) + "</i>";
    $(id).innerHTML = h;
  }
  function rate(n) {
    if (rated) return; rated = true;
    [].forEach.call($("stars").children, function (b, i) { b.classList.toggle("on", i < n); });
    FS.track("review", { stars: n });
    FS.pushReview({ t: Date.now(), stars: n, note: "", sent: n >= S.review.threshold ? "google" : "owner" });

    if (n >= S.review.threshold) {
      $("rateHint").innerHTML = "شكراً ليك ❤️ ممكن تكتبها على جوجل؟";
      giveCoupon();
      setTimeout(function () {
        if (S.review.googleUrl.indexOf("REPLACE") < 0) window.open(S.review.googleUrl, "_blank");
        else toast("(في النسخة الحقيقية بيفتح لينك تقييم جوجل)");
      }, 900);
    } else {
      $("rateHint").textContent = "آسفين — قولنا إيه اللي حصل؟";
      $("lowBlk").classList.remove("hidden");
    }
  }
  function sendComplaint() {
    var note = $("rNote").value.trim();
    var revs = FS.get(FS.K.rev, []);
    if (revs.length) { revs[revs.length - 1].note = note; FS.set(FS.K.rev, revs); }
    FS.track("complaint", { note: note });
    var txt = "شكوى من عميل عبر المنيو:%0A" + note;
    window.open("https://wa.me/" + S.review.ownerWhatsapp + "?text=" + encodeURI(decodeURIComponent(txt)), "_blank");
    $("lowBlk").innerHTML = "<div style='padding:12px;color:var(--txt2);font-size:13.5px'>وصلت لصاحب المطعم — هيتواصل معاك 🙏</div>";
    giveCoupon();
  }
  function giveCoupon() {
    if (!S.coupon.on) return;
    var code = "FR" + String(Math.floor(Math.random() * 9000) + 1000);
    var exp = Date.now() + S.coupon.days * 86400000;
    FS.set("fsys.coupon.v1", { code: code, exp: exp, pct: S.coupon.pct });
    FS.track("coupon_issued", { code: code, pct: S.coupon.pct });
    $("cCode").textContent = code;
    $("cTxt").textContent = S.coupon.text + " — صالح " + S.coupon.days + " أيام";
    $("couponBlk").classList.remove("hidden");
  }

  function openLoyalty() {
    var loy = FS.get(FS.K.loy, { n: 0 });
    $("loyN").textContent = (loy.n || 0) + "/" + S.loyalty.goal;
    paintStamps("loyStamps", loy.n || 0);
    var c = FS.get("fsys.coupon.v1", null);
    var msg = "كل ما تطلب من المنيو بتاخد ختم. لما تكمّل " + S.loyalty.goal + " تاخد " + S.loyalty.reward;
    if (c && c.exp > Date.now())
      msg += "<br><br>🎟️ عندك كوبون <b style='color:var(--orange);direction:ltr;display:inline-block'>" + E(c.code) +
        "</b> خصم " + c.pct + "٪ — قوله للكاشير";
    $("loyMsg").innerHTML = msg;
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
    renderCombos(); renderPops(); renderSections(); renderFoot();
    paintFab();
    offerTick(); setInterval(offerTick, 1000);
    FS.track("visit", { ref: document.referrer || "" });

    $("q").addEventListener("input", function (e) { search(e.target.value); });
    window.addEventListener("scroll", function () {
      $("topbar").classList.toggle("solid", window.scrollY > 20);
    });
    // لو الأونر غيّر حاجة من اللوحة — يتحدث فورًا
    FS.onMsg(function (m) {
      if (m.type === "control") {
        if (curSec) openSection(curSec.id); else { renderPops(); }
        offerTick();
      }
    });
  }

  window.App = {
    home: home, openSection: openSection, goCat: goCat, openItem: openItem,
    pickSize: pickSize, tglAddon: tglAddon, tglSug: tglSug, qty: qty,
    addToCart: addToCart, addCombo: addCombo, rmLine: rmLine, quickAdd: quickAdd,
    openCart: openCart, setMode: setMode, sendOrder: sendOrder,
    rate: rate, sendComplaint: sendComplaint, openLoyalty: openLoyalty,
    toggleTheme: toggleTheme, closeAll: closeAll
  };
  document.addEventListener("DOMContentLoaded", init);
})();
