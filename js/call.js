// MBsanma/js/call.js
// ========= call.js（鳴き：ロン/ポン/スキップ/明槓） =========
// 役割：鳴き判定・鳴き選択UI・鳴き実行（状態変更はここ）
//
// 優先度（簡易）：ロン ＞ 明槓 ＞ ポン
//
// 依存：hand13, drawn, melds, cpuLeftRiver, cpuRightRiver, isEnded, isRiichiSelecting, isRiichi
// 依存：ponBtn, ronBtn, passBtn, kanBtn, setBtnEnabled(), render(), calcShanten(), countsFromTiles()
// 依存：drawFromDeadWallForKan(), deadWall, doraIndicators, clearNewFlags()
//
// NOTE：ボタンは「カンボタン(kanBtn)」を鳴き中の明槓にも流用する。

let pendingCallResolver = null;

function openPonEffect(seatIndex = 0){
  if (!ponOverlay) return;

  const inner = ponOverlay.querySelector(".inner");
  const img = inner ? inner.querySelector("img") : null;

  ponOverlay.style.position = "fixed";
  ponOverlay.style.inset = "0";
  ponOverlay.style.display = "block";
  ponOverlay.style.pointerEvents = "none";
  ponOverlay.style.zIndex = "2500";
  ponOverlay.style.background = "transparent";

  if (inner){
    inner.style.position = "absolute";
    inner.style.left = "50%";
    inner.style.top = "50%";
    inner.style.transform = "translate(-50%, -50%) scale(1)";
    inner.style.transformOrigin = "center center";
    inner.style.opacity = "0";
    inner.style.filter = "drop-shadow(0 0 18px rgba(255,140,40,0.95)) drop-shadow(0 0 42px rgba(255,90,0,0.75))";
    inner.style.willChange = "transform, opacity";
    inner.style.animation = "none";
  }

  if (img){
    img.style.display = "block";
    img.style.width = "100%";
    img.style.height = "auto";
    img.style.userSelect = "none";
    img.draggable = false;
  }

  let x = "50%";
  let y = "78%";
  let w = "300px";

  if (seatIndex === 1){
    x = "82%";
    y = "58%";
    w = "260px";
  } else if (seatIndex === 2){
    x = "18%";
    y = "58%";
    w = "260px";
  }

  if (inner){
    inner.style.left = x;
    inner.style.top = y;
    inner.style.width = `min(${w}, 32vw)`;
    if (seatIndex === 0){
      inner.style.width = "min(300px, 38vw)";
    }

    void inner.offsetWidth;
    inner.animate(
      [
        { opacity: 0, transform: "translate(-50%, -50%) scale(0.72)" },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1.06)", offset: 0.38 },
        { opacity: 1, transform: "translate(-50%, -50%) scale(1.00)", offset: 0.72 },
        { opacity: 0, transform: "translate(-50%, -50%) scale(1.12)" }
      ],
      {
        duration: 900,
        easing: "ease-out",
        fill: "forwards"
      }
    );
  }

  setTimeout(()=>{
    if (!ponOverlay) return;
    ponOverlay.style.display = "none";
  }, 900);
}

// ================================
// ★ フリテン（河フリテンのみ）
// - 自分の河に「現在の待ち牌」が1枚でもあればロン不可
// - 状態フラグを持たずに純関数で判定する（1ファイル完結・安全優先）
// ================================
function getRonMachiCodesFromHand13(){
  // 「ロン前提」：hand13(13枚)に1枚足してアガリになる牌コード一覧
  // ※ melds.length を固定メンツ数として calcShanten -1 をアガリ扱い
  const base = Array.isArray(hand13) ? hand13.slice() : [];
  if (base.length === 0) return [];

  const fixedM = Array.isArray(melds) ? melds.length : 0;

  const set = new Set();

  // TILE_TYPES は core.js のグローバルを利用（無ければ安全側で空）
  if (typeof TILE_TYPES === "undefined" || !Array.isArray(TILE_TYPES)) return [];

  for (const code of TILE_TYPES){
    const tiles14 = base.slice();
    tiles14.push({ code });

    try{
      if (calcShanten(countsFromTiles(tiles14), fixedM) === -1){
        set.add(code);
      }
    }catch(e){
      // calcShanten が落ちたら、その牌は待ち候補に入れない（安全側）
    }
  }

  return Array.from(set);
}

