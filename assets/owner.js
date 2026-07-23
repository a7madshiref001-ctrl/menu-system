/* ============================================================
   لوحة المطعم — الأوردرات هي الصفحة الأساسية
   أوردر جديد = رنّة + شارة + كارت مضيء + طباعة ريسيت
   ============================================================ */
(function () {
  "use strict";
  var M = window.MENU, S = window.SALES, E = FS.esc, $ = function (i) { return document.getElementById(i); };
  var CUR = M.brand.currency || "ج";
  var DOW = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  var ST = {
    "new": { t: "جديد", c: "st-new" },
    prep: { t: "قيد التجهيز", c: "st-prep" },
    done: { t: "تم التسليم", c: "st-done" },
    cancel: { t: "ملغي", c: "st-cancel" }
  };
  var days = 30, demo = true, filter = "all", activePane = "or", A = null;
  var soundOn = FS.get("fsys.sound.v1", true);

  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  function stOf(o) { return o.status || "done"; }

  /* ================= الصوت ================= */
  var AC = null, ringTimer = null, titleTimer = null, baseTitle = document.title;
  function ensureAC() {
    try {
      if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === "suspended") AC.resume();
    } catch (e) { }
  }
  document.addEventListener("pointerdown", ensureAC);
  function chime() {
    if (!soundOn) return;
    ensureAC();
    if (!AC || AC.state !== "running") return;
    var t = AC.currentTime;
    // رنّة مرّتين: دينج-دونج
    [[0, 988], [.18, 1319], [.6, 988], [.78, 1319]].forEach(function (p) {
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = "sine"; o.frequency.value = p[1];
      g.gain.setValueAtTime(0, t + p[0]);
      g.gain.linearRampToValueAtTime(.35, t + p[0] + .02);
      g.gain.exponentialRampToValueAtTime(.001, t + p[0] + .5);
      o.connect(g); g.connect(AC.destination);
      o.start(t + p[0]); o.stop(t + p[0] + .55);
    });
  }
  function unseenCount() {
    return FS.get(FS.K.ord, []).filter(function (o) { return !o.seen && (demo || !o.demo); }).length;
  }
  function alarm() {
    // رنّة فورية + تكرار كل ٥ ثواني لحد ما الأوردر يتشاف (زي تابلت الدليفري)
    stopAlarm();
    chime(); flashTitle();
    ringTimer = setInterval(function () {
      if (unseenCount() > 0) { chime(); } else stopAlarm();
    }, 5000);
  }
  function stopAlarm() {
    if (ringTimer) { clearInterval(ringTimer); ringTimer = null; }
    if (titleTimer) { clearInterval(titleTimer); titleTimer = null; document.title = baseTitle; }
  }
  function flashTitle() {
    if (titleTimer) return;
    var on = false;
    titleTimer = setInterval(function () {
      var n = unseenCount();
      if (!n) { stopAlarm(); return; }
      on = !on;
      document.title = on ? "(" + n + ") طلب جديد" : baseTitle;
    }, 900);
  }

  /* ================= الأوردرات ================= */
  function allOrders() {
    return FS.get(FS.K.ord, []).filter(function (o) { return demo || !o.demo; })
      .sort(function (a, b) { return b.t - a.t; });
  }
  function fmtTime(t) {
    var d = new Date(t), now = new Date();
    var hm = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    if (d.toDateString() === now.toDateString()) return hm + " · اليوم";
    var y = new Date(now.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return hm + " · أمس";
    return hm + " · " + d.getDate() + "/" + (d.getMonth() + 1);
  }
  function linesText(o) {
    return (o.lines || []).map(function (l) {
      return (l.q > 1 ? l.q + "× " : "") + E(l.n) +
        (l.addons && l.addons.length ? " <i>(+" + E(l.addons.join(" + ")) + ")</i>" : "");
    }).join(" · ");
  }

  function paintOrders() {
    var ords = allOrders();

    // أرقام النهاردة
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tOrds = ords.filter(function (o) { return o.t >= today.getTime() && stOf(o) !== "cancel"; });
    $("tOrd").textContent = FS.money(tOrds.length);
    $("tRev").textContent = FS.money(tOrds.reduce(function (a, o) { return a + (o.total || 0); }, 0));
    $("tNew").textContent = ords.filter(function (o) { return stOf(o) === "new" || stOf(o) === "prep"; }).length;

    // الفلاتر
    var counts = { all: ords.length };
    Object.keys(ST).forEach(function (k) { counts[k] = ords.filter(function (o) { return stOf(o) === k; }).length; });
    var chips = [["all", "الكل"], ["new", "جديد"], ["prep", "قيد التجهيز"], ["done", "تم التسليم"], ["cancel", "ملغي"]];
    $("fchips").innerHTML = chips.map(function (c) {
      return '<button class="' + (filter === c[0] ? "on" : "") + '" onclick="Own.setFilter(\'' + c[0] + '\')">' +
        c[1] + " <b>" + counts[c[0]] + "</b></button>";
    }).join("");

    var list = ords.filter(function (o) { return filter === "all" || stOf(o) === filter; }).slice(0, 60);
    if (!list.length) {
      $("ordList").innerHTML = '<div class="empty" style="text-align:center;padding:44px 20px;color:var(--txt3)">ما فيه طلبات هنا</div>';
      return;
    }
    $("ordList").innerHTML = list.map(function (o) {
      var st = stOf(o), meta = ST[st];
      var who = '<span class="md">' + E(o.mode || "") + (o.table ? " · طاولة " + E(o.table) : "") + "</span>";
      if (o.name) who += "<b>" + E(o.name) + "</b>";
      if (o.phone) who += '<a href="tel:' + E(o.phone) + '">' + E(o.phone) + "</a>";
      var acts = '<button class="btn btn-s" onclick="Own.printOrder(\'' + E(o.id) + '\')">طباعة الفاتورة</button>';
      if (st === "new")
        acts += '<button class="btn btn-p" onclick="Own.setSt(\'' + E(o.id) + '\',\'prep\')">ابدأ التجهيز</button>' +
          '<button class="btn btn-cancel" onclick="Own.cancelOrder(\'' + E(o.id) + '\')">إلغاء</button>';
      else if (st === "prep")
        acts += '<button class="btn btn-g" onclick="Own.setSt(\'' + E(o.id) + '\',\'done\')">تم التسليم</button>' +
          '<button class="btn btn-cancel" onclick="Own.cancelOrder(\'' + E(o.id) + '\')">إلغاء</button>';
      return '<div class="ordcard' + (st === "new" ? " is-new" : "") + '">' +
        '<div class="oc-top"><b class="oc-id">#' + E(o.id) + '</b>' +
        '<span class="stchip ' + meta.c + '">' + meta.t + "</span>" +
        '<span class="oc-time">' + fmtTime(o.t) + "</span></div>" +
        '<div class="oc-who">' + who + "</div>" +
        (o.addr ? '<div class="oc-addr">العنوان: ' + E(o.addr) + "</div>" : "") +
        '<div class="oc-lines">' + linesText(o) + "</div>" +
        '<div class="oc-foot"><b class="oc-tot">' + FS.money(o.total || 0) + " " + CUR + '</b><div class="sp"></div>' + acts + "</div>" +
        "</div>";
    }).join("");
  }

  function refreshOrders(fromEvent) {
    paintOrders();
    if (activePane === "or") {
      // الصفحة مفتوحة قدامه: اعتبر كل حاجة اتشافت
      FS.markAllSeen();
      if (fromEvent) chime();   // رنّة واحدة للتنبيه
      stopAlarm();
    } else if (unseenCount() > 0) {
      alarm();
    }
    updateBadge();
  }
  function updateBadge() {
    var n = unseenCount();
    $("ordBadge").textContent = n;
    $("ordBadge").classList.toggle("hidden", n === 0);
  }

  function setSt(id, st) { FS.setOrderStatus(id, st); refreshOrders(false); paintStats(); }
  function cancelOrder(id) {
    if (!confirm("متأكد تلغي الطلب #" + id + "؟")) return;
    FS.setOrderStatus(id, "cancel");
    refreshOrders(false); paintStats();
  }

  /* ================= الريسيت ================= */
  function buildReceipt(id) {
    var o = FS.get(FS.K.ord, []).filter(function (x) { return x.id === id; })[0];
    if (!o) return false;
    var d = new Date(o.t);
    var sub = (o.lines || []).reduce(function (a, l) { return a + (l.p || 0) * (l.q || 1); }, 0);
    var h = '<div class="rc">' +
      '<div class="rc-h">' +
      '<svg viewBox="0 0 100 92"><path d="M6 14 C34 -4 74 0 95 22 L64 36 C54 27 42 26 33 32 L46 88 Z" fill="#000"/></svg>' +
      "<b>" + E(M.brand.nameAr) + "</b><span>" + E(M.brand.tagline || "") + "</span></div><hr>" +
      '<div class="rc-meta">' +
      '<div class="l"><b>#' + E(o.id) + "</b><span>" +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") +
      " · " + d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear() + "</span></div>" +
      '<div class="l"><span>' + E(o.mode || "") + (o.table ? " — طاولة " + E(o.table) : "") + "</span></div>" +
      (o.name ? '<div class="l"><span>الاسم: ' + E(o.name) + "</span>" +
        (o.phone ? "<span>" + E(o.phone) + "</span>" : "") + "</div>"
        : (o.phone ? '<div class="l"><span>ت: ' + E(o.phone) + "</span></div>" : "")) +
      (o.addr ? '<div class="l"><span>العنوان: ' + E(o.addr) + "</span></div>" : "") +
      "</div><hr>" +
      (o.lines || []).map(function (l) {
        return '<div class="rc-l"><span>' + (l.q > 1 ? l.q + "× " : "") + E(l.n) + "</span><b>" +
          FS.money((l.p || 0) * (l.q || 1)) + "</b></div>" +
          (l.addons && l.addons.length ? '<div class="rc-a">+ ' + E(l.addons.join(" + ")) + "</div>" : "");
      }).join("") +
      "<hr>" +
      '<div class="rc-t"><span>الإجمالي الفرعي</span><span>' + FS.money(sub) + " " + CUR + "</span></div>" +
      (o.off ? '<div class="rc-t"><span>' + E(o.offLb || "خصم") + "</span><span>− " + FS.money(o.off) + " " + CUR + "</span></div>" : "") +
      (o.del ? '<div class="rc-t"><span>توصيل</span><span>' + FS.money(o.del) + " " + CUR + "</span></div>" : "") +
      '<div class="rc-t big"><span>الإجمالي</span><span>' + FS.money(o.total || 0) + " " + CUR + "</span></div>" +
      "<hr>" +
      '<div class="rc-vat">الأسعار شاملة ضريبة القيمة المضافة 15%<br>الرقم الضريبي: 310158975400003</div><hr>' +
      '<div class="rc-f">شكرًا لزيارتكم — نتشرف فيكم دايم<br>' +
      (M.brand.phones || []).slice(0, 2).map(E).join(" · ") +
      "<br>" + E((M.brand.address || "").split("—")[0].trim()) + "</div>" +
      "</div>";
    $("printArea").innerHTML = h;
    return true;
  }
  function printOrder(id) {
    if (!buildReceipt(id)) return;
    document.body.classList.add("rcpt");
    window.print();
    // fallback لو afterprint معملش fire
    setTimeout(function () { document.body.classList.remove("rcpt"); }, 1500);
  }
  window.addEventListener("afterprint", function () { document.body.classList.remove("rcpt"); });

  /* ================= الأرقام ================= */
  function bars(id, axisId, data, labels, fmt) {
    var mx = Math.max.apply(null, data.concat([1]));
    $(id).innerHTML = data.map(function (v) {
      return '<div class="b' + (v >= mx * 0.85 ? " pk" : "") + '" style="height:' +
        Math.max(3, v / mx * 100) + '%" data-v="' + (fmt ? fmt(v) : v) + '"></div>';
    }).join("");
    $(axisId).innerHTML = labels.map(function (l) { return "<span>" + l + "</span>"; }).join("");
  }
  function rowList(id, rows, opt) {
    opt = opt || {};
    if (!rows.length) { $(id).innerHTML = '<div style="padding:22px;color:var(--txt3);font-size:13px;text-align:center">ما فيه بيانات بهذي الفترة</div>'; return; }
    var mx = Math.max.apply(null, rows.map(function (r) { return r.bar || 0; }).concat([1]));
    $(id).innerHTML = rows.map(function (r, i) {
      return '<div class="rw">' + (opt.rank ? '<div class="rk">' + (i + 1) + "</div>" : "") +
        '<div class="nm"><b>' + E(r.n) + "</b><span>" + E(r.sub || "") + "</span>" +
        (r.bar != null ? '<div class="trk"><i style="width:' + (r.bar / mx * 100) + '%"></i></div>' : "") +
        "</div>" +
        '<div class="mt">' + r.v + (r.v2 ? "<small>" + E(r.v2) + "</small>" : "") + "</div></div>";
    }).join("");
  }

  function paintStats() {
    A = FS.agg(days, demo);

    $("hAdd").textContent = FS.money(A.upRevenue + A.addonRevenue);
    $("kVis").textContent = FS.money(A.visits);
    $("kVisD").textContent = "تقريبًا " + A.perDayVisits + " زائر باليوم";
    $("kOrd").textContent = FS.money(A.orders);
    $("kOrdD").textContent = A.convRate + "٪ من الزوار أرسلوا طلب";
    $("kAvg").textContent = FS.money(A.avgTicket);
    $("kUp").textContent = A.upRate;
    $("kRev").textContent = FS.money(A.revenue);
    $("kUpRev").textContent = FS.money(A.upRevenue);
    $("kAdRev").textContent = FS.money(A.addonRevenue);
    $("kDead").textContent = A.dead.length;

    bars("hourBars", "hourAxis", A.byHour,
      A.byHour.map(function (_, i) { return i % 3 === 0 ? i : ""; }));
    var pk = A.byHour.indexOf(Math.max.apply(null, A.byHour));
    var lowEv = A.byHour.map(function (v, i) { return { v: v, i: i }; })
      .filter(function (r) { return r.i >= 12 && r.i <= 21; }).sort(function (a, b) { return a.v - b.v; })[0];
    $("peakMsg").innerHTML = "أعلى ساعة عندك <b>" + pk + ":00</b> — خل فريقك كامل فيها. " +
      "وأهدى ساعة <b>" + (lowEv ? lowEv.i : "-") + ":00</b> — هذي مكان العرض المحدود.";

    bars("dowBars", "dowAxis", A.byDow, ["ح", "ن", "ث", "ر", "خ", "ج", "س"]);
    var bi = A.byDow.indexOf(Math.max.apply(null, A.byDow));
    var wi = A.byDow.indexOf(Math.min.apply(null, A.byDow.filter(function (x) { return x > 0; })));
    $("dowMsg").innerHTML = "أقوى يوم <b>" + DOW[bi] + "</b> وأهدى يوم <b>" + DOW[wi < 0 ? 1 : wi] +
      "</b>. خل العرض على اليوم الهادي بس — مو على الأسبوع كله.";

    rowList("topItems", A.top.slice(0, 12).map(function (r) {
      return { n: r.n, sub: r.sec + " · انطلب " + r.orders + " مرة", v: FS.money(r.views), v2: "مشاهدة", bar: r.views };
    }), { rank: true });
    rowList("topRev", A.topRev.slice(0, 12).map(function (r) {
      return { n: r.n, sub: r.q + " طلب", v: FS.money(r.rev) + " " + CUR, bar: r.rev };
    }), { rank: true });
    rowList("leak", A.leak.map(function (r) {
      return { n: r.n, sub: "انشاف " + r.views + " مرة · انطلب " + r.orders + " · سعره " + r.price + " " + CUR, v: pct(r.orders, r.views) + "٪", v2: "تحويل" };
    }));

    $("deadN").textContent = A.dead.length;
    $("deadList").innerHTML = A.dead.length
      ? A.dead.map(function (d) { return "<span>" + E(d.n) + " · " + d.price + " " + CUR + "</span>"; }).join("")
      : '<div style="color:var(--txt3);font-size:13px">كل الأصناف انشافت — ممتاز</div>';

    paintCustomers();
  }

  /* ================= العملاء ================= */
  function paintCustomers() {
    var rs = A.reviews;
    var avg = rs.length ? (rs.reduce(function (a, r) { return a + r.stars; }, 0) / rs.length) : 0;
    var low = rs.filter(function (r) { return r.stars < S.review.threshold; }).length;
    $("kStars").textContent = avg ? avg.toFixed(1) : "0";
    $("kStarsD").textContent = rs.length + " تقييم";
    $("kLow").textContent = low;

    var cs = A.customers.slice().sort(function (a, b) { return b.t - a.t; });
    $("cKn").textContent = cs.length;
    rowList("customers", cs.slice(0, 20).map(function (c) {
      return { n: c.name || "عميل", sub: c.phone, v: FS.money(c.spent || 0) + " " + CUR };
    }));

    $("reviews").innerHTML = rs.length ? rs.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 12).map(function (r) {
      return '<div class="revrow"><div class="stars-s">' + "★".repeat(r.stars) + "</div>" +
        '<div class="bd">' + (r.note ? E(r.note) : (r.stars >= 4 ? "تقييم إيجابي" : "بدون تعليق")) + "</div>" +
        '<div class="tg ' + (r.sent === "google" ? "g" : "o") + '">' +
        (r.sent === "google" ? "راح لقوقل" : "وصلت لك") + "</div></div>";
    }).join("") : '<div style="color:var(--txt3);font-size:13px;padding:16px 0">ما فيه تقييمات للحين</div>';
  }
  function exportCsv() {
    var rows = [["الاسم", "الجوال", "قيمة الطلب", "التاريخ"]].concat(
      A.customers.map(function (c) {
        return [c.name || "", c.phone, c.spent || 0, new Date(c.t).toLocaleDateString("ar-SA")];
      }));
    var csv = "﻿" + rows.map(function (r) { return r.join(","); }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "customers.csv"; a.click();
  }

  /* ================= التحكم ================= */
  function paintControl() {
    renderSo($("soSearch").value.trim());
    renderPr($("prSearch").value.trim());
    var url = location.href.replace(/owner\.html.*$/, "");
    $("links").innerHTML =
      '<div class="rw"><div class="nm"><b>رابط العميل (QR الطاولة)</b><span style="direction:ltr;display:inline-block">' +
      E(url) + '</span></div><div class="mt"><a class="btn btn-s" style="font-size:12px;padding:8px 12px" href="' +
      E(url) + '" target="_blank">فتح</a></div></div>' +
      '<div class="rw"><div class="nm"><b>رابط اللوحة (لك أنت بس)</b><span style="direction:ltr;display:inline-block">' +
      E(url + "owner.html") + "</span></div></div>";
  }
  function renderSo(q) {
    var c = FS.control();
    var list = FS.items().filter(function (r) {
      return !q || r.n.indexOf(q) > -1 || c.soldOut.indexOf(r.n) > -1;
    });
    list.sort(function (a, b) {
      return (c.soldOut.indexOf(b.n) > -1) - (c.soldOut.indexOf(a.n) > -1);
    });
    $("soList").innerHTML = list.slice(0, 60).map(function (r) {
      var on = c.soldOut.indexOf(r.n) > -1;
      return '<div class="ctlrow"><div class="nm">' + E(r.n) +
        '<span style="color:var(--txt3);font-size:11px"> · ' + E(r.secTitle) + "</span></div>" +
        '<div class="sw ' + (on ? "on" : "") + '" onclick="Own.tglSold(\'' + E(r.n).replace(/'/g, "&#39;") + "')\"><i></i></div></div>";
    }).join("");
  }
  function tglSold(n) {
    var c = FS.control(), i = c.soldOut.indexOf(n);
    if (i > -1) c.soldOut.splice(i, 1); else c.soldOut.push(n);
    FS.saveControl(c); renderSo($("soSearch").value.trim());
  }
  function renderPr(q) {
    var c = FS.control();
    var list = FS.items().filter(function (r) {
      return !r.sized && (!q || r.n.indexOf(q) > -1 || c.prices[r.n] != null);
    });
    list.sort(function (a, b) { return (c.prices[b.n] != null) - (c.prices[a.n] != null); });
    $("prList").innerHTML = list.slice(0, 40).map(function (r) {
      var v = c.prices[r.n] != null ? c.prices[r.n] : r.price;
      return '<div class="ctlrow"><div class="nm">' + E(r.n) +
        (c.prices[r.n] != null ? ' <span style="color:var(--orange);font-size:11px">(معدّل)</span>' : "") + "</div>" +
        '<input type="number" value="' + v + '" style="width:78px;background:var(--card2);border:1px solid var(--line2);' +
        'border-radius:10px;padding:7px;text-align:center;font-weight:800;direction:ltr" ' +
        "onchange=\"Own.setPrice('" + E(r.n).replace(/'/g, "&#39;") + "',this.value)\"></div>";
    }).join("");
  }
  function setPrice(n, v) {
    var c = FS.control();
    v = parseInt(v, 10);
    var rec = FS.byName(n);
    if (!v || (rec && v === rec.price)) delete c.prices[n]; else c.prices[n] = v;
    FS.saveControl(c); renderPr($("prSearch").value.trim());
  }
  /* ================= حاسبة العائد ================= */
  function calc() {
    var ord = +$("rOrd").value || 0, avg = +$("rAvg").value || 0,
      up = +$("rUp").value || 0, price = +$("rPrice").value || 0;
    var month = ord * up * 30, year = month * 12;
    var dailyGain = ord * up;
    $("oMonth").textContent = FS.money(month);
    $("oYear").textContent = FS.money(year);
    $("oDays").textContent = dailyGain ? Math.ceil(price / dailyGain) : 0;
    $("oRoi").textContent = price ? (year / price).toFixed(1) : "0";
    $("oHalf").textContent = FS.money(month / 2);
    $("oHalfD").textContent = dailyGain ? Math.ceil(price / (dailyGain / 2)) : 0;
  }

  /* ================= عام ================= */
  function refreshAll(fromEvent) {
    refreshOrders(fromEvent);
    paintStats();
    paintControl();
    $("demoChip").innerHTML = demo ? "وضع العرض التجريبي" : "بيانات حقيقية فقط";
    $("demoChip").style.background = demo ? "" : "var(--green-soft)";
    $("demoChip").style.color = demo ? "" : "var(--green)";
    $("demoNote").textContent = demo
      ? "اللوحة تعرض بيانات تجريبية لـ ٣٠ يوم عشان تشوف النظام شغال. اضغط عشان تشوف البيانات الحقيقية بس."
      : "هذي البيانات الحقيقية اللي انسجلت من رابط العميل على هذا الجهاز.";
  }
  function tab(id, btn) {
    activePane = id;
    [].forEach.call(document.querySelectorAll(".pane"), function (p) { p.classList.remove("on"); });
    $("pane-" + id).classList.add("on");
    [].forEach.call($("tabs2").children, function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    if (id === "or") { FS.markAllSeen(); stopAlarm(); paintOrders(); updateBadge(); }
    window.scrollTo(0, 0);
  }
  function theme() {
    var c = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", c);
    FS.set(FS.K.theme, c);
  }
  function tglSound() {
    soundOn = !soundOn;
    FS.set("fsys.sound.v1", soundOn);
    $("sndOff").classList.toggle("hidden", soundOn);
    if (soundOn) chime(); else stopAlarm();
  }

  var refT = null;
  function init() {
    document.documentElement.setAttribute("data-theme", FS.get(FS.K.theme, "dark"));
    FS.ensureSeed();
    $("brandName").textContent = M.brand.nameAr;
    $("sndOff").classList.toggle("hidden", soundOn);
    $("rOrd").value = S.roi.ordersPerDay;
    $("rAvg").value = S.roi.avgTicket;
    $("rUp").value = S.roi.upliftEGP;
    $("rPrice").value = S.roi.priceEGP;
    ["rOrd", "rAvg", "rUp", "rPrice"].forEach(function (i) { $(i).addEventListener("input", calc); });
    calc();
    $("range").addEventListener("change", function (e) { days = +e.target.value; paintStats(); });
    $("soSearch").addEventListener("input", function (e) { renderSo(e.target.value.trim()); });
    $("prSearch").addEventListener("input", function (e) { renderPr(e.target.value.trim()); });
    refreshAll(false);

    // أي حاجة تحصل من تاب العميل → تحديث لحظي
    FS.onMsg(function (m) {
      if (m.type === "order") { refreshOrders(true); paintStats(); return; }
      if (m.type === "order_update") { refreshOrders(false); paintStats(); return; }
      clearTimeout(refT);
      refT = setTimeout(function () { refreshAll(false); }, 400);
    });
  }

  window.Own = {
    tab: tab, theme: theme, tglSound: tglSound, setFilter: function (f) { filter = f; paintOrders(); },
    setSt: setSt, cancelOrder: cancelOrder, printOrder: printOrder,
    tglSold: tglSold, setPrice: setPrice,
    exportCsv: exportCsv,
    tglDemo: function () { demo = !demo; filter = "all"; refreshAll(false); },
    reset: function () {
      if (confirm("بينمسح كل شي وينولد ٣٠ يوم تجريبي من جديد. أكيد؟")) { FS.reset(); location.reload(); }
    }
  };
  document.addEventListener("DOMContentLoaded", init);
})();
