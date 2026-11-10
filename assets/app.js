/* 경기도다문화교육연구회 홈페이지 - 화면 동작
 * 내용은 구글 시트(또는 data.js 예시)에서 읽어 옵니다. 이 파일은 고치지 않아도 됩니다.
 */
(function () {
  "use strict";
  var CFG = window.GGMCE_CONFIG || {};
  var DB = null;          // 시트 내용
  var LIVE = false;       // 구글 시트와 연결됐는지
  var TR_OK = false;      // 구글 번역이 켜졌는지
  var RTL = ["ar", "ur", "fa", "iw", "he", "ps", "sd", "ug", "yi", "dv", "ckb"];
  var LANGS = CFG.FEATURED_LANGS || [];
  var HERO_N = CFG.HERO_LANGS || 16;
  var app = document.getElementById("app");

  /* ---------- 작은 도구 ---------- */
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function linkify(s) {
    return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  var store = {
    get: function (k) { try { return localStorage.getItem("ggmce." + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem("ggmce." + k, v); } catch (e) {} }
  };
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }
  function setting(k) {
    var r = (DB.설정 || []).filter(function (x) { return x.항목 === k; })[0];
    return r ? String(r.값 || "") : "";
  }
  function visible(r) { var v = String(r.공개 || "Y").trim().toUpperCase(); return v === "Y" || v === ""; }
  function rows(tab) { return (DB[tab] || []).filter(visible); }
  function byDate(a, b) { return String(b.날짜 || b.등록일 || "").localeCompare(String(a.날짜 || a.등록일 || "")); }
  function lines(s) { return String(s || "").split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ---------- 데이터 ---------- */
  function load() {
    var url = (CFG.API_URL || "").trim();
    if (!url) return Promise.resolve(useSample());
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + "action=data&t=" + Date.now())
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.data) { DB = j.data; LIVE = true; document.getElementById("demoNotice").hidden = true; } else useSample();
      })
      .catch(function () { useSample(); });
  }
  function useSample() {
    DB = JSON.parse(JSON.stringify(window.SAMPLE_DATA || {}));
    LIVE = false;
    var n = document.getElementById("demoNotice");
    n.hidden = false;
    n.innerHTML = "지금은 홈페이지에 들어 있는 <b>예시 내용</b>이 보이는 중입니다. 구글 시트를 연결하면 시트의 내용으로 바뀌고, 보드·자료 등록도 할 수 있어요.";
  }
  function post(payload) {
    if (!LIVE) return Promise.reject(new Error("아직 구글 시트가 연결되지 않아 등록할 수 없어요. 편집 안내서의 '처음 한 번 설정'을 마치면 등록할 수 있어요."));
    if (!payload.lang) payload.lang = getLang();
    var adm = adminPw(); if (adm && !payload.admin) payload.admin = adm;
    return fetch(CFG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j.ok) throw new Error(j.error || "등록하지 못했어요. 잠시 뒤 다시 해 주세요.");
      return j;
    });
  }
  function refresh() { return load().then(render); }
  function adminPw() { try { return sessionStorage.getItem("ggmce.admin") || ""; } catch (e) { return ""; } }
  function apiGet(params) {
    var url = (CFG.API_URL || "").trim();
    if (!url || !LIVE) return Promise.reject(new Error("구글 시트가 연결되지 않았어요."));
    var q = Object.keys(params).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]); }).join("&");
    return fetch(url + (url.indexOf("?") < 0 ? "?" : "&") + q).then(function (r) { return r.json(); }).then(function (j) { if (!j.ok) throw new Error(j.error || "불러오지 못했어요."); return j; });
  }

  /* ---------- 언어 ---------- */
  function cookieLang() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/;]*\/([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function getLang() { return cookieLang() || "ko"; }
  function writeCookie(val) {
    var host = location.hostname, parts = host.split(".");
    var exp = val ? "" : "expires=Thu, 01 Jan 1970 00:00:00 GMT;";
    var v = val || "";
    document.cookie = "googtrans=" + v + ";" + exp + "path=/";
    if (parts.length > 1) {
      document.cookie = "googtrans=" + v + ";" + exp + "path=/;domain=" + host;
      document.cookie = "googtrans=" + v + ";" + exp + "path=/;domain=." + parts.slice(-2).join(".");
    }
  }
  function langName(code) {
    var f = LANGS.filter(function (l) { return l.code === code; })[0];
    if (f) return f.name;
    try { return new Intl.DisplayNames([code], { type: "language" }).of(code); } catch (e) { return code; }
  }
  function applyDir() {
    var c = getLang();
    document.documentElement.dir = RTL.indexOf(c.split("-")[0]) >= 0 ? "rtl" : "ltr";
    $$(".lang-current").forEach(function (el) { el.textContent = langName(c); });
    $$(".hello").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-lang") === c); });
  }
  function setLang(code) {
    store.set("langAsked", "1");
    if (!TR_OK && code !== "ko") {
      closeModal();
      toast("자동 번역은 공개된 홈페이지 주소에서 작동해요. (지금 화면은 미리보기라 번역이 꺼져 있어요)");
      return;
    }
    if (code === "ko") { writeCookie(""); location.reload(); return; }
    writeCookie("/ko/" + code);
    var combo = document.querySelector(".goog-te-combo");
    if (combo) {
      combo.value = code;
      combo.dispatchEvent(new Event("change"));
      closeModal(); applyDir(); skipRetranslate = true; render();
    } else { location.reload(); }
  }
  function initTranslate() {
    // 주소에 ?lang=vi 처럼 언어가 붙어 오면 그 언어로 시작
    var q = new URLSearchParams(location.search).get("lang");
    if (q) { store.set("langAsked", "1"); if (q === "ko") writeCookie(""); else writeCookie("/ko/" + q); }
    window.googleTranslateElementInit = function () {
      try {
        var codes = (CFG.FEATURED_LANGS || []).map(function (l) { return l.code; }).filter(function (c) { return c !== "ko"; }).join(",");
        new window.google.translate.TranslateElement({ pageLanguage: "ko", includedLanguages: codes, autoDisplay: false }, "google_translate_element");
        TR_OK = true;
        applyDir();
      } catch (e) {}
    };
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.head.appendChild(s);
  }
  function suggestLang() {
    if (store.get("langAsked") || getLang() !== "ko") return;
    var map = { zh: "zh-CN", "zh-tw": "zh-TW", "zh-hk": "zh-TW", "zh-hant": "zh-TW", fil: "tl", tl: "tl" };
    var navs = navigator.languages || [navigator.language || ""];
    var pick = null;
    navs.some(function (n) {
      var full = String(n).toLowerCase(), base = full.split("-")[0];
      if (base === "ko") return true;
      var code = map[full] || map[base] || base;
      var f = LANGS.filter(function (l) { return l.code === code; })[0];
      if (f) { pick = f; return true; }
      return false;
    });
    if (!pick) return;
    var n = document.getElementById("langNotice");
    n.hidden = false;
    n.innerHTML = '<span class="notranslate" translate="no">🌐 ' + esc(pick.hello) + " · " + esc(pick.name) + '?</span>' +
      '<button class="yes notranslate" translate="no" type="button">✓ ' + esc(pick.name) + "</button>" +
      '<button class="no notranslate" translate="no" type="button">한국어</button>';
    $(".yes", n).onclick = function () { n.hidden = true; setLang(pick.code); };
    $(".no", n).onclick = function () { n.hidden = true; store.set("langAsked", "1"); };
  }
  function openLang() {
    var cur = getLang();
    var btns = LANGS.map(function (l) {
      return '<button type="button" data-lang="' + esc(l.code) + '" class="' + (l.code === cur ? "on" : "") + '">' + esc(l.name) + "</button>";
    }).join("");
    openModal(
      '<h2 id="modalTitle">🌐 Language · 언어</h2>' +
      '<div class="lang-grid notranslate" translate="no">' + btns + "</div>" +
      '<p class="note">' + (TR_OK ? "구글 자동 번역이라 조금 틀릴 수 있어요. 한국어로 돌아가려면 '한국어'를 누르세요." : "자동 번역은 공개된 홈페이지 주소에서 작동해요. 지금 화면은 미리보기라 번역 기능이 꺼져 있어요.") + "</p>"
    );
    $$(".lang-grid button").forEach(function (b) { b.onclick = function () { setLang(b.getAttribute("data-lang")); }; });
  }

  /* ---------- 모달 ---------- */
  var lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    $(".modal-box").classList.remove("wide");
    document.getElementById("modalBody").innerHTML = html;
    var m = document.getElementById("modal"); m.hidden = false;
    var f = $("input,select,textarea,button:not(.modal-x)", m); (f || $(".modal-x", m)).focus();
  }
  function closeModal() {
    var m = document.getElementById("modal");
    var holder = document.getElementById("google_translate_element");
    if (holder && holder.parentNode && holder.parentNode.id === "gteSlot") { holder.classList.add("gte-holder"); document.body.appendChild(holder); }
    m.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- 공유 ---------- */
  function shareUrl() {
    var lang = getLang();
    return location.origin + location.pathname + (lang !== "ko" ? "?lang=" + encodeURIComponent(lang) : "") + location.hash;
  }
  function openShare(title) {
    var url = shareUrl();
    openModal('<h2 id="modalTitle">이 페이지 보내기</h2>' +
      '<p>링크를 카카오톡이나 문자로 보내거나, QR 코드를 가정통신문에 넣으세요. 지금 고른 언어로 열려요.</p>' +
      '<div class="qr" id="qrBox"></div>' +
      '<div class="copyline"><input readonly value="' + esc(url) + '" aria-label="링크"><button class="btn small solid" type="button" id="copyUrl">링크 복사</button></div>' +
      (navigator.share ? '<p style="margin-top:12px"><button class="btn" type="button" id="nativeShare">휴대폰으로 보내기 (카카오톡 등)</button></p>' : ""));
    if (window.QRCode) { try { new window.QRCode(document.getElementById("qrBox"), { text: url, width: 180, height: 180 }); } catch (e) {} }
    $("#copyUrl").onclick = function () { copyText(url, "링크를 복사했어요"); };
    var ns = $("#nativeShare"); if (ns) ns.onclick = function () { navigator.share({ title: title || document.title, url: url }).catch(function () {}); };
  }
  function copyText(t, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast(msg || "복사했어요"); }, function () { toast("복사가 막혀 있어요. 직접 선택해서 복사해 주세요."); });
    } else toast("복사가 막혀 있어요. 직접 선택해서 복사해 주세요.");
  }

  /* ---------- 소리로 듣기 ---------- */
  function speak(el, btn) {
    if (!("speechSynthesis" in window)) { toast("이 기기에서는 소리로 듣기를 쓸 수 없어요"); return; }
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); btn.textContent = "🔊 소리로 듣기"; return; }
    var u = new SpeechSynthesisUtterance(el.innerText);
    var l = getLang(); u.lang = l === "ko" ? "ko-KR" : l;
    u.onend = function () { btn.textContent = "🔊 소리로 듣기"; };
    speechSynthesis.speak(u); btn.textContent = "⏹ 멈추기";
  }

  /* ---------- 공통 조각 ---------- */
  function head(title, lead, crumb) {
    return '<div class="wrap page-head">' + (crumb ? '<div class="crumb">' + crumb + "</div>" : "") +
      "<h1>" + esc(title) + "</h1>" + (lead ? "<p>" + esc(lead) + "</p>" : "") + "</div>";
  }
  function articleTools() {
    return '<div class="article-tools"><button class="btn small quiet" type="button" data-act="speak">🔊 소리로 듣기</button>' +
      '<button class="btn small quiet" type="button" data-act="share">📤 보내기·QR</button></div>';
  }
  function tile(href, ic, title, desc) {
    return '<a class="tile" href="' + href + '"><span class="ic" aria-hidden="true">' + esc(ic) + "</span><span><h3>" + esc(title) + "</h3><p>" + esc(desc) + "</p></span></a>";
  }
  function noticeList(list) {
    if (!list.length) return '<div class="empty">아직 소식이 없어요.</div>';
    return '<ul class="list">' + list.map(function (n) {
      var i = (DB.공지 || []).indexOf(n);
      return '<li><a href="#news-' + esc(n.id || i) + '"><span class="date">' + esc(n.날짜) + '</span><span><span class="tag news">' + esc(n.분류 || "공지") + "</span> " + esc(n.제목) + "</span></a></li>";
    }).join("") + "</ul>";
  }

  /* ---------- 화면들 ---------- */
  var V = {};

  V.home = function () {
    var hellos = LANGS.slice(0, HERO_N).map(function (l) {
      return '<li><button class="hello notranslate" translate="no" type="button" data-lang="' + esc(l.code) + '"><span class="h">' + esc(l.hello) + '</span><span class="n">' + esc(l.name) + "</span></button></li>";
    }).join("") + '<li><button class="hello more" type="button" data-open="lang"><span class="h">+ ' + Math.max(0, LANGS.length - HERO_N) + '</span><span class="n">더 많은 언어</span></button></li>';
    var news = rows("공지").sort(byDate).slice(0, 4);
    var picks = rows("자료").sort(byDate).slice(0, 3);
    return '<section class="wrap hero">' +
      "<h1>" + esc(setting("첫화면제목") || "어느 나라 말로 볼까요?") + "</h1>" +
      '<p class="hero-lead">' + esc(setting("첫화면설명")) + "</p>" +
      '<ul class="hellos">' + hellos + "</ul>" +
      '<div class="doors">' +
      '<a class="door family" href="#family"><span class="emoji" aria-hidden="true">👨‍👩‍👧</span><h2>가족이에요</h2><p>입학·전학, 가정통신문, 학교 낱말, 도움받을 곳</p></a>' +
      '<a class="door student" href="#student"><span class="emoji" aria-hidden="true">🎒</span><h2>학생이에요</h2><p>다문화 퀴즈, 학교 낱말 카드, 활동 보드</p></a>' +
      '<a class="door teacher" href="#teacher"><span class="emoji" aria-hidden="true">📚</span><h2>선생님이에요</h2><p>수업 자료, 다국어 통신문, 자료·보드 등록</p></a>' +
      "</div></section>" +
      '<section class="wrap sec"><div class="sec-head"><h2>가족이 많이 찾는 안내</h2><a href="#family">전체 보기</a></div><div class="grid">' +
      rows("가족안내").slice(0, 6).map(function (g, i) { return tile("#family-" + i, g.아이콘, titleOf(g), g.요약); }).join("") +
      "</div></section>" +
      '<section class="wrap sec"><div class="two"><div><div class="sec-head"><h2>소식</h2><a href="#news">전체 보기</a></div>' + noticeList(news) + "</div>" +
      '<div><div class="sec-head"><h2>새로 올라온 자료</h2><a href="#resources">자료실</a></div>' +
      (picks.length ? '<ul class="list">' + picks.map(function (r) { return '<li><a href="#res-' + esc(r.id) + '"><span class="tag teacher">' + esc(r.분류) + "</span><span>" + esc(r.제목) + "</span></a></li>"; }).join("") + "</ul>" : '<div class="empty">아직 자료가 없어요.</div>') +
      "</div></div></section>" +
      '<section class="wrap sec"><div class="band about"><h2>' + esc(setting("사이트이름")) + "</h2><p>" + esc(setting("연구회소개")) + '</p><a class="btn" href="#about">연구회 소개</a></div></section>' +
      '<section class="wrap sec"><div class="sec-head"><h2>도움받을 곳</h2><a href="#help">전체 보기</a></div>' + orgList(rows("기관").slice(0, 4)) + "</section>";
  };

  function titleOf(g) { var l = getLang(); return (l !== "ko" && g["제목_" + l]) || g.제목; }

  V.family = function () {
    return head("가족 안내", "한국 학교생활에 필요한 것을 쉬운 말로 정리했어요. 위의 🌐 버튼으로 우리 나라 말로 바꿔 보세요.", '<a href="#home">홈</a>') +
      '<div class="wrap"><div class="grid">' +
      rows("가족안내").map(function (g, i) { return tile("#family-" + i, g.아이콘, titleOf(g), g.요약); }).join("") +
      tile("#words", "📖", "학교 낱말 사전", "담임, 알림장, 급식… 학교에서 쓰는 말") +
      tile("#faq", "❓", "자주 묻는 질문", "다른 가족들이 많이 물어본 것") +
      tile("#help", "📞", "도움받을 곳", "상담 전화와 기관") +
      tile("#contact", "✉️", "문의하기", "궁금한 것을 남기면 선생님이 답해요") +
      "</div></div>";
  };

  V.familyItem = function (i) {
    var g = rows("가족안내")[i];
    if (!g) return V.notfound();
    var l = getLang(), revT = l !== "ko" && g["제목_" + l], revB = l !== "ko" && g["내용_" + l];
    var body = revB
      ? '<p><span class="tag ok reviewed">✓ 감수된 번역</span></p><div class="body notranslate" translate="no" lang="' + esc(l) + '">' + linkify(revB) + "</div>"
      : '<div class="body">' + linkify(g.내용) + "</div>";
    return '<div class="wrap page-head"><div class="crumb"><a href="#family">가족 안내</a></div></div>' +
      '<div class="wrap"><article class="article" id="readable"><span style="font-size:2.4rem" aria-hidden="true">' + esc(g.아이콘) + "</span>" +
      "<h1" + (revT ? ' class="notranslate" translate="no"' : "") + ">" + esc(revT || g.제목) + "</h1>" + articleTools() + body +
      '<p class="note" style="margin-top:20px">일반적인 안내예요. 학교마다 조금 다를 수 있어요. 궁금하면 담임 선생님께 물어보세요.</p></article></div>';
  };

  V.words = function () {
    return head("학교 낱말 사전", "학교에서 자주 듣는 말을 쉽게 풀었어요.", '<a href="#family">가족 안내</a>') +
      '<div class="wrap"><div class="words">' + rows("용어사전").map(function (w) {
        return '<div class="word"><div class="pic" aria-hidden="true">' + esc(w.그림) + "</div><h3>" + esc(w.용어) + "</h3><p>" + esc(w.쉬운설명) + "</p></div>";
      }).join("") + "</div></div>";
  };

  V.faq = function () {
    return head("자주 묻는 질문", "", '<a href="#family">가족 안내</a>') + '<div class="wrap" style="max-width:820px">' +
      rows("자주묻는질문").map(function (q) { return '<details class="faq"><summary>' + esc(q.질문) + "</summary><p>" + linkify(q.답) + "</p></details>"; }).join("") +
      '<p style="margin-top:18px"><a class="btn solid" href="#contact">다른 것이 궁금해요</a></p></div>';
  };

  function orgList(list) {
    if (!list.length) return '<div class="empty">등록된 기관이 없어요.</div>';
    return '<div class="cards">' + list.map(function (o) {
      return '<div class="card"><div class="meta"><span class="tag family">' + esc(o.지역) + "</span></div><h3>" + esc(o.이름) + '</h3><p class="desc">' + esc(o.하는일) + "</p>" +
        '<div class="foot">' + (o.전화 ? '<span class="by">☎ <b class="notranslate" translate="no">' + esc(o.전화) + "</b></span>" : '<span class="by"></span>') +
        (o.링크 ? '<a class="btn small" href="' + esc(o.링크) + '" target="_blank" rel="noopener">홈페이지</a>' : "") + "</div></div>";
    }).join("") + "</div>";
  }
  V.help = function () {
    return head("도움받을 곳", "내 나라 말로 상담받을 수 있는 곳과 학교 관련 기관이에요.", '<a href="#family">가족 안내</a>') +
      '<div class="wrap">' + orgList(rows("기관")) + "</div>";
  };

  V.student = function () {
    return head("학생 마당", "놀면서 배우는 다문화 퀴즈와 학교 낱말 카드예요.", '<a href="#home">홈</a>') +
      '<div class="wrap"><div class="grid">' +
      tile("#quiz", "🎯", "다문화 퀴즈쇼", "교실 큰 화면에 띄우고 함께 풀어요") +
      tile("#flash", "🃏", "학교 낱말 카드", "카드를 넘기며 학교 말을 익혀요") +
      tile("#boards", "🧩", "활동 보드", "친구들과 함께 쓰는 보드") +
      tile("#resources", "🗂️", "학생 자료", "학생이 볼 수 있는 자료") +
      "</div></div>";
  };

  var quiz = { i: 0, score: 0, done: false };
  V.quiz = function () {
    var qs = rows("퀴즈");
    if (!qs.length) return head("다문화 퀴즈쇼") + '<div class="wrap"><div class="empty">퀴즈가 없어요. 시트의 "퀴즈" 탭에 문제를 넣어 주세요.</div></div>';
    if (quiz.i >= qs.length) {
      return head("다문화 퀴즈쇼", "", '<a href="#student">학생 마당</a>') + '<div class="wrap"><div class="quiz"><p class="q">' + qs.length + "문제 중 " + quiz.score + '개를 맞혔어요!</p><button class="btn" type="button" data-act="quiz-restart">처음부터 다시</button></div></div>';
    }
    var q = qs[quiz.i];
    var opts = [1, 2, 3, 4].map(function (n) {
      return q["보기" + n] ? '<button class="opt" type="button" data-opt="' + n + '"><b aria-hidden="true">' + n + "</b><span>" + esc(q["보기" + n]) + "</span></button>" : "";
    }).join("");
    return head("다문화 퀴즈쇼", "", '<a href="#student">학생 마당</a>') + '<div class="wrap"><div class="quiz" id="quizBox">' +
      '<div class="bar"><span>' + (quiz.i + 1) + " / " + qs.length + "</span><span>맞힌 문제 " + quiz.score + "</span></div>" +
      '<p class="q">' + esc(q.질문) + '</p><div class="opts">' + opts + '</div><div id="quizExp"></div></div></div>';
  };

  var flash = { i: 0, back: false };
  V.flash = function () {
    var ws = rows("용어사전");
    if (!ws.length) return head("학교 낱말 카드") + '<div class="wrap"><div class="empty">낱말이 없어요.</div></div>';
    var w = ws[flash.i % ws.length];
    return head("학교 낱말 카드", "카드를 누르면 뜻이 나와요.", '<a href="#student">학생 마당</a>') +
      '<div class="wrap"><button type="button" class="quiz" data-act="flip" style="width:100%;text-align:center;cursor:pointer;min-height:260px;border:0">' +
      '<div class="bar"><span>' + ((flash.i % ws.length) + 1) + " / " + ws.length + "</span><span>" + (flash.back ? "뜻" : "낱말") + "</span></div>" +
      '<div style="font-size:3rem;margin-top:14px" aria-hidden="true">' + esc(w.그림) + "</div>" +
      '<p class="q">' + esc(flash.back ? w.쉬운설명 : w.용어) + "</p></button>" +
      '<p style="margin-top:14px;display:flex;gap:8px"><button class="btn" type="button" data-act="flash-prev">이전</button><button class="btn solid" type="button" data-act="flash-next">다음 낱말</button></p></div>';
  };

  V.teacher = function () {
    return head("선생님 자료실", "현장 선생님들이 만든 수업 자료와 활동 보드예요. 누구나 올릴 수 있어요.", '<a href="#home">홈</a>') +
      '<div class="wrap"><div class="grid">' +
      tile("#resources", "🗂️", "수업 자료", "KSL 한국어, 다문화이해, 세계시민, 학적 실무") +
      tile("#boards", "🧩", "활동 보드", "분과·교실 활동 보드 모음") +
      tile("#letters", "✉️", "다국어 가정통신문", "통신문을 만들고 한국어와 함께 인쇄") +
      tile("#news", "📢", "연수·모임 소식", "총회, 연구모임, 연수 안내") +
      '</div><div class="sec"><div class="band teacher"><h2>자료나 보드를 나눠 주세요</h2><p>로그인 없이 누구나 올릴 수 있어요. 이름과 삭제용 비밀번호만 적으면 됩니다.</p>' +
      '<p style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn solid" type="button" data-act="add-resource">자료 올리기</button><button class="btn" type="button" data-act="add-board">보드 등록하기</button></p></div></div></div>';
  };

  function uniq(a) { var o = []; a.forEach(function (x) { if (x && o.indexOf(x) < 0) o.push(x); }); return o; }
  V.boards = function () {
    var list = rows("보드").sort(byDate);
    return head("활동 보드", "분과와 교실에서 쓰는 보드 모음이에요. 새 보드는 누구나 등록할 수 있어요.", '<a href="#teacher">선생님 자료실</a>') +
      '<div class="wrap"><p><button class="btn solid" type="button" data-act="add-board">보드 등록하기</button></p>' +
      (list.length ? '<div class="cards">' + list.map(function (b) {
        return '<div class="card"><div class="meta"><span class="tag student">' + esc(b.분류 || "보드") + "</span></div><h3>" + esc(b.제목) + '</h3><p class="desc">' + linkify(b.설명) + "</p>" +
          '<div class="foot"><span class="by">' + esc(b.만든사람) + (b.PIN ? ' · PIN <span class="pin notranslate" translate="no">' + esc(b.PIN) + "</span>" : "") + "</span>" +
          (b.링크 ? '<a class="btn small solid" href="' + esc(b.링크) + '" target="_blank" rel="noopener">보드 열기</a>' : "") + "</div>" +
          '<div class="foot"><button class="linkish" type="button" data-report="보드" data-id="' + esc(b.id) + '">신고</button><button class="linkish" type="button" data-del="보드" data-id="' + esc(b.id) + '">내 글 지우기</button></div></div>';
      }).join("") + "</div>" : '<div class="empty">아직 보드가 없어요. 첫 보드를 등록해 주세요.</div>') + "</div>";
  };

  V.about = function () {
    function ul(s) { var l = lines(s); return l.length ? "<ul>" + l.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : ""; }
    return head("연구회 소개", "", '<a href="#home">홈</a>') + '<div class="wrap"><div class="two">' +
      '<div class="band about"><h2>' + esc(setting("사이트이름")) + "</h2><p>" + esc(setting("연구회소개")) + "</p></div>" +
      '<div class="article"><h2>인사말</h2><div class="body">' + esc(setting("인사말")) + "</div></div>" +
      '<div class="article"><h2>연혁</h2>' + ul(setting("연혁")) + "</div>" +
      '<div class="article"><h2>조직·분과</h2>' + ul(setting("분과")) + "</div>" +
      '<div class="article"><h2>함께하기</h2><p>' + esc(setting("회원가입안내")) + '</p><a class="btn solid" href="#contact">문의하기</a></div>' +
      '<div class="article"><h2>연락처</h2><p>이메일 ' + esc(setting("연락처이메일")) + "<br>주소 " + esc(setting("주소")) + "</p></div>" +
      "</div></div>";
  };

  V.contact = function () {
    return head("문의하기", "궁금한 것을 남기면 연구회 선생님이 답해 드려요. 어느 나라 말로 써도 괜찮아요.", '<a href="#home">홈</a>') +
      '<div class="wrap"><form class="form article" id="contactForm" novalidate>' +
      '<label for="cWho">답을 받을 연락처 <small>(이메일 또는 전화번호)</small></label><input id="cWho" name="연락처" required autocomplete="email">' +
      '<label for="cMsg">내용</label><textarea id="cMsg" name="내용" required></textarea>' +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="note" style="margin-top:12px">답을 드리기 위해 연락처만 받고, 답변 뒤 1년이 지나면 지웁니다. 이름이나 체류 자격 같은 정보는 적지 않아도 돼요.</p>' +
      '<div class="err" id="cErr" role="alert"></div><div class="actions"><button class="btn solid" type="submit">보내기</button></div></form></div>';
  };

  V.policy = function () {
    return head("개인정보처리방침", "", '<a href="#home">홈</a>') + '<div class="wrap"><div class="article"><div class="body">' +
      esc("경기도다문화교육연구회 홈페이지는 꼭 필요한 정보만 받습니다.\n\n1. 받는 정보\n- 문의하기: 답을 받을 연락처, 문의 내용\n- 자료·보드 등록: 올린 사람 이름(별명 가능), 삭제용 비밀번호(암호화해서 저장)\n\n2. 쓰는 곳\n- 문의에 답하기, 올린 글을 관리하기\n\n3. 보관 기간\n- 문의: 답변 후 1년\n- 등록한 글: 올린 사람이 지우거나 관리자가 지울 때까지\n\n4. 다른 곳에 주지 않습니다.\n\n5. 문의: 연구회 이메일 " + setting("연락처이메일") + "\n\n(연구회 운영위원회 확인 후 확정할 내용입니다.)") +
      "</div></div></div>";
  };
  V.terms = function () {
    return head("이용약관·저작권", "", '<a href="#home">홈</a>') + '<div class="wrap"><div class="article"><div class="body">' +
      esc("1. 누구나 자료와 보드를 올릴 수 있습니다. 올린 내용의 책임은 올린 사람에게 있습니다.\n2. 다른 사람의 저작물(시판 교재, 음원, 사진)을 허락 없이 올리지 마세요.\n3. 학생 얼굴 사진, 전화번호 같은 개인정보를 올리지 마세요.\n4. 광고, 욕설, 개인정보가 있는 글은 신고되면 숨겨지고 관리자가 지울 수 있습니다.\n5. 연구회 자료는 출처를 밝히면 수업에 자유롭게 쓸 수 있습니다. 자료마다 따로 적힌 조건이 있으면 그 조건을 따릅니다.\n\n(연구회 운영위원회 확인 후 확정할 내용입니다.)") +
      "</div></div></div>";
  };
  V.sitemap = function () {
    function g(t, items) { return '<div class="article"><h2>' + t + "</h2><ul>" + items.map(function (x) { return '<li><a href="#' + x[0] + '">' + x[1] + "</a></li>"; }).join("") + "</ul></div>"; }
    return head("사이트맵", "", '<a href="#home">홈</a>') + '<div class="wrap"><div class="grid">' +
      g("가족 안내", [["family", "가족 안내"], ["words", "학교 낱말 사전"], ["faq", "자주 묻는 질문"], ["help", "도움받을 곳"], ["contact", "문의하기"]]) +
      g("학생 마당", [["quiz", "다문화 퀴즈쇼"], ["flash", "학교 낱말 카드"], ["boards", "활동 보드"]]) +
      g("선생님 자료실", [["resources", "수업 자료"], ["boards", "활동 보드"], ["letters", "다국어 가정통신문"], ["templates", "통신문 양식"]]) +
      g("연구회", [["about", "연구회 소개"], ["news", "소식"], ["policy", "개인정보처리방침"], ["terms", "이용약관·저작권"], ["admin", "관리자"]]) +
      "</div></div>";
  };
  V.notfound = function () { return head("페이지를 찾을 수 없어요", "주소가 바뀌었거나 글이 지워졌어요.") + '<div class="wrap"><a class="btn solid" href="#home">홈으로</a></div>'; };

  /* ---------- 등록 폼 ---------- */
  function formShell(title, inner, id) {
    return '<h2 id="modalTitle">' + title + '</h2><form class="form" id="' + id + '" novalidate>' + inner +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="err" role="alert"></div><div class="actions"><button class="btn" type="button" data-close>취소</button><button class="btn solid" type="submit">등록하기</button></div></form>';
  }
  var who = '<div class="two"><div><label>올린 사람 <small>(이름 또는 별명)</small><input name="이름" required maxlength="40"></label></div>' +
    '<div><label>삭제용 비밀번호 <small>(4자 이상, 나중에 지울 때 필요)</small><input name="비밀번호" type="password" required minlength="4" autocomplete="new-password"></label></div></div>';
  function openBoardForm() {
    openModal(formShell("보드 등록하기",
      '<label>보드 이름<input name="제목" required maxlength="120"></label>' +
      '<label>분류 <small>(예: KSL 한국어, 세계시민, 교실 활동)</small><input name="분류" maxlength="40"></label>' +
      '<label>설명<textarea name="설명" maxlength="600"></textarea></label>' +
      '<label>보드 주소 <small>(퀴즈앤, 패들렛 등)</small><input name="링크" type="url" required placeholder="https://"></label>' +
      '<label>PIN <small>(보드 입장 번호가 있으면)</small><input name="PIN" maxlength="20"></label>' + who, "boardForm"));
    bindForm("boardForm", "addBoard");
  }
  function openReport(kind, id) {
    openModal('<h2 id="modalTitle">신고하기</h2><form class="form" id="repForm"><label>이유<select name="이유"><option>광고·스팸</option><option>개인정보가 있어요</option><option>저작권 문제</option><option>욕설·불쾌한 내용</option><option>기타</option></select></label>' +
      '<p class="note" style="margin-top:12px">신고가 여러 번 모이면 자동으로 숨겨지고 관리자가 확인해요.</p><div class="err" role="alert"></div><div class="actions"><button class="btn" type="button" data-close>취소</button><button class="btn solid" type="submit">신고하기</button></div></form>');
    $("#repForm").onsubmit = function (e) {
      e.preventDefault();
      post({ action: "report", kind: kind, id: id, reason: this.이유.value }).then(function () { closeModal(); toast("신고했어요. 고맙습니다."); refresh(); })
        .catch(function (err) { $("#repForm .err").textContent = err.message; });
    };
  }
  function openDelete(kind, id) {
    openModal('<h2 id="modalTitle">내 글 지우기</h2><form class="form" id="delForm"><label>올릴 때 정한 삭제용 비밀번호<input name="비밀번호" type="password" required></label>' +
      '<div class="err" role="alert"></div><div class="actions"><button class="btn" type="button" data-close>취소</button><button class="btn solid" type="submit">지우기</button></div></form>');
    $("#delForm").onsubmit = function (e) {
      e.preventDefault();
      post({ action: "delete", kind: kind, id: id, password: this.비밀번호.value }).then(function () { closeModal(); toast("지웠어요."); refresh(); })
        .catch(function (err) { $("#delForm .err").textContent = err.message; });
    };
  }
  function readFile(file) {
    return new Promise(function (ok, bad) {
      if (!file) return ok(null);
      if (file.size > 10 * 1024 * 1024) return bad(new Error("파일이 10MB보다 커요. 구글 드라이브에 올리고 링크를 적어 주세요."));
      var fr = new FileReader();
      fr.onload = function () { ok({ name: file.name, type: file.type || "application/octet-stream", data: String(fr.result).split(",")[1] }); };
      fr.onerror = function () { bad(new Error("파일을 읽지 못했어요.")); };
      fr.readAsDataURL(file);
    });
  }
  function bindForm(id, action) {
    var f = document.getElementById(id), opened = Date.now();
    f.onsubmit = function (e) {
      e.preventDefault();
      var err = $(".err", f); err.textContent = "";
      var need = $$("[required]", f).filter(function (x) { return !x.value.trim(); });
      if (need.length) { err.textContent = "빈칸을 채워 주세요."; need[0].focus(); return; }
      if (f.비밀번호 && f.비밀번호.value.length < 4) { err.textContent = "삭제용 비밀번호는 4자 이상으로 정해 주세요."; return; }
      var data = {};
      $$("input,select,textarea", f).forEach(function (x) { if (x.name && x.type !== "file") data[x.name] = x.value.trim(); });
      var btn = $("button[type=submit]", f); btn.disabled = true; btn.textContent = "올리는 중…";
      readFile(f.파일 && f.파일.files[0]).then(function (file) {
        return post({ action: action, data: data, file: file, elapsed: Date.now() - opened });
      }).then(function (j) {
        closeModal(); toast(j.status === "검토" ? "등록했어요. 관리자 확인 뒤 보여요." : "등록했어요!"); refresh();
      }).catch(function (x) { err.textContent = x.message; btn.disabled = false; btn.textContent = "등록하기"; });
    };
  }

  /* ---------- 검색 ---------- */
  function openSearch() {
    openModal('<h2 id="modalTitle">검색</h2><input class="search" style="max-width:none" id="sq" type="search" placeholder="찾을 말을 쓰세요" aria-label="검색어"><div id="sr"></div>');
    var inp = $("#sq");
    inp.oninput = function () {
      var q = inp.value.trim().toLowerCase(), out = [];
      if (q.length < 1) { $("#sr").innerHTML = ""; return; }
      function hit(s) { return String(s || "").toLowerCase().indexOf(q) >= 0; }
      rows("가족안내").forEach(function (g, i) { if (hit(g.제목 + g.요약 + g.내용)) out.push(["#family-" + i, "가족 안내", g.제목]); });
      rows("용어사전").forEach(function (w) { if (hit(w.용어 + w.쉬운설명)) out.push(["#words", "낱말", w.용어]); });
      rows("자주묻는질문").forEach(function (f) { if (hit(f.질문 + f.답)) out.push(["#faq", "질문", f.질문]); });
      (DB.공지 || []).forEach(function (n, i) { if (visible(n) && hit(n.제목 + n.내용)) out.push(["#news-" + (n.id || i), "소식", n.제목]); });
      rows("자료").forEach(function (r) { if (hit(r.제목 + r.설명)) out.push(["#res-" + r.id, "자료", r.제목]); });
      rows("통신문").forEach(function (l) { if (hit(l.제목 + l.한국어)) out.push(["#letter-" + l.id, "통신문", l.제목]); });
      rows("보드").forEach(function (b) { if (hit(b.제목 + b.설명)) out.push(["#boards", "보드", b.제목]); });
      $("#sr").innerHTML = out.length ? '<ul class="list">' + out.slice(0, 30).map(function (o) { return '<li><a href="' + o[0] + '" data-close><span class="tag">' + o[1] + "</span><span>" + esc(o[2]) + "</span></a></li>"; }).join("") + "</ul>" : '<p class="note">찾는 내용이 없어요.</p>';
    };
  }

  /* ---------- 라우터 ---------- */
  function route() {
    var h = (location.hash || "#home").slice(1) || "home";
    var m;
    if ((m = h.match(/^family-(\d+)$/))) return ["family", V.familyItem(+m[1])];
    for (var k = 0; k < G.routes.length; k++) { if ((m = h.match(G.routes[k].re))) return [G.routes[k].sec, G.routes[k].fn(m)]; }
    var sec = { family: "family", words: "family", faq: "family", help: "family", contact: "family", student: "student", quiz: "student", flash: "student",
      teacher: "teacher", resources: "teacher", boards: "teacher", letters: "teacher", about: "about", news: "news", home: "home", policy: "", terms: "", sitemap: "" };
    if (V[h] && h !== "familyItem" && h !== "newsItem" && h !== "notfound") return [sec[h] || "", V[h]()];
    return ["", V.notfound()];
  }
  // 화면을 새로 그린 뒤, 번역 중이면 구글 번역이 새 내용도 번역하도록 다시 실행
  var skipRetranslate = false, rtTimer = null;
  function retranslate() {
    if (skipRetranslate) { skipRetranslate = false; return; }
    var lang = getLang(), combo = document.querySelector(".goog-te-combo");
    if (!TR_OK || lang === "ko" || !combo) return;
    clearTimeout(rtTimer);
    rtTimer = setTimeout(function () {
      var other = lang === "en" ? "vi" : "en";
      combo.value = other; combo.dispatchEvent(new Event("change"));
      setTimeout(function () { combo.value = lang; combo.dispatchEvent(new Event("change")); }, 600);
    }, 150);
  }
  function render() {
    var r = route();
    app.innerHTML = r[1];
    $$("[data-sec]").forEach(function (a) { a.classList.toggle("on", a.getAttribute("data-sec") === r[0]); });
    $$("[data-setting]").forEach(function (el) { var v = setting(el.getAttribute("data-setting")); if (v) el.textContent = v; });
    var t = $("h1", app); document.title = (t && location.hash && location.hash !== "#home" ? t.textContent + " | " : "") + (setting("사이트이름") || "경기도다문화교육연구회");
    applyDir();
    after();
    retranslate();
  }
  function after() {
    var cf = $("#contactForm");
    if (cf) cf.onsubmit = function (e) {
      e.preventDefault();
      var err = $("#cErr"); err.textContent = "";
      if (!cf.연락처.value.trim() || !cf.내용.value.trim()) { err.textContent = "연락처와 내용을 적어 주세요."; return; }
      post({ action: "contact", data: { 연락처: cf.연락처.value.trim(), 내용: cf.내용.value.trim(), website: cf.website.value } })
        .then(function () { cf.innerHTML = '<h2>보냈어요</h2><p>연구회 선생님이 확인하고 연락드릴게요.</p><a class="btn" href="#home">홈으로</a>'; })
        .catch(function (x) { err.textContent = x.message; });
    };
    G.afters.forEach(function (f) { try { f(); } catch (x) { if (window.console) console.error(x); } });
  }

  /* ---------- 클릭 처리 ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, a"); if (!t) return;
    if (t.hasAttribute("data-close")) { if (t.tagName === "A") { closeModal(); return; } e.preventDefault(); closeModal(); return; }
    var open = t.getAttribute("data-open");
    if (open === "lang") { e.preventDefault(); openLang(); return; }
    if (open === "search") { e.preventDefault(); openSearch(); return; }
    if (t.classList.contains("hello") && t.getAttribute("data-lang")) { setLang(t.getAttribute("data-lang")); return; }
    if (t.hasAttribute("data-report")) { openReport(t.getAttribute("data-report"), t.getAttribute("data-id")); return; }
    if (t.hasAttribute("data-del")) { openDelete(t.getAttribute("data-del"), t.getAttribute("data-id")); return; }
    if (t.hasAttribute("data-copy")) { var el = document.getElementById(t.getAttribute("data-copy")); copyText(el.textContent, "복사했어요"); return; }
    if (t.hasAttribute("data-opt")) {
      var qs = rows("퀴즈"), q = qs[quiz.i], pick = t.getAttribute("data-opt"), ok = String(q.정답).trim() === pick;
      $$(".opt").forEach(function (b) { b.disabled = true; if (b.getAttribute("data-opt") === String(q.정답).trim()) b.classList.add("right"); });
      if (!ok) t.classList.add("wrong"); else quiz.score++;
      $("#quizExp").innerHTML = '<div class="exp"><b>' + (ok ? "정답이에요!" : "아쉬워요.") + "</b> " + esc(q.해설) + '</div><p style="margin-top:14px"><button class="btn" type="button" data-act="quiz-next">다음 문제</button></p>';
      $("[data-act=quiz-next]").focus();
      return;
    }
    var act = t.getAttribute("data-act");
    if (!act) return;
    if (act === "speak") speak($("#readable .body") || $("#readable"), t);
    else if (act === "share") openShare();
    else if (act === "add-resource") location.hash = "#write-res";
    else if (act === "add-board") openBoardForm();
    else if (act === "quiz-next") { quiz.i++; render(); }
    else if (act === "quiz-restart") { quiz = { i: 0, score: 0 }; render(); }
    else if (act === "flip") { flash.back = !flash.back; render(); }
    else if (act === "flash-next") { flash.i++; flash.back = false; render(); }
    else if (act === "flash-prev") { flash.i = Math.max(0, flash.i - 1); flash.back = false; render(); }
    else if (act === "print") { try { window.print(); } catch (x) {} }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !document.getElementById("modal").hidden) closeModal(); });

  var fb = document.getElementById("fontBtn");
  if (store.get("big") === "1") { document.documentElement.classList.add("big"); fb.setAttribute("aria-pressed", "true"); }
  fb.onclick = function () {
    var on = document.documentElement.classList.toggle("big");
    fb.setAttribute("aria-pressed", on ? "true" : "false"); store.set("big", on ? "1" : "0");
  };

  window.addEventListener("hashchange", function () {
    if (!document.getElementById("modal").hidden) closeModal();
    if (location.hash !== "#quiz") quiz = { i: 0, score: 0 };
    render(); window.scrollTo(0, 0);
    var a = document.getElementById("app"); if (a) a.focus({ preventScroll: true });
  });

  var G = {
    $: $, $$: $$, esc: esc, linkify: linkify, toast: toast, setting: setting, rows: rows, visible: visible, byDate: byDate, lines: lines, uniq: uniq,
    post: post, apiGet: apiGet, refresh: refresh, render: render, getLang: getLang, langName: langName, LANGS: LANGS, RTL: RTL,
    openModal: openModal, closeModal: closeModal, head: head, articleTools: articleTools, readFile: readFile, copyText: copyText,
    openShare: openShare, openReport: openReport, V: V, routes: [], afters: [], admin: adminPw,
    db: function () { return DB; }, live: function () { return LIVE; },
    route: function (re, sec, fn) { G.routes.push({ re: re, sec: sec, fn: fn }); },
    after: function (fn) { G.afters.push(fn); }
  };
  (window.GGMCE_MODULES || []).forEach(function (f) { f(G); });

  initTranslate();
  load().then(function () { render(); suggestLang(); });
})();
