// MBsanma/js/turn.js
// ========= turn.js（ターン制：進行の司令塔） =========

// 0=自分(下) / 1=右CPU / 2=左CPU
let currentTurnSeatIndex = 0;

// "DISCARD" | "CALL_DISCARD"
let turnPhase = "DISCARD";

// ★ 全員 0.5秒に統一（ただし「局開始の最初のCPU捨て」だけは即時）
const CPU_TURN_DELAY_MS = 500;
const PLAYER_TURN_DRAW_DELAY_MS = 500;

let playerDrawTimer = null;

function isPlayerSeat(seatIndex){
  return seatIndex === 0;
}
function isCpuRightSeat(seatIndex){
  return seatIndex === 1;
}
function isCpuLeftSeat(seatIndex){
  return seatIndex === 2;
}

function nextSeatIndexOf(seatIndex){
  return (seatIndex + 1) % 3;
}

function sleep(ms){
  return new Promise((resolve)=>setTimeout(resolve, ms));
}

function endRyukyokuFromTurnIfPossible(){
  if (typeof endByExhaustionRyukyoku === "function"){
    endByExhaustionRyukyoku();
    return;
  }
  if (!isEnded){
    isEnded = true;
    hoveredTileId = null;
    render();
    if (typeof openRyukyoku === "function") openRyukyoku();
  }
}

function clearPlayerDrawTimer(){
  if (playerDrawTimer){
    clearTimeout(playerDrawTimer);
    playerDrawTimer = null;
  }
}

// ★ call.js から呼ぶ：鳴き後の「ツモ無し打牌」へ強制切替
function forceEnterPlayerCallDiscardTurn(){
  clearPlayerDrawTimer();
  currentTurnSeatIndex = 0;
  turnPhase = "CALL_DISCARD";
  drawn = null; // 鳴き直後はツモ無し
}

function initTurnForKyokuStart(){
  clearPlayerDrawTimer();

  if (typeof resetCpuExtraState === "function"){
    resetCpuExtraState();
  }

  currentTurnSeatIndex = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;
  turnPhase = "DISCARD";

  // CPU親開始のときはプレイヤーの drawn は必ず空に
  if (currentTurnSeatIndex !== 0){
    drawn = null;
  }

  hoveredTileId = null;
  render();

  // ★ 局開始直後にCPU親なら、確実にCPUが捨てて始まるように回す（初手だけ即時）
  kickCpuTurnsIfNeeded(true);
}

function isPlayerTurn(){
  if (isEnded) return false;
  return currentTurnSeatIndex === 0 && (turnPhase === "DISCARD" || turnPhase === "CALL_DISCARD");
}

// ★ ポン後の「ツモ無し打牌」か？
function isPlayerCallDiscardTurn(){
  if (isEnded) return false;
  return currentTurnSeatIndex === 0 && turnPhase === "CALL_DISCARD";
}

function ensurePlayerHasDrawnOnTurnStart(){
  // ★ 鳴き直後（ツモ無し打牌）はツモらない
  if (!isPlayerTurn()) return;
  if (isPlayerCallDiscardTurn()) return;

  const wallCount = Array.isArray(wall) ? wall.length : 0;
  if (wallCount === 0){
    endRyukyokuFromTurnIfPossible();
    return;
  }

  if (!drawn){
    drawn = drawOne();
    hoveredTileId = null;
    render();
  }

  if (!isEnded && isRiichi && typeof scheduleRiichiAuto === "function"){
    scheduleRiichiAuto();
  }
}

function schedulePlayerDrawOnTurnStart(){
  clearPlayerDrawTimer();

  // ★ 鳴き直後（ツモ無し打牌）はツモタイマー不要
  if (isPlayerCallDiscardTurn()) return;

  if (drawn) return;

  playerDrawTimer = setTimeout(()=>{
    playerDrawTimer = null;

    if (isEnded) return;
    if (!isPlayerTurn()) return;

    ensurePlayerHasDrawnOnTurnStart();
  }, PLAYER_TURN_DRAW_DELAY_MS);
}

