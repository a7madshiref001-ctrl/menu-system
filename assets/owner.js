/* ============================================================
   لوحة الأونر — الأرقام اللي المنيو المطبوع ما بيقولهاش
   ============================================================ */
(function () {
  "use strict";
  var M = window.MENU, S = window.SALES, E = FS.esc, $ = function (i) { return document.getElementById(i); };
  var CUR = M.brand.currency || "ج";
  var DOW = ["الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];
  var days = 30, demo = true, A = null;

  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }

  /* ---------------- رسم ---------------- */
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
    if (!rows.length) { $(id).innerHTML = '<div class="empty" style="padding:22px;color:var(--txt3);font-size:13px;text-align:center">مفيش بيانات في الفترة دي</div>'; return; }
    var mx = Math.max.apply(null, rows.map(function (r) { return r.bar || 0; }).concat([1]));
    $(id).innerHTML = rows.map(function (r, i) {
      return '<div class="rw">' + (opt.rank ? '<div class="rk">' + (i + 1) + "</div>" : "") +
        '<div class="nm"><b>' + E(r.n) + "</b><span>" + E(r.sub || "") + "</span>" +
        (r.bar != null ? '<div class="trk"><i style="width:' + (r.bar / mx * 100) + '%"></i></div>' : "") +
        "</div>" +
        '<div class="mt">' + E(r.v) + (r.v2 ? "<small>" + E(r.v2) + "</small>" : "") + "</div></div>";
    }).join("");
  }

  /* ---------------- نظرة عامة ---------------- */
  function paintOverview() {
    $("hAdd").textContent = FS.money(A.upRevenue + A.addonRevenue);
    $("kVis").textContent = FS.money(A.visits);
    $("kVisD").textContent = "≈ " + A.perDayVisits + " زائر في اليوم";
    $("kOrd").textContent = FS.money(A.orders);
    $("kOrdD").textContent = A.convRate + "٪ من الزوار بعتوا طلب";
    $("kAvg").textContent = FS.money(A.avgTicket);
    $("kUp").textContent = A.upRate;

    bars("hourBars", "hourAxis", A.byHour,
      A.byHour.map(function (_, i) { return i % 3 === 0 ? i : ""; }));
    var pk = A.byHour.indexOf(Math.max.apply(null, A.byHour));
    var lowEv = A.byHour.map(function (v, i) { return { v: v, i: i }; })
      .filter(function (r) { return r.i >= 12 && r.i <= 21; }).sort(function (a, b) { return a.v - b.v; })[0];
    $("peakMsg").innerHTML = "أعلى ساعة عندك <b>" + pk + ":00</b> — لازم تبقى كامل العدد فيها. " +
      "وأضعف ساعة <b>" + (lowEv ? lowEv.i : "-") + ":00</b> — دي مكان العرض المحدود.";

    bars("dowBars", "dowAxis", A.byDow, ["ح", "ن", "ث", "ر", "خ", "ج", "س"]);
    var bi = A.byDow.indexOf(Math.max.apply(null, A.byDow));
    var wi = A.byDow.indexOf(Math.min.apply(null, A.byDow.filter(function (x) { return x > 0; })));
    $("dowMsg").innerHTML = "أقوى يوم <b>" + DOW[bi] + "</b> وأضعف يوم <b>" + DOW[wi < 0 ? 1 : wi] +
      "</b>. حط عرض على اليوم الضعيف بس — مش على الأسبوع كله.";

    var steps = [
      { n: "فتح المنيو", v: A.fVisits },
      { n: "فتح صنف", v: A.fViewed },
      { n: "ضاف للسلة", v: A.fCarted },
      { n: "بعت الطلب", v: A.orders }
    ];
    var base = steps[0].v || 1;
    $("funnel").innerHTML = steps.map(function (s) {
      var p = pct(s.v, base);
      return '<div class="fst"><div class="fill" style="width:' + p + '%"></div>' +
        '<div class="ct"><b>' + s.n + '</b><span class="n mono">' + FS.money(s.v) + '</span>' +
        '<span class="pc mono">' + p + "٪</span></div></div>";
    }).join("");

    var secs = M.sections.map(function (s) {
      return { id: s.id, t: s.title, v: A.revBySection[s.id] || 0 };
    }).sort(function (a, b) { return b.v - a.v; });
    rowList("secRev", secs.map(function (s) {
      return { n: s.t, sub: pct(s.v, A.revenue) + "٪ من الإيراد", v: FS.money(s.v) + " " + CUR, bar: s.v };
    }));
  }

  /* ---------------- الأصناف ---------------- */
  function paintItems() {
    rowList("topItems", A.top.slice(0, 12).map(function (r) {
      return {
        n: r.n, sub: r.sec + " · اتطلب " + r.orders + " مرة",
        v: FS.money(r.views), v2: "مشاهدة", bar: r.views
      };
    }), { rank: true });

    rowList("topRev", A.topRev.slice(0, 12).map(function (r) {
      return { n: r.n, sub: r.q + " طلب", v: FS.money(r.rev) + " " + CUR, bar: r.rev };
    }), { rank: true });

    rowList("leak", A.leak.map(function (r) {
      return {
        n: r.n, sub: "اتشاف " + r.views + " مرة · اتطلب " + r.orders + " · سعره " + r.price + " " + CUR,
        v: pct(r.orders, r.views) + "٪", v2: "تحويل"
      };
    }));

    $("deadN").textContent = A.dead.length;
    $("deadList").innerHTML = A.dead.length
      ? A.dead.map(function (d) { return "<span>" + E(d.n) + " · " + d.price + " " + CUR + "</span>"; }).join("")
      : '<div style="color:var(--txt3);font-size:13px">كل الأصناف اتشافت — عاش 👏</div>';
  }

  /* ---------------- الطلبات والعملاء ---------------- */
  function paintOrders() {
    $("kRev").textContent = FS.money(A.revenue);
    $("kUpRev").textContent = FS.money(A.upRevenue);
    $("kAdRev").textContent = FS.money(A.addonRevenue);

    var rs = A.reviews;
    var avg = rs.length ? (rs.reduce(function (a, r) { return a + r.stars; }, 0) / rs.length) : 0;
    $("kStars").textContent = avg ? avg.toFixed(1) : "0";
    var low = rs.filter(function (r) { return r.stars < S.review.threshold; }).length;
    $("kStarsD").textContent = rs.length + " تقييم · " + low + " شكوى اتمسكت قبل جوجل";

    var ords = A.orderList.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 14);
    $("orders").innerHTML = ords.length ? ords.map(function (o) {
      var d = new Date(o.t);
      var names = (o.lines || []).map(function (l) { return l.n; }).slice(0, 3).join(" · ");
      return '<div class="ordrow"><div class="id">' + E(o.id) + "</div>" +
        '<div class="nm"><b>' + E(o.mode) + (o.table ? " · ترابيزة " + E(o.table) : "") + "</b>" +
        E(names) + ((o.lines || []).length > 3 ? " +" + (o.lines.length - 3) : "") +
        "<br><span style='font-size:10.5px;color:var(--txt3)'>" +
        d.toLocaleDateString("ar-EG") + " " + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0") +
        "</span></div>" +
        '<div class="v">' + FS.money(o.total) + " " + CUR + "</div></div>";
    }).join("") : '<div style="color:var(--txt3);font-size:13px;padding:16px 0">لسه مفيش طلبات</div>';

    $("reviews").innerHTML = rs.length ? rs.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 12).map(function (r) {
      return '<div class="revrow"><div class="stars-s">' + "★".repeat(r.stars) + "</div>" +
        '<div class="bd">' + (r.note ? E(r.note) : (r.stars >= 4 ? "تقييم إيجابي" : "بدون تعليق")) + "</div>" +
        '<div class="tg ' + (r.sent === "google" ? "g" : "o") + '">' +
        (r.sent === "google" ? "راح لجوجل" : "وصلك انت") + "</div></div>";
    }).join("") : '<div style="color:var(--txt3);font-size:13px;padding:16px 0">لسه مفيش تقييمات</div>';

    var cs = A.customers.slice().sort(function (a, b) { return b.t - a.t; });
    $("cusN").textContent = "(" + cs.length + " رقم)";
    $("customers").innerHTML = cs.length ? cs.slice(0, 20).map(function (c) {
      return '<div class="ordrow"><div class="nm"><b>' + E(c.name || "عميل") + "</b>" +
        '<span style="direction:ltr;display:inline-block">' + E(c.phone) + "</span></div>" +
        '<div class="v">' + FS.money(c.spent || 0) + " " + CUR + "</div></div>";
    }).join("") : '<div style="color:var(--txt3);font-size:13px;padding:16px 0">لسه مفيش أرقام</div>';
  }

  function exportCsv() {
    var rows = [["الاسم", "الموبايل", "قيمة الطلب", "التاريخ"]].concat(
      A.customers.map(function (c) {
        return [c.name || "", c.phone, c.spent || 0, new Date(c.t).toLocaleDateString("ar-EG")];
      }));
    var csv = "﻿" + rows.map(function (r) { return r.join(","); }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "friends-customers.csv"; a.click();
  }

  /* ---------------- تحكّم فوري ---------------- */
  function paintControl() {
    var c = FS.control();
    $("swOffer").classList.toggle("on", c.offerOn == null ? S.offer.on : c.offerOn);
    $("offT2").value = c.offerTitle || S.offer.title;
    $("offB2").value = c.offerBody || S.offer.body;
    renderSo(""); renderPr("");
    var url = location.href.replace(/owner\.html.*$/, "");
    $("links").innerHTML =
      '<div class="rw"><div class="nm"><b>لينك العميل (على الترابيزة / QR)</b><span style="direction:ltr;display:inline-block">' +
      E(url) + '</span></div><div class="mt"><a class="btn btn-s" style="font-size:12px;padding:8px 12px" href="' +
      E(url) + '" target="_blank">افتح</a></div></div>' +
      '<div class="rw"><div class="nm"><b>لينك الأونر (اللوحة دي)</b><span style="direction:ltr;display:inline-block">' +
      E(url + "owner.html") + "</span></div></div>";
  }
  function renderSo(q) {
    var c = FS.control();
    var list = FS.items().filter(function (r) {
      return !q || r.n.indexOf(q) > -1 || c.soldOut.indexOf(r.n) > -1;
    });
    // اللي مقفول يظهر فوق
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
  function tglOffer() {
    var c = FS.control();
    var now = c.offerOn == null ? S.offer.on : c.offerOn;
    c.offerOn = !now; FS.saveControl(c);
    $("swOffer").classList.toggle("on", c.offerOn);
  }
  function saveOffer() {
    var c = FS.control();
    c.offerTitle = $("offT2").value.trim();
    c.offerBody = $("offB2").value.trim();
    FS.saveControl(c);
    alert("اتحدّث ✓ — افتح لينك العميل هتلاقي العرض اتغيّر");
  }

  /* ---------------- حاسبة العائد ---------------- */
  function calc() {
    var ord = +$("rOrd").value || 0, avg = +$("rAvg").value || 0,
      up = +$("rUp").value || 0, price = +$("rPrice").value || 0;
    var month = ord * up * 30, year = month * 12;
    var dailyGain = ord * up;
    var backDays = dailyGain ? Math.ceil(price / dailyGain) : 0;
    $("oMonth").textContent = FS.money(month);
    $("oYear").textContent = FS.money(year);
    $("oDays").textContent = backDays;
    $("oRoi").textContent = price ? (year / price).toFixed(1) : "0";
    $("oHalf").textContent = FS.money(month / 2);
    $("oHalfD").textContent = dailyGain ? Math.ceil(price / (dailyGain / 2)) : 0;
  }

  /* ---------------- عام ---------------- */
  function refresh() {
    A = FS.agg(days, demo);
    paintOverview(); paintItems(); paintOrders(); paintControl();
    $("demoChip").innerHTML = demo ? "● وضع العرض التجريبي" : "○ بيانات حقيقية فقط";
    $("demoChip").style.background = demo ? "" : "var(--green-soft)";
    $("demoChip").style.color = demo ? "" : "var(--green)";
    $("demoNote").textContent = demo
      ? "اللوحة دلوقتي بتعرض بيانات تجريبية لـ ٣٠ يوم عشان تشوف السيستم شغال. دوس عشان تشوف البيانات الحقيقية اللي اتسجلت من لينك العميل بس."
      : "دي البيانات الحقيقية اللي اتسجّلت فعلًا من لينك العميل على الجهاز ده.";
  }
  function tab(id, btn) {
    [].forEach.call(document.querySelectorAll(".pane"), function (p) { p.classList.remove("on"); });
    $("pane-" + id).classList.add("on");
    [].forEach.call($("tabs2").children, function (b) { b.classList.remove("on"); });
    btn.classList.add("on");
    window.scrollTo(0, 0);
  }
  function theme() {
    var c = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", c);
    FS.set(FS.K.theme, c);
  }

  function init() {
    document.documentElement.setAttribute("data-theme", FS.get(FS.K.theme, "dark"));
    FS.ensureSeed();
    $("brandName").textContent = M.brand.nameAr;
    $("rOrd").value = S.roi.ordersPerDay;
    $("rAvg").value = S.roi.avgTicket;
    $("rUp").value = S.roi.upliftEGP;
    $("rPrice").value = S.roi.priceEGP;
    ["rOrd", "rAvg", "rUp", "rPrice"].forEach(function (i) { $(i).addEventListener("input", calc); });
    calc();
    $("range").addEventListener("change", function (e) { days = +e.target.value; refresh(); });
    $("soSearch").addEventListener("input", function (e) { renderSo(e.target.value.trim()); });
    $("prSearch").addEventListener("input", function (e) { renderPr(e.target.value.trim()); });
    refresh();
    // تحديث لحظي لما العميل يعمل أي حاجة
    FS.onMsg(function () { clearTimeout(init._t); init._t = setTimeout(refresh, 400); });
  }

  window.Own = {
    tab: tab, theme: theme, tglSold: tglSold, setPrice: setPrice,
    tglOffer: tglOffer, saveOffer: saveOffer, exportCsv: exportCsv,
    print: function () { window.print(); },
    tglDemo: function () { demo = !demo; refresh(); },
    reset: function () {
      if (confirm("هيمسح كل البيانات ويولّد ٣٠ يوم تجريبي من جديد. تمام؟")) { FS.reset(); location.reload(); }
    }
  };
  document.addEventListener("DOMContentLoaded", init);
})();
