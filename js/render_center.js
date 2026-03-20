// ========= render_center.js（中央UI描画専用） =========
// 役割：中央UIのDOM確保と内容更新だけを行う（状態変更はしない）
// 依存：roundWind, roundNumber, honba, kyotakuCount, doraIndicators, wall, deadWall, eastSeatIndex
// 依存：ukeireToggleBtn, isUkeireVisible
// 依存：makeImgByCode()

function ensureCenterUi(){
  const root = document.getElementById("centerUi");
  if (!root) return;

  const hasTopRow = !!document.getElementById("centerTopRow");
  const hasRound = !!document.getElementById("roundInfo");
  const hasKyotaku = !!document.getElementById("kyotakuInfo");
  const hasDora  = !!document.getElementById("doraIndicator");
  const hasWall  = !!document.getElementById("wallInfo");
  const hasScoreB = !!document.getElementById("scoreBottom");
  const hasScoreL = !!document.getElementById("scoreLeft");
  const hasScoreR = !!document.getElementById("scoreRight");

  if (hasTopRow && hasRound && hasKyotaku && hasDora && hasWall && hasScoreB && hasScoreL && hasScoreR){
    return;
  }

  root.innerHTML = "";

  const topRow = document.createElement("div");
  topRow.id = "centerTopRow";

  const roundInfo = document.createElement("div");
  roundInfo.id = "roundInfo";
  topRow.appendChild(roundInfo);

  const kyotakuInfo = document.createElement("div");
  kyotakuInfo.id = "kyotakuInfo";

  const kyotakuLabel = document.createElement("span");
  kyotakuLabel.className = "kyotakuLabel";
  kyotakuLabel.textContent = "供託";

  const kyotakuCountEl = document.createElement("div");
  kyotakuCountEl.id = "kyotakuCount";

  kyotakuInfo.appendChild(kyotakuLabel);
  kyotakuInfo.appendChild(kyotakuCountEl);
  topRow.appendChild(kyotakuInfo);

  root.appendChild(topRow);

  const dora = document.createElement("div");
  dora.id = "doraIndicator";

  const doraLabel = document.createElement("span");
  doraLabel.className = "doraLabel";
  doraLabel.textContent = "ドラ";

  const doraTile = document.createElement("div");
  doraTile.id = "doraTile";

  dora.appendChild(doraLabel);
  dora.appendChild(doraTile);
  root.appendChild(dora);

  const wallInfo = document.createElement("div");
  wallInfo.id = "wallInfo";
  root.appendChild(wallInfo);

  function makeScoreBox(id){
    const box = document.createElement("div");
    box.id = id;
    box.className = "scoreBox";

    const wind = document.createElement("span");
    wind.className = "windMark";
    wind.textContent = "";

    const num = document.createElement("span");
    num.className = "scoreNum";
    num.textContent = "35000";

    box.appendChild(wind);
    box.appendChild(num);
    return box;
  }

  root.appendChild(makeScoreBox("scoreLeft"));
  root.appendChild(makeScoreBox("scoreRight"));
  root.appendChild(makeScoreBox("scoreBottom"));
}

function renderCenterUi(){
  ensureCenterUi();

  renderScoreWinds();
  renderRoundInfo();
  renderKyotakuInfo();
  renderCenterScores();
  renderDoraIndicators();
  renderWallInfo();
  renderUkeireSwitch();
}

function renderUkeireSwitch(){
  if (typeof ukeireToggleBtn === "undefined" || !ukeireToggleBtn) return;
  if (typeof isUkeireVisible === "undefined") return;
  ukeireToggleBtn.textContent = isUkeireVisible ? "受け入れ：ON" : "受け入れ：OFF";
}

function renderScoreWinds(){
  const seatOrder = ["bottom", "right", "left"];

  const e = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;
  const eastSeat = seatOrder[((e % 3) + 3) % 3];

  const windBySeat = { bottom:"", right:"", left:"" };

  const startIdx = seatOrder.indexOf(eastSeat);
  windBySeat[seatOrder[startIdx]] = "東";
  windBySeat[seatOrder[(startIdx + 1) % 3]] = "南";
  windBySeat[seatOrder[(startIdx + 2) % 3]] = "西";

  const setWind = (boxId, windChar) => {
    const box = document.getElementById(boxId);
    if (!box) return;
    const windEl = box.querySelector(".windMark");
    if (!windEl) return;
    windEl.textContent = windChar;
    windEl.classList.toggle("windEast", windChar === "東");
  };

  setWind("scoreBottom", windBySeat.bottom);
  setWind("scoreRight",  windBySeat.right);
  setWind("scoreLeft",   windBySeat.left);
}

