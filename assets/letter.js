/* 경기도다문화교육연구회 홈페이지 - 다국어 가정통신문
 * - 홈페이지에서 통신문을 쓰고, 자동 번역을 사람이 고친 뒤 저장합니다.
 * - 인쇄하면 고른 언어와 한국어가 함께 나옵니다.
 * - 학교·기관 통신문 양식(PDF)을 올리면 그 틀(머리글, 로고, 결재란 등)을 그대로 두고 내용만 바꿔 인쇄합니다.
 * 이 파일은 고치지 않아도 됩니다.
 */
(window.GGMCE_MODULES = window.GGMCE_MODULES || []).push(function (G) {
  "use strict";
  var esc = G.esc, $ = G.$, $$ = G.$$, U = G.ui;
  var MM = 96 / 25.4;
  var PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  var PDFDATA = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/";  // 한글 글꼴 정보(cmaps)
  var DEF_ZONES = [
    { t: "title", x: 0.09, y: 0.125, w: 0.82, h: 0.075 },
    { t: "body", x: 0.09, y: 0.215, w: 0.82, h: 0.665 },
    { t: "foot", x: 0.09, y: 0.895, w: 0.82, h: 0.06 }
  ];
  var ZT = { body: ["본문", "#3157D5"], title: ["제목", "#0E8F7C"], foot: ["날짜·보낸 곳", "#D98A00"], erase: ["지울 곳", "#6b7280"] };
  var FONT = { th: "Noto Sans Thai", km: "Noto Sans Khmer", my: "Noto Sans Myanmar", lo: "Noto Sans Lao", si: "Noto Sans Sinhala", bn: "Noto Sans Bengali",
    hi: "Noto Sans Devanagari", ne: "Noto Sans Devanagari", ta: "Noto Sans Tamil", pa: "Noto Sans Gurmukhi", am: "Noto Sans Ethiopic",
    ar: "Noto Naskh Arabic", fa: "Noto Naskh Arabic", ps: "Noto Naskh Arabic", ur: "Noto Nastaliq Urdu", "zh-CN": "Noto Sans SC", "zh-TW": "Noto Sans TC", ja: "Noto Sans JP" };
  var trCache = {}, imgCache = {}, rawCache = {};
  var LV = { id: "", lang: "", layout: "alt", order: "tr", size: "m", tpl: "", tab: "" };
  var token = 0;

  function langs() { return G.LANGS.filter(function (l) { return l.code !== "ko"; }); }
  function isRtl(code) { return G.RTL.indexOf(String(code).split("-")[0]) >= 0; }
  function ff(code) { return (FONT[code] ? "'" + FONT[code] + "'," : "") + "'Noto Sans KR',sans-serif"; }
  function letters() { return G.rows("통신문").sort(function (a, b) { return String(b.날짜 || b.등록일).localeCompare(String(a.날짜 || a.등록일)); }); }
  function templates() { return G.rows("통신문양식").sort(function (a, b) { return String(a.이름).localeCompare(String(b.이름)); }); }
  function tplById(id) { return templates().filter(function (t) { return t.id === id; })[0] || null; }
  function zonesOf(t) { try { var z = JSON.parse(t.영역); return z && z.length ? z : DEF_ZONES; } catch (e) { return DEF_ZONES; } }
  function savedLangs(L) { return String(L.언어 || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean); }
  function lines(s) { return String(s == null ? "" : s).split("\n"); }

  /* ---------- 데이터 불러오기 ---------- */
  function getTr(id) {
    if (trCache[id]) return Promise.resolve(trCache[id]);
    if (!G.live()) {
      var o = {};
      (G.db().통신문번역 || []).forEach(function (r) { if (String(r.통신문id) === String(id)) o[r.언어] = r; });
      trCache[id] = o; return Promise.resolve(o);
    }
    return G.apiGet({ action: "letter", id: id }).then(function (j) { trCache[id] = j.tr || {}; return trCache[id]; });
  }
  function ensureLang(id, lang) {
    return getTr(id).then(function (tr) {
      if (tr[lang]) return tr[lang];
      if (!G.live()) return null;
      return G.post({ action: "letterLang", id: id, lang: lang }).then(function (j) { tr[lang] = j.tr; return j.tr; });
    });
  }
  function loadImage(src) {
    return new Promise(function (ok, bad) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { bad(new Error("그림을 불러오지 못했어요.")); }; im.src = src; });
  }
  function getRaw(t) {
    if (rawCache[t.id]) return Promise.resolve(rawCache[t.id]);
    return G.apiGet({ action: "image", id: t.id }).then(function (j) { return (rawCache[t.id] = "data:" + j.mime + ";base64," + j.data); });
  }
  /** 양식 그림에서 내용이 들어갈 자리와 '지울 곳'을 하얗게 지웁니다. */
  function eraseZones(src, zones) {
    return loadImage(src).then(function (im) {
      var c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
      var x = c.getContext("2d"); x.drawImage(im, 0, 0); x.fillStyle = "#fff";
      zones.forEach(function (z) { x.fillRect(Math.floor(z.x * c.width), Math.floor(z.y * c.height), Math.ceil(z.w * c.width) + 1, Math.ceil(z.h * c.height) + 1); });
      return c.toDataURL("image/jpeg", 0.92);
    });
  }
  function getTplImage(t) {
    if (imgCache[t.id]) return Promise.resolve(imgCache[t.id]);
    return getRaw(t).then(function (raw) { return eraseZones(raw, zonesOf(t)); }).then(function (u) { return (imgCache[t.id] = u); });
  }
  var fontLinks = {};
  function loadFont(fam, sample) {
    if (!fam || !document.fonts || !document.fonts.load) return Promise.resolve();
    var p = fontLinks[fam];
    if (!p) {
      p = fontLinks[fam] = new Promise(function (ok) {
        var l = document.createElement("link"); l.rel = "stylesheet";
        l.href = "https://fonts.googleapis.com/css2?family=" + fam.replace(/ /g, "+") + ":wght@400;700&display=swap";
        l.onload = ok; l.onerror = ok; document.head.appendChild(l); setTimeout(ok, 4000);
      });
    }
    return p.then(function () {
      return Promise.race([
        Promise.all([document.fonts.load("16px '" + fam + "'", sample || "가"), document.fonts.load("bold 16px '" + fam + "'", sample || "가")]),
        new Promise(function (ok) { setTimeout(ok, 4000); })
      ]);
    }).catch(function () {});
  }
  function loadFontsFor(L, tr, lang) {
    var ko = [L.제목, L.한국어, L.회신서, L.보낸곳].join(" ").slice(0, 3000);
    var jobs = [loadFont("Noto Sans KR", ko + "가정통신문 회신서 년월일")];
    if (tr && FONT[lang]) jobs.push(loadFont(FONT[lang], [tr.제목, tr.내용, tr.회신서, tr.보낸곳, tr.머리, tr.회신].join(" ").slice(0, 3000)));
    return Promise.all(jobs);
  }

  /* ---------- 인쇄 화면 만들기 ---------- */
  function dateText(d, lang) {
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(d || "");
    if (!m) return d || "";
    if (lang === "ko") return m[1] + "년 " + +m[2] + "월 " + +m[3] + "일";
    try { return new Intl.DateTimeFormat(lang === "tl" ? "fil" : lang, { year: "numeric", month: "long", day: "numeric" }).format(new Date(+m[1], +m[2] - 1, +m[3])); } catch (e) { return d; }
  }
  /** 번역 한 줄과 한국어 한 줄을 배치에 맞게 묶습니다. */
  function pair(t, k, mode, c, cls) {
    var T = t ? '<p class="x tl" lang="' + esc(c.lang) + '" dir="' + (isRtl(c.lang) ? "rtl" : "ltr") + '" style="font-family:' + ff(c.lang) + '">' + esc(t) + "</p>" : "";
    var K = k ? '<p class="x ko" lang="ko">' + esc(k) + "</p>" : "";
    cls = "blk " + (cls || "");
    if (mode === "ko") return K ? '<div class="' + cls + '">' + K + "</div>" : "";
    if (mode === "tr") return T || K ? '<div class="' + cls + '">' + (T || K) + "</div>" : "";
    if (!T || !K) return '<div class="' + cls + '">' + (T || K) + "</div>";
    var a = c.order === "ko" ? K : T, b = c.order === "ko" ? T : K;
    if (mode === "side") return '<div class="' + cls + ' side"><div>' + a + "</div><div>" + b + "</div></div>";
    return '<div class="' + cls + ' alt">' + a + b.replace('class="x ', 'class="x sub ') + "</div>";
  }
  function lineBlocks(ko, tr, mode, c, cls) {
    var ks = lines(ko), ts = lines(tr), out = [];
    ks.forEach(function (k, i) {
      if (!k.trim()) { out.push('<div class="blk gap"></div>'); return; }
      out.push(pair(ts[i] || "", k, mode, c, cls));
    });
    while (out.length && out[out.length - 1] === '<div class="blk gap"></div>') out.pop();
    return out;
  }
  function over(el) { return el.scrollHeight > el.clientHeight + 1; }
  function fit(zone, html, maxPt, minPt) {
    zone.innerHTML = html;
    var pt = maxPt; zone.style.fontSize = pt + "pt";
    while (over(zone) && pt > minPt) { pt -= 0.5; zone.style.fontSize = pt + "pt"; }
  }
  function pageDims(tpl) { return { w: 210, h: tpl ? Math.round(210 * (Number(tpl.비율) || 1.4142) * 10) / 10 : 297 }; }

  /**
   * sheet 안에 인쇄할 쪽들을 만듭니다.
   * c = { L, tr, lang, layout(alt|side|sep), order(tr|ko), size(s|m|l), tpl, bg, koOnly }
   */
  function buildSheet(sheet, c) {
    sheet.innerHTML = "";
    var d = pageDims(c.tpl), zones = c.tpl ? zonesOf(c.tpl) : DEF_ZONES;
    sheet.style.setProperty("--fs", { s: "10pt", m: "11.5pt", l: "13pt" }[c.size] || "11.5pt");
    var modes = c.koOnly || !c.tr ? ["ko"] : c.layout === "sep" ? (c.order === "ko" ? ["ko", "tr"] : ["tr", "ko"]) : [c.layout === "side" ? "side" : "alt"];
    var site = G.setting("사이트이름") || "경기도다문화교육연구회";
    modes.forEach(function (mode) {
      var L = c.L, tr = c.tr || {};
      var has = {}; zones.forEach(function (z) { has[z.t] = true; });
      var title = pair(tr.제목, L.제목, mode, c, "ttl");
      var foot = pair(dateText(L.날짜, c.lang) + (tr.보낸곳 || L.보낸곳 ? "   " + (tr.보낸곳 || L.보낸곳) : ""), dateText(L.날짜, "ko") + (L.보낸곳 ? "   " + L.보낸곳 : ""), mode, c, "foot");
      var blocks = lineBlocks(L.한국어, tr.내용, mode, c, "");
      if (String(L.회신서 || "").trim()) {
        var lab = "회신서" + (mode !== "ko" && tr.회신 ? " · " + esc(tr.회신) : "");
        blocks.push('<div class="blk reply"><div class="blk cut"><span aria-hidden="true">✂</span><span class="cl"></span><b>' + (mode !== "ko" && tr.회신 ? '<span style="font-family:' + ff(c.lang) + '">' + lab + "</span>" : lab) + '</b><span class="cl"></span></div>' +
          title.replace("blk ttl", "blk ttl small") + lineBlocks(L.회신서, tr.회신서, mode, c, "").join("") + "</div>");
      }
      if (!has.title) blocks.unshift(title);
      if (!has.foot) blocks.push(foot.replace("blk foot", "blk foot inflow"));
      var head = c.tpl ? "" : '<div class="lt-head"><div class="org">' + esc(site) + '</div><div class="nm">가정통신문' +
        (mode !== "ko" && tr.머리 ? ' <span style="font-family:' + ff(c.lang) + '">' + esc(tr.머리) + "</span>" : "") + "</div></div>";

      function page(first) {
        var pg = document.createElement("div"); pg.className = "lt-page"; pg.style.width = d.w + "mm"; pg.style.height = d.h + "mm";
        if (first && c.bg) pg.innerHTML = '<img class="lt-bg" alt="" src="' + c.bg + '">';
        if (first && head) pg.insertAdjacentHTML("beforeend", head);
        var zs = first ? zones : [(function () { var b = zones.filter(function (z) { return z.t === "body"; })[0] || DEF_ZONES[1]; return { t: "body", x: b.x, y: 0.06, w: b.w, h: 0.87 }; })()];
        var got = {};
        zs.forEach(function (z) {
          if (z.t === "erase" || got[z.t]) return;
          var e = document.createElement("div"); e.className = "lt-z lt-z-" + z.t;
          e.style.left = z.x * 100 + "%"; e.style.top = z.y * 100 + "%"; e.style.width = z.w * 100 + "%"; e.style.height = z.h * 100 + "%";
          pg.appendChild(e); got[z.t] = e;
        });
        sheet.appendChild(pg);
        return got;
      }
      var z = page(true);
      if (z.title) fit(z.title, title, 20, 9);
      if (z.foot) fit(z.foot, foot, 12, 7);
      var body = z.body, queue = blocks.filter(Boolean);
      while (queue.length) {
        var html = queue.shift();
        if (!body.children.length && html === '<div class="blk gap"></div>') continue;
        body.insertAdjacentHTML("beforeend", html);
        var node = body.lastElementChild;
        if (!node || !over(body)) continue;
        if (body.children.length > 1) { node.remove(); body = page(false).body; queue.unshift(html); continue; }
        if (node.classList.contains("reply")) {
          node.remove();
          queue = Array.prototype.map.call(node.children, function (k) { return k.outerHTML; }).concat(queue);
        }
      }
    });
    var pages = $$(".lt-page", sheet);
    if (pages.length > 1) pages.forEach(function (p, i) { p.insertAdjacentHTML("beforeend", '<div class="lt-pno">' + (i + 1) + " / " + pages.length + "</div>"); });
    return d;
  }
  function scaleSheet(view, sheet, d) {
    var w = view.clientWidth || 600, px = d.w * MM, s = Math.min(1, (w - 2) / px);
    sheet.style.transform = "scale(" + s + ")";
    view.style.height = Math.ceil(sheet.scrollHeight * s) + 8 + "px";
  }
  function printSheet(sheet, d) {
    var root = document.getElementById("printRoot");
    if (!root) { root = document.createElement("div"); root.id = "printRoot"; root.className = "notranslate"; root.setAttribute("translate", "no"); document.body.appendChild(root); }
    root.innerHTML = sheet.innerHTML;
    var stl = document.createElement("style"); stl.id = "ltPageSize";
    stl.textContent = "@page{size:" + d.w + "mm " + d.h + "mm;margin:0}";
    document.head.appendChild(stl);
    root.style.setProperty("--fs", sheet.style.getPropertyValue("--fs"));
    var done = false;
    function clean() { if (done) return; done = true; document.documentElement.classList.remove("lt-printing"); stl.remove(); root.innerHTML = ""; }
    var imgs = $$("img", root).map(function (im) { return im.decode ? im.decode().catch(function () {}) : Promise.resolve(); });
    Promise.all(imgs).then(function () {
      document.documentElement.classList.add("lt-printing");
      window.addEventListener("afterprint", function () { setTimeout(clean, 100); }, { once: true });
      setTimeout(function () { window.print(); }, 50);
      setTimeout(clean, 120000);
    });
  }

  /* ---------- 통신문 목록 ---------- */
  G.route(/^letters$/, "teacher", function () {
    var s = U.st.letters, q = s.q.toLowerCase();
    var list = letters().filter(function (l) { return !q || (l.제목 + " " + l.한국어 + " " + l.보낸곳).toLowerCase().indexOf(q) >= 0; });
    return G.head("다국어 가정통신문", "통신문을 쓰면 여러 언어로 번역돼요. 인쇄하면 고른 언어와 한국어가 함께 나와요.", '<a href="#teacher">선생님 자료실</a>') +
      '<div class="wrap"><div class="board-top"><input class="search" type="search" id="ltQ" placeholder="통신문 검색" value="' + esc(s.q) + '" aria-label="통신문 검색">' +
      '<span class="sp"></span><a class="btn" href="#templates">🖼️ 양식 관리</a>' + (U.canWrite("통신문쓰기", "누구나") ? '<a class="btn solid" href="#write-letter">✏️ 통신문 만들기</a>' : "") + "</div>" +
      '<div id="ltList">' + U.table("letters", list, [
        { h: "제목", c: "t", v: function (l) { return esc(l.제목); } },
        { h: "보낸 곳", c: "by", v: function (l) { return esc(l.보낸곳); } },
        { h: "언어", c: "cat", v: function (l) { var n = savedLangs(l).length; return n ? '<span class="tag teacher">' + n + "개 언어</span>" : '<span class="tag">한국어</span>'; } },
        { h: "날짜", c: "d", v: function (l) { return esc(l.날짜 || l.등록일); } }
      ], function (l) { return "#letter-" + l.id; }, "아직 통신문이 없어요. 첫 통신문을 만들어 주세요.") + "</div>" +
      '<div class="note" style="margin-top:16px">📌 학교나 기관 통신문 양식이 있으면 <a href="#templates">양식 관리</a>에서 PDF로 올려 두세요. 머리글·로고·결재란은 그대로 두고 내용만 바꿔 인쇄할 수 있어요.</div></div>';
  });

  /* ---------- 통신문 보기·인쇄 ---------- */
  function langOptions(L, sel) {
    var have = savedLangs(L), all = langs();
    function opt(l, mark) { return '<option value="' + esc(l.code) + '"' + (l.code === sel ? " selected" : "") + ">" + esc(l.name) + mark + "</option>"; }
    var a = all.filter(function (l) { return have.indexOf(l.code) >= 0; }), b = all.filter(function (l) { return have.indexOf(l.code) < 0; });
    return (a.length ? '<optgroup label="번역 있음">' + a.map(function (l) { return opt(l, ""); }).join("") + "</optgroup>" : "") +
      '<optgroup label="고르면 자동 번역">' + b.map(function (l) { return opt(l, ""); }).join("") + "</optgroup>";
  }
  function tplOptions(sel) {
    return '<option value="">기본 양식 (연구회)</option>' + templates().map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === sel ? " selected" : "") + ">" + esc(t.이름) + "</option>"; }).join("");
  }
  G.route(/^letter-(.+)$/, "teacher", function (m) {
    var L = U.findItem("통신문", m[1]);
    if (!L) return G.V.notfound();
    if (LV.id !== L.id) {
      var site = G.getLang(), have = savedLangs(L), def = String(G.setting("통신문기본언어") || "vi").split(",")[0].trim();
      LV = { id: L.id, lang: site !== "ko" ? site : have[0] || def || "vi", layout: "alt", order: "tr", size: "m", tpl: L.양식 && tplById(L.양식) ? L.양식 : "", tab: site !== "ko" ? "read" : "print" };
    }
    function sel(id, label, opts) { return '<label for="' + id + '">' + label + '</label><select id="' + id + '">' + opts + "</select>"; }
    function o(v, t, cur) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + t + "</option>"; }
    return '<div class="wrap page-head"><div class="crumb"><a href="#letters">다국어 가정통신문</a></div>' +
      '<h1 class="notranslate" translate="no">' + esc(L.제목) + '</h1><p class="meta-line">' + esc(L.보낸곳) + " · " + esc(L.날짜 || L.등록일) + " · 작성 " + esc(L.작성) + "</p></div>" +
      '<div class="wrap lt-layout"><aside class="panel lt-ctl">' +
      sel("ltLang", "🌐 함께 넣을 언어", langOptions(L, LV.lang)) +
      '<p class="hint" id="ltStatus"></p>' +
      sel("ltLay", "배치", o("alt", "줄마다 번갈아 (번역 → 한국어)", LV.layout) + o("side", "좌우 나란히", LV.layout) + o("sep", "언어별로 따로 (번역본 + 한국어본)", LV.layout)) +
      sel("ltOrd", "먼저 나올 말", o("tr", "고른 언어 먼저", LV.order) + o("ko", "한국어 먼저", LV.order)) +
      sel("ltTpl", "양식", tplOptions(LV.tpl)) +
      sel("ltSize", "글자 크기", o("s", "작게", LV.size) + o("m", "보통", LV.size) + o("l", "크게", LV.size)) +
      '<div class="ctl-btns"><button class="btn solid" type="button" id="ltPrint">🖨 두 언어로 인쇄</button>' +
      '<button class="btn" type="button" id="ltPrintKo">한국어만 인쇄</button>' +
      '<button class="btn quiet" type="button" data-act="share">📤 보내기·QR</button></div>' +
      '<p class="hint">인쇄 창에서 대상(프린터)을 <b>PDF로 저장</b>으로 바꾸면 PDF 파일로 저장돼요. 여백은 "없음", 배율은 "100%"로 두세요.</p>' +
      '<div class="ctl-btns"><button class="btn small quiet" type="button" id="ltEditTr">✏️ 이 언어 번역 고치기</button></div>' +
      '<div class="item-actions" style="margin-top:8px"><a class="btn small quiet" href="#edit-letter-' + esc(L.id) + '">통신문 고치기</a>' +
      '<button class="btn small quiet" type="button" data-bdel="통신문" data-id="' + esc(L.id) + '" data-back="#letters">🗑 지우기</button>' +
      '<button class="linkish" type="button" data-report="통신문" data-id="' + esc(L.id) + '">신고</button></div>' +
      "</aside><section class=\"lt-main\">" +
      '<div class="seg" role="tablist"><button type="button" role="tab" data-lttab="print" aria-selected="' + (LV.tab === "print") + '">📄 인쇄 모양</button><button type="button" role="tab" data-lttab="read" aria-selected="' + (LV.tab === "read") + '">📖 화면으로 읽기</button></div>' +
      '<div id="ltView" class="lt-view notranslate' + (LV.tab === "print" ? "" : " off") + '" translate="no"><div class="lt-sheet" id="ltSheet"><p class="lt-wait">미리보기를 만드는 중…</p></div></div>' +
      '<div id="ltRead" class="article lt-read notranslate" translate="no"' + (LV.tab === "read" ? "" : " hidden") + '></div>' +
      "</section></div>";
  });

  function currentLetter() { var m = location.hash.match(/^#letter-(.+)$/); return m ? U.findItem("통신문", m[1]) : null; }
  function drawDetail() {
    var L = currentLetter(); if (!L) return;
    var my = ++token, status = $("#ltStatus"), sheet = $("#ltSheet"), view = $("#ltView");
    var tpl = LV.tpl ? tplById(LV.tpl) : null;
    if (status) status.textContent = "번역을 불러오는 중…";
    var trP = ensureLang(L.id, LV.lang).catch(function (x) { if (status) status.textContent = x.message; return null; });
    var bgP = tpl ? getTplImage(tpl).catch(function () { G.toast("양식 그림을 불러오지 못해 기본 양식으로 보여 드려요."); tpl = null; return ""; }) : Promise.resolve("");
    Promise.all([trP, bgP]).then(function (r) {
      var tr = r[0], bg = r[1];
      if (my !== token) return;
      if (status) status.innerHTML = tr ? '<span class="tag ' + (/사람|감수/.test(tr.감수 || "") && !/전/.test(tr.감수 || "") ? "ok" : "") + '">' + esc(tr.감수 || "자동 번역") + "</span>" + (/자동/.test(tr.감수 || "자동") ? " 자동 번역은 틀릴 수 있어요. 고칠 곳이 있으면 '번역 고치기'를 눌러 주세요." : "") : (G.live() ? "번역을 만들지 못했어요." : "예시 화면에서는 새 번역을 만들 수 없어요.");
      drawRead(L, tr);
      return loadFontsFor(L, tr, LV.lang).then(function () {
        if (my !== token || !sheet) return;
        var c = { L: L, tr: tr, lang: LV.lang, layout: LV.layout, order: LV.order, size: LV.size, tpl: bg ? tpl : null, bg: bg };
        var d = buildSheet(sheet, c);
        scaleSheet(view, sheet, d);
        LV.last = c; LV.dims = d;
      });
    });
  }
  function drawRead(L, tr) {
    var box = $("#ltRead"); if (!box) return;
    var name = G.langName(LV.lang), rtl = isRtl(LV.lang);
    function col(t, b, r, lang, title) {
      return '<div class="rd" lang="' + lang + '" dir="' + (lang !== "ko" && rtl ? "rtl" : "ltr") + '"' + (lang !== "ko" ? ' style="font-family:' + ff(lang) + '"' : "") + '><p class="rd-lab">' + esc(title) + "</p><h2>" + esc(t) + '</h2><div class="body">' + esc(b) + "</div>" +
        (String(r || "").trim() ? '<div class="rd-reply">' + esc(r) + "</div>" : "") + "</div>";
    }
    box.innerHTML = '<div class="article-tools"><button class="btn small quiet" type="button" id="ltSpeak">🔊 소리로 듣기</button></div>' +
      (tr ? col(tr.제목, tr.내용, tr.회신서, LV.lang, name) : "") + col(L.제목, L.한국어, L.회신서, "ko", "한국어");
    $("#ltSpeak").onclick = function () {
      if (!("speechSynthesis" in window)) { G.toast("이 기기에서는 소리로 듣기를 쓸 수 없어요"); return; }
      if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
      var u = new SpeechSynthesisUtterance(tr ? tr.제목 + "\n" + tr.내용 : L.제목 + "\n" + L.한국어);
      u.lang = tr ? LV.lang : "ko-KR"; speechSynthesis.speak(u);
    };
  }
  function openTrEditor() {
    var L = currentLetter(); if (!L) return;
    getTr(L.id).then(function (all) {
      var t = all[LV.lang];
      if (!t) { G.toast("번역을 먼저 불러와 주세요."); return; }
      G.openModal('<h2 id="modalTitle">' + esc(G.langName(LV.lang)) + ' 번역 고치기</h2><p class="hint">왼쪽 한국어 줄에 맞춰 오른쪽 번역을 고쳐 주세요. 줄 수는 그대로 두면 인쇄할 때 한국어와 짝이 맞아요.</p>' +
        '<form class="form" id="trEdForm">' + trEditor(LV.lang, L, t, true, true) +
        (G.admin() ? "" : '<label>올릴 때 정한 비밀번호<input name="pw" type="password" required autocomplete="current-password"></label>') +
        '<div class="err" role="alert"></div><div class="actions"><button class="btn" type="button" data-close>취소</button><button class="btn solid" type="submit">저장</button></div></form>');
      autosize($("#trEdForm"));
      $("#trEdForm").onsubmit = function (e) {
        e.preventDefault();
        var f = this, err = $(".err", f), btn = $("button[type=submit]", f);
        var nt = collectTr($(".tred", f), L); nt.감수 = "사람이 고침 " + U.today();
        U.busy(btn, true, "저장하는 중…");
        G.post({ action: "saveLetterLang", id: L.id, lang: LV.lang, tr: nt, password: f.pw ? f.pw.value : "" }).then(function () {
          all[LV.lang] = Object.assign({}, t, nt); G.closeModal(); G.toast("번역을 고쳤어요."); drawDetail();
        }).catch(function (x) { err.textContent = x.message; U.busy(btn, false); });
      };
    });
  }

  /* ---------- 줄 맞춤 번역 편집기 ---------- */
  function trEditor(code, src, t, open, noDrop) {
    var dir = isRtl(code) ? "rtl" : "ltr", style = ' lang="' + esc(code) + '" dir="' + dir + '" style="font-family:' + ff(code) + '"';
    function one(f, label, ko, v) { return '<div class="prow"><div class="pk"><small>' + label + "</small>" + esc(ko) + '</div><textarea rows="1" data-f="' + f + '"' + style + ">" + esc(v || "") + "</textarea></div>"; }
    function many(f, label, ko, v) {
      if (!String(ko || "").trim()) return "";
      var ks = lines(ko), ts = lines(v);
      return '<p class="pgrp">' + label + "</p>" + ks.map(function (k, i) {
        return k.trim() ? '<div class="prow"><div class="pk">' + esc(k) + '</div><textarea rows="1" data-f="' + f + '" data-i="' + i + '"' + style + ">" + esc(ts[i] || "") + "</textarea></div>" : '<div class="prow gap"></div>';
      }).join("");
    }
    return '<details class="tred" data-lang="' + esc(code) + '"' + (open ? " open" : "") + '><summary><b>' + esc(G.langName(code)) + '</b> <span class="tag">' + esc(t.감수 || "자동 번역") + "</span>" +
      (noDrop ? "" : ' <button type="button" class="linkish" data-trdrop="' + esc(code) + '">이 언어 빼기</button>') + '</summary><div class="pairs">' +
      one("제목", "제목", src.제목, t.제목) + one("보낸곳", "보낸 곳", src.보낸곳, t.보낸곳) +
      many("내용", "본문", src.한국어, t.내용) + many("회신서", "회신서", src.회신서, t.회신서) +
      one("머리", "머리글", "가정통신문", t.머리) + (String(src.회신서 || "").trim() ? one("회신", "회신서 이름", "회신서", t.회신) : "") +
      "</div></details>";
  }
  function collectTr(box, src) {
    var out = { 감수: "" };
    ["제목", "보낸곳", "머리", "회신"].forEach(function (f) { var x = $('textarea[data-f="' + f + '"]', box); out[f] = x ? x.value.trim() : ""; });
    ["내용", "회신서"].forEach(function (f) {
      var arr = lines(f === "내용" ? src.한국어 : src.회신서).map(function () { return ""; });
      $$('textarea[data-f="' + f + '"]', box).forEach(function (x) { arr[+x.getAttribute("data-i")] = x.value.replace(/\n+/g, " ").trim(); });
      out[f] = String(f === "내용" ? src.한국어 : src.회신서 || "").trim() ? arr.join("\n") : "";
    });
    return out;
  }
  function autosize(root) {
    $$("textarea[data-f]", root).forEach(function (x) {
      var fitH = function () { x.style.height = "auto"; x.style.height = x.scrollHeight + 2 + "px"; };
      x.addEventListener("input", fitH); setTimeout(fitH, 0);
    });
  }

  /* ---------- 통신문 쓰기·고치기 ---------- */
  var WS = null;
  function letterForm(L) {
    var edit = !!L;
    if (!edit && !U.canWrite("통신문쓰기", "누구나")) return G.head("통신문 만들기", "", '<a href="#letters">다국어 가정통신문</a>') + '<div class="wrap">' + U.needAdminBox("통신문") + "</div>";
    L = L || {};
    var def = edit ? savedLangs(L) : String(G.setting("통신문기본언어") || "zh-CN,vi,en,ru,th,uz").split(",").map(function (s) { return s.trim(); });
    WS = { id: L.id || "", tr: {}, sig: {}, sel: def.filter(function (c) { return langs().some(function (l) { return l.code === c; }); }), loaded: !edit, src: {} };
    return G.head(edit ? "통신문 고치기" : "통신문 만들기", "한국어로 쓰고 '번역 만들기'를 누르면 고른 언어로 번역돼요. 번역은 한 줄씩 고칠 수 있어요.", '<a href="#letters">다국어 가정통신문</a>') +
      '<div class="wrap">' + U.liveNote() + '<form class="form article page-form wide" id="letterForm" novalidate>' +
      '<h2 class="step"><span>1</span> 기본 정보</h2>' +
      U.field({ n: "제목", l: "제목", v: L.제목, req: true, max: 150, ph: "예: 현장체험학습 안내" }) +
      '<div class="fld-row">' + U.field({ n: "보낸곳", l: "보낸 곳", small: "(학교·기관 이름)", v: L.보낸곳 || G.setting("사이트이름"), max: 80, half: true }) +
      U.field({ n: "날짜", l: "날짜", t: "date", v: L.날짜 || U.today(), half: true }) + "</div>" +
      '<div class="fld"><label for="f-양식">양식 <small>(<a href="#templates">양식 관리</a>에서 PDF 양식을 올릴 수 있어요)</small></label><select id="f-양식" name="양식">' + tplOptions(L.양식 || "") + "</select></div>" +
      '<h2 class="step"><span>2</span> 내용 (한국어)</h2>' +
      U.field({ n: "한국어", l: "본문", t: "textarea", rows: 12, v: L.한국어, req: true, max: 8000, note: "한 줄이 번역 한 줄과 짝이 돼요. 문단 사이는 빈 줄로 띄워 주세요. 짧고 쉬운 문장일수록 번역이 정확해요." }) +
      U.field({ n: "회신서", l: "회신서", small: "(선택)", t: "textarea", rows: 5, v: L.회신서, max: 3000, ph: "[ ] 참가합니다   [ ] 참가하지 않습니다\n학생 이름:            보호자 서명:", note: "점선 아래에 붙는, 잘라서 돌려받는 부분이에요. 없으면 비워 두세요." }) +
      '<h2 class="step"><span>3</span> 번역할 언어</h2>' +
      '<div class="lang-chips notranslate" translate="no" id="tlChips">' + langs().map(function (l) {
        return '<button type="button" class="chip" data-tl="' + esc(l.code) + '" aria-pressed="' + (WS.sel.indexOf(l.code) >= 0) + '">' + esc(l.name) + "</button>";
      }).join("") + "</div>" +
      '<p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button class="btn solid" type="button" id="trMake">🌐 번역 만들기</button><button class="btn" type="button" id="ltPrev">🖨 인쇄 미리보기</button><span class="hint" id="trProg" role="status"></span></p>' +
      '<div id="trBox" class="notranslate" translate="no"></div>' +
      '<h2 class="step"><span>4</span> 저장</h2>' +
      U.ownerFields(edit, "작성", L.작성) +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="err" role="alert"></div><div class="actions"><a class="btn" href="' + (edit ? "#letter-" + esc(L.id) : "#letters") + '">취소</a><button class="btn solid" type="submit">' + (edit ? "고친 내용 저장" : "저장하기") + "</button></div></form></div>";
  }
  G.route(/^write-letter$/, "teacher", function () { return letterForm(null); });
  G.route(/^edit-letter-(.+)$/, "teacher", function (m) { var L = U.findItem("통신문", m[1]); return L ? letterForm(L) : G.V.notfound(); });

  function srcOf(f) { return { 제목: f.제목.value.trim(), 보낸곳: f.보낸곳.value.trim(), 한국어: f.한국어.value.replace(/\s+$/, ""), 회신서: f.회신서.value.replace(/\s+$/, ""), 날짜: f.날짜.value }; }
  function sigOf(s) { return JSON.stringify([s.제목, s.보낸곳, s.한국어, s.회신서]); }
  function drawEditors(f) {
    var box = $("#trBox"), src = srcOf(f);
    // 지금 열린 편집기의 내용을 먼저 저장
    $$(".tred", box).forEach(function (d) { var c = d.getAttribute("data-lang"); if (WS.tr[c] && WS.src && WS.src[c]) WS.tr[c] = Object.assign({}, WS.tr[c], collectTr(d, WS.src[c]), { 감수: WS.tr[c].감수 }); });
    box.innerHTML = WS.sel.filter(function (c) { return WS.tr[c]; }).map(function (c) { return trEditor(c, WS.src[c] || src, WS.tr[c], false); }).join("") ||
      '<p class="hint">아직 번역이 없어요. 언어를 고르고 [번역 만들기]를 눌러 주세요.</p>';
    autosize(box);
    $$(".tred textarea", box).forEach(function (x) { x.addEventListener("input", function () { var c = x.closest(".tred").getAttribute("data-lang"); if (WS.tr[c]) WS.tr[c].감수 = "사람이 고침"; }); });
  }
  function translateAll(f, codes) {
    var src = srcOf(f), prog = $("#trProg");
    if (!src.한국어.trim()) return Promise.reject(new Error("본문을 먼저 써 주세요."));
    if (!G.live()) return Promise.reject(new Error("예시 화면에서는 번역을 만들 수 없어요. 공개 주소에서 해 주세요."));
    var groups = [];
    for (var i = 0; i < codes.length; i += 3) groups.push(codes.slice(i, i + 3));
    var done = 0, fails = [];
    WS.src = WS.src || {};
    return groups.reduce(function (p, g) {
      return p.then(function () {
        if (prog) prog.textContent = "번역하는 중… (" + done + " / " + codes.length + ")";
        return G.post({ action: "translate", src: src, langs: g }).then(function (j) {
          Object.keys(j.tr || {}).forEach(function (c) { WS.tr[c] = j.tr[c]; WS.sig[c] = sigOf(src); WS.src[c] = src; });
          Object.keys(j.errors || {}).forEach(function (c) { fails.push(G.langName(c)); });
          done += g.length;
        });
      });
    }, Promise.resolve()).then(function () {
      if (prog) prog.textContent = fails.length ? "번역하지 못한 언어: " + fails.join(", ") : "번역을 만들었어요. 아래에서 한 줄씩 확인하고 고쳐 주세요.";
      drawEditors(f);
    });
  }
  function bindLetterForm(f) {
    var opened = Date.now();
    if (WS.id && !WS.loaded) {
      getTr(WS.id).then(function (all) {
        var src = srcOf(f); WS.src = {};
        Object.keys(all).forEach(function (c) { WS.tr[c] = all[c]; WS.sig[c] = sigOf(src); WS.src[c] = src; if (WS.sel.indexOf(c) < 0) WS.sel.push(c); });
        WS.loaded = true;
        $$("[data-tl]", f).forEach(function (b) { b.setAttribute("aria-pressed", WS.sel.indexOf(b.getAttribute("data-tl")) >= 0); });
        drawEditors(f);
      }).catch(function (x) { G.toast(x.message); });
    } else drawEditors(f);
    $("#tlChips").onclick = function (e) {
      var b = e.target.closest("[data-tl]"); if (!b) return;
      var c = b.getAttribute("data-tl"), i = WS.sel.indexOf(c);
      if (i >= 0) WS.sel.splice(i, 1); else WS.sel.push(c);
      b.setAttribute("aria-pressed", i < 0);
      drawEditors(f);
    };
    $("#trBox").onclick = function (e) {
      var b = e.target.closest("[data-trdrop]"); if (!b) return;
      e.preventDefault();
      var c = b.getAttribute("data-trdrop"), i = WS.sel.indexOf(c);
      if (i >= 0) WS.sel.splice(i, 1);
      var chip = $('[data-tl="' + c + '"]', f); if (chip) chip.setAttribute("aria-pressed", "false");
      drawEditors(f);
    };
    $("#trMake").onclick = function () {
      var btn = this, src = srcOf(f);
      if (!WS.sel.length) { G.toast("번역할 언어를 골라 주세요."); return; }
      drawEditors(f);
      var codes = WS.sel.filter(function (c) { return !WS.tr[c] || WS.sig[c] !== sigOf(src); });
      var human = codes.filter(function (c) { return WS.tr[c] && /사람/.test(WS.tr[c].감수 || ""); });
      if (human.length && !confirm("사람이 고친 번역(" + human.map(G.langName).join(", ") + ")도 다시 번역할까요?\n[취소]를 누르면 그 언어는 그대로 둬요.")) codes = codes.filter(function (c) { return human.indexOf(c) < 0; });
      if (!codes.length) {
        if (!confirm("고른 언어는 모두 번역이 있어요. 전부 새로 번역할까요?")) return;
        codes = WS.sel.slice();
      }
      U.busy(btn, true, "번역하는 중…");
      translateAll(f, codes).catch(function (x) { $("#trProg").textContent = x.message; }).then(function () { U.busy(btn, false); });
    };
    $("#ltPrev").onclick = function () {
      var src = srcOf(f);
      if (!src.제목 || !src.한국어.trim()) { G.toast("제목과 본문을 먼저 써 주세요."); return; }
      drawEditors(f);
      var have = WS.sel.filter(function (c) { return WS.tr[c]; });
      var L = Object.assign({}, src, { 양식: f.양식.value });
      previewModal(L, have, function (c) { return WS.tr[c]; });
    };
    f.onsubmit = function (e) {
      e.preventDefault();
      var err = $(".err", f); err.textContent = "";
      if (!U.checkRequired(f, err)) return;
      drawEditors(f);
      var src = srcOf(f), btn = $("button[type=submit]", f);
      var missing = WS.sel.filter(function (c) { return !WS.tr[c]; });
      var stale = WS.sel.filter(function (c) { return WS.tr[c] && WS.sig[c] !== sigOf(src); });
      var todo = missing.slice();
      if (stale.length && confirm("한국어를 고친 뒤 번역을 다시 만들지 않은 언어가 있어요: " + stale.map(G.langName).join(", ") + "\n\n[확인] 다시 번역하고 저장  [취소] 지금 번역 그대로 저장")) todo = todo.concat(stale);
      U.busy(btn, true, todo.length ? "번역하고 저장하는 중…" : "저장하는 중…");
      (todo.length ? translateAll(f, todo) : Promise.resolve()).then(function () {
        drawEditors(f);
        var tr = {};
        WS.sel.forEach(function (c) {
          if (!WS.tr[c]) return;
          var box = $('.tred[data-lang="' + c + '"]', f);
          tr[c] = Object.assign({}, WS.tr[c], box ? collectTr(box, WS.src[c] || src) : {});
          tr[c].감수 = WS.tr[c].감수 || "자동 번역";
        });
        var data = U.formData(f);
        var payload = { action: WS.id ? "update" : "addLetter", kind: "통신문", id: WS.id || undefined, data: data, tr: tr, elapsed: Date.now() - opened };
        if (WS.id) payload.password = data.비밀번호 || "";
        return G.post(payload);
      }).then(function (j) {
        var id = j.id || WS.id;
        delete trCache[id]; LV.id = "";
        G.toast(j.status === "검토" ? "저장했어요. 관리자 확인 뒤 보여요." : "저장했어요!");
        return G.refresh().then(function () { location.hash = j.status === "검토" ? "#letters" : "#letter-" + id; });
      }).catch(function (x) { err.textContent = x.message; U.busy(btn, false); });
    };
  }
  /** 저장 전·양식 확인용 미리보기 (모달) */
  function previewModal(L, codes, getT, tplOverride) {
    var cur = codes[0] || "";
    G.openModal('<h2 id="modalTitle">인쇄 미리보기</h2><div class="fld-row prev-ctl">' +
      (codes.length ? '<label>언어<select id="pvLang">' + codes.map(function (c) { return '<option value="' + c + '">' + esc(G.langName(c)) + "</option>"; }).join("") + "</select></label>" : '<p class="hint">번역이 없어서 한국어만 보여요.</p>') +
      '<label>배치<select id="pvLay"><option value="alt">줄마다 번갈아</option><option value="side">좌우 나란히</option><option value="sep">언어별로 따로</option></select></label></div>' +
      '<div class="lt-view notranslate" translate="no" id="pvView"><div class="lt-sheet" id="pvSheet"><p class="lt-wait">만드는 중…</p></div></div>' +
      '<div class="actions"><button class="btn" type="button" data-close>닫기</button><button class="btn solid" type="button" id="pvPrint">🖨 인쇄</button></div>');
    $(".modal-box").classList.add("wide");
    var tpl = tplOverride || (L.양식 ? tplById(L.양식) : null), last = null;
    function draw() {
      var lang = $("#pvLang") ? $("#pvLang").value : "", t = lang ? getT(lang) : null;
      var bgP = tplOverride ? Promise.resolve(tplOverride.bg) : tpl ? getTplImage(tpl).catch(function () { tpl = null; return ""; }) : Promise.resolve("");
      bgP.then(function (bg) { return loadFontsFor(L, t, lang).then(function () { return bg; }); }).then(function (bg) {
        var sheet = $("#pvSheet"); if (!sheet) return;
        var d = buildSheet(sheet, { L: L, tr: t, lang: lang, layout: $("#pvLay").value, order: "tr", size: "m", tpl: bg ? tpl : null, bg: bg });
        scaleSheet($("#pvView"), sheet, d); last = d;
      });
    }
    if ($("#pvLang")) $("#pvLang").onchange = draw;
    $("#pvLay").onchange = draw;
    $("#pvPrint").onclick = function () { if (last) printSheet($("#pvSheet"), last); };
    draw();
  }

  /* ---------- 양식 관리 ---------- */
  G.route(/^templates$/, "teacher", function () {
    var list = templates();
    return G.head("통신문 양식", "학교·기관의 가정통신문 양식을 PDF로 올려 두면, 머리글·로고·결재란 같은 틀은 그대로 두고 내용만 바꿔 인쇄해요.", '<a href="#letters">다국어 가정통신문</a>') +
      '<div class="wrap"><div class="board-top"><span class="sp"></span>' + (U.canWrite("양식등록", "누구나") ? '<a class="btn solid" href="#template-new">⬆️ 양식 올리기</a>' : "") + "</div>" +
      '<table class="board"><thead><tr><th class="c-t">양식 이름</th><th class="c-by">올린 사람</th><th class="c-d">날짜</th></tr></thead><tbody>' +
      '<tr><td class="c-t"><b>기본 양식 (연구회)</b> <span class="tag">기본</span></td><td class="c-by">연구회</td><td class="c-d"></td></tr>' +
      list.map(function (t) { return '<tr data-href="#template-' + esc(t.id) + '"><td class="c-t"><a href="#template-' + esc(t.id) + '">' + esc(t.이름) + '</a></td><td class="c-by">' + esc(t.올린사람) + '</td><td class="c-d">' + esc(t.등록일) + "</td></tr>"; }).join("") +
      "</tbody></table>" +
      '<div class="article" style="margin-top:18px;max-width:none"><h2>양식 만드는 법</h2><ol class="steps">' +
      "<li>한글(HWP)이나 워드로 만든 통신문 양식을 <b>PDF로 저장</b>해요. (한글: [파일] → [PDF로 저장하기])</li>" +
      "<li>[양식 올리기]에서 PDF를 고르면 첫 쪽이 그림으로 나와요.</li>" +
      "<li>그림 위에서 끌어서 <b>본문</b> 자리를 네모로 그려요. 제목 칸, 날짜·학교장 자리, 예시 글처럼 지울 곳이 있으면 같이 그려요.</li>" +
      "<li>[미리보기]로 확인하고 저장하면, 통신문을 만들 때 이 양식을 고를 수 있어요.</li></ol></div></div>";
  });
  var TE = null;
  function tplEditorPage(t) {
    var edit = !!t;
    if (!edit && !U.canWrite("양식등록", "누구나")) return G.head("양식 올리기", "", '<a href="#templates">통신문 양식</a>') + '<div class="wrap">' + U.needAdminBox("양식") + "</div>";
    TE = { id: t ? t.id : "", img: "", ratio: t ? Number(t.비율) || 1.4142 : 1.4142, zones: t ? zonesOf(t).slice() : [], type: "body" };
    return G.head(edit ? "양식 고치기" : "양식 올리기", "", '<a href="#templates">통신문 양식</a>') + '<div class="wrap">' + U.liveNote() +
      '<div class="article page-form wide">' +
      (edit ? "" : '<div class="fld"><label for="tplFile">양식 파일 <small>(PDF 또는 그림 파일, 첫 쪽만 써요)</small></label><input id="tplFile" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"><p class="hint">한글(HWP) 파일은 [파일] → [PDF로 저장하기]로 PDF를 만든 뒤 올려 주세요.</p></div>') +
      '<div id="tplEd"' + (edit ? "" : " hidden") + '>' +
      '<div class="tpl-tools" role="group" aria-label="그릴 영역">' + Object.keys(ZT).map(function (k) {
        return '<button type="button" class="chip" data-zt="' + k + '" aria-pressed="' + (k === "body") + '"><i style="background:' + ZT[k][1] + '"></i>' + ZT[k][0] + (k === "body" ? " (꼭)" : "") + "</button>";
      }).join("") + "</div>" +
      '<p class="hint">위에서 종류를 고르고, 그림 위에서 끌어서 네모를 그리세요. <b>본문</b>은 꼭 있어야 해요. 그린 자리에 있던 글씨는 인쇄할 때 지워지고 새 내용이 들어가요. 예시 글이 남아 있으면 <b>지울 곳</b>으로 덮으세요.</p>' +
      '<div class="tpl-stage" id="tplStage"><img id="tplImg" alt="양식 그림"><div class="tpl-ov" id="tplOv"></div><p class="lt-wait" id="tplWait">' + (edit ? "양식을 불러오는 중…" : "") + "</p></div>" +
      '<ul class="tpl-zones" id="tplZones"></ul>' +
      '<p><button class="btn" type="button" id="tplPrev">👀 미리보기</button></p></div>' +
      '<form class="form" id="tplForm" novalidate>' + U.field({ n: "양식이름", l: "양식 이름", v: t ? t.이름 : "", req: true, max: 60, ph: "예: ○○초등학교 가정통신문" }) +
      U.ownerFields(edit, "올린 사람", t ? t.올린사람 : "") +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="err" role="alert"></div><div class="actions">' +
      (edit ? '<button class="btn quiet" type="button" data-bdel="양식" data-id="' + esc(t.id) + '" data-back="#templates">🗑 지우기</button><span class="sp"></span>' : "") +
      '<a class="btn" href="#templates">취소</a><button class="btn solid" type="submit">저장</button></div></form></div></div>';
  }
  G.route(/^template-new$/, "teacher", function () { return tplEditorPage(null); });
  G.route(/^template-(.+)$/, "teacher", function (m) { var t = tplById(m[1]); return t ? tplEditorPage(t) : G.V.notfound(); });

  function loadScript(src) {
    return new Promise(function (ok, bad) {
      var s = document.createElement("script"); s.src = src; s.onload = ok;
      s.onerror = function () { bad(new Error("PDF 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.")); };
      document.head.appendChild(s);
    });
  }
  var pdfReady = null;
  function pdfLib() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfReady) pdfReady = loadScript(PDFJS + "pdf.min.js").then(function () {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js"; return window.pdfjsLib;
    });
    return pdfReady;
  }
  function toJpeg(canvas) {
    var q = 0.88, u = canvas.toDataURL("image/jpeg", q);
    while (u.length > 5500000 && q > 0.5) { q -= 0.1; u = canvas.toDataURL("image/jpeg", q); }
    return u;
  }
  function fileToImage(file) {
    var W = 1654;
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      return pdfLib().then(function (lib) { return file.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf, cMapUrl: PDFDATA + "cmaps/", cMapPacked: true, standardFontDataUrl: PDFDATA + "standard_fonts/" }).promise; }); })
        .then(function (pdf) { return pdf.getPage(1); })
        .then(function (pg) {
          var v0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: W / v0.width });
          var c = document.createElement("canvas"); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
          var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          return pg.render({ canvasContext: x, viewport: vp, intent: "print" }).promise.then(function () { return { img: toJpeg(c), ratio: c.height / c.width }; });
        });
    }
    return new Promise(function (ok, bad) {
      var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = function () { bad(new Error("파일을 읽지 못했어요.")); }; fr.readAsDataURL(file);
    }).then(loadImage).then(function (im) {
      var s = Math.min(1, W / im.naturalWidth), c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      return { img: toJpeg(c), ratio: c.height / c.width };
    });
  }
  function drawZones() {
    var ov = $("#tplOv"), ul = $("#tplZones"); if (!ov) return;
    ov.innerHTML = TE.zones.map(function (z, i) {
      return '<div class="tz tz-' + z.t + '" style="left:' + z.x * 100 + "%;top:" + z.y * 100 + "%;width:" + z.w * 100 + "%;height:" + z.h * 100 + "%;border-color:" + ZT[z.t][1] + '"><span style="background:' + ZT[z.t][1] + '">' + ZT[z.t][0] + "</span></div>";
    }).join("");
    ul.innerHTML = TE.zones.map(function (z, i) {
      return '<li><i style="background:' + ZT[z.t][1] + '"></i>' + ZT[z.t][0] + ' <button type="button" class="linkish" data-zdel="' + i + '">빼기</button></li>';
    }).join("") || '<li class="hint">아직 그린 영역이 없어요.</li>';
  }
  function bindTplEditor() {
    var stage = $("#tplStage"), img = $("#tplImg"), ov = $("#tplOv"), wait = $("#tplWait");
    function show(src) { TE.img = src; img.src = src; $("#tplEd").hidden = false; if (wait) wait.textContent = ""; drawZones(); }
    if (TE.id) {
      var t = tplById(TE.id);
      getRaw(t).then(show).catch(function (x) { if (wait) wait.textContent = x.message; });
    }
    var fi = $("#tplFile");
    if (fi) fi.onchange = function () {
      var file = fi.files[0]; if (!file) return;
      $("#tplEd").hidden = false; img.removeAttribute("src"); wait.textContent = "양식을 그림으로 바꾸는 중…";
      fileToImage(file).then(function (r) {
        TE.ratio = r.ratio; TE.zones = [];
        var f = $("#tplForm"); if (f && !f.양식이름.value) f.양식이름.value = file.name.replace(/\.[^.]+$/, "");
        show(r.img);
      }).catch(function (x) { wait.textContent = x.message; });
    };
    $$("[data-zt]").forEach(function (b) {
      b.onclick = function () { TE.type = b.getAttribute("data-zt"); $$("[data-zt]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); };
    });
    $("#tplZones").onclick = function (e) { var b = e.target.closest("[data-zdel]"); if (b) { TE.zones.splice(+b.getAttribute("data-zdel"), 1); drawZones(); } };
    var start = null, temp = null;
    function pt(e) { var r = stage.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) }; }
    ov.addEventListener("pointerdown", function (e) {
      if (!TE.img) return;
      e.preventDefault(); ov.setPointerCapture(e.pointerId);
      start = pt(e); temp = document.createElement("div"); temp.className = "tz drawing"; temp.style.borderColor = ZT[TE.type][1]; ov.appendChild(temp);
    });
    ov.addEventListener("pointermove", function (e) {
      if (!start) return;
      var p = pt(e);
      temp.style.left = Math.min(p.x, start.x) * 100 + "%"; temp.style.top = Math.min(p.y, start.y) * 100 + "%";
      temp.style.width = Math.abs(p.x - start.x) * 100 + "%"; temp.style.height = Math.abs(p.y - start.y) * 100 + "%";
    });
    function end(e) {
      if (!start) return;
      var p = pt(e), z = { t: TE.type, x: Math.min(p.x, start.x), y: Math.min(p.y, start.y), w: Math.abs(p.x - start.x), h: Math.abs(p.y - start.y) };
      start = null;
      if (z.w > 0.02 && z.h > 0.01) {
        if (z.t !== "erase") TE.zones = TE.zones.filter(function (x) { return x.t !== z.t; });
        TE.zones.push(z);
      }
      drawZones();
    }
    ov.addEventListener("pointerup", end);
    ov.addEventListener("pointercancel", function () { start = null; drawZones(); });
    $("#tplPrev").onclick = function () {
      if (!TE.zones.some(function (z) { return z.t === "body"; })) { G.toast("본문 영역을 먼저 그려 주세요."); return; }
      eraseZones(TE.img, TE.zones).then(function (bg) {
        var sample = {
          제목: "(예시) 현장체험학습 안내", 보낸곳: G.setting("사이트이름") || "○○학교장", 날짜: U.today(),
          한국어: "안녕하세요. 다음 주 금요일에 박물관으로 현장체험학습을 갑니다.\n준비물: 도시락, 물, 편한 신발\n아래 동의서에 서명하여 수요일까지 담임 선생님께 보내 주세요.",
          회신서: "[ ] 참가합니다   [ ] 참가하지 않습니다\n학생 이름:            보호자 서명:"
        };
        var en = { 제목: "(Sample) Field Trip Notice", 보낸곳: "Principal", 머리: "Family Letter", 회신: "Reply Slip",
          내용: "Hello. Next Friday, we will go on a field trip to the museum.\nWhat to bring: lunch box, water, comfortable shoes\nPlease sign the consent form below and return it to the homeroom teacher by Wednesday.",
          회신서: "[ ] Will attend   [ ] Will not attend\nStudent name:            Parent signature:" };
        previewModal(sample, ["en"], function () { return en; }, { 비율: TE.ratio, 영역: JSON.stringify(TE.zones), bg: bg });
      });
    };
    var f = $("#tplForm"), opened = Date.now();
    f.onsubmit = function (e) {
      e.preventDefault();
      var err = $(".err", f); err.textContent = "";
      if (!TE.img) { err.textContent = "양식 파일을 먼저 골라 주세요."; return; }
      if (!TE.zones.some(function (z) { return z.t === "body"; })) { err.textContent = "본문 영역을 그려 주세요."; return; }
      if (!U.checkRequired(f, err)) return;
      var data = U.formData(f), btn = $("button[type=submit]", f);
      data.영역 = JSON.stringify(TE.zones); data.비율 = TE.ratio;
      U.busy(btn, true, "저장하는 중…");
      var payload = TE.id ? { action: "update", kind: "양식", id: TE.id, data: data, password: data.비밀번호 || "" }
        : { action: "addTemplate", data: data, image: { type: "image/jpeg", data: TE.img.split(",")[1] }, elapsed: Date.now() - opened };
      G.post(payload).then(function (j) {
        if (TE.id) { delete imgCache[TE.id]; }
        G.toast(j.status === "검토" ? "저장했어요. 관리자 확인 뒤 보여요." : "양식을 저장했어요.");
        return G.refresh().then(function () { location.hash = "#templates"; });
      }).catch(function (x) { err.textContent = x.message; U.busy(btn, false); });
    };
  }

  /* ---------- 화면 연결 ---------- */
  G.after(function () {
    var q = $("#ltQ");
    if (q) q.oninput = function () { U.st.letters.q = q.value; U.st.letters.p = 1; var p = q.selectionStart; G.render(); var n = $("#ltQ"); n.focus(); try { n.setSelectionRange(p, p); } catch (x) {} };
    if ($("#ltSheet")) {
      $("#ltLang").onchange = function () { LV.lang = this.value; drawDetail(); };
      $("#ltLay").onchange = function () { LV.layout = this.value; drawDetail(); };
      $("#ltOrd").onchange = function () { LV.order = this.value; drawDetail(); };
      $("#ltTpl").onchange = function () { LV.tpl = this.value; drawDetail(); };
      $("#ltSize").onchange = function () { LV.size = this.value; drawDetail(); };
      $("#ltPrint").onclick = function () { if (LV.last) printSheet($("#ltSheet"), LV.dims); else G.toast("미리보기를 만드는 중이에요. 잠시 뒤 눌러 주세요."); };
      $("#ltPrintKo").onclick = function () {
        if (!LV.last) return;
        var tmp = document.createElement("div"); tmp.className = "lt-sheet"; tmp.style.cssText = "position:absolute;left:-9999px;top:0";
        document.body.appendChild(tmp);
        var d = buildSheet(tmp, Object.assign({}, LV.last, { koOnly: true }));
        printSheet(tmp, d); setTimeout(function () { tmp.remove(); }, 1000);
      };
      $("#ltEditTr").onclick = openTrEditor;
      $$("[data-lttab]").forEach(function (b) {
        b.onclick = function () {
          LV.tab = b.getAttribute("data-lttab");
          $$("[data-lttab]").forEach(function (x) { x.setAttribute("aria-selected", x === b); });
          $("#ltView").classList.toggle("off", LV.tab !== "print"); $("#ltRead").hidden = LV.tab !== "read";
          if (LV.tab === "print" && LV.dims) scaleSheet($("#ltView"), $("#ltSheet"), LV.dims);
        };
      });
      drawDetail();
    }
    var lf = $("#letterForm"); if (lf && WS) bindLetterForm(lf);
    if ($("#tplStage") && TE) bindTplEditor();
  });
  window.addEventListener("resize", function () {
    var v = $("#ltView"), s = $("#ltSheet");
    if (v && s && LV.dims && !v.classList.contains("off")) scaleSheet(v, s, LV.dims);
  });
});
