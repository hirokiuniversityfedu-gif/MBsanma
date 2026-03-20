// MBsanma/js/main.js
// ========= main.js（起動/イベント紐付け） =========

// ================================
// ★ 自動で次局へ（誤爆防止）
// ================================
let __autoNextTimer = null;
let __nextKyokuArmed = false;

// ★ 流局（山枯れ）時の「親テンパイ」情報（actions.js がセット）
let lastRyukyokuDealerTenpai = null;

// ★ アガリ後進行段階
// "none"        : 通常局中
// "overlay"     : 演出オーバーレイ表示中
// "table"       : 卓確認中
// "result"      : 結果確認中
// "nextArmed"   : 次局クリック待ち
let __postAgariStage = "none";


// ★ デバッグ用：CPはリーチするがツモ・ロンしない
let debugCpuRiichiOnlyMode = false;

// ★ CPU自動進行の世代管理（局リセット時に古いループを止める）
let __cpuTurnLoopEpoch = 0;

// ★ デバッグシナリオ開始前の新半荘リセット中はCPU自動進行を止める
let __suspendCpuAutoKick = false;

function setDebugCpuRiichiOnlyMode(value){
  debugCpuRiichiOnlyMode = !!value;
}

function isDebugCpuRiichiOnlyMode(){
  return !!debugCpuRiichiOnlyMode;
}

function bumpCpuTurnLoopEpoch(){
  __cpuTurnLoopEpoch += 1;
  return __cpuTurnLoopEpoch;
}

function getCpuTurnLoopEpoch(){
  return __cpuTurnLoopEpoch;
}

function clearAutoNextTimer(){
  if (__autoNextTimer){
    clearTimeout(__autoNextTimer);
    __autoNextTimer = null;
  }
  __nextKyokuArmed = false;
}

function resetPostAgariStage(){
  __postAgariStage = "none";
  __nextKyokuArmed = false;
}

function setPostAgariStageToOverlay(){
  __postAgariStage = "overlay";
  __nextKyokuArmed = false;
}

function hasResultOverlayApi(){
  return (typeof openResultOverlay === "function" && typeof closeResultOverlay === "function");
}

function isResultOverlayVisible(){
  if (typeof resultOverlay === "undefined" || !resultOverlay) return false;
  const d = resultOverlay.style && resultOverlay.style.display;
  return (d !== "none" && d !== "");
}

function hasAgariResultQueueNow(){
  try{
    return (typeof window !== "undefined" && typeof window.getCurrentAgariResultEntry === "function" && !!window.getCurrentAgariResultEntry());
  }catch(e){
    return false;
  }
}

function getHeadAgariResultEntrySafe(){
  try{
    if (typeof window !== "undefined" && typeof window.getAgariQueueHeadEntry === "function"){
      return window.getAgariQueueHeadEntry();
    }
  }catch(e){}
  return null;
}

// ================================
// ★ 次局へ進む（ここだけで局進行）
// ================================
function startNextKyoku(){
  if (!__nextKyokuArmed) return;
  __nextKyokuArmed = false;

  const dealer = (typeof eastSeatIndex === "number") ? eastSeatIndex : 0;

  const nextSeatOf = (s)=>{
    if (typeof nextSeatIndexOf === "function") return nextSeatIndexOf(s);
    return (s + 1) % 3;
  };

  // ================================
  // ★ 親番/本場の進行ルール（このプロジェクト仕様）
  // - 親がアガった：連荘（本場+1 / 局番号は据え置き）
  // - 山枯れ流局で親テンパイ：連荘（本場+1 / 局番号は据え置き）
  // - 親がアガらない / 親ノーテン流局：親流れ（親交代 / 本場=0 / 局番号+1）
  //
  // ★ 三麻の局進行
  // - 東1 → 東2 → 東3 → 南1 → 南2 → 南3
  // - 南3で親が流れたら対局終了
  // ================================
  let dealerKeeps = false;

  try{
    const headEntry = getHeadAgariResultEntrySafe();
    if (headEntry && (headEntry.winType === "tsumo" || headEntry.winType === "ron")){
      dealerKeeps = (headEntry.winnerSeatIndex === dealer);
    } else if (lastAgariType === "tsumo" || lastAgariType === "ron"){
      dealerKeeps = (lastAgariWinnerSeatIndex === dealer);
    } else if (lastAgariType === "ryukyoku"){
      dealerKeeps = (lastRyukyokuDealerTenpai === true);
    } else {
      dealerKeeps = false;
    }
  }catch(e){
    dealerKeeps = false;
  }

  if (dealerKeeps){
    honba = (typeof honba === "number") ? (honba + 1) : 1;
    // roundNumber / roundWind は据え置き
  } else {
    // 親流れ
    eastSeatIndex = nextSeatOf(dealer);
    honba = 0;

    // 次局（表示上の局番号）
    roundNumber++;

    if (roundNumber > 3){
      if (roundWind === "東"){
        roundWind = "南";
        roundNumber = 1;
      } else {
        // 南3終了
        lastAgariWinnerSeatIndex = null;
        lastAgariDiscarderSeatIndex = null;
        lastAgariType = null;
        lastAgariRonTile = null;
        lastRyukyokuDealerTenpai = null;

        resetPostAgariStage();
        return;
      }
    }
  }

  // 次局に影響を残さない
  lastAgariWinnerSeatIndex = null;
  lastAgariDiscarderSeatIndex = null;
  lastAgariType = null;
  lastAgariRonTile = null;
  lastRyukyokuDealerTenpai = null;
  try{ if (typeof window !== "undefined" && typeof window.clearAgariResultQueue === "function") window.clearAgariResultQueue(); }catch(e){}

  resetPostAgariStage();
  startNewKyoku();
}

