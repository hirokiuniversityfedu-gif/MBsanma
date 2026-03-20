// MBsanma/js/seisan.js
// ========= seisan.js（点数移動・供託・終局判定） =========
// 役割：
// - 和了 / 流局時の点数移動内容を作る
// - result閉じ時に1回だけ scores へ反映する
// - 供託 / 聴牌料 / 本場 / 飛び / オーラス終了を扱う
//
// 注意：
// - render系では状態変更しない
// - 実際の score 変更は applyPendingRoundSettlement() だけで行う

function normalizeScoreState(){
  if (!Array.isArray(scores) || scores.length !== 3){
    scores = [35000, 35000, 35000];
  }

  for (let i = 0; i < 3; i++){
    if (!Number.isFinite(scores[i])) scores[i] = 35000;
    scores[i] = scores[i] | 0;
  }

  if (!Number.isFinite(kyotakuCount)) kyotakuCount = 0;
  kyotakuCount = Math.max(0, kyotakuCount | 0);

  if (typeof pendingRoundSettlement === "undefined"){
    pendingRoundSettlement = null;
  }
}

function resetScoreStateForNewHanchan(){
  scores = [35000, 35000, 35000];
  kyotakuCount = 0;
  pendingRoundSettlement = null;
}

function cloneScoreArray(src){
  if (!Array.isArray(src)) return [0, 0, 0];
  return [
    Number.isFinite(src[0]) ? (src[0] | 0) : 0,
    Number.isFinite(src[1]) ? (src[1] | 0) : 0,
    Number.isFinite(src[2]) ? (src[2] | 0) : 0
  ];
}

function getCurrentRiichiDepositorSeats(){
  try{
    if (typeof window !== "undefined" && typeof window.getCommittedRiichiStickSeats === "function"){
      const seats = window.getCommittedRiichiStickSeats();
      if (Array.isArray(seats)){
        return seats.filter((seat)=> seat === 0 || seat === 1 || seat === 2);
      }
    }
  }catch(e){}

  const seats = [];
  for (let seat = 0; seat < 3; seat++){
    try{
      if (typeof window !== "undefined" && typeof window.hasCommittedRiichiStickForSeat === "function"){
        if (window.hasCommittedRiichiStickForSeat(seat)) seats.push(seat);
      }
    }catch(e){}
  }
  return seats;
}

function getTilesForSettlementSeat(seat){
  if (seat === 0){
    const arr = [];
    if (Array.isArray(hand13)) arr.push(...hand13);
    if (drawn) arr.push(drawn);
    return arr;
  }

  if (seat === 1){
    return Array.isArray(cpuRightHand13) ? cpuRightHand13.slice() : [];
  }

  if (seat === 2){
    return Array.isArray(cpuLeftHand13) ? cpuLeftHand13.slice() : [];
  }

  return [];
}

function getFixedMForSettlementSeat(seat){
  if (seat === 0){
    return Array.isArray(melds) ? melds.length : 0;
  }
  return 0;
}

function isTenpaiWithSettlementTiles(tiles, fixedM){
  try{
    const counts = countsFromTiles(tiles);
    const sh = (typeof calcShanten === "function") ? calcShanten(counts, fixedM) : 99;
    return sh === 0;
  }catch(e){
    return false;
  }
}

function isSeatTenpaiAtRyukyoku(seat){
  const tiles = getTilesForSettlementSeat(seat);
  const fixedM = getFixedMForSettlementSeat(seat);

  if (tiles.length === 13){
    return isTenpaiWithSettlementTiles(tiles, fixedM);
  }

  if (tiles.length === 14){
    for (let i = 0; i < tiles.length; i++){
      const cand = tiles.slice();
      cand.splice(i, 1);
      if (isTenpaiWithSettlementTiles(cand, fixedM)) return true;
    }
    return false;
  }

  return false;
}

