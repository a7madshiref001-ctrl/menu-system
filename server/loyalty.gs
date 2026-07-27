/* ============================================================
   الطبقة السيرفرية الاختيارية — Google Apps Script (مجاني بالكامل)
   ------------------------------------------------------------
   ليه موجودة؟
   كل الحماية اللي في النظام شغّالة على موبايل العميل (localStorage).
   دي بتقفل الطريق قدام أي حد عادي — بس حد فاهم برمجة يقدر يفتح
   DevTools ويمسح الأختام أو يزوّدها. الملف ده بينقل الأختام
   وأكواد الهدايا لجوجل شيت، فتبقى بره إيد العميل خالص.

   إزاي تشغّلها (١٠ دقايق، من غير أي فلوس):
   1) افتح https://sheets.new واعمل شيت جديد اسمه "friends-loyalty"
   2) من الشيت: Extensions ← Apps Script
   3) امسح اللي فيه والصق الملف ده كله
   4) Deploy ← New deployment ← Web app
        Execute as: Me
        Who has access: Anyone
   5) انسخ الرابط اللي هيطلعلك وحطه في data/sales.js:
        endpoint: "https://script.google.com/macros/s/..../exec"

   ⚠ مهم: حط الرابط في endpoint لوحده = الأحداث بس هي اللي هتتبعت
   للشيت (تتبّع). عشان الأختام نفسها تتخزن هنا لازم كمان نوصّل
   awardStamp و redeemReward في assets/sys.js بالسيرفر ده — دي
   شغلانة نص يوم تقريبًا وساعتها الحماية تبقى مقفولة ١٠٠٪.
   ============================================================ */

var SHEET_STAMPS = "stamps";
var SHEET_REWARDS = "rewards";
var SHEET_EVENTS = "events";

var MIN_ORDER = 25;      // نفس الرقم اللي في sales.js
var GOAL = 5;
var MAX_PER_DAY = 1;
var CODE_LIFE_DAYS = 30;

function sheet(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);                       // من غير ده ممكن أوردرين في نفس اللحظة يدّوا ختمين
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var out;
    switch (body.action) {
      case "stamp":  out = awardStamp(body); break;
      case "card":   out = readCard(body.phone); break;
      case "redeem": out = redeem(body.code); break;
      default:       out = logEvent(body); break;
    }
    return json(out);
  } catch (err) {
    return json({ ok: false, msg: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.phone) return json(readCard(e.parameter.phone));
  return json({ ok: true, msg: "friends loyalty service" });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function dayKey(d) {
  return Utilities.formatDate(d, "Asia/Riyadh", "yyyy-MM-dd");
}

/* ---------- الأختام ---------- */
/* بيتنده لما الأونر يعلّم الأوردر «اتسلم» — مش لما العميل يبعت */
function awardStamp(b) {
  var phone = String(b.phone || "").trim();
  var total = Number(b.total || 0);
  var orderId = String(b.orderId || "");
  if (!phone) return { ok: false, err: "مفيش رقم موبايل" };
  if (total < MIN_ORDER) return { ok: false, err: "الأوردر أقل من " + MIN_ORDER };

  var sh = sheet(SHEET_STAMPS, ["at", "phone", "orderId", "total", "day"]);
  var rows = sh.getDataRange().getValues();
  var today = dayKey(new Date());
  var mine = 0, todayCount = 0;

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) !== phone) continue;
    if (String(rows[i][2]) === orderId) return { ok: false, err: "الأوردر ده اتحسب قبل كده" };
    mine++;
    if (String(rows[i][4]) === today) todayCount++;
  }
  if (todayCount >= MAX_PER_DAY) return { ok: false, err: "الرقم ده خد ختمه النهاردة" };

  sh.appendRow([new Date(), phone, orderId, total, today]);
  mine++;

  var used = countRewards(phone);
  var n = mine - used * GOAL;               // الأختام المتبقية بعد الهدايا اللي اتفتحت
  var reward = null;
  if (n >= GOAL) reward = openReward(phone);
  return { ok: true, phone: phone, n: reward ? 0 : n, goal: GOAL, total: mine, reward: reward };
}

function countRewards(phone) {
  var sh = sheet(SHEET_REWARDS, ["at", "phone", "code", "used", "usedAt"]);
  var rows = sh.getDataRange().getValues(), c = 0;
  for (var i = 1; i < rows.length; i++) if (String(rows[i][1]) === phone) c++;
  return c;
}

function openReward(phone) {
  var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", code = "FR-";
  for (var i = 0; i < 4; i++) code += A.charAt(Math.floor(Math.random() * A.length));
  sheet(SHEET_REWARDS, ["at", "phone", "code", "used", "usedAt"])
    .appendRow([new Date(), phone, code, false, ""]);
  return { code: code, at: new Date().getTime() };
}

function readCard(phone) {
  phone = String(phone || "").trim();
  if (!phone) return { ok: false, err: "مفيش رقم" };
  var st = sheet(SHEET_STAMPS, ["at", "phone", "orderId", "total", "day"]).getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < st.length; i++) if (String(st[i][1]) === phone) total++;

  var rw = sheet(SHEET_REWARDS, ["at", "phone", "code", "used", "usedAt"]).getDataRange().getValues();
  var open = [], count = 0, life = CODE_LIFE_DAYS * 86400000, now = new Date().getTime();
  for (var j = 1; j < rw.length; j++) {
    if (String(rw[j][1]) !== phone) continue;
    count++;
    var at = new Date(rw[j][0]).getTime();
    if (rw[j][3] !== true && rw[j][3] !== "TRUE" && now - at <= life)
      open.push({ code: String(rw[j][2]), at: at });
  }
  return { ok: true, phone: phone, total: total, n: total - count * GOAL, goal: GOAL, rewards: open };
}

/* ---------- حرق كود الهدية ---------- */
function redeem(code) {
  code = String(code || "").trim().toUpperCase();
  if (!code) return { ok: false, msg: "اكتب الكود" };
  var sh = sheet(SHEET_REWARDS, ["at", "phone", "code", "used", "usedAt"]);
  var rows = sh.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][2]).toUpperCase() !== code) continue;
    if (rows[i][3] === true || rows[i][3] === "TRUE")
      return { ok: false, msg: "الكود ده اتصرف قبل كده — " + rows[i][4] };
    var at = new Date(rows[i][0]).getTime();
    if (new Date().getTime() - at > CODE_LIFE_DAYS * 86400000)
      return { ok: false, msg: "الكود ده انتهت صلاحيته" };
    sh.getRange(i + 1, 4).setValue(true);
    sh.getRange(i + 1, 5).setValue(new Date());
    return { ok: true, msg: "اتصرف لصاحب الرقم " + rows[i][1], phone: String(rows[i][1]) };
  }
  return { ok: false, msg: "الكود ده مش موجود" };
}

/* ---------- تتبّع عادي (اللي بيوصل من SALES.endpoint) ---------- */
function logEvent(b) {
  sheet(SHEET_EVENTS, ["at", "event", "visitor", "payload"])
    .appendRow([new Date(), String(b.e || ""), String(b.vid || ""), JSON.stringify(b)]);
  return { ok: true };
}