function armNextKyoku(){
  // ★放置で「次局に行けなくなる」原因だった 2秒自動解除をやめる
  // これで、卓確認後にしばらく放置しても、次のクリックで次局へ進める
  if (__autoNextTimer){
    clearTimeout(__autoNextTimer);
    __autoNextTimer = null;
  }
  __nextKyokuArmed = true;
  __postAgariStage = "nextArmed";
}

function movePostAgariFlowFromOverlayToTable(closeFn){
  try{
    if (typeof closeFn === "function") closeFn();
  }catch(e){}

  // 演出オーバーレイを閉じたら、卓確認画面へ
  __postAgariStage = "table";
}

function movePostAgariFlowFromTableToResult(){
  // 結果画面APIがまだ無い間は、従来どおり次局待ちへフォールバック
  if (!hasResultOverlayApi()){
    armNextKyoku();
    return;
  }

  try{
    openResultOverlay();
  }catch(e){}

  __postAgariStage = "result";
}

function movePostAgariFlowFromResultToNext(){
  if (hasAgariResultQueueNow()){
    try{
      if (typeof window.hasNextAgariResultQueueEntry === "function" && window.hasNextAgariResultQueueEntry()){
        if (typeof window.advanceAgariResultQueue === "function") window.advanceAgariResultQueue();
        if (typeof openResultOverlay === "function") openResultOverlay();
        __postAgariStage = "result";
        return;
      }
    }catch(e){}
  }

  let settlement = null;

  try{
    if (typeof buildCurrentRoundSettlement === "function"){
      settlement = buildCurrentRoundSettlement();
    }
  }catch(e){}

  try{
    if (typeof applyPendingRoundSettlement === "function"){
      settlement = applyPendingRoundSettlement() || settlement;
    }
  }catch(e){}

  try{
    if (typeof closeResultOverlay === "function") closeResultOverlay();
  }catch(e){}

  try{
    if (typeof render === "function") render();
  }catch(e){}

  let endInfo = null;
  try{
    if (typeof getHanchanEndReasonAfterSettlement === "function"){
      endInfo = getHanchanEndReasonAfterSettlement(settlement);
    }
  }catch(e){}

  if (endInfo && endInfo.end){
    try{
      if (typeof showHanchanEndOverlay === "function"){
        showHanchanEndOverlay(endInfo, settlement);
      }
    }catch(e){}
    resetPostAgariStage();
    return;
  }

  armNextKyoku();
}


function setInitialDoraAndUraFromDeadWall(){
  if (typeof resetDoraIndicatorsFromDeadWall === "function"){
    resetDoraIndicatorsFromDeadWall();
    return;
  }

  doraIndicators = [];
  uraDoraIndicators = [];
  try{ if (typeof deadWallDrawCursor !== "undefined") deadWallDrawCursor = 0; }catch(e){}

  if (!Array.isArray(deadWall) || deadWall.length <= 0) return;

  const omote = deadWall[8];
  if (omote && omote.code){
    doraIndicators.push({ code: omote.code, imgCode: omote.imgCode || omote.code, isRed: !!omote.isRed });
  }

  const ura = deadWall[13];
  if (ura && ura.code){
    uraDoraIndicators.push({ code: ura.code, imgCode: ura.imgCode || ura.code, isRed: !!ura.isRed });
  }
}