function isRiverFuritenNow(){
  // 自分の河に「現在の待ち牌」があればフリテン
  if (!Array.isArray(river) || river.length === 0) return false;

  const machi = getRonMachiCodesFromHand13();
  if (!machi || machi.length === 0) return false;

  const s = new Set(machi);
  for (const t of river){
    if (t && s.has(t.code)) return true;
  }
  return false;
}


function canPlayerRonAgariByYaku(tile){
  if (!tile || !tile.code) return false;
  if (typeof getCurrentPlayerAgariYakuInfo !== "function") return true;

  try{
    const info = getCurrentPlayerAgariYakuInfo("ron", tile);
    if (!info || !info.isAgari) return false;
    if ((info.yakuman | 0) > 0) return true;
    return (info.han | 0) > 0;
  }catch(e){
    return false;
  }
}

function canPonOn(code){
  if (isEnded) return false;
  if (isRiichi) return false;           // 簡易：リーチ後は鳴けない（今の方針のまま）
  if (isRiichiSelecting) return false;
  if (drawn) return false;              // 自分のツモ中は鳴き扱いにしない
  const n = hand13.filter(t => t.code === code).length;
  return n >= 2;
}

function canMinkanOn(code){
  if (isEnded) return false;
  if (isRiichi) return false;           // 簡易：リーチ後は鳴けない（今の方針のまま）
  if (isRiichiSelecting) return false;
  if (drawn) return false;              // 自分のツモ中は鳴き扱いにしない
  const n = hand13.filter(t => t.code === code).length;
  return n >= 3;
}

function canRonOn(tile){
  if (isEnded) return false;
  if (isRiichiSelecting) return false;
  if (drawn) return false;              // 自分のツモ中はロン判定にしない
  if (!tile || !tile.code) return false;

  // ★ 河フリテン：今の待ち牌が自分の河に1枚でもあればロン不可
  // （待ち集合は hand13 から算出。tile.code でアガるかどうかはこの後で最終判定）
  try{
    if (isRiverFuritenNow()) return false;
  }catch(e){
    // 判定が落ちてもロンを許可すると危険なので、ここは「フリテン扱い（ロン不可）」に倒すと
    // 体験が悪い。今回は“判定失敗＝無視”で進める（レンダ落ちの方が致命なので安全運用）
  }

  const tiles14 = hand13.slice();
  tiles14.push({ code: tile.code });

  const fixedM = Array.isArray(melds) ? melds.length : 0;
  if (calcShanten(countsFromTiles(tiles14), fixedM) !== -1) return false;

  return canPlayerRonAgariByYaku(tile);
}

// ★常時表示なので「表示切替」はしない（enabledだけ制御する）
function renderCallButtons(){
  const inCall = !!pendingCall;
  const canPon = inCall ? !!pendingCall.canPon : false;
  const canRon = inCall ? !!pendingCall.canRon : false;
  const canMinkan = inCall ? !!pendingCall.canMinkan : false;

  setBtnEnabled(ponBtn, inCall && canPon);
  setBtnEnabled(ronBtn, inCall && canRon);
  setBtnEnabled(passBtn, inCall);
  // ★ 明槓はカンボタンで
  setBtnEnabled(kanBtn, inCall && canMinkan);
}

function beginCallPrompt(from, tile){
  if (pendingCall) return Promise.resolve("pass");
  if (!tile || !tile.code) return Promise.resolve("pass");

  const canPon = canPonOn(tile.code);
  const canRon = canRonOn(tile);
  const canMinkan = canMinkanOn(tile.code);

  if (!canPon && !canRon && !canMinkan) return Promise.resolve("pass");

  pendingCall = {
    type: "call",
    from,
    code: tile.code,
    canPon,
    canRon,
    canMinkan
  };

  render();

  return new Promise((resolve)=>{
    pendingCallResolver = resolve;
  });
}