function getRyukyokuTenpaiSeats(){
  const seats = [];
  for (let seat = 0; seat < 3; seat++){
    if (isSeatTenpaiAtRyukyoku(seat)) seats.push(seat);
  }
  return seats;
}

function getOtherSeatIndexes(baseSeat){
  const list = [];
  for (let seat = 0; seat < 3; seat++){
    if (seat !== baseSeat) list.push(seat);
  }
  return list;
}

function addDelta(delta, seatIndex, amount){
  if (seatIndex !== 0 && seatIndex !== 1 && seatIndex !== 2) return;
  if (!Number.isFinite(amount) || amount === 0) return;
  delta[seatIndex] = (delta[seatIndex] | 0) + (amount | 0);
}

function buildAgariSettlement(){
  const winner = (typeof lastAgariWinnerSeatIndex === "number") ? lastAgariWinnerSeatIndex : null;
  const winType = lastAgariType;
  if (winner == null) return null;
  if (winType !== "tsumo" && winType !== "ron") return null;

  const info = (typeof getResultYakuInfo === "function") ? getResultYakuInfo() : null;
  const scoreInfo = (typeof calcSanmaScoreFromInfo === "function")
    ? calcSanmaScoreFromInfo(info, winner, winType)
    : null;

  if (!scoreInfo) return null;

  normalizeScoreState();

  const beforeScores = cloneScoreArray(scores);
  const delta = [0, 0, 0];
  const riichiSeats = getCurrentRiichiDepositorSeats();
  const previousKyotakuCount = kyotakuCount | 0;
  const currentHandKyotakuCount = riichiSeats.length | 0;
  const dealerSeat = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;
  const honbaBonusPerPayer = Number.isFinite(scoreInfo.honbaBonusPerPayer) ? (scoreInfo.honbaBonusPerPayer | 0) : 0;

  if (winType === "tsumo"){
    const payAll = Number.isFinite(scoreInfo.payAll) ? (scoreInfo.payAll | 0) : 0;
    const payChild = Number.isFinite(scoreInfo.payChild) ? (scoreInfo.payChild | 0) : 0;
    const payDealer = Number.isFinite(scoreInfo.payDealer) ? (scoreInfo.payDealer | 0) : 0;
    const loserSeats = getOtherSeatIndexes(winner);

    for (const seat of loserSeats){
      let total = 0;
      if (scoreInfo.isDealer){
        total = payAll + honbaBonusPerPayer;
      } else {
        total = ((seat === dealerSeat) ? payDealer : payChild) + honbaBonusPerPayer;
      }

      addDelta(delta, seat, -total);
      addDelta(delta, winner, total);
    }
  } else {
    const discarder = (typeof lastAgariDiscarderSeatIndex === "number") ? lastAgariDiscarderSeatIndex : null;
    if (discarder == null) return null;

    const total = (Number.isFinite(scoreInfo.ronPoint) ? (scoreInfo.ronPoint | 0) : 0) + honbaBonusPerPayer;
    addDelta(delta, discarder, -total);
    addDelta(delta, winner, total);
  }


  const kyotakuPoint = (previousKyotakuCount + currentHandKyotakuCount) * 1000;
  if (kyotakuPoint > 0){
    addDelta(delta, winner, kyotakuPoint);
  }

  const afterScores = [
    beforeScores[0] + delta[0],
    beforeScores[1] + delta[1],
    beforeScores[2] + delta[2]
  ];

  return {
    type: "agari",
    winType,
    winnerSeatIndex: winner,
    discarderSeatIndex: (typeof lastAgariDiscarderSeatIndex === "number") ? lastAgariDiscarderSeatIndex : null,
    scoreInfo,
    beforeScores,
    delta,
    afterScores,
    riichiSeats: riichiSeats.slice(),
    previousKyotakuCount,
    currentHandKyotakuCount,
    nextKyotakuCount: 0
  };
}

function getAgariQueueForSettlement(){
  try{
    if (typeof window !== "undefined" && typeof window.getAgariResultQueue === "function"){
      const queue = window.getAgariResultQueue();
      return Array.isArray(queue) ? queue.slice() : [];
    }
  }catch(e){}
  return [];
}