function resetKyokuRuntimeState(){
  bumpCpuTurnLoopEpoch();

  try{ if (typeof clearPlayerDrawTimer === "function") clearPlayerDrawTimer(); }catch(e){}

  isEnded = false;

  isRiichi = false;
  isRiichiSelecting = false;
  riichiCandidates = null;
  riichiWait = false;
  try{ if (typeof resetPlayerRiichiDisplayState === "function") resetPlayerRiichiDisplayState(); }catch(e){}

  pendingCall = null;
  mustDiscardAfterCall = false;

  hoveredTileId = null;

  river = [];
  cpuLeftRiver  = [];
  cpuRightRiver = [];
  melds = [];
  peis  = [];

  lastAgariWinnerSeatIndex = null;
  lastAgariDiscarderSeatIndex = null;
  lastAgariType = null;
  lastAgariRonTile = null;
  lastRyukyokuDealerTenpai = null;

  doraIndicators = [];
  uraDoraIndicators = [];

  try{ if (typeof clearAllIppatsuChances === "function") clearAllIppatsuChances(); }catch(e){}
  try{ if (typeof clearAllDoubleRiichiFlags === "function") clearAllDoubleRiichiFlags(); }catch(e){}
  try{ if (typeof resetOpenCallOrKanFlag === "function") resetOpenCallOrKanFlag(); }catch(e){}
  try{ if (typeof resetCurrentWinContext === "function") resetCurrentWinContext(); }catch(e){}

  clearAutoNextTimer();
  resetPostAgariStage();

  try{ if (typeof closeTsumo === "function") closeTsumo(); }catch(e){}
  try{ if (typeof closeRon === "function") closeRon(); }catch(e){}
  try{ if (typeof closeRyukyoku === "function") closeRyukyoku(); }catch(e){}
  try{ if (typeof closeResultOverlay === "function") closeResultOverlay(); }catch(e){}

  try{ if (typeof kanOverlay !== "undefined" && kanOverlay) kanOverlay.style.display = "none"; }catch(e){}
  try{ if (typeof riichiOverlay !== "undefined" && riichiOverlay) riichiOverlay.style.display = "none"; }catch(e){}
  try{ if (typeof drawOverlay !== "undefined" && drawOverlay) drawOverlay.style.display = "none"; }catch(e){}
}

function startDebugKyokuByCodes(selectedImgCodes){
  try{
    if (!Array.isArray(selectedImgCodes) || selectedImgCodes.length !== 13) return false;

    const normalizeCode = (imgCode)=>{
      if (imgCode === "r5p") return { code: "5p", imgCode: "r5p" };
      if (imgCode === "r5s") return { code: "5s", imgCode: "r5s" };
      if (imgCode === "r4z") return { code: "4z", imgCode: "r4z" };
      return { code: imgCode, imgCode };
    };

    const requested = selectedImgCodes.map(normalizeCode);
    const fullWall = shuffle(makeWall());

    const consumeTile = ({ code, imgCode })=>{
      const idx = fullWall.findIndex((t)=> t && t.code === code && t.imgCode === imgCode);
      if (idx < 0) return null;
      const picked = fullWall[idx];
      fullWall.splice(idx, 1);
      return picked;
    };

    const selectedTiles = [];
    for (const item of requested){
      const tile = consumeTile(item);
      if (!tile) return false;
      selectedTiles.push(tile);
    }

    if (fullWall.length < (18 + 1 + 13 + 13)) return false;

    resetKyokuRuntimeState();

    try{
      if (typeof resetScoreStateForNewHanchan === "function"){
        resetScoreStateForNewHanchan();
      }
    }catch(e){}

    nextId = 1 + fullWall.length + selectedTiles.length;
    initWallsFromShuffled(fullWall);

    setInitialDoraAndUraFromDeadWall();

    hand13 = sortHand(selectedTiles);
    drawn = null;

    cpuRightHand13 = sortHand(wall.slice(0, 13));
    wall = wall.slice(13);

    cpuLeftHand13 = sortHand(wall.slice(0, 13));
    wall = wall.slice(13);

    initialHand13 = hand13.map(t => ({...t}));
    initialDrawn  = drawn ? ({...drawn}) : null;
    initialCpuRightHand13 = cpuRightHand13.map(t => ({...t}));
    initialCpuLeftHand13  = cpuLeftHand13.map(t => ({...t}));

    clearNewFlags();
    if (drawn) drawn.isNew = true;

    try{
      if (typeof initTurnForKyokuStart === "function"){
        initTurnForKyokuStart();
      } else {
        if (typeof currentTurnSeatIndex !== "undefined") currentTurnSeatIndex = 0;
        if (typeof turnPhase !== "undefined") turnPhase = "DISCARD";
      }
    }catch(e){}

    render();
    return true;
  }catch(err){
    if (typeof showFatalError === "function") showFatalError(err, "startDebugKyokuByCodes()");
    return false;
  }
}

