// progress.js - Table-format multi-month progress chart
// (Tabular grass chart for multiple months: English/Japanese multilingual, image export supported)

//////////////////////////////////////////////////////
// Language dictionary (UI text, English/Japanese)
// (UIテキスト用多言語辞書)
//////////////////////////////////////////////////////
const STRINGS = {
  months_label: { ja: "表示月数", en: "Months to show" },
  save_img:     { ja: "画像として保存", en: "Save as image" },
  progress_title: { ja: "進捗グラフ", en: "Progress Chart" },
  month_fmt:    { ja: y=>`${y[0]}年${y[1]}月`, en: y=>`${y[0]}-${String(y[1]).padStart(2,'0')}` },
  day_nums:     { ja: "日", en: "" }
};

//////////////////////////////////////////////////////
// Detect language and fallback to English
// (言語判定。非対応時は英語にフォールバック)
//////////////////////////////////////////////////////
function detectLang() {
  let lang = navigator.language.slice(0,2);
  if (!STRINGS.save_img[lang]) lang = "en";
  return lang;
}
const LANG = detectLang();

//////////////////////////////////////////////////////
// Utility: get recent n months, latest month first
// (直近nヶ月を最新から降順で返す)
//////////////////////////////////////////////////////
function getRecentMonths(count) {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth()+1;
  const arr = [];
  for (let i=0; i<count; i++) {
    arr.push({year:y, month:m});
    m--;
    if (m < 1) { m = 12; y--; }
  }
  return arr;
}

//////////////////////////////////////////////////////
// Utility: get number of days in a given month
// (その月の日数を返す)
//////////////////////////////////////////////////////
function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate();
}

//////////////////////////////////////////////////////
// Main logic
// (メイン処理)
//////////////////////////////////////////////////////
document.addEventListener("DOMContentLoaded", () => {
  // --- UI setup (UIセットアップ) ---
  // Title (タイトル)
  document.getElementById("progress-title").textContent = STRINGS.progress_title[LANG];
  // Save button (保存ボタン)
  document.getElementById("save-img").textContent = STRINGS.save_img[LANG];

  let monthsToShow = 6; // Default: show 6 months (デフォルト6ヶ月表示)

  // Month selector UI (月数セレクトボックス)
  const select = document.createElement("select");
  [3,6,12].forEach(v=>{
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    if (v===monthsToShow) o.selected = true;
    select.appendChild(o);
  });
  select.onchange = () => { monthsToShow = parseInt(select.value,10); draw(); };
  select.style.margin = "8px 0 10px 8px";

  // Label for selector (セレクトラベル)
  const label = document.createElement("label");
  label.textContent = STRINGS.months_label[LANG] + ": ";
  label.appendChild(select);

  // Insert selector at the top of progress-wrap (progress-wrapの先頭に追加)
  const wrap = document.getElementById("progress-wrap");
  wrap.insertBefore(label, wrap.firstChild);

  //////////////////////////////////////////////////////
  // Draw the progress chart
  // (進捗草グラフを描画)
  //////////////////////////////////////////////////////
  function draw() {
    chrome.storage.local.get("memo_stats", (data) => {
      const stats = data.memo_stats || {};
      const months = getRecentMonths(monthsToShow); // [{year,month},...] latest first (最新が先頭)
      const cols = 31, cellSize=18, rowGap=7, colGap=2;
      const labelW = 120; // Width of month label (月ラベル幅)
      const labelH = 28; // Height of header (ヘッダ高さ)
      const w = labelW + cols*(cellSize+colGap) + 20; // Canvas width (キャンバス横幅)
      const h = labelH + monthsToShow*(cellSize+rowGap) + 40; // Canvas height (+date label row) (縦幅)
      const canvas = document.getElementById("progress-canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0,0,w,h);

      // Draw day numbers at the top (1-31)
      // (一番上に1～31日を描画)
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff";
      for(let d=1; d<=cols; d++){
        ctx.fillText(d, labelW + (d-1)*(cellSize+colGap) + cellSize/2, labelH-7);
      }
      // "日" label (Japanese only) (「日」ラベル、日本語のみ)
      if(LANG==="ja"){
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(STRINGS.day_nums[LANG], labelW + cols*(cellSize+colGap) + 3, labelH-7);
      }

      // Draw each month row (最新月が一番上)
      months.forEach((mobj, mi) => {
        const y = labelH + mi*(cellSize+rowGap) + 20; // Y-position for row (行のY座標)
        // Month label (月ラベル)
        ctx.textAlign = "right";
        ctx.font = "bold 14px sans-serif";
        ctx.fillStyle = "#fff";
        ctx.fillText(STRINGS.month_fmt[LANG]([mobj.year, mobj.month]), labelW-10, y+cellSize-4);

        // Get number of days in this month (その月の日数)
        const nDays = getMonthDays(mobj.year, mobj.month);

        // Draw day cells (各日の草マス)
        for(let d=1; d<=cols; d++){
          let color="#222";
          if(d <= nDays){
            // Key: YYYY-MM-DD (例: 2025-06-15)
            const key = `${mobj.year}-${String(mobj.month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const n = stats[key] || 0;
            // Color coding (色分け)
            if(n >= 10) color="#b30000";
            else if(n >= 5) color="#ff6666";
            else if(n >= 1) color="#ffcccc";
          }
          // Draw filled box (マス描画)
          ctx.fillStyle = color;
          ctx.fillRect(labelW + (d-1)*(cellSize+colGap), y, cellSize, cellSize);

          // Draw gray border for days not in this month (該当日なしはグレー枠線)
          if(d > nDays){
            ctx.strokeStyle = "#444";
            ctx.lineWidth = 1;
            ctx.strokeRect(labelW + (d-1)*(cellSize+colGap), y, cellSize, cellSize);
          }
        }
      });

      // Save as PNG (画像保存ボタン)
      document.getElementById("save-img").onclick = () => {
        const url = canvas.toDataURL("image/png");
        const m0 = months[0], mN = months[months.length-1];
        const fname = `progress_${m0.year}${String(m0.month).padStart(2,'0')}-${mN.year}${String(mN.month).padStart(2,'0')}.png`;
        const a = document.createElement("a");
        a.href = url;
        a.download = fname;
        a.click();
      };
    });
  }

  draw();
});
