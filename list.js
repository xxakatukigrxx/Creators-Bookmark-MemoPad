// list.js - Shows all memos, with search and delete (全メモの検索・削除対応)

/////////////////////////////////////////////////////////////////////////////
// Language dictionary (UI text) - English and Japanese (popup.jsと共通にしてもOK)
/////////////////////////////////////////////////////////////////////////////
const STRINGS = {
  search_placeholder: { ja: "検索（本文・タイトル・タグ・作品名）", en: "Search (content, title, tag, work)" },
  delete_confirm:     { ja: "本当に削除しますか？", en: "Are you sure you want to delete this memo?" },
  no_memos:           { ja: "メモはありません。",    en: "No memos found." },
  no_title:           { ja: "(タイトルなし)",        en: "(No title)" },
  tag_label:          { ja: "タグ",                en: "Tag" },
  url_label:          { ja: "URL",                 en: "URL" }
};

// Detect language (言語判定)
function detectLang() {
  let lang = navigator.language.slice(0,2);
  if (!STRINGS.no_memos[lang]) lang = "en";
  return lang;
}
const LANG = detectLang();

// UI placeholder (プレースホルダーセット)
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search").placeholder = STRINGS.search_placeholder[LANG];
});

function toLocalStr(isoStr) {
  if (!isoStr) return "";
  const dt = new Date(isoStr);
  return dt.toLocaleString();
}

// Simple search (簡易検索)
function filterMemos(memos, q) {
  if (!q) return memos;
  const kw = q.toLowerCase();
  return memos.filter(m =>
    (m.body||"").toLowerCase().includes(kw) ||
    (m.title||"").toLowerCase().includes(kw) ||
    (m.work||"").toLowerCase().includes(kw) ||
    (m.tag||"").toLowerCase().includes(kw)
  );
}

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("memos", (data) => {
    let memos = data.memos || [];
    renderMemos(memos);

    document.getElementById("search").onkeyup = function() {
      renderMemos(filterMemos(memos, this.value));
    };
  });
});

function renderMemos(list) {
  const wrap = document.getElementById("all-memos");
  wrap.innerHTML = "";
  if (!list.length) {
    wrap.textContent = STRINGS.no_memos[LANG];
    return;
  }
  list.slice().reverse().forEach((m) => {
    const div = document.createElement("div");
    div.className = "memo";
    div.innerHTML = `<b>${m.title || STRINGS.no_title[LANG]}</b> | ${m.work || ""}<br>
      <small>${toLocalStr(m.created_at)}</small><br>
      <pre>${m.body}</pre>
      <span>${STRINGS.tag_label[LANG]}: ${m.tag || "-"}</span><br>
      <span>${STRINGS.url_label[LANG]}: <a href="${m.url}" target="_blank">${m.url}</a></span>
      <button class="delete-btn" title="Delete">✕</button>
    `;
    // Delete logic: do NOT decrement memo_stats! (削除してもmemo_statsは減らさない)
    div.querySelector(".delete-btn").onclick = () => {
      if (confirm(STRINGS.delete_confirm[LANG])) {
        chrome.storage.local.get(["memos","memo_stats"], (data) => {
          let arr = data.memos || [];
          const idx = arr.findIndex(x => x.created_at === m.created_at);
          if (idx > -1) arr.splice(idx,1);
          chrome.storage.local.set({memos: arr}, () => location.reload());
        });
      }
    };
    wrap.appendChild(div);
  });
}