function endCallPrompt(result){
  pendingCall = null;

  const r = pendingCallResolver;
  pendingCallResolver = null;

  render();

  if (typeof r === "function") r(result);
}

// =========================================================
// ★ turn.js が呼ぶ「鳴き判定の入口」
// - 以前のプロジェクトではこの名前で呼んでいた想定
// - これが無いと CPU 捨て牌後の鳴きUIが一切出ず、ポン/ロン/明槓ができない
// =========================================================
async function maybePromptCallOnDiscard(from, discardedTile){
  return await beginCallPrompt(from, discardedTile);
}

// ★ ポン成立後の「鳴き後打牌ターン」へ強制遷移（turn.js が無い/壊れてても安全側に寄せる）
function forceEnterCallDiscardTurnHard(){
  // 1) まずは turn.js の正規APIがあればそれを使う
  if (typeof forceEnterPlayerCallDiscardTurn === "function"){
    forceEnterPlayerCallDiscardTurn();
    return;
  }

  // 2) 無い場合でも、グローバルレキシカル変数へ直接アクセスを試みる
  try{
    if (typeof clearPlayerDrawTimer === "function") clearPlayerDrawTimer();
  }catch(e){}

  try{
    // ※ turn.js の top-level let でも、別scriptから同名identifierで参照できる（window経由は不可）
    if (typeof currentTurnSeatIndex !== "undefined") currentTurnSeatIndex = 0;
    if (typeof turnPhase !== "undefined") turnPhase = "CALL_DISCARD";
  }catch(e){}

  // 3) 念のため drawn は確実に消す（鳴き直後はツモ無し）
  try{ drawn = null; }catch(e){}
}

// ★ 明槓成立後は「嶺上ツモ → 自分の通常打牌」へ（ツモ有りDISCARD）
function forceEnterPlayerDiscardTurnAfterKanHard(){
  try{
    if (typeof clearPlayerDrawTimer === "function") clearPlayerDrawTimer();
  }catch(e){}

  try{
    if (typeof currentTurnSeatIndex !== "undefined") currentTurnSeatIndex = 0;
    if (typeof turnPhase !== "undefined") turnPhase = "DISCARD";
  }catch(e){}

}

function doRonWin(ronTile, from, opts = {}){
  if (isEnded) return;
  isEnded = true;

  try{
    if (typeof setPostAgariStageToOverlay === "function") setPostAgariStageToOverlay();
  }catch(e){}

  try{
    if (opts && opts.isChankan && typeof markCurrentWinContextChankan === "function") markCurrentWinContextChankan();
  }catch(e){}

  // ★ 勝者情報を記録（現状：ロンできるのは自分だけ）
  lastAgariWinnerSeatIndex = 0;
  lastAgariDiscarderSeatIndex = (from === "R") ? 1 : ((from === "L") ? 2 : null);
  lastAgariType = "ron";
  lastAgariRonTile = null;
  if (ronTile && ronTile.code){
    lastAgariRonTile = {
      code: ronTile.code,
      imgCode: ronTile.imgCode || ronTile.code
    };
  }

  hoveredTileId = null;
  clearNewFlags();
  render();

  if (typeof openRon === "function") openRon();
}

// ================================
// UIから呼ばれる（ポン / ロン / スキップ / 明槓）
// ================================