// ================================
// ================================
// ★ 新しい局（配牌〜）
// ================================


function parseDebugKyokuLabel(label){
  const text = String(label || '東1');
  if (text.startsWith('南')){
    const n = Number(text.slice(1)) || 1;
    return { roundWind: '南', roundNumber: Math.min(3, Math.max(1, n)) };
  }
  const n = Number(text.slice(1)) || 1;
  return { roundWind: '東', roundNumber: Math.min(3, Math.max(1, n)) };
}

function startDebugKyokuByScenario(opts){
  try{
    const scenario = (opts && typeof opts === 'object') ? opts : {};
    const selected = (scenario.selected && typeof scenario.selected === 'object') ? scenario.selected : {};
    const cpuRiichiOnly = !!scenario.cpuRiichiOnly;

    __suspendCpuAutoKick = true;
    try{
      if (typeof startNewHanchan === 'function') startNewHanchan();
    }finally{
      __suspendCpuAutoKick = false;
    }

    setDebugCpuRiichiOnlyMode(cpuRiichiOnly);

    const normalizeCode = (imgCode)=>{
      if (imgCode === 'r5p') return { code: '5p', imgCode: 'r5p' };
      if (imgCode === 'r5s') return { code: '5s', imgCode: 'r5s' };
      if (imgCode === 'r4z') return { code: '4z', imgCode: 'r4z' };
      return { code: imgCode, imgCode };
    };

    const kyokuInfo = parseDebugKyokuLabel(scenario.kyokuLabel);
    roundWind = kyokuInfo.roundWind;
    roundNumber = kyokuInfo.roundNumber;
    eastSeatIndex = (scenario.dealer === 1 || scenario.dealer === 2) ? scenario.dealer : 0;
    honba = (Number.isInteger(scenario.honba) && scenario.honba >= 0) ? scenario.honba : 0;

    const junme = (Number.isInteger(scenario.junme) && scenario.junme >= 0)
      ? scenario.junme
      : Math.max(0, Number(scenario.junme) || 0);

    const fullPool = shuffle(makeWall());

    const consumeTile = (spec)=>{
      if (!spec || !spec.code || !spec.imgCode) return null;
      const idx = fullPool.findIndex((t)=> t && t.code === spec.code && t.imgCode === spec.imgCode);
      if (idx < 0) return null;
      const picked = fullPool[idx];
      fullPool.splice(idx, 1);
      return picked;
    };

    const drawRandomFromPool = ()=>{
      if (!Array.isArray(fullPool) || fullPool.length <= 0) return null;
      return fullPool.pop() || null;
    };

    const buildOrderedTiles = (arr, max)=>{
      const out = [];
      const list = Array.isArray(arr) ? arr.slice(0, max) : [];
      for (const imgCode of list){
        const tile = consumeTile(normalizeCode(imgCode));
        if (!tile) return null;
        out.push(tile);
      }
      while (out.length < max){
        const tile = drawRandomFromPool();
        if (!tile) return null;
        out.push(tile);
      }
      return out;
    };

    const buildHand = (arr)=>{
      const out = buildOrderedTiles(arr, 13);
      if (!out) return null;
      return sortHand(out);
    };

    const meHand = buildHand(selected.me);
    const rightHand = buildHand(selected.right);
    const leftHand = buildHand(selected.left);
    if (!meHand || !rightHand || !leftHand) return false;

    let omote = null;
    if (Array.isArray(selected.dora) && selected.dora.length > 0){
      omote = consumeTile(normalizeCode(selected.dora[0]));
      if (!omote) return false;
    } else {
      omote = drawRandomFromPool();
      if (!omote) return false;
    }

    const ura = drawRandomFromPool();
    if (!ura) return false;

    const supplementTiles = buildOrderedTiles(selected.deadDraw, 8);
    if (!supplementTiles) return false;

    const extraOmoteTiles = [];
    while (extraOmoteTiles.length < 4){
      const tile = drawRandomFromPool();
      if (!tile) return false;
      extraOmoteTiles.push(tile);
    }

    const extraUraTiles = [];
    while (extraUraTiles.length < 4){
      const tile = drawRandomFromPool();
      if (!tile) return false;
      extraUraTiles.push(tile);
    }

    const customDeadWall = [
      ...supplementTiles,
      omote,
      ...extraOmoteTiles,
      ura,
      ...extraUraTiles
    ];

    const nextSeatOf = (s)=> ((s + 1) % 3);
    const riverOrder = [eastSeatIndex, nextSeatOf(eastSeatIndex), nextSeatOf(nextSeatOf(eastSeatIndex))];
    const riverMap = { 0: [], 1: [], 2: [] };

    for (let j = 0; j < junme; j++){
      for (const seat of riverOrder){
        const tile = drawRandomFromPool();
        if (!tile) return false;
        tile.isNew = false;
        riverMap[seat].push(tile);
      }
    }

    const wallTopTiles = buildOrderedTiles(selected.wallTop, 9);
    if (!wallTopTiles) return false;

    const remainingWall = [
      ...shuffle(fullPool.slice()),
      ...wallTopTiles.slice().reverse()
    ];

    resetKyokuRuntimeState();

    wall = remainingWall;
    liveWall = wall;
    deadWall = customDeadWall;
    try{ if (typeof deadWallDrawCursor !== 'undefined') deadWallDrawCursor = 0; }catch(e){}

    setInitialDoraAndUraFromDeadWall();

    hand13 = meHand;
    cpuRightHand13 = rightHand;
    cpuLeftHand13 = leftHand;
    drawn = null;

    river = riverMap[0].slice();
    cpuRightRiver = riverMap[1].slice();
    cpuLeftRiver = riverMap[2].slice();

    initialHand13 = hand13.map(t => ({...t}));
    initialDrawn  = null;
    initialCpuRightHand13 = cpuRightHand13.map(t => ({...t}));
    initialCpuLeftHand13  = cpuLeftHand13.map(t => ({...t}));

    clearNewFlags();

    currentTurnSeatIndex = eastSeatIndex;
    turnPhase = 'DISCARD';
    hoveredTileId = null;

    if (currentTurnSeatIndex === 0){
      drawn = drawOne();
      if (drawn) drawn.isNew = true;
      initialDrawn = drawn ? ({...drawn}) : null;
      render();
      if (!isEnded && isRiichi && typeof scheduleRiichiAuto === 'function'){
        try{ scheduleRiichiAuto(); }catch(e){}
      }
    } else {
      drawn = null;
      initialDrawn = null;
      render();
      if (typeof kickCpuTurnsIfNeeded === 'function'){
        kickCpuTurnsIfNeeded(true);
      }
    }

    return true;
  }catch(err){
    if (typeof showFatalError === 'function') showFatalError(err, 'startDebugKyokuByScenario()');
    return false;
  }
}