function cpuDoOneDiscard(seatIndex){
  if (isEnded) return null;
  if (typeof isCpuSeat === "function" && !isCpuSeat(seatIndex)) return null;

  const hand13 = (typeof getCpuHand13RefBySeat === "function") ? getCpuHand13RefBySeat(seatIndex) : null;
  const riverRef = (typeof getCpuRiverRefBySeat === "function") ? getCpuRiverRefBySeat(seatIndex) : null;

  if (!Array.isArray(hand13) || !Array.isArray(riverRef)) return null;

  const drawnTile = drawOne();
  if (!drawnTile) return null;

  if (typeof setCpuDrawnTileBySeat === "function"){
    setCpuDrawnTileBySeat(seatIndex, drawnTile);
  }

  const tiles14 = hand13.slice();
  tiles14.push(drawnTile);

  if (typeof isCpuRiichiSeat === "function" && isCpuRiichiSeat(seatIndex)){
    if (typeof canCpuTsumoWithTiles === "function" && canCpuTsumoWithTiles(tiles14)){
      if (typeof finishCpuTsumo === "function"){
        finishCpuTsumo(seatIndex);
      }
      return null;
    }

    drawnTile.isNew = false;
    riverRef.push(drawnTile);

    try{ if (typeof setIppatsuChanceForSeat === "function") setIppatsuChanceForSeat(seatIndex, false); }catch(e){}

    if (typeof clearCpuDrawnTileBySeat === "function"){
      clearCpuDrawnTileBySeat(seatIndex);
    }

    return drawnTile;
  }

  const best = (typeof chooseCpuDiscardInfo === "function")
    ? chooseCpuDiscardInfo(seatIndex, hand13, drawnTile)
    : null;

  if (!best || !best.discardTile){
    drawnTile.isNew = false;
    riverRef.push(drawnTile);

    if (typeof clearCpuDrawnTileBySeat === "function"){
      clearCpuDrawnTileBySeat(seatIndex);
    }

    return drawnTile;
  }

  const discardedTile = best.discardTile;
  discardedTile.isNew = false;

  const nextHand13 = sortHand(best.after13.slice());
  for (const t of nextHand13){
    if (t) t.isNew = false;
  }

  if (typeof setCpuHand13BySeat === "function"){
    setCpuHand13BySeat(seatIndex, nextHand13);
  }

  if (best.willRiichi && typeof setCpuRiichiBySeat === "function"){
    setCpuRiichiBySeat(seatIndex, true);
    try{ if (typeof setIppatsuChanceForSeat === "function") setIppatsuChanceForSeat(seatIndex, true); }catch(e){}
    try{ if (typeof setDoubleRiichiForSeat === "function" && typeof canDeclareDoubleRiichiNow === "function") setDoubleRiichiForSeat(seatIndex, canDeclareDoubleRiichiNow(seatIndex)); }catch(e){}

    if (typeof setCpuRiichiDeclareTileIdBySeat === "function"){
      setCpuRiichiDeclareTileIdBySeat(seatIndex, discardedTile.id);
    }

    if (typeof openRiichiEffect === "function"){
      try{ openRiichiEffect(seatIndex); }catch(e){}
    }
  }

  if (typeof clearCpuDrawnTileBySeat === "function"){
    clearCpuDrawnTileBySeat(seatIndex);
  }

  riverRef.push(discardedTile);

  if (!best.willRiichi && typeof isCpuRiichiSeat === "function" && isCpuRiichiSeat(seatIndex)){
    try{ if (typeof setIppatsuChanceForSeat === "function") setIppatsuChanceForSeat(seatIndex, false); }catch(e){}
  }

  try{ if (typeof resetCurrentWinContext === "function") resetCurrentWinContext(); }catch(e){}

  return discardedTile;
}

function advanceTurnAfterDiscard(discardSeatIndex){
  if (isEnded) return;

  clearPlayerDrawTimer();

  currentTurnSeatIndex = nextSeatIndexOf(discardSeatIndex);
  turnPhase = "DISCARD";

  if (currentTurnSeatIndex === 0){
    schedulePlayerDrawOnTurnStart();
  }
}

// ★ 引数 immediateFirst = true のとき「最初のCPU捨て」だけ即時にする
async function kickCpuTurnsIfNeeded(immediateFirst = false){
  if (isEnded) return;

  let firstStep = true;

  while (!isEnded && currentTurnSeatIndex !== 0 && turnPhase === "DISCARD"){
    const seat = currentTurnSeatIndex;

    // ★ 局開始の最初の1手目だけ待たない
    if (!(immediateFirst && firstStep)){
      await sleep(CPU_TURN_DELAY_MS);
    }
    firstStep = false;

    if (isEnded) return;

    const wallCount = Array.isArray(wall) ? wall.length : 0;
    if (wallCount === 0){
      endRyukyokuFromTurnIfPossible();
      return;
    }

    // ===== CPUが1枚捨てる =====
    const discardedTile = cpuDoOneDiscard(seat);

    hoveredTileId = null;
    render();

    if (!discardedTile) return;

    // ===== CPU捨て直後に「ロン/ポン」判定 =====
    if (typeof maybePromptCallOnDiscard === "function"){
      const from = isCpuRightSeat(seat) ? "R" : "L";
      const action = await maybePromptCallOnDiscard(from, discardedTile);

      if (action === "ron"){
        // ★ ロンで局終了
        return;
      }

      if (action === "pon"){
        // ★ ここでは「call.js 側で強制切替」される想定だが、
        //    念のため保険でも自分番へ寄せる
        forceEnterPlayerCallDiscardTurn();
        render();
        return;
      }
    }

    const wallCountAfter = Array.isArray(wall) ? wall.length : 0;
    if (wallCountAfter === 0){
      endRyukyokuFromTurnIfPossible();
      return;
    }

    advanceTurnAfterDiscard(seat);

    if (currentTurnSeatIndex === 0) return;
  }
}
