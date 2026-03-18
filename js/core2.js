// MBsanma/js/core2.js
// ========= core2.js（core追加ぶん / CPU用補助） =========

let cpuRightRiichi = false;
let cpuLeftRiichi = false;

// ★ CPU手牌の表/裏表示切替
let isCpuHandOpen = false;

// ★ CPUリーチ宣言牌ID
let cpuRightRiichiDeclareTileId = null;
let cpuLeftRiichiDeclareTileId = null;

// ★ CPUの現在ツモ牌
let cpuRightDrawnTile = null;
let cpuLeftDrawnTile = null;

function resetCpuExtraState(){
  cpuRightRiichi = false;
  cpuLeftRiichi = false;

  cpuRightRiichiDeclareTileId = null;
  cpuLeftRiichiDeclareTileId = null;

  cpuRightDrawnTile = null;
  cpuLeftDrawnTile = null;
}

function isCpuSeat(seatIndex){
  return seatIndex === 1 || seatIndex === 2;
}

function getCpuHand13RefBySeat(seatIndex){
  if (seatIndex === 1) return cpuRightHand13;
  if (seatIndex === 2) return cpuLeftHand13;
  return null;
}

function setCpuHand13BySeat(seatIndex, nextHand13){
  if (!Array.isArray(nextHand13)) return;

  if (seatIndex === 1){
    cpuRightHand13 = nextHand13;
    return;
  }
  if (seatIndex === 2){
    cpuLeftHand13 = nextHand13;
  }
}

function getCpuRiverRefBySeat(seatIndex){
  if (seatIndex === 1) return cpuRightRiver;
  if (seatIndex === 2) return cpuLeftRiver;
  return null;
}

function isCpuRiichiSeat(seatIndex){
  if (seatIndex === 1) return !!cpuRightRiichi;
  if (seatIndex === 2) return !!cpuLeftRiichi;
  return false;
}

function setCpuRiichiBySeat(seatIndex, value){
  if (seatIndex === 1){
    cpuRightRiichi = !!value;
    return;
  }
  if (seatIndex === 2){
    cpuLeftRiichi = !!value;
  }
}

function setCpuRiichiDeclareTileIdBySeat(seatIndex, tileId){
  if (seatIndex === 1){
    cpuRightRiichiDeclareTileId = tileId ?? null;
    return;
  }
  if (seatIndex === 2){
    cpuLeftRiichiDeclareTileId = tileId ?? null;
  }
}

function getCpuRiichiDeclareTileIdBySeat(seatIndex){
  if (seatIndex === 1) return cpuRightRiichiDeclareTileId;
  if (seatIndex === 2) return cpuLeftRiichiDeclareTileId;
  return null;
}

function setCpuDrawnTileBySeat(seatIndex, tile){
  if (seatIndex === 1){
    cpuRightDrawnTile = tile || null;
    return;
  }
  if (seatIndex === 2){
    cpuLeftDrawnTile = tile || null;
  }
}

function getCpuDrawnTileBySeat(seatIndex){
  if (seatIndex === 1) return cpuRightDrawnTile;
  if (seatIndex === 2) return cpuLeftDrawnTile;
  return null;
}

function clearCpuDrawnTileBySeat(seatIndex){
  setCpuDrawnTileBySeat(seatIndex, null);
}

function countVisibleForCpuSeat(seatIndex, ownTiles){
  const c = Array(TILE_TYPES.length).fill(0);

  const addCode = (code, n = 1)=>{
    const idx = TYPE_TO_IDX[code];
    if (idx === undefined) return;
    c[idx] += (n | 0);
  };

  const addTiles = (arr)=>{
    if (!Array.isArray(arr)) return;
    for (const t of arr){
      if (t && t.code) addCode(t.code, 1);
    }
  };

  addTiles(ownTiles);

  addTiles(river);
  addTiles(cpuLeftRiver);
  addTiles(cpuRightRiver);
  addTiles(peis);

  if (Array.isArray(doraIndicators)){
    for (const d of doraIndicators){
      if (d && d.code) addCode(d.code, 1);
    }
  }

  if (Array.isArray(melds)){
    for (const m of melds){
      if (!m || !m.code) continue;
      if (m.type === "pon") addCode(m.code, 3);
      else if (m.type === "minkan") addCode(m.code, 4);
      else if (m.type === "ankan") addCode(m.code, 4);
      else if (m.type === "kakan") addCode(m.code, 4);
    }
  }

  for (let i = 0; i < c.length; i++){
    if (c[i] < 0) c[i] = 0;
    if (c[i] > 4) c[i] = 4;
  }

  return c;
}