function startNewKyoku(){
  resetKyokuRuntimeState();

  nextId = 1;
  const shuffled108 = shuffle(makeWall());
  initWallsFromShuffled(shuffled108);

  setInitialDoraAndUraFromDeadWall();

  hand13 = sortHand(wall.slice(0, 13));
  wall = wall.slice(13);

  drawn = null;
  if ((typeof eastSeatIndex === "number" ? eastSeatIndex : 0) === 0 && wall.length > 0){
    drawn = wall[0];
    wall = wall.slice(1);
    if (drawn) drawn.isNew = true;
  }

  cpuRightHand13 = sortHand(wall.slice(0, 13));
  wall = wall.slice(13);

  cpuLeftHand13 = sortHand(wall.slice(0, 13));
  wall = wall.slice(13);

  initialHand13 = hand13.map(t => ({...t}));
  initialDrawn  = drawn ? ({...drawn}) : null;

  initialCpuRightHand13 = cpuRightHand13.map(t => ({...t}));
  initialCpuLeftHand13  = cpuLeftHand13.map(t => ({...t}));

  clearNewFlags();
  if (drawn) drawn.isNew = true;

  try{
    if (typeof initTurnForKyokuStart === "function"){
      initTurnForKyokuStart();
    } else {
      if (typeof currentTurnSeatIndex !== "undefined") currentTurnSeatIndex = 0;
      if (typeof turnPhase !== "undefined") turnPhase = "DISCARD";
    }
  }catch(e){}

  render();
}

