// popup.js - Writer Memo Paste Buddy (multilingual/dictionary version)
// (多言語/辞書方式対応版)

/////////////////////////////////////////////////////////////////////////////
// Language dictionary (UI text) - English and Japanese
// (UIテキスト用辞書。英語・日本語に対応)
/////////////////////////////////////////////////////////////////////////////
const STRINGS = {
  save:        { ja: "保存",        en: "Save" },
  progress:    { ja: "今月の進捗",  en: "Monthly Progress" },
  all:         { ja: "▶ 全件を見る", en: "▶ Show all memos" },
  export_json: { ja: "JSON出力",    en: "Export JSON" },
  export_csv:  { ja: "CSV出力",     en: "Export CSV" },
  export_txt:  { ja: "TXT出力",     en: "Export TXT" },
  body:        { ja: "本文（アイディアやメモ）",      en: "Memo content (idea, note, etc.)" },
  work:        { ja: "作品名（任意）",             en: "Work name (optional)" },
  title:       { ja: "タイトル（任意）",            en: "Title (optional)" },
  tag:         { ja: "タグ（任意・カンマ区切りOK）",en: "Tag(s) (optional, comma-separated)" },
  url:         { ja: "URL（自動取得・編集可）",      en: "URL (auto-filled, editable)" },
  err_empty:   { ja: "本文は必須です",              en: "Memo content is required." },
  confirm_del: { ja: "本当に削除しますか？",         en: "Are you sure you want to delete this memo?" },
  no_title:    { ja: "(タイトルなし)",               en: "(No title)" },
  no_memos:    { ja: "メモはありません",             en: "No memos found." },
  tag_label:   { ja: "タグ",                        en: "Tag" },
  url_label:   { ja: "URL",                         en: "URL" }
};

/////////////////////////////////////////////////////////////////////////////
// Language detection and fallback (言語判定＆デフォルト英語)
/////////////////////////////////////////////////////////////////////////////
function detectLang() {
  let lang = navigator.language.slice(0,2);
  if (!STRINGS.save[lang]) lang = "en"; // fallback to English (対応辞書がなければ英語)
  return lang;
}
const LANG = detectLang();

/////////////////////////////////////////////////////////////////////////////
// Set UI text according to language (言語に合わせてUI文言をセット)
/////////////////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("save").textContent           = STRINGS.save[LANG];
  document.getElementById("show-progress").textContent  = STRINGS.progress[LANG];
  document.getElementById("show-all").textContent       = STRINGS.all[LANG];
  document.getElementById("export-json").textContent    = STRINGS.export_json[LANG];
  document.getElementById("export-csv").textContent     = STRINGS.export_csv[LANG];
  document.getElementById("export-txt").textContent     = STRINGS.export_txt[LANG];
  document.getElementById("body").placeholder           = STRINGS.body[LANG];
  document.getElementById("work").placeholder           = STRINGS.work[LANG];
  document.getElementById("title").placeholder          = STRINGS.title[LANG];
  document.getElementById("tag").placeholder            = STRINGS.tag[LANG];
  document.getElementById("url").placeholder            = STRINGS.url[LANG];
});

/////////////////////////////////////////////////////////////////////////////
// Helper: get ISO string for now (現在時刻をISO文字列で返す)
/////////////////////////////////////////////////////////////////////////////
function nowISO() {
  return new Date().toISOString();
}

// Convert ISO datetime to user-local string (ISO日時をローカル表記に変換)
function toLocalStr(isoStr) {
  if (!isoStr) return "";
  const dt = new Date(isoStr);
  return dt.toLocaleString();
}

