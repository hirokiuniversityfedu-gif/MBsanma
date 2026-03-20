// MBsanma/js/cpai.js
// ========= cpai.js（CPU打牌判断） =========

function countCpuImproveTiles(seatIndex, handCounts13, visibleCounts){
  let total = 0;

  for (let i = 0; i < TILE_TYPES.length; i++){
    if (handCounts13[i] >= 4) continue;

    const remain = 4 - (visibleCounts[i] | 0);
    if (remain <= 0) continue;

    const next = handCounts13.slice();
    next[i]++;

    try{
      if (calcShanten(next, 0) < calcShanten(handCounts13, 0)){
        total += remain;
      }
    }catch(e){}
  }

  return total;
}

function chooseCpuDiscardInfo(seatIndex, hand13Tiles, drawnTile){
  if (!Array.isArray(hand13Tiles)) return null;
  if (!drawnTile) return null;

  const tiles14 = hand13Tiles.slice();
  tiles14.push(drawnTile);

  let best = null;

  for (let i = 0; i < tiles14.length; i++){
    const discardTile = tiles14[i];
    if (!discardTile || !discardTile.code) continue;

    const after13 = tiles14.slice();
    after13.splice(i, 1);

    const counts13 = countsFromTiles(after13);
    const shantenAfter = calcShanten(counts13, 0);
    const visibleCounts = countVisibleForCpuSeat(seatIndex, after13);
    const improveCount = countCpuImproveTiles(seatIndex, counts13, visibleCounts);
    const isDrawnDiscard = !!drawnTile && discardTile.id === drawnTile.id;

    const info = {
      discardTile,
      discardIndex: i,
      after13,
      shantenAfter,
      improveCount,
      isDrawnDiscard,
      willRiichi: (shantenAfter === 0)
    };

    if (!best){
      best = info;
      continue;
    }

    if (info.shantenAfter < best.shantenAfter){
      best = info;
      continue;
    }

    if (info.shantenAfter > best.shantenAfter){
      continue;
    }

    if (info.improveCount > best.improveCount){
      best = info;
      continue;
    }

    if (info.improveCount < best.improveCount){
      continue;
    }

    if (info.isDrawnDiscard && !best.isDrawnDiscard){
      best = info;
      continue;
    }

    if (!info.isDrawnDiscard && best.isDrawnDiscard){
      continue;
    }

    const bestCode = best.discardTile && best.discardTile.code ? best.discardTile.code : "";
    const thisCode = info.discardTile && info.discardTile.code ? info.discardTile.code : "";

    if (thisCode > bestCode){
      best = info;
    }
  }

  return best;
}