function hasAgariResultQueueForSettlement(){
  return getAgariQueueForSettlement().length > 0;
}

function getHeadAgariQueueEntryForSettlement(queue){
  const list = Array.isArray(queue) ? queue : [];
  return list.find((entry)=> entry && entry.headWinner) || list[0] || null;
}

function getResultYakuInfoFromEntryForSettlement(entry){
  try{
    if (!entry) return null;
    if (typeof getResultYakuInfoByEntry === "function"){
      return getResultYakuInfoByEntry(entry);
    }
  }catch(e){}
  return null;
}

function buildCombinedSettlementFromAgariQueue(){
  const queue = getAgariQueueForSettlement();
  if (queue.length <= 0) return null;

  normalizeScoreState();

  const beforeScores = cloneScoreArray(scores);
  const delta = [0, 0, 0];
  const riichiSeats = getCurrentRiichiDepositorSeats();
  const previousKyotakuCount = kyotakuCount | 0;
  const currentHandKyotakuCount = riichiSeats.length | 0;
  const dealerSeat = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;
  const headEntry = getHeadAgariQueueEntryForSettlement(queue);

  for (const entry of queue){
    if (!entry || entry.winType !== "ron") continue;
    const winner = entry.winnerSeatIndex;
    const discarder = entry.discarderSeatIndex;
    if (winner == null || discarder == null) continue;

    const info = getResultYakuInfoFromEntryForSettlement(entry);
    const scoreInfo = (typeof calcSanmaScoreFromInfo === "function")
      ? calcSanmaScoreFromInfo(info, winner, "ron")
      : null;
    if (!scoreInfo) continue;

    entry.scoreInfo = scoreInfo;

    const honbaBonusPerPayer = Number.isFinite(scoreInfo.honbaBonusPerPayer) ? (scoreInfo.honbaBonusPerPayer | 0) : 0;
    const total = (Number.isFinite(scoreInfo.ronPoint) ? (scoreInfo.ronPoint | 0) : 0) + honbaBonusPerPayer;
    addDelta(delta, discarder, -total);
    addDelta(delta, winner, total);
  }


  const kyotakuWinner = headEntry ? headEntry.winnerSeatIndex : null;
  const kyotakuPoint = (previousKyotakuCount + currentHandKyotakuCount) * 1000;
  if (kyotakuWinner != null && kyotakuPoint > 0){
    addDelta(delta, kyotakuWinner, kyotakuPoint);
  }

  const afterScores = [
    beforeScores[0] + delta[0],
    beforeScores[1] + delta[1],
    beforeScores[2] + delta[2]
  ];

  return {
    type: "agari",
    winType: "ron",
    winnerSeatIndex: headEntry ? headEntry.winnerSeatIndex : null,
    discarderSeatIndex: headEntry ? headEntry.discarderSeatIndex : null,
    beforeScores,
    delta,
    afterScores,
    riichiSeats: riichiSeats.slice(),
    previousKyotakuCount,
    currentHandKyotakuCount,
    nextKyotakuCount: 0,
    agariEntries: queue.slice(),
    headEntry
  };
}

