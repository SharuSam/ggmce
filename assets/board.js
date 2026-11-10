/* 경기도다문화교육연구회 홈페이지 - 게시판(소식·자료)과 관리자
 * 글은 구글 시트의 '공지', '자료' 탭에 저장됩니다. 이 파일은 고치지 않아도 됩니다.
 */
(window.GGMCE_MODULES = window.GGMCE_MODULES || []).push(function (G) {
  "use strict";
  var esc = G.esc, $ = G.$, $$ = G.$$;
  var PER = 15;
  var NEWS_CATS = ["공지", "안내", "총회", "연수", "행사", "모집", "기타"];
  var RES_CATS = ["KSL 한국어", "다문화이해", "세계시민", "학적·실무", "연수 자료", "가족 안내", "기타"];
  var st = { news: { p: 1, cat: "전체", q: "" }, res: { p: 1, cat: "전체", who: "전체", q: "" }, letters: { p: 1, q: "" } };

  /* ---------- 공통 도구 (통신문 화면도 같이 씁니다) ---------- */
  function today() {
    var d = new Date(), z = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  }
  function canWrite(key, def) {
    var mode = (G.setting(key) || def || "누구나").trim();
    return mode === "누구나" || !!G.admin();
  }
  function findItem(tab, key) {
    var all = G.db()[tab] || [];
    var hit = all.filter(function (r) { return G.visible(r) && String(r.id) === String(key); })[0];
    if (!hit && /^\d+$/.test(key) && all[+key] && !all[+key].id) hit = all[+key];
    return hit && G.visible(hit) ? hit : null;
  }
  function pager(key, total) {
    var n = Math.ceil(total / PER);
    if (n < 2) return "";
    var cur = st[key].p, out = [];
    for (var i = 1; i <= n; i++) out.push('<button type="button" class="pg' + (i === cur ? " on" : "") + '" data-pg="' + key + '" data-n="' + i + '"' + (i === cur ? ' aria-current="page"' : "") + ">" + i + "</button>");
    return '<nav class="pager" aria-label="쪽">' + out.join("") + "</nav>";
  }
  /** cols: [{h:"제목", c:"t", v:function(r){return html}}], href(r) */
  function table(key, list, cols, href, emptyMsg) {
    if (!list.length) return '<div class="empty">' + esc(emptyMsg || "아직 글이 없어요.") + "</div>";
    var cur = st[key] ? st[key].p : 1, from = (cur - 1) * PER, total = list.length;
    var page = st[key] ? list.slice(from, from + PER) : list;
    return '<table class="board"><thead><tr><th class="c-no">번호</th>' + cols.map(function (c) { return '<th class="c-' + c.c + '">' + esc(c.h) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      page.map(function (r, i) {
        return '<tr data-href="' + esc(href(r)) + '"><td class="c-no">' + (total - from - i) + "</td>" +
          cols.map(function (c) { return '<td class="c-' + c.c + '">' + (c.c === "t" ? '<a href="' + esc(href(r)) + '">' + c.v(r) + "</a>" : c.v(r)) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>" + (st[key] ? pager(key, total) : "");
  }
  function field(f) {
    var id = "f-" + f.n, req = f.req ? " required" : "", v = f.v == null ? "" : f.v;
    var lab = '<label for="' + id + '">' + esc(f.l) + (f.small ? " <small>" + esc(f.small) + "</small>" : "") + (f.req ? ' <b class="need" aria-hidden="true">*</b>' : "") + "</label>";
    var ctl;
    if (f.t === "textarea") ctl = '<textarea id="' + id + '" name="' + f.n + '" rows="' + (f.rows || 6) + '"' + req + (f.max ? ' maxlength="' + f.max + '"' : "") + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + ">" + esc(v) + "</textarea>";
    else if (f.t === "select") ctl = '<select id="' + id + '" name="' + f.n + '">' + f.opts.map(function (o) { return "<option" + (o === v ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>";
    else if (f.t === "file") ctl = '<input id="' + id + '" name="' + f.n + '" type="file"' + (f.accept ? ' accept="' + f.accept + '"' : "") + ">";
    else ctl = '<input id="' + id + '" name="' + f.n + '" type="' + (f.t || "text") + '" value="' + esc(v) + '"' + req + (f.max ? ' maxlength="' + f.max + '"' : "") + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : "") + (f.ac ? ' autocomplete="' + f.ac + '"' : "") + ">";
    return '<div class="fld' + (f.half ? " half" : "") + '">' + lab + ctl + (f.note ? '<p class="hint">' + esc(f.note) + "</p>" : "") + "</div>";
  }
  /** 글쓴이·비밀번호 칸. edit=true면 '올릴 때 정한 비밀번호' */
  function ownerFields(edit, whoLabel, whoVal) {
    var adm = !!G.admin();
    var out = field({ n: "이름", l: whoLabel || "올린 사람", small: "(이름 또는 별명)", v: whoVal || "", req: !adm && !edit, max: 40, half: true });
    if (adm) out += '<div class="fld half"><label>권한</label><p class="adm-badge">🔑 관리자로 쓰는 중</p></div>';
    else out += field({ n: "비밀번호", l: edit ? "올릴 때 정한 비밀번호" : "삭제용 비밀번호", small: edit ? "" : "(4자 이상, 고치거나 지울 때 필요)", t: "password", req: true, ac: edit ? "current-password" : "new-password", half: true });
    return '<div class="fld-row">' + out + "</div>";
  }
  function formData(f) {
    var data = {};
    $$("input,select,textarea", f).forEach(function (x) { if (x.name && x.type !== "file" && x.type !== "checkbox") data[x.name] = x.value.trim(); });
    return data;
  }
  function checkRequired(f, err) {
    var need = $$("[required]", f).filter(function (x) { return !x.value.trim(); });
    if (need.length) { err.textContent = "* 표시된 칸을 채워 주세요."; need[0].focus(); return false; }
    if (f.비밀번호 && f.비밀번호.value && f.비밀번호.value.length < 4) { err.textContent = "비밀번호는 4자 이상으로 정해 주세요."; f.비밀번호.focus(); return false; }
    return true;
  }
  function busy(btn, on, label) { btn.disabled = on; if (on) { btn.setAttribute("data-label", btn.textContent); btn.textContent = label || "보내는 중…"; } else btn.textContent = btn.getAttribute("data-label") || btn.textContent; }
  function askPassword(title, cb) {
    if (G.admin()) { cb(""); return; }
    G.openModal('<h2 id="modalTitle">' + esc(title) + '</h2><form class="form" id="pwForm"><label>올릴 때 정한 비밀번호<input name="pw" type="password" required autocomplete="current-password"></label>' +
      '<p class="note" style="margin-top:12px">관리자는 맨 아래 [관리자]에서 들어오면 비밀번호 없이 할 수 있어요.</p>' +
      '<div class="err" role="alert"></div><div class="actions"><button class="btn" type="button" data-close>취소</button><button class="btn solid" type="submit">확인</button></div></form>');
    $("#pwForm").onsubmit = function (e) { e.preventDefault(); var v = this.pw.value; if (!v) return; cb(v, $("#pwForm .err")); };
  }
  function removeItem(kind, id, back) {
    askPassword("지우기", function (pw, errEl) {
      if (!G.admin() && !confirm("정말 지울까요? 지운 글은 되돌릴 수 없어요.")) return;
      if (G.admin() && !confirm("관리자 권한으로 지웁니다. 정말 지울까요?")) return;
      G.post({ action: "delete", kind: kind, id: id, password: pw }).then(function () {
        G.closeModal(); G.toast("지웠어요."); location.hash = back; G.refresh();
      }).catch(function (x) { if (errEl) errEl.textContent = x.message; else G.toast(x.message); });
    });
  }
  function itemActions(kind, id, editHash, back, canReport) {
    return '<div class="item-actions"><a class="btn small" href="' + back + '">목록</a>' +
      '<span class="sp"></span>' +
      (editHash ? '<a class="btn small quiet" href="' + editHash + '">✏️ 고치기</a>' : "") +
      '<button class="btn small quiet" type="button" data-bdel="' + esc(kind) + '" data-id="' + esc(id) + '" data-back="' + esc(back) + '">🗑 지우기</button>' +
      (canReport ? '<button class="linkish" type="button" data-report="' + esc(kind) + '" data-id="' + esc(id) + '">신고</button>' : "") + "</div>";
  }
  function attachLink(link, label) {
    if (!link) return "";
    var isFile = /drive\.google\.com/.test(link);
    return '<p class="attach"><a class="btn solid" href="' + esc(link) + '" target="_blank" rel="noopener">' + (isFile ? "📎 " : "🔗 ") + esc(label || (isFile ? "첨부 파일 열기" : "링크 열기")) + "</a></p>";
  }
  function liveNote() {
    return G.live() ? "" : '<p class="note">지금은 예시 화면이라 글을 저장할 수 없어요. 구글 시트가 연결된 공개 주소에서 써 주세요.</p>';
  }
  function needAdminBox(what) {
    return '<div class="article"><h2>' + esc(what) + '은(는) 관리자만 쓸 수 있어요</h2><p>연구회 관리자라면 관리자 비밀번호로 들어와 주세요.</p><a class="btn solid" href="#admin">관리자로 들어가기</a></div>';
  }
  /** 글쓰기 폼 전송: action, kind, id(고칠 때), extra(payload에 더할 것) */
  function bindWrite(f, opt) {
    var opened = Date.now();
    f.onsubmit = function (e) {
      e.preventDefault();
      var err = $(".err", f); err.textContent = "";
      if (!checkRequired(f, err)) return;
      var data = formData(f), btn = $("button[type=submit]", f);
      busy(btn, true, "올리는 중…");
      var fileInput = f.querySelector("input[type=file]");
      G.readFile(fileInput && fileInput.files[0]).then(function (file) {
        var payload = { action: opt.id ? "update" : opt.action, kind: opt.kind, id: opt.id, data: data, file: file, elapsed: Date.now() - opened };
        if (opt.id) payload.password = data.비밀번호 || "";
        if (opt.extra) opt.extra(payload);
        return G.post(payload);
      }).then(function (j) {
        G.toast(j.status === "검토" ? "등록했어요. 관리자 확인 뒤 보여요." : opt.id ? "고쳤어요." : "등록했어요!");
        return G.refresh().then(function () { location.hash = j.status === "검토" ? opt.back : opt.detail(j.id || opt.id); });
      }).catch(function (x) { err.textContent = x.message; busy(btn, false); });
    };
  }

  /* ---------- 관리자 ---------- */
  G.route(/^admin$/, "", function () {
    var on = !!G.admin();
    return G.head("관리자", "연구회 관리자만 쓰는 곳이에요.", '<a href="#home">홈</a>') + '<div class="wrap"><div class="article">' +
      (on
        ? '<p class="adm-badge">🔑 관리자로 들어와 있어요 (이 브라우저 창을 닫으면 자동으로 나가요)</p>' +
          '<div class="grid" style="margin:16px 0">' +
          '<a class="tile" href="#write-news"><span class="ic">📢</span><span><h3>소식 쓰기</h3><p>공지·연수·행사 소식</p></span></a>' +
          '<a class="tile" href="#write-letter"><span class="ic">✉️</span><span><h3>가정통신문 만들기</h3><p>여러 언어로 번역해 인쇄</p></span></a>' +
          '<a class="tile" href="#templates"><span class="ic">🖼️</span><span><h3>통신문 양식 관리</h3><p>PDF 양식 올리기·고치기</p></span></a>' +
          '<a class="tile" href="#write-res"><span class="ic">🗂️</span><span><h3>자료 올리기</h3><p>수업 자료실</p></span></a></div>' +
          '<p class="note">관리자로 들어와 있으면 모든 글을 비밀번호 없이 고치거나 지울 수 있어요. 숨겨진 글(공개가 N 또는 검토)은 구글 시트에서 공개를 Y로 바꾸면 보여요. 관리자 비밀번호는 구글 시트 [설정] 탭의 <b>관리자비밀번호</b>에서 바꿉니다.</p>' +
          '<p><button class="btn" type="button" id="admOut">관리자 나가기</button></p>'
        : '<form class="form" id="admForm" style="max-width:420px"><label for="admPw">관리자 비밀번호</label><input id="admPw" name="pw" type="password" required autocomplete="current-password">' +
          '<p class="hint">처음 만든 비밀번호는 연구회 알림 메일로 보냈어요. 구글 시트 [설정] 탭의 관리자비밀번호에서도 볼 수 있어요.</p>' +
          '<div class="err" role="alert"></div><div class="actions" style="justify-content:flex-start"><button class="btn solid" type="submit">들어가기</button></div></form>') +
      "</div></div>";
  });
  G.after(function () {
    var f = $("#admForm");
    if (f) f.onsubmit = function (e) {
      e.preventDefault();
      var pw = f.pw.value, err = $(".err", f), btn = $("button[type=submit]", f);
      if (!pw) return;
      busy(btn, true, "확인 중…");
      G.post({ action: "checkAdmin", admin: pw }).then(function () {
        try { sessionStorage.setItem("ggmce.admin", pw); } catch (x) {}
        G.toast("관리자로 들어왔어요."); G.render();
      }).catch(function (x) { err.textContent = x.message; busy(btn, false); });
    };
    var o = $("#admOut");
    if (o) o.onclick = function () { try { sessionStorage.removeItem("ggmce.admin"); } catch (x) {} G.toast("나갔어요."); G.render(); };
  });

  /* ---------- 소식 게시판 ---------- */
  function newsList() {
    var s = st.news, q = s.q.toLowerCase();
    return G.rows("공지").sort(G.byDate).filter(function (n) {
      return (s.cat === "전체" || (n.분류 || "공지") === s.cat) && (!q || (n.제목 + " " + n.내용 + " " + n.작성).toLowerCase().indexOf(q) >= 0);
    });
  }
  function newsTable() {
    return table("news", newsList(), [
      { h: "분류", c: "cat", v: function (n) { return '<span class="tag news">' + esc(n.분류 || "공지") + "</span>"; } },
      { h: "제목", c: "t", v: function (n) { return esc(n.제목) + (n.링크 ? ' <span class="clip" title="첨부">📎</span>' : ""); } },
      { h: "작성", c: "by", v: function (n) { return esc(n.작성); } },
      { h: "날짜", c: "d", v: function (n) { return esc(n.날짜); } }
    ], function (n) { return "#news-" + (n.id || (G.db().공지 || []).indexOf(n)); }, "조건에 맞는 소식이 없어요.");
  }
  G.route(/^news$/, "news", function () {
    var cats = ["전체"].concat(G.uniq(G.rows("공지").map(function (n) { return n.분류 || "공지"; })));
    return G.head("소식", "연구회 공지, 총회·연수, 행사 소식이에요.", '<a href="#home">홈</a>') +
      '<div class="wrap"><div class="board-top"><input class="search" type="search" id="newsQ" placeholder="소식 검색" value="' + esc(st.news.q) + '" aria-label="소식 검색">' +
      (canWrite("소식쓰기", "관리자") ? '<a class="btn solid" href="#write-news">✏️ 소식 쓰기</a>' : "") + "</div>" +
      '<div class="filters" role="group" aria-label="분류">' + cats.map(function (c) { return '<button type="button" class="chip' + (c === st.news.cat ? " on" : "") + '" data-ncat="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" +
      '<div id="newsList">' + newsTable() + "</div></div>";
  });
  G.route(/^news-(.+)$/, "news", function (m) {
    var n = findItem("공지", m[1]);
    if (!n) return G.V.notfound();
    var list = G.rows("공지").sort(G.byDate), i = list.indexOf(n), prev = list[i + 1], next = list[i - 1];
    function nav(x, lab) { return x ? '<a href="#news-' + esc(x.id || (G.db().공지 || []).indexOf(x)) + '"><span>' + lab + "</span>" + esc(x.제목) + "</a>" : ""; }
    return '<div class="wrap page-head"><div class="crumb"><a href="#news">소식</a></div></div><div class="wrap"><article class="article" id="readable">' +
      '<p class="meta-line"><span class="tag news">' + esc(n.분류 || "공지") + '</span> <span class="date">' + esc(n.날짜) + "</span> · " + esc(n.작성) + "</p><h1>" + esc(n.제목) + "</h1>" + G.articleTools() +
      '<div class="body">' + G.linkify(n.내용) + "</div>" + attachLink(n.링크) +
      (n.id ? itemActions("소식", n.id, "#edit-news-" + n.id, "#news", false) : '<div class="item-actions"><a class="btn small" href="#news">목록</a></div>') +
      '<div class="prevnext">' + nav(next, "다음 글") + nav(prev, "이전 글") + "</div></article></div>";
  });
  function newsForm(n) {
    var edit = !!n;
    if (!edit && !canWrite("소식쓰기", "관리자")) return G.head("소식 쓰기", "", '<a href="#news">소식</a>') + '<div class="wrap">' + needAdminBox("소식") + "</div>";
    n = n || {};
    return G.head(edit ? "소식 고치기" : "소식 쓰기", "", '<a href="#news">소식</a>') + '<div class="wrap">' + liveNote() +
      '<form class="form article page-form" id="newsForm" novalidate>' +
      '<div class="fld-row">' + field({ n: "분류", l: "분류", t: "select", opts: NEWS_CATS, v: n.분류 || "공지", half: true }) + field({ n: "날짜", l: "날짜", t: "date", v: n.날짜 || today(), half: true }) + "</div>" +
      field({ n: "제목", l: "제목", v: n.제목, req: true, max: 150 }) +
      field({ n: "내용", l: "내용", t: "textarea", rows: 14, v: n.내용, req: true, max: 20000, note: "줄을 바꾸면 그대로 보여요. 인터넷 주소(https://…)는 자동으로 링크가 돼요." }) +
      field({ n: "링크", l: "링크", small: "(있으면)", t: "url", v: n.링크, ph: "https://" }) +
      field({ n: "파일", l: edit ? "첨부 파일 바꾸기" : "첨부 파일", small: "(10MB까지. PDF, 한글, PPT, 워드, 엑셀, 이미지)", t: "file", accept: ".pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip" }) +
      ownerFields(edit, "작성", n.작성) +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="err" role="alert"></div><div class="actions"><a class="btn" href="' + (edit ? "#news-" + esc(n.id) : "#news") + '">취소</a><button class="btn solid" type="submit">' + (edit ? "고친 내용 저장" : "올리기") + "</button></div></form></div>";
  }
  G.route(/^write-news$/, "news", function () { return newsForm(null); });
  G.route(/^edit-news-(.+)$/, "news", function (m) { var n = findItem("공지", m[1]); return n ? newsForm(n) : G.V.notfound(); });

  /* ---------- 자료 게시판 ---------- */
  function resList() {
    var s = st.res, q = s.q.toLowerCase();
    return G.rows("자료").sort(G.byDate).filter(function (r) {
      return (s.cat === "전체" || r.분류 === s.cat) && (s.who === "전체" || r.대상 === s.who) &&
        (!q || (r.제목 + " " + r.설명 + " " + r.올린사람).toLowerCase().indexOf(q) >= 0);
    });
  }
  function whoCls(w) { return w === "가족" ? "family" : w === "학생" ? "student" : "teacher"; }
  function resTable() {
    return table("res", resList(), [
      { h: "분류", c: "cat", v: function (r) { return '<span class="tag">' + esc(r.분류 || "기타") + "</span>"; } },
      { h: "제목", c: "t", v: function (r) { return '<span class="tag ' + whoCls(r.대상) + ' who">' + esc(r.대상 || "교사") + "용</span> " + esc(r.제목) + (r.링크 ? ' <span class="clip" title="첨부">📎</span>' : ""); } },
      { h: "올린 사람", c: "by", v: function (r) { return esc(r.올린사람); } },
      { h: "날짜", c: "d", v: function (r) { return esc(r.등록일); } }
    ], function (r) { return "#res-" + r.id; }, "조건에 맞는 자료가 없어요. 첫 자료를 올려 주세요.");
  }
  G.route(/^resources$/, "teacher", function () {
    var cats = ["전체"].concat(G.uniq(G.rows("자료").map(function (r) { return r.분류; })));
    var whos = ["전체", "교사", "가족", "학생"];
    return G.head("수업 자료", "선생님들이 나눈 자료예요. 누구나 올릴 수 있어요.", '<a href="#teacher">선생님 자료실</a>') +
      '<div class="wrap"><div class="board-top"><input class="search" type="search" id="resQ2" placeholder="자료 검색" value="' + esc(st.res.q) + '" aria-label="자료 검색">' +
      '<a class="btn solid" href="#write-res">✏️ 자료 올리기</a></div>' +
      '<div class="filters" role="group" aria-label="분류">' + cats.map(function (c) { return '<button type="button" class="chip' + (c === st.res.cat ? " on" : "") + '" data-rcat="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") + "</div>" +
      '<div class="filters" role="group" aria-label="대상">' + whos.map(function (c) { return '<button type="button" class="chip' + (c === st.res.who ? " on" : "") + '" data-rwho="' + esc(c) + '">' + (c === "전체" ? "누구나" : esc(c) + "용") + "</button>"; }).join("") + "</div>" +
      '<div id="resList2">' + resTable() + "</div></div>";
  });
  G.route(/^res-(.+)$/, "teacher", function (m) {
    var r = findItem("자료", m[1]);
    if (!r) return G.V.notfound();
    return '<div class="wrap page-head"><div class="crumb"><a href="#resources">수업 자료</a></div></div><div class="wrap"><article class="article" id="readable">' +
      '<p class="meta-line"><span class="tag ' + whoCls(r.대상) + '">' + esc(r.대상 || "교사") + '용</span> <span class="tag">' + esc(r.분류) + "</span>" + (r.학교급 ? ' <span class="tag">' + esc(r.학교급) + "</span>" : "") +
      ' <span class="date">' + esc(r.등록일) + "</span> · " + esc(r.올린사람) + "</p><h1>" + esc(r.제목) + "</h1>" + G.articleTools() +
      '<div class="body">' + (r.설명 ? G.linkify(r.설명) : '<span class="muted">설명이 없어요.</span>') + "</div>" +
      (r.링크 ? attachLink(r.링크, "자료 열기") : '<p class="note">링크가 아직 없어요.</p>') +
      itemActions("자료", r.id, "#edit-res-" + r.id, "#resources", true) + "</article></div>";
  });
  function resForm(r) {
    var edit = !!r; r = r || {};
    return G.head(edit ? "자료 고치기" : "자료 올리기", edit ? "" : "로그인 없이 누구나 올릴 수 있어요. 이름과 비밀번호만 적으면 돼요.", '<a href="#resources">수업 자료</a>') + '<div class="wrap">' + liveNote() +
      '<form class="form article page-form" id="resForm2" novalidate>' +
      field({ n: "제목", l: "제목", v: r.제목, req: true, max: 120 }) +
      '<div class="fld-row">' + field({ n: "분류", l: "분류", t: "select", opts: RES_CATS, v: r.분류 || RES_CATS[0], half: true }) +
      field({ n: "대상", l: "누구를 위한 자료인가요?", t: "select", opts: ["교사", "가족", "학생"], v: r.대상 || "교사", half: true }) + "</div>" +
      field({ n: "학교급", l: "학교급", t: "select", opts: ["공통", "초등", "중등", "고등"], v: r.학교급 || "공통" }) +
      field({ n: "설명", l: "설명", t: "textarea", rows: 8, v: r.설명, max: 5000, note: "어떤 자료인지, 어떻게 쓰면 좋은지 적어 주세요." }) +
      field({ n: "링크", l: "링크", small: "(구글 드라이브·유튜브 등 공유 링크)", t: "url", v: r.링크, ph: "https://" }) +
      field({ n: "파일", l: edit ? "파일 바꾸기" : "또는 파일 올리기", small: "(10MB까지. PDF, 한글, PPT, 워드, 엑셀, 이미지)", t: "file", accept: ".pdf,.hwp,.hwpx,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip" }) +
      ownerFields(edit, "올린 사람", r.올린사람) +
      '<p class="note">학생 얼굴 사진, 전화번호 같은 개인정보와 허락받지 않은 저작물은 올리지 마세요.</p>' +
      '<div class="hp" aria-hidden="true"><label>웹사이트<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="err" role="alert"></div><div class="actions"><a class="btn" href="' + (edit ? "#res-" + esc(r.id) : "#resources") + '">취소</a><button class="btn solid" type="submit">' + (edit ? "고친 내용 저장" : "올리기") + "</button></div></form></div>";
  }
  G.route(/^write-res$/, "teacher", function () { return resForm(null); });
  G.route(/^edit-res-(.+)$/, "teacher", function (m) { var r = findItem("자료", m[1]); return r ? resForm(r) : G.V.notfound(); });

  /* ---------- 화면 연결 ---------- */
  G.after(function () {
    var nf = $("#newsForm"), m;
    if (nf) {
      m = location.hash.match(/^#edit-news-(.+)$/);
      bindWrite(nf, { action: "addNews", kind: "소식", id: m && m[1], back: "#news", detail: function (id) { return "#news-" + id; } });
    }
    var rf = $("#resForm2");
    if (rf) {
      m = location.hash.match(/^#edit-res-(.+)$/);
      bindWrite(rf, { action: "addResource", kind: "자료", id: m && m[1], back: "#resources", detail: function (id) { return "#res-" + id; } });
    }
    var nq = $("#newsQ");
    if (nq) nq.oninput = function () { st.news.q = nq.value; st.news.p = 1; $("#newsList").innerHTML = newsTable(); };
    var rq = $("#resQ2");
    if (rq) rq.oninput = function () { st.res.q = rq.value; st.res.p = 1; $("#resList2").innerHTML = resTable(); };
  });

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, tr[data-href]"); if (!t) return;
    if (t.tagName === "TR") { if (!e.target.closest("a")) location.hash = t.getAttribute("data-href"); return; }
    if (t.hasAttribute("data-ncat")) { st.news.cat = t.getAttribute("data-ncat"); st.news.p = 1; G.render(); return; }
    if (t.hasAttribute("data-rcat")) { st.res.cat = t.getAttribute("data-rcat"); st.res.p = 1; G.render(); return; }
    if (t.hasAttribute("data-rwho")) { st.res.who = t.getAttribute("data-rwho"); st.res.p = 1; G.render(); return; }
    if (t.hasAttribute("data-pg")) { st[t.getAttribute("data-pg")].p = +t.getAttribute("data-n"); G.render(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute("data-bdel")) { removeItem(t.getAttribute("data-bdel"), t.getAttribute("data-id"), t.getAttribute("data-back")); }
  });

  /* 통신문 화면에서 쓰도록 내보내기 */
  G.ui = { table: table, field: field, ownerFields: ownerFields, formData: formData, checkRequired: checkRequired, busy: busy, askPassword: askPassword,
    itemActions: itemActions, findItem: findItem, canWrite: canWrite, liveNote: liveNote, needAdminBox: needAdminBox, today: today, st: st };
});
