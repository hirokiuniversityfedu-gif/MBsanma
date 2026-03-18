// ========= turn2.js（CPUロン後乗せ） =========
// 目的：turn.js を直接いじらずに、CPUロンアガリを後乗せする
//
// 対応内容
// - 自分の捨て牌に対して CPU右 / CPU左 がロンできる
// - CPU右の捨て牌に対して CPU左 がロンできる
// - CPU左の捨て牌に対して CPU右 がロンできる
//
// 方針
// - turn.js は触らない
// - 既存関数をラップ / 上書きして差し込む
// - render.js は描画専用のまま
//
// 優先順
// - 自分の捨て牌に対しては 右CPU → 左CPU
// - CPUの捨て牌に対しては 既存の「自分ロン確認」を先に行い、通らなければ残りCPUを確認
//
// 注意
// - CPUフリテンはまだ未対応
// - ダブロンもまだ未対応（最初に見た1人で終了）

(function(){
  "use strict";


  function getCpuSeatWindForRon(seatIndex){
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

  function isCpuRiichiForRon(seatIndex){
    try{
      if (typeof isCpuRiichiSeat === "function"){
        return !!isCpuRiichiSeat(seatIndex);
      }

      if (seatIndex === 1){
        return !!cpuRightRiichi;
      }

      if (seatIndex === 2){
        return !!cpuLeftRiichi;
      }

      return false;
    }catch(e){
      return false;
    }
  }

  function canCpuRonAgariByYaku(seatIndex, tiles14, tile){
    if (!Array.isArray(tiles14) || tiles14.length !== 14) return false;
    if (!tile || !tile.code) return false;
    if (typeof getAgariYakuInfo !== "function") return true;

    try{
      const info = getAgariYakuInfo({
        tiles14: tiles14.slice(),
        meldList: [],
        winType: "ron",
        winTileCode: tile.code,
        isRiichi: isCpuRiichiForRon(seatIndex),
        roundWind: (typeof roundWind !== "undefined") ? roundWind : null,
        seatWind: getCpuSeatWindForRon(seatIndex),
        doraIndicators: Array.isArray(doraIndicators) ? doraIndicators.slice() : [],
        peis: [],
        ...(typeof getWinSituationFlags === "function" ? getWinSituationFlags("ron", seatIndex) : {})
      });
      if (!info || !info.isAgari) return false;
      if ((info.yakuman | 0) > 0) return true;
      return (info.han | 0) > 0;
    }catch(e){
      return false;
    }
  }

  function cpuHandRefBySeat(seatIndex){
    if (seatIndex === 1) return cpuRightHand13;
    if (seatIndex === 2) return cpuLeftHand13;
    return null;
  }

  function cpuRiverRefBySeat(seatIndex){
    if (seatIndex === 1) return cpuRightRiver;
    if (seatIndex === 2) return cpuLeftRiver;
    return null;
  }

  function isCpuRonAgariWithTile(seatIndex, tile){
    try{
      if (isEnded) return false;
      if (!tile || !tile.code) return false;
      if (seatIndex !== 1 && seatIndex !== 2) return false;

      const hand13Ref = cpuHandRefBySeat(seatIndex);
      if (!Array.isArray(hand13Ref)) return false;
      if (hand13Ref.length !== 13) return false;

      const tiles14 = hand13Ref.slice();
      tiles14.push({ code: tile.code });

      if (calcShanten(countsFromTiles(tiles14), 0) !== -1) return false;
      return canCpuRonAgariByYaku(seatIndex, tiles14, tile);
    }catch(e){
      return false;
    }
  }

  function finishCpuRon(seatIndex, ronTile, discarderSeatIndex){
    if (isEnded) return;

    isEnded = true;
    hoveredTileId = null;

    try{
      clearPlayerDrawTimer();
    }catch(e){}

    try{
      clearNewFlags();
    }catch(e){}

    try{
      if (typeof clearCpuDrawnTileBySeat === "function"){
        clearCpuDrawnTileBySeat(1);
        clearCpuDrawnTileBySeat(2);
      }
    }catch(e){}

    try{
      lastAgariWinnerSeatIndex = seatIndex;
      lastAgariDiscarderSeatIndex = (typeof discarderSeatIndex === "number") ? discarderSeatIndex : null;
      lastAgariType = "ron";
      lastAgariRonTile = null;
      if (ronTile && ronTile.code){
        lastAgariRonTile = {
          code: ronTile.code,
          imgCode: ronTile.imgCode || ronTile.code
        };
      }
    }catch(e){}

    try{
      render();
    }catch(e){}

    try{
      if (typeof openRon === "function") openRon();
    }catch(e){}
  }

  function tryCpuRonOnPlayerDiscard(){
    try{
      if (isEnded) return false;
      if (!Array.isArray(river) || river.length === 0) return false;

      const tile = river[river.length - 1];
      if (!tile || !tile.code) return false;

      // 自分の捨て牌に対しては 右CPU → 左CPU の順
      if (isCpuRonAgariWithTile(1, tile)){
        finishCpuRon(1, tile, 0);
        return true;
      }

      if (isCpuRonAgariWithTile(2, tile)){
        finishCpuRon(2, tile, 0);
        return true;
      }

      return false;
    }catch(e){
      if (typeof showFatalError === "function") showFatalError(e, "turn2:tryCpuRonOnPlayerDiscard()");
      return false;
    }
  }


  function tryCpuRonOnPlayerKakan(kakanCode){
    try{
      if (isEnded) return false;
      if (!kakanCode) return false;

      const tile = { code: kakanCode, imgCode: kakanCode };

      if (typeof markCurrentWinContextChankan === "function") markCurrentWinContextChankan();

      if (isCpuRonAgariWithTile(1, tile)){
        finishCpuRon(1, tile, 0);
        return true;
      }

      if (isCpuRonAgariWithTile(2, tile)){
        finishCpuRon(2, tile, 0);
        return true;
      }

      if (typeof resetCurrentWinContext === "function") resetCurrentWinContext();
      return false;
    }catch(e){
      try{ if (typeof resetCurrentWinContext === "function") resetCurrentWinContext(); }catch(_e){}
      if (typeof showFatalError === "function") showFatalError(e, "turn2:tryCpuRonOnPlayerKakan()");
      return false;
    }
  }

  function tryCpuRonOnCpuDiscard(discardSeatIndex, discardedTile){
    try{
      if (isEnded) return false;
      if (!discardedTile || !discardedTile.code) return false;

      // 捨てた本人は除外
      // 残るCPUが1人いれば、そのCPUだけを見る
      const targetSeat = (discardSeatIndex === 1) ? 2 : (discardSeatIndex === 2 ? 1 : null);
      if (targetSeat == null) return false;

      if (isCpuRonAgariWithTile(targetSeat, discardedTile)){
        finishCpuRon(targetSeat, discardedTile, discardSeatIndex);
        return true;
      }

      return false;
    }catch(e){
      if (typeof showFatalError === "function") showFatalError(e, "turn2:tryCpuRonOnCpuDiscard()");
      return false;
    }
  }

  try{
    if (typeof window !== "undefined") window.tryCpuRonOnPlayerKakan = tryCpuRonOnPlayerKakan;
  }catch(e){}

  // =========================================================
  // actions.js の afterPlayerDiscardAdvance をラップ
  // - 自分の捨て牌直後に CPUロンを先に確認
  // - ロンが無ければ従来処理へ
  // =========================================================
  if (typeof afterPlayerDiscardAdvance === "function" && !afterPlayerDiscardAdvance.__turn2_patched__){
    const __origAfterPlayerDiscardAdvance = afterPlayerDiscardAdvance;

    afterPlayerDiscardAdvance = function(){
      try{
        hoveredTileId = null;
        render();

        if (tryCpuRonOnPlayerDiscard()){
          return;
        }

        return __origAfterPlayerDiscardAdvance();
      }catch(e){
        if (typeof showFatalError === "function") showFatalError(e, "turn2:afterPlayerDiscardAdvance()");
      }
    };

    afterPlayerDiscardAdvance.__turn2_patched__ = true;
  }

  // =========================================================
  // turn.js の kickCpuTurnsIfNeeded を上書き
  // - 既存の流れをほぼ維持
  // - CPU捨て牌後
  //    1) まず既存の「自分ロン/ポン/明槓」確認
  //    2) 自分がロンしなかったら、もう一人のCPUロン確認
  // =========================================================
  if (typeof kickCpuTurnsIfNeeded === "function" && !kickCpuTurnsIfNeeded.__turn2_patched__){
    const __origKickCpuTurnsIfNeeded = kickCpuTurnsIfNeeded;

    kickCpuTurnsIfNeeded = async function(immediateFirst = false){
      if (isEnded) return;

      let firstStep = true;

      while (!isEnded && currentTurnSeatIndex !== 0 && turnPhase === "DISCARD"){
        const seat = currentTurnSeatIndex;

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

        // ===== 既存：CPU捨て直後に自分のロン/ポン/明槓確認 =====
        if (typeof maybePromptCallOnDiscard === "function"){
          const from = isCpuRightSeat(seat) ? "R" : "L";
          const action = await maybePromptCallOnDiscard(from, discardedTile);

          if (action === "ron"){
            return;
          }

          if (action === "pon"){
            forceEnterPlayerCallDiscardTurn();
            render();
            return;
          }
        }

        // ===== 追加：自分がロンしなかったら、残りCPUがロンできるか =====
        if (tryCpuRonOnCpuDiscard(seat, discardedTile)){
          return;
        }

        const wallCountAfter = Array.isArray(wall) ? wall.length : 0;
        if (wallCountAfter === 0){
          endRyukyokuFromTurnIfPossible();
          return;
        }

        advanceTurnAfterDiscard(seat);

        if (currentTurnSeatIndex === 0) return;
      }
    };

    kickCpuTurnsIfNeeded.__turn2_patched__ = true;
    kickCpuTurnsIfNeeded.__turn2_orig__ = __origKickCpuTurnsIfNeeded;
  }

})();