function buildRyukyokuSettlement(){
  normalizeScoreState();

  const beforeScores = cloneScoreArray(scores);
  const delta = [0, 0, 0];
  const tenpaiSeats = getRyukyokuTenpaiSeats();
  const riichiSeats = getCurrentRiichiDepositorSeats();
  const previousKyotakuCount = kyotakuCount | 0;
  const currentHandKyotakuCount = riichiSeats.length | 0;

  if (tenpaiSeats.length === 1){
    const winner = tenpaiSeats[0];
    const losers = getOtherSeatIndexes(winner);
    for (const seat of losers){
      addDelta(delta, seat, -1000);
      addDelta(delta, winner, 1000);
    }
  } else if (tenpaiSeats.length === 2){
    const loser = [0, 1, 2].find((seat)=> !tenpaiSeats.includes(seat));
    if (typeof loser === "number"){
      addDelta(delta, loser, -2000);
      for (const seat of tenpaiSeats){
        addDelta(delta, seat, 1000);
      }
    }
  }


  const afterScores = [
    beforeScores[0] + delta[0],
    beforeScores[1] + delta[1],
    beforeScores[2] + delta[2]
  ];

  return {
    type: "ryukyoku",
    winType: "ryukyoku",
    winnerSeatIndex: null,
    discarderSeatIndex: null,
    beforeScores,
    delta,
    afterScores,
    tenpaiSeats: tenpaiSeats.slice(),
    riichiSeats: riichiSeats.slice(),
    previousKyotakuCount,
    currentHandKyotakuCount,
    nextKyotakuCount: previousKyotakuCount + currentHandKyotakuCount
  };
}

function buildCurrentRoundSettlement(){
  let settlement = null;

  // ここではキャッシュしない。
  // result描画中に先に精算を確定してしまうと、
  // その後に参照したい最新の供託本数や状態が反映されず、
  // 「流局表示では4本なのに次局で2本へ戻る」ようなズレが起きる。
  // 実際の確定は applyPendingRoundSettlement() 側で行う。
  if (hasAgariResultQueueForSettlement()){
    settlement = buildCombinedSettlementFromAgariQueue();
  } else if (lastAgariType === "tsumo" || lastAgariType === "ron"){
    settlement = buildAgariSettlement();
  } else if (lastAgariType === "ryukyoku"){
    settlement = buildRyukyokuSettlement();
  }

  return settlement;
}

function clearPendingRoundSettlement(){
  pendingRoundSettlement = null;
}

function applyPendingRoundSettlement(){
  const settlement = pendingRoundSettlement || buildCurrentRoundSettlement();
  if (!settlement) return null;

  normalizeScoreState();

  scores = settlement.afterScores.slice();
  kyotakuCount = Math.max(0, settlement.nextKyotakuCount | 0);
  pendingRoundSettlement = null;

  try{
    if (typeof window !== "undefined" && typeof window.resetCommittedRiichiStickState === "function"){
      window.resetCommittedRiichiStickState();
    }
  }catch(e){}

  try{
    if (typeof window !== "undefined" && typeof window.clearAgariResultQueue === "function"){
      window.clearAgariResultQueue();
    }
  }catch(e){}

  return settlement;
}

function isSeatTopOrTiedForTop(scoreList, seatIndex){
  if (!Array.isArray(scoreList)) return false;
  const me = Number(scoreList[seatIndex]) || 0;
  for (let i = 0; i < scoreList.length; i++){
    if (i === seatIndex) continue;
    const other = Number(scoreList[i]) || 0;
    if (other > me) return false;
  }
  return true;
}

function getHanchanEndReasonAfterSettlement(settlement){
  if (!settlement || !Array.isArray(settlement.afterScores)) return null;

  const afterScores = settlement.afterScores.slice();

  for (let seat = 0; seat < afterScores.length; seat++){
    if ((afterScores[seat] | 0) <= 0){
      return {
        end: true,
        reason: `${typeof resultSeatName === "function" ? resultSeatName(seat) : ("席" + seat)}がトビ`
      };
    }
  }

  if (roundWind === "南" && (roundNumber | 0) === 3){
    const dealerSeat = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;
    let dealerKeeps = false;

    const headEntry = getHeadAgariQueueEntryForSettlement(getAgariQueueForSettlement());
    if (headEntry && (headEntry.winType === "tsumo" || headEntry.winType === "ron")){
      dealerKeeps = (headEntry.winnerSeatIndex === dealerSeat);
    } else if (lastAgariType === "tsumo" || lastAgariType === "ron"){
      dealerKeeps = (lastAgariWinnerSeatIndex === dealerSeat);
    } else if (lastAgariType === "ryukyoku"){
      dealerKeeps = (lastRyukyokuDealerTenpai === true);
    }

    if (!dealerKeeps){
      return {
        end: true,
        reason: "南3 親流れ終了"
      };
    }

    if (isSeatTopOrTiedForTop(afterScores, dealerSeat)){
      return {
        end: true,
        reason: "南3 親トップ終了"
      };
    }
  }

  return null;
}