function choosePon(doIt){
  if (!pendingCall || pendingCall.type !== "call") return;
  if (!doIt){
    endCallPrompt("pass");
    return;
  }
  if (!pendingCall.canPon) return;

  const from = pendingCall.from;
  const code = pendingCall.code;

  try{ if (typeof clearAllIppatsuChances === "function") clearAllIppatsuChances(); }catch(e){}
  try{ if (typeof resetCurrentWinContext === "function") resetCurrentWinContext(); }catch(e){}

  // CPU河の最後の1枚を「鳴いた牌」として取り除く
  if (from === "R"){
    if (cpuRightRiver.length > 0) cpuRightRiver.pop();
  } else {
    if (cpuLeftRiver.length > 0) cpuLeftRiver.pop();
  }

  // 手牌から同一牌を2枚抜く
  let removed = 0;
  for (let i = hand13.length - 1; i >= 0 && removed < 2; i--){
    if (hand13[i].code === code){
      hand13.splice(i, 1);
      removed++;
    }
  }

  if (removed < 2){
    endCallPrompt("pass");
    return;
  }

  // 副露として保持（from付き）
  melds.push({ type: "pon", code, from });
  openPonEffect(0);
  try{ if (typeof markOpenCallOrKanThisKyoku === "function") markOpenCallOrKanThisKyoku(); }catch(e){}

  hoveredTileId = null;
  clearNewFlags();
  drawn = null;

  // ★★★ ここが本体：ポン成立時点で「自分の鳴き後打牌（ツモ無し）」へ必ず遷移させる ★★★
  forceEnterCallDiscardTurnHard();
  forceEnterCallDiscardTurnHard();

  // ★ ポン後は「切るまで」ツモ/カン/ペー等を封印
  mustDiscardAfterCall = true;

  endCallPrompt("pon");
}

function chooseMinkan(doIt){
  if (!pendingCall || pendingCall.type !== "call") return;
  if (!doIt){
    endCallPrompt("pass");
    return;
  }
  if (!pendingCall.canMinkan) return;

  const from = pendingCall.from;
  const code = pendingCall.code;

  try{ if (typeof clearAllIppatsuChances === "function") clearAllIppatsuChances(); }catch(e){}
  try{ if (typeof resetCurrentWinContext === "function") resetCurrentWinContext(); }catch(e){}

  // CPU河の最後の1枚を「鳴いた牌」として取り除く（明槓は捨て牌を使う）
  if (from === "R"){
    if (cpuRightRiver.length > 0) cpuRightRiver.pop();
  } else {
    if (cpuLeftRiver.length > 0) cpuLeftRiver.pop();
  }

  // 手牌から同一牌を3枚抜く
  let removed = 0;
  for (let i = hand13.length - 1; i >= 0 && removed < 3; i--){
    if (hand13[i].code === code){
      hand13.splice(i, 1);
      removed++;
    }
  }

  if (removed < 3){
    endCallPrompt("pass");
    return;
  }

  // 副露として保持（from付き）
  melds.push({ type: "minkan", code, from });
  if (typeof openKanEffect === "function") openKanEffect(0);
  try{ if (typeof markOpenCallOrKanThisKyoku === "function") markOpenCallOrKanThisKyoku(); }catch(e){}

  hoveredTileId = null;
  clearNewFlags();
  drawn = null;

  // ドラ追加
  // - 王牌18枚の固定帯ルールに従って追加する
  // - 0〜7   : 嶺上牌/北抜き補充
  // - 8〜12  : 表ドラ表示牌
  // - 13〜17 : 裏ドラ表示牌
  if (typeof pushNextKanDoraIndicatorsFromDeadWall === "function"){
    pushNextKanDoraIndicatorsFromDeadWall();
  }

  // 王牌から嶺上ツモ
  const t = drawFromDeadWallForKan();
  if (t){
    t.isNew = true;
    drawn = t;
    try{ if (typeof markCurrentWinContextRinshan === "function") markCurrentWinContextRinshan(); }catch(e){}
  }

  // 明槓後は通常DISCARDへ
  forceEnterPlayerDiscardTurnAfterKanHard();

  endCallPrompt("minkan");
}

// UIから呼ばれる（ロン）
function chooseRon(doIt){
  if (!pendingCall || pendingCall.type !== "call") return;
  if (!doIt){
    endCallPrompt("pass");
    return;
  }
  if (!pendingCall.canRon) return;

  const ronTile = {
    code: pendingCall.code,
    imgCode: pendingCall.code
  };

  const from = pendingCall.from;
  endCallPrompt("ron");
  doRonWin(ronTile, from);
}

// UIから呼ばれる（スキップ）
function choosePass(){
  if (!pendingCall || pendingCall.type !== "call") return;
  endCallPrompt("pass");
}