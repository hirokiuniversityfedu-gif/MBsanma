// ========= render_stats.js（受け入れ/シャンテン表示：描画専用） =========
// 依存：statsEl, hand13, drawn, melds, isRiichi, isRiichiSelecting, riichiWait
//       countVisible(), countsFromTiles(), calcShanten(), calcImproveTilesFromCounts(), makeImgByCode()
//       isUkeireVisible（ON/OFFフラグ：core.js）

function _statsHide(){
  return (typeof isUkeireVisible !== "undefined" && !isUkeireVisible);
}

function _statsClear(){
  if (!statsEl) return;
  statsEl.innerHTML = "";
}

function _addLine(leftText, rightText){
  const line = document.createElement("div");
  line.className = "line";

  const a = document.createElement("span");
  const b = document.createElement("span");
  a.textContent = leftText || "";
  b.textContent = rightText || "";

  line.appendChild(a);
  line.appendChild(b);
  statsEl.appendChild(line);
}

function _buildTiles(list){
  const tiles = document.createElement("div");
  tiles.className = "tiles tiles4"; // ★CSS側で「4段表示」にする

  for (const t of list){
    const chip = document.createElement("span");
    chip.className = "tileChip";

    const img = makeImgByCode(t.code);
    img.title = `${t.code}（残り${t.remain}枚）`;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = String(t.remain);

    chip.appendChild(img);
    chip.appendChild(badge);
    tiles.appendChild(chip);
  }

  return tiles;
}

function _formatRight(modeText, types, total){
  // modeText: "待ち" or "受け入れ"
  return `${modeText}:${types}種${total}枚`;
}

function _appendBlock(label, info, modeText){
  // info: {curShanten, types, total, list:[{code,remain}]}
  if (!info) return;
  if (!info.list || info.list.length === 0) return;

  const s = (typeof info.curShanten === "number") ? info.curShanten : "?";
  const types = (typeof info.types === "number") ? info.types : 0;
  const total = (typeof info.total === "number") ? info.total : 0;

  // ここは「2行で済ませる」：見出し＋数値（縦を増やさない）
  // 例：七対子 Sh:2 | 受け入れ:7種31枚
  _addLine(`${label} Sh:${s}`, _formatRight(modeText, types, total));

  statsEl.appendChild(_buildTiles(info.list));
}

function _calcDualFromCounts(counts13, visible, fixedM){
  const curBest = calcShanten(counts13, fixedM);
  const mode = (curBest === 0) ? "machi" : "ukeire";
  const modeText = (mode === "machi") ? "待ち" : "受け入れ";

  const info = calcImproveTilesFromCounts(counts13, visible, mode, fixedM);
  const chi = info && info.breakdown ? (info.breakdown.chiitoi || null) : null;
  const nor = info && info.breakdown ? (info.breakdown.normal || null) : null;

  return { modeText, chi, nor };
}

function updateStatsDefault(){
  if (!statsEl) return;

  // ★ OFFなら完全非表示
  if (_statsHide()){
    _statsClear();
    return;
  }

  _statsClear();

  // リーチ中はコンパクトな文字だけ（ブロック巨大化防止）
  if (isRiichiSelecting){
    _addLine("リーチ選択中", "候補のみ切れる");
    return;
  }
  if (isRiichi){
    if (typeof riichiWait !== "undefined" && riichiWait){
      _addLine("リーチ中", "選択待ち");
    } else {
      _addLine("リーチ中", "基本ツモ切り");
    }
    return;
  }

  const fixedM = (Array.isArray(melds) ? melds.length : 0);
  const visible = countVisible();

  // ★ デフォルトは「手牌13枚」（drawnは含めない：切る前提なので）
  const base13 = hand13.slice();
  const counts13 = countsFromTiles(base13);

  const dual = _calcDualFromCounts(counts13, visible, fixedM);

  // 七対子 / 一般手の順で表示（昔の表示に戻す）
  _appendBlock("七対子", dual.chi, dual.modeText);
  _appendBlock("一般手", dual.nor, dual.modeText);

  // どっちも出ない場合の保険
  if (statsEl.innerHTML.trim() === ""){
    const curS = calcShanten(counts13, fixedM);
    _addLine(`Sh:${curS}`, "（表示なし）");
  }
}

function updateStatsByHover(tileId, isDrawn){
  if (!statsEl) return;

  // ★ OFFなら完全非表示
  if (_statsHide()){
    _statsClear();
    return;
  }

  // リーチ中はホバーで変えない
  if (isRiichi || isRiichiSelecting){
    updateStatsDefault();
    return;
  }

  const fixedM = (Array.isArray(melds) ? melds.length : 0);
  const visible = countVisible();

  let after13 = [];
  let cutCode = "";

  if (isDrawn){
    if (!drawn || drawn.id !== tileId) return;
    after13 = hand13.slice();
    cutCode = drawn.code;
  } else {
    const idx = hand13.findIndex(t => t.id === tileId);
    if (idx < 0) return;

    after13 = hand13.filter(t => t.id !== tileId);
    cutCode = hand13[idx].code;

    if (drawn) after13.push(drawn);
  }

  const counts13 = countsFromTiles(after13);
  const dual = _calcDualFromCounts(counts13, visible, fixedM);

  _statsClear();

  // 先頭に「切り」だけ短く入れる（縦を増やしすぎない）
  _addLine(`切り:${cutCode}`, "");

  _appendBlock("七対子", dual.chi, dual.modeText);
  _appendBlock("一般手", dual.nor, dual.modeText);

  if (statsEl.innerHTML.trim() === ""){
    const curS = calcShanten(counts13, fixedM);
    _addLine(`切り:${cutCode}`, `Sh:${curS}`);
  }
}
