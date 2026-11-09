/*
 * 홈페이지 설정 파일
 * ------------------------------------------------------------
 * API_URL : 구글 시트에 붙인 Apps Script 의 '웹 앱 URL'을 따옴표 안에 붙여 넣으세요.
 *           비워 두면 홈페이지에 들어 있는 예시 내용으로 보입니다.
 *           예) API_URL: "https://script.google.com/macros/s/AKfy.../exec",
 */
window.GGMCE_CONFIG = {
  API_URL: "",

  // 첫 화면에 인사말 버튼으로 보여 줄 언어 수 (나머지는 '더 보기'에서 고릅니다)
  HERO_LANGS: 16,

  // 번역 언어 40개: 한국 체류 외국인이 많이 쓰는 언어 순 (법무부 체류외국인 통계 참고)
  // 줄을 지우면 그 언어가 빠지고, 줄을 더하면 언어가 늘어납니다. code 는 구글 번역 언어 코드입니다.
  FEATURED_LANGS: [
    { code: "ko", name: "한국어", hello: "안녕하세요" },
    { code: "zh-CN", name: "中文(简体)", hello: "你好" },
    { code: "vi", name: "Tiếng Việt", hello: "Xin chào" },
    { code: "en", name: "English", hello: "Hello" },
    { code: "th", name: "ไทย", hello: "สวัสดี" },
    { code: "uz", name: "Oʻzbekcha", hello: "Assalomu alaykum" },
    { code: "ru", name: "Русский", hello: "Здравствуйте" },
    { code: "tl", name: "Filipino", hello: "Kumusta" },
    { code: "mn", name: "Монгол", hello: "Сайн байна уу" },
    { code: "id", name: "Bahasa Indonesia", hello: "Halo" },
    { code: "ne", name: "नेपाली", hello: "नमस्ते" },
    { code: "km", name: "ខ្មែរ", hello: "សួស្តី" },
    { code: "my", name: "မြန်မာ", hello: "မင်္ဂလာပါ" },
    { code: "kk", name: "Қазақ тілі", hello: "Сәлеметсіз бе" },
    { code: "ky", name: "Кыргызча", hello: "Саламатсызбы" },
    { code: "ja", name: "日本語", hello: "こんにちは" },
    { code: "zh-TW", name: "中文(繁體)", hello: "你好" },
    { code: "si", name: "සිංහල", hello: "ආයුබෝවන්" },
    { code: "bn", name: "বাংলা", hello: "নমস্কার" },
    { code: "ur", name: "اردو", hello: "السلام علیکم" },
    { code: "hi", name: "हिन्दी", hello: "नमस्ते" },
    { code: "lo", name: "ລາວ", hello: "ສະບາຍດີ" },
    { code: "tg", name: "Тоҷикӣ", hello: "Салом" },
    { code: "tk", name: "Türkmençe", hello: "Salam" },
    { code: "uk", name: "Українська", hello: "Вітаю" },
    { code: "ms", name: "Bahasa Melayu", hello: "Helo" },
    { code: "tet", name: "Tetun", hello: "Bondia" },
    { code: "ta", name: "தமிழ்", hello: "வணக்கம்" },
    { code: "pa", name: "ਪੰਜਾਬੀ", hello: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ" },
    { code: "fa", name: "فارسی", hello: "سلام" },
    { code: "ps", name: "پښتو", hello: "سلام" },
    { code: "ar", name: "العربية", hello: "مرحبا" },
    { code: "tr", name: "Türkçe", hello: "Merhaba" },
    { code: "az", name: "Azərbaycan dili", hello: "Salam" },
    { code: "es", name: "Español", hello: "Hola" },
    { code: "fr", name: "Français", hello: "Bonjour" },
    { code: "de", name: "Deutsch", hello: "Hallo" },
    { code: "pt", name: "Português", hello: "Olá" },
    { code: "am", name: "አማርኛ", hello: "ሰላም" },
    { code: "sw", name: "Kiswahili", hello: "Habari" }
  ]
};