function ensureHanchanEndOverlay(){
  let overlay = document.getElementById("hanchanEndOverlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "hanchanEndOverlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "none";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.background = "rgba(0,0,0,0.68)";
  overlay.style.zIndex = "2800";
  overlay.style.padding = "20px";
  overlay.style.boxSizing = "border-box";

  const panel = document.createElement("div");
  panel.style.width = "min(560px, 92vw)";
  panel.style.background = "linear-gradient(180deg, rgba(18,31,55,0.96), rgba(8,17,32,0.96))";
  panel.style.border = "1px solid rgba(255,255,255,0.12)";
  panel.style.borderRadius = "24px";
  panel.style.boxShadow = "0 18px 60px rgba(0,0,0,0.38)";
  panel.style.padding = "28px 24px";
  panel.style.color = "#fff";
  panel.style.textAlign = "center";

  const title = document.createElement("div");
  title.id = "hanchanEndTitle";
  title.style.fontSize = "34px";
  title.style.fontWeight = "900";
  title.style.letterSpacing = "0.08em";
  title.style.marginBottom = "10px";
  title.textContent = "対局終了";

  const reason = document.createElement("div");
  reason.id = "hanchanEndReason";
  reason.style.fontSize = "16px";
  reason.style.opacity = "0.9";
  reason.style.marginBottom = "18px";

  const scoresBox = document.createElement("div");
  scoresBox.id = "hanchanEndScores";
  scoresBox.style.display = "grid";
  scoresBox.style.gridTemplateColumns = "1fr";
  scoresBox.style.gap = "10px";
  scoresBox.style.textAlign = "left";
  scoresBox.style.marginBottom = "16px";

  const hint = document.createElement("div");
  hint.style.fontSize = "13px";
  hint.style.opacity = "0.8";
  hint.textContent = "クリックで閉じる";

  panel.appendChild(title);
  panel.appendChild(reason);
  panel.appendChild(scoresBox);
  panel.appendChild(hint);
  overlay.appendChild(panel);

  overlay.addEventListener("click", (ev)=>{
    if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
    overlay.style.display = "none";
  }, true);

  document.body.appendChild(overlay);
  return overlay;
}

function showHanchanEndOverlay(endInfo, settlement){
  const overlay = ensureHanchanEndOverlay();
  const reasonEl = document.getElementById("hanchanEndReason");
  const scoresEl = document.getElementById("hanchanEndScores");

  if (reasonEl){
    reasonEl.textContent = endInfo && endInfo.reason ? endInfo.reason : "";
  }

  if (scoresEl){
    scoresEl.innerHTML = "";
    const finalScores = Array.isArray(scores) ? scores : (settlement && settlement.afterScores ? settlement.afterScores : [0,0,0]);
    const seatNames = [
      "あなた",
      "右CPU",
      "左CPU"
    ];

    for (let seat = 0; seat < 3; seat++){
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.gap = "12px";
      row.style.padding = "12px 14px";
      row.style.borderRadius = "14px";
      row.style.background = "rgba(255,255,255,0.06)";

      const name = document.createElement("div");
      name.textContent = seatNames[seat];
      name.style.fontWeight = "700";

      const point = document.createElement("div");
      point.textContent = (Number(finalScores[seat]) || 0).toLocaleString("ja-JP");
      point.style.fontSize = "24px";
      point.style.fontWeight = "900";
      point.style.color = "#ffd76d";

      row.appendChild(name);
      row.appendChild(point);
      scoresEl.appendChild(row);
    }
  }

  overlay.style.display = "flex";
}