// ================================
// ★ 新しい半荘
// ================================
function resetHanchanCarryState(){
  try{
    if (typeof clearPendingRoundSettlement === "function"){
      clearPendingRoundSettlement();
    }
  }catch(e){}

  try{
    if (typeof window !== "undefined" && typeof window.clearAgariResultQueue === "function"){
      window.clearAgariResultQueue();
    }
  }catch(e){}

  try{
    if (typeof window !== "undefined" && typeof window.resetCommittedRiichiStickState === "function"){
      window.resetCommittedRiichiStickState();
    }
  }catch(e){}
}

function startNewHanchan(){
  clearAutoNextTimer();
  setDebugCpuRiichiOnlyMode(false);

  try{
    if (typeof resetScoreStateForNewHanchan === "function"){
      resetScoreStateForNewHanchan();
    }
  }catch(e){}

  resetHanchanCarryState();

  roundWind = "東";
  roundNumber = 1;
  eastSeatIndex = Math.floor(Math.random() * 3);
  honba = 0;

  lastAgariWinnerSeatIndex = null;
  lastAgariDiscarderSeatIndex = null;
  lastAgariType = null;
  lastAgariRonTile = null;
  lastRyukyokuDealerTenpai = null;

  resetPostAgariStage();
  startNewKyoku();
}

// ================================
// ★ リセット（配牌に戻す）
// ================================
function doReset(){
  if (!initialHand13 || initialHand13.length === 0) return;

  resetKyokuRuntimeState();

  hand13 = initialHand13.map(t => ({...t}));
  drawn  = initialDrawn ? ({...initialDrawn}) : null;

  cpuRightHand13 = initialCpuRightHand13.map(t => ({...t}));
  cpuLeftHand13  = initialCpuLeftHand13.map(t => ({...t}));

  clearNewFlags();
  if (drawn) drawn.isNew = true;

  try{
    if (typeof initTurnForKyokuStart === "function"){
      initTurnForKyokuStart();
    } else {
      if (typeof currentTurnSeatIndex !== "undefined") currentTurnSeatIndex = 0;
      if (typeof turnPhase !== "undefined") turnPhase = "DISCARD";
    }
  }catch(e){}

  render();
}

// ================================

// ================================

// ================================

// ================================
// ★ オーバーレイの表示判定（卓画面に戻っているか）
// ================================
function isAnyOverlayVisible(){
  const isShown = (el)=>{
    if (!el) return false;
    // display:none だけで判定（CSS次第で opacity などもあるが、ここは安全側）
    const d = el.style && el.style.display;
    return (d !== "none" && d !== "");
  };

  // overlayは「表示時に style.display='block' などを付けてる前提」
  // もし display 指定を使っていない場合でも、卓クリック誤爆を防ぐために
  // isEnded=false の局中は進めない（下の卓クリック側で守る）
  return (
    isShown(tsumoOverlay) ||
    isShown(ronOverlay) ||
    isShown(ryukyokuOverlay) ||
    isShown(kanOverlay) ||
    isShown(riichiOverlay) ||
    isResultOverlayVisible()
  );
}

// ================================
// ★ 演出オーバーレイを閉じたら「卓確認画面」へ
// ================================
function onAgariOverlayCloseToTable(closeFn){
  movePostAgariFlowFromOverlayToTable(closeFn);
}

// ================================
// ★ 卓クリック / 結果クリックの進行
// - isEnded の時だけ
// - 演出オーバーレイが出ている最中は卓クリック無効
// - ボタン類のクリックは誤爆しないよう除外
// ================================
function bindTableClickFlowAfterAgari(){
  document.addEventListener("click", (ev)=>{
    try{
      if (!isEnded) return;

      const t = ev && ev.target;

      // ボタン操作で誤爆しない
      if (t && (t.closest && t.closest("button"))) return;

      // 演出中は卓クリックで進めない（オーバーレイ側クリックのみ）
      if (__postAgariStage === "overlay"){
        return;
      }

      // 卓確認中 → 結果確認画面
      if (__postAgariStage === "table"){
        if (isAnyOverlayVisible()) return;
        movePostAgariFlowFromTableToResult();
        return;
      }

      // 結果確認中は、結果画面側クリックで処理する
      if (__postAgariStage === "result"){
        return;
      }

      // 次局待ち → 次局
      if (__postAgariStage === "nextArmed"){
        if (isAnyOverlayVisible()) return;
        startNextKyoku();
      }
    }catch(e){
      // 何もしない
    }
  }, true);
}