/////////////////////////////////////////////////////////////////////////////
// On DOM ready (DOMContentLoaded) - Main logic (初期化・メイン処理)
/////////////////////////////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", async () => {
  const body = document.getElementById("body");
  const errSpan = document.getElementById("err");
  body.focus();

  // Auto-fill URL from current tab (アクティブタブのURL自動取得)
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    document.getElementById("url").value = tabs[0]?.url || '';
  });

  // Initialize memo_stats if missing, migrate from memos if needed
  // (memo_stats未作成時、既存memosから初期化)
  chrome.storage.local.get(["memos", "memo_stats"], (data) => {
    if (!data.memo_stats && (data.memos || []).length > 0) {
      const stats = {};
      (data.memos || []).forEach(m => {
        const dt = new Date(m.created_at);
        const y = dt.getFullYear(), mo = dt.getMonth() + 1, d = dt.getDate();
        const key = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        stats[key] = (stats[key] || 0) + 1;
      });
      chrome.storage.local.set({memo_stats: stats});
    }
  });

  // Show latest 5 memos (最新5件のメモを表示)
  chrome.storage.local.get("memos", (data) => {
    const list = document.getElementById("memo-list");
    list.innerHTML = "";
    (data.memos || []).slice(-5).reverse().forEach(memo => {
      const li = document.createElement("li");
      li.textContent = `"${memo.title || STRINGS.no_title[LANG]}"${memo.work ? ` | ${memo.work}` : ""} (${toLocalStr(memo.created_at)})`;
      list.appendChild(li);
    });
  });

  // Save button logic (保存ボタン処理)
  document.getElementById("save").onclick = async () => {
    const memo = {
      body: body.value.trim(),
      title: document.getElementById("title").value.trim(),
      work: document.getElementById("work").value.trim(),
      tag: document.getElementById("tag").value.trim(),
      url: document.getElementById("url").value.trim(),
      created_at: nowISO()
    };
    if (!memo.body) {
      errSpan.textContent = STRINGS.err_empty[LANG];
      body.focus();
      return;
    }
    errSpan.textContent = "";

    // Date key for memo_stats (ローカルタイム基準で日付キー作成)
    const dt = new Date();
    const y = dt.getFullYear(), m = dt.getMonth() + 1, d = dt.getDate();
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    // Add to memos and increment memo_stats (memos配列＆memo_statsを両方更新)
    chrome.storage.local.get(["memos", "memo_stats"], (data) => {
      const memos = data.memos || [];
      memos.push(memo);

      const stats = data.memo_stats || {};
      stats[key] = (stats[key] || 0) + 1;

      chrome.storage.local.set({memos, memo_stats: stats}, () => {
        window.close(); // Close popup after saving (保存後ポップアップを閉じる)
      });
    });
  };

  // Show all memos button (全メモ一覧ボタン)
  document.getElementById("show-all").onclick = () => {
    chrome.tabs.create({url: chrome.runtime.getURL("list.html")});
  };

  // Export logic (エクスポート処理)
  document.getElementById("export-json").onclick = () => { exportMemos("json"); };
  document.getElementById("export-csv").onclick = () => { exportMemos("csv"); };
  document.getElementById("export-txt").onclick = () => { exportMemos("txt"); };

  // Show monthly progress ("grass") button (月別進捗グラフ画面へ)
  document.getElementById("show-progress").onclick = () => {
    chrome.tabs.create({url: chrome.runtime.getURL("progress.html")});
  };

  // Time log (session logging, not shown in UI) (創作時間ログ。UIには表示しない)
  const start = Date.now();
  window.addEventListener("beforeunload", () => {
    const min = Math.round((Date.now() - start)/60000);
    if (min > 0) {
      chrome.storage.local.get("time_log", (data) => {
        const log = data.time_log || {};
        const today = (new Date()).toISOString().slice(0,10);
        log[today] = (log[today] || 0) + min;
        chrome.storage.local.set({time_log: log});
      });
    }
  });
});

// Export function for memos (メモのエクスポート関数)
function exportMemos(type) {
  chrome.storage.local.get("memos", (data) => {
    const memos = data.memos || [];
    let content = "";
    let mime = "text/plain";
    if (type === "json") {
      content = JSON.stringify(memos, null, 2);
      mime = "application/json";
    } else if (type === "csv") {
      const header = "Title,Content,Work,Tag,URL,Date\n";
      content = header + memos.map(m => 
        [m.title, m.body, m.work, m.tag, m.url, m.created_at]
        .map(x => `"${(x||"").replace(/"/g,'""')}"`).join(",")
      ).join("\n");
      content = '\uFEFF' + content; // Add BOM for Excel compatibility (Excelで文字化け防止)
      mime = "text/csv";
    } else if (type === "txt") {
      content = memos.map(m => 
        `■ ${m.body}\nWork: ${m.work}\nTitle: ${m.title}\nTag: ${m.tag}\nURL: ${m.url}\nDate: ${m.created_at?.slice(0,10)}\n----------------------------`
      ).join("\n\n");
    }
    // Download file (ファイルをダウンロード)
    const blob = new Blob([content], {type: mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `memos_${new Date().toISOString().slice(0,10)}.${type}`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });
}