function renderRoundInfo(){
  const el = document.getElementById("roundInfo");
  if (!el) return;
  const wind = roundWind || "東";
  const num  = roundNumber || 1;
  const hb = honba || 0;
  el.textContent = `${wind}${num}局　${hb}本場`;
}

function getCurrentCommittedRiichiStickCount(){
  try{
    if (typeof window !== "undefined" && typeof window.getCommittedRiichiStickSeats === "function"){
      const seats = window.getCommittedRiichiStickSeats();
      if (Array.isArray(seats)) return seats.length;
    }
  }catch(e){}
  return 0;
}

function renderKyotakuInfo(){
  const box = document.getElementById("kyotakuInfo");
  const countEl = document.getElementById("kyotakuCount");
  if (!box || !countEl) return;

  const baseCount = (typeof kyotakuCount === "number" && Number.isFinite(kyotakuCount))
    ? Math.max(0, kyotakuCount | 0)
    : 0;

  const committedCount = getCurrentCommittedRiichiStickCount();
  const showRyukyokuCarry = !!(
    typeof isEnded !== "undefined" && isEnded && lastAgariType === "ryukyoku"
  );
  const hideForAgari = !!(
    typeof isEnded !== "undefined" && isEnded && (lastAgariType === "tsumo" || lastAgariType === "ron")
  );

  const count = hideForAgari
    ? 0
    : (showRyukyokuCarry ? (baseCount + committedCount) : baseCount);

  countEl.innerHTML = "";

  if (count <= 0){
    box.style.display = "none";
    return;
  }

  box.style.display = "inline-flex";

  const img = document.createElement("img");
  img.src = "img/sentenbou.png";
  img.alt = "1000点棒";
  img.draggable = false;

  if (count <= 3){
    for (let i = 0; i < count; i++){
      countEl.appendChild(img.cloneNode(false));
    }
    return;
  }

  countEl.appendChild(img);

  const text = document.createElement("span");
  text.className = "kyotakuTimes";
  text.textContent = `×${count}`;
  countEl.appendChild(text);
}

function renderCenterScores(){
  const scoreMap = {
    scoreBottom: 0,
    scoreRight: 1,
    scoreLeft: 2
  };

  const safeScores = Array.isArray(scores) ? scores : [35000, 35000, 35000];

  Object.entries(scoreMap).forEach(([boxId, seatIndex])=>{
    const box = document.getElementById(boxId);
    if (!box) return;

    const numEl = box.querySelector(".scoreNum");
    if (!numEl) return;

    const value = Number.isFinite(safeScores[seatIndex]) ? (safeScores[seatIndex] | 0) : 0;
    numEl.textContent = value.toLocaleString("ja-JP");
  });
}

function getDoraCodeFromIndicator(code){
  if (!code || typeof code !== "string" || code.length < 2) return code;

  const num = code[0];
  const suit = code[1];

  if (suit === "p" || suit === "s"){
    const n = Number(num);
    if (!Number.isInteger(n) || n < 1 || n > 9) return code;
    return `${n === 9 ? 1 : n + 1}${suit}`;
  }

  if (suit === "z"){
    const n = Number(num);
    if (!Number.isInteger(n) || n < 1 || n > 7) return code;
    return `${n === 7 ? 1 : n + 1}z`;
  }

  if (suit === "m"){
    if (code === "1m") return "9m";
    if (code === "9m") return "1m";
    return code;
  }

  return code;
}

function renderDoraIndicators(){
  const el = document.getElementById("doraTile");
  if (!el) return;
  el.innerHTML = "";
  if (!Array.isArray(doraIndicators)) return;

  for (const d of doraIndicators){
    if (!d || !d.code) continue;
    const doraCode = getDoraCodeFromIndicator(d.code);
    el.appendChild(makeImgByCode(doraCode));
  }
}

function renderWallInfo(){
  const el = document.getElementById("wallInfo");
  if (!el) return;

  const wallCount = (typeof wall !== "undefined" && wall) ? wall.length : 0;
  const deadCount = (typeof deadWall !== "undefined" && deadWall) ? deadWall.length : 0;

  el.innerHTML = `
    <div>山：${wallCount}枚</div>
    <div>王牌：${deadCount}枚</div>
  `;
}