// ================================
// ★ イベント紐付け
// ================================
function bindEvents(){
  if (newBtn){
    newBtn.addEventListener("click", ()=>{
      startNewHanchan();
    });
  }




  if (typeof cpuOpenToggleBtn !== "undefined" && cpuOpenToggleBtn){
    cpuOpenToggleBtn.addEventListener("click", ()=>{
      if (typeof toggleCpuHandOpen === "function"){
        toggleCpuHandOpen();
      }

      if (typeof getCpuHandOpenLabel === "function"){
        cpuOpenToggleBtn.textContent = getCpuHandOpenLabel();
      }

      render();
    });

    if (typeof getCpuHandOpenLabel === "function"){
      cpuOpenToggleBtn.textContent = getCpuHandOpenLabel();
    }
  }

  if (resetBtn){
    resetBtn.addEventListener("click", ()=>{
      doReset();
    });
  }

  if (ukeireToggleBtn){
    ukeireToggleBtn.addEventListener("click", ()=>{
      isUkeireVisible = !isUkeireVisible;
      ukeireToggleBtn.textContent = `受け入れ：${isUkeireVisible ? "ON" : "OFF"}`;
      render();
    });
  }

  if (peiBtn){
    peiBtn.addEventListener("click", ()=>{
      if (typeof doPei === "function") doPei();
    });
  }

  if (ponBtn){
    ponBtn.addEventListener("click", ()=>{
      if (typeof choosePon === "function") choosePon(true);
    });
  }

  if (passBtn){
    passBtn.addEventListener("click", ()=>{
      if (typeof choosePass === "function") choosePass();
    });
  }

  if (kanBtn){
    kanBtn.addEventListener("click", ()=>{
      if (typeof doKan === "function") doKan();
      if (typeof chooseMinkan === "function") chooseMinkan(true);
    });
  }

  if (riichiBtn){
    riichiBtn.addEventListener("click", ()=>{
      if (typeof doRiichi === "function") doRiichi();
    });
  }

  if (ronBtn){
    ronBtn.addEventListener("click", ()=>{
      if (typeof chooseRon === "function") chooseRon(true);
    });
  }

  if (tsumoBtn){
    tsumoBtn.addEventListener("click", ()=>{
      if (typeof openTsumo === "function"){
        setPostAgariStageToOverlay();
        openTsumo();
      }
    });
  }

  // オーバーレイ：ツモ（クリックで卓確認画面へ）
  if (tsumoOverlay){
    tsumoOverlay.addEventListener("click", (ev)=>{
      // 卓クリックにバブルして即進行しないように止める
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      onAgariOverlayCloseToTable(()=>{ if (typeof closeTsumo === "function") closeTsumo(); });
    }, true);
  }

  // オーバーレイ：ロン（クリックで卓確認画面へ）
  if (ronOverlay){
    ronOverlay.addEventListener("click", (ev)=>{
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      onAgariOverlayCloseToTable(()=>{ if (typeof closeRon === "function") closeRon(); });
    }, true);
  }

  // オーバーレイ：流局（今は従来どおり卓確認へ）
  if (ryukyokuOverlay){
    ryukyokuOverlay.addEventListener("click", (ev)=>{
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      onAgariOverlayCloseToTable(()=>{ if (typeof closeRyukyoku === "function") closeRyukyoku(); });
    }, true);
  }

  // 結果確認画面（後から追加する新オーバーレイ）
  if (typeof resultOverlay !== "undefined" && resultOverlay){
    resultOverlay.addEventListener("click", (ev)=>{
      if (ev && typeof ev.stopPropagation === "function") ev.stopPropagation();
      if (__postAgariStage !== "result") return;
      movePostAgariFlowFromResultToNext();
    }, true);
  }

  // 卓クリックで進行
  bindTableClickFlowAfterAgari();
}

// ================================
// ★ 起動
// ================================
(function boot(){
  try{
    bindEvents();
    startNewHanchan();
  }catch(err){
    if (typeof showFatalError === "function") showFatalError(err, "boot()");
  }
})();