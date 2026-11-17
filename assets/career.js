/* 경기도다문화교육연구회 홈페이지 - 진로·진학 길라잡이
 * 가족 안내의 '진로·진학 길라잡이' 칸(시트 '가족안내' 탭에서 제목에 '길라잡이'가 들어간 줄)을 누르면
 * 구글 드라이브에 둔 HTML 자료를 홈페이지 안에서 보여 줍니다.
 * 자료를 바꾸려면: 새 HTML 파일을 구글 드라이브에 올리고, 구글 시트 [설정] 탭의
 * '페이지_진로진학' 값에 그 파일 링크(또는 ID)를 넣으면 됩니다. 이 파일은 고치지 않아도 됩니다.
 */
(window.GGMCE_MODULES = window.GGMCE_MODULES || []).push(function (G) {
  "use strict";
  var esc = G.esc, $ = G.$;
  var KEY = "진로진학";
  var LANG_MAP = { ko: "ko", "zh-CN": "zh", "zh-TW": "zh", vi: "vi", en: "en", ru: "ru", uz: "uz", tl: "tl" };
  var html = null, blobUrl = null, loading = null;

  // 시트 '가족안내' 탭에서 제목에 '길라잡이'가 들어간 칸을 누르면 이 자료를 보여 줍니다.
  function isGuide(g) { return !!g && /길라잡이/.test(g.제목 || ""); }
  G.route(/^family-(\d+)$/, "family", function (m) {
    var g = G.rows("가족안내")[+m[1]];
    return isGuide(g) ? page() : G.V.familyItem(+m[1]);
  });

  G.route(/^career$/, "family", page);
  function page() {
    return G.head("진로·진학 길라잡이", "초등학교 취학부터 중학교 배정, 고등학교 입학, 대학 진학까지 다문화가정이 알아야 할 내용을 정리했어요. 자료 안의 🌐 버튼으로 언어를 바꿀 수 있어요.", '<a href="#family">가족 안내</a>') +
      '<div class="wrap"><div class="career-bar"><button class="btn small quiet" type="button" id="cgOpen" disabled>↗ 새 창으로 크게 보기</button></div>' +
      '<div class="career-frame notranslate" translate="no"><p class="lt-wait" id="cgWait">자료를 불러오는 중이에요…</p>' +
      '<iframe id="cgFrame" title="진로·진학 길라잡이" loading="eager" hidden></iframe></div>' +
      '<p class="note" style="margin-top:12px">제도와 운영은 해마다 바뀔 수 있어요. 자녀의 학교 안내문을 함께 확인하고, 궁금한 점은 담임 선생님께 물어보세요.</p></div>';
  }

  function load() {
    if (html) return Promise.resolve(html);
    if (!loading) {
      loading = G.apiGet({ action: "page", key: KEY }).then(function (j) { html = j.html; return html; });
      loading.catch(function () { loading = null; });
    }
    return loading;
  }
  function urlFor(h) {
    if (!blobUrl) blobUrl = URL.createObjectURL(new Blob([h], { type: "text/html;charset=utf-8" }));
    return blobUrl;
  }

  G.after(function () {
    var frame = $("#cgFrame");
    if (!frame) return;
    var wait = $("#cgWait"), open = $("#cgOpen");
    if (!G.live()) { wait.textContent = "구글 시트가 연결된 공개 주소에서 볼 수 있어요."; return; }
    // 홈페이지에서 고른 언어를 자료에도 맞춥니다 (자료가 지원하는 언어일 때).
    var site = G.getLang(), gl = LANG_MAP[site];
    if (gl) { try { localStorage.setItem("lang", gl); } catch (e) {} }
    load().then(function (h) {
      if (!document.body.contains(frame)) return;
      frame.src = urlFor(h);
      frame.hidden = false; wait.hidden = true;
      open.disabled = false;
      open.onclick = function () { window.open(urlFor(h), "_blank", "noopener"); };
    }).catch(function (x) {
      wait.innerHTML = esc(x.message || "자료를 불러오지 못했어요.") + ' <button class="btn small" type="button" onclick="location.reload()">다시 시도</button>';
    });
  });
});