function getSeatWindBySeatIndexForCpu(seatIndex){
  const e = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;

  if (e === 0){
    if (seatIndex === 0) return "東";
    if (seatIndex === 1) return "南";
    if (seatIndex === 2) return "西";
  }

  if (e === 1){
    if (seatIndex === 1) return "東";
    if (seatIndex === 2) return "南";
    if (seatIndex === 0) return "西";
  }

  if (e === 2){
    if (seatIndex === 2) return "東";
    if (seatIndex === 0) return "南";
    if (seatIndex === 1) return "西";
  }

  return null;
}

function canCpuTsumoByYaku(seatIndex, tiles14){
  if (!Array.isArray(tiles14) || tiles14.length !== 14) return false;
  if (typeof getAgariYakuInfo !== "function") return true;

  try{
    const info = getAgariYakuInfo({
      tiles14: tiles14.slice(),
      meldList: [],
      winType: "tsumo",
      winTileCode: tiles14[tiles14.length - 1] && tiles14[tiles14.length - 1].code ? tiles14[tiles14.length - 1].code : null,
      isRiichi: (typeof isCpuRiichiSeat === "function") ? isCpuRiichiSeat(seatIndex) : false,
      roundWind: (typeof roundWind !== "undefined") ? roundWind : null,
      seatWind: getSeatWindBySeatIndexForCpu(seatIndex),
      doraIndicators: Array.isArray(doraIndicators) ? doraIndicators.slice() : [],
      uraDoraIndicators: Array.isArray(uraDoraIndicators) ? uraDoraIndicators.slice() : [],
      peis: [],
      ...(typeof getWinSituationFlags === "function" ? getWinSituationFlags("tsumo", seatIndex) : {})
    });
    if (!info || !info.isAgari) return false;
    if ((info.yakuman | 0) > 0) return true;
    return (info.han | 0) > 0;
  }catch(e){
    return false;
  }
}

function canCpuTsumoWithTiles(seatIndexOrTiles14, maybeTiles14){
  try{
    let seatIndex = null;
    let tiles14 = null;

    if (Array.isArray(seatIndexOrTiles14)){
      tiles14 = seatIndexOrTiles14;
    } else {
      seatIndex = seatIndexOrTiles14;
      tiles14 = maybeTiles14;
    }

    if (!Array.isArray(tiles14)) return false;
    if (tiles14.length !== 14) return false;
    if (calcShanten(countsFromTiles(tiles14), 0) !== -1) return false;

    if (seatIndex == null) return true;
    return canCpuTsumoByYaku(seatIndex, tiles14);
  }catch(e){
    return false;
  }
}

function finishCpuTsumo(seatIndex){
  if (isEnded) return;

  isEnded = true;
  hoveredTileId = null;

  try{
    lastAgariWinnerSeatIndex = seatIndex;
    lastAgariDiscarderSeatIndex = null;
    lastAgariType = "tsumo";
  }catch(e){}

  try{
    clearNewFlags();
  }catch(e){}

  try{
    render();
  }catch(e){}

  if (typeof openTsumo === "function"){
    openTsumo();
  }
}

function toggleCpuHandOpen(){
  isCpuHandOpen = !isCpuHandOpen;
}

function setCpuHandOpen(value){
  isCpuHandOpen = !!value;
}

function getCpuHandOpenLabel(){
  return isCpuHandOpen ? "CP手牌：表" : "CP手牌：裏";
}