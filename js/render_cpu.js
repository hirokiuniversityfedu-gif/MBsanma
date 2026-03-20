// ========= render_cpu.js（CPU描画専用） =========
// 依存：cpuLeftHandEl, cpuRightHandEl, cpuLeftRiverEl, cpuRightRiverEl
//      cpuLeftHand13, cpuRightHand13, cpuLeftRiver, cpuRightRiver
//      makeHaimenImg(), makeImgByCode()

function renderCpuHands(){
  const openAll = (typeof isCpuHandOpen !== "undefined") ? !!isCpuHandOpen : false;

  let winnerSeats = [];
  try{
    if (typeof window !== "undefined" && typeof window.getRonWinnerSeatIndexesFromQueue === "function"){
      winnerSeats = window.getRonWinnerSeatIndexesFromQueue();
    }
  }catch(e){}

  if (!Array.isArray(winnerSeats) || winnerSeats.length <= 0){
    winnerSeats =
      (typeof lastAgariWinnerSeatIndex !== "undefined" && lastAgariWinnerSeatIndex != null)
        ? [lastAgariWinnerSeatIndex]
        : [];
  }

  const ended =
    (typeof isEnded !== "undefined")
      ? !!isEnded
      : false;

  let ryukyokuTenpaiSeats = null;
  if (ended && lastAgariType === "ryukyoku"){
    try{
      if (typeof buildCurrentRoundSettlement === "function"){
        const settlement = buildCurrentRoundSettlement();
        if (settlement && Array.isArray(settlement.tenpaiSeats)){
          ryukyokuTenpaiSeats = settlement.tenpaiSeats.slice();
        }
      }
    }catch(e){}
  }

  const openLeft = openAll
    || (ended && Array.isArray(winnerSeats) && winnerSeats.includes(2))
    || (ended && lastAgariType === "ryukyoku" && Array.isArray(ryukyokuTenpaiSeats) && ryukyokuTenpaiSeats.includes(2));

  const openRight = openAll
    || (ended && Array.isArray(winnerSeats) && winnerSeats.includes(1))
    || (ended && lastAgariType === "ryukyoku" && Array.isArray(ryukyokuTenpaiSeats) && ryukyokuTenpaiSeats.includes(1));

  const leftDrawnTile =
    (typeof getCpuDrawnTileBySeat === "function")
      ? getCpuDrawnTileBySeat(2)
      : null;

  const rightDrawnTile =
    (typeof getCpuDrawnTileBySeat === "function")
      ? getCpuDrawnTileBySeat(1)
      : null;

  // 左CPU 手牌
  if (cpuLeftHandEl){
    cpuLeftHandEl.innerHTML = "";
    const nL = Array.isArray(cpuLeftHand13) ? cpuLeftHand13.length : 0;

    for (let i = 0; i < nL; i++){
      const t = cpuLeftHand13[i];
      cpuLeftHandEl.appendChild(openLeft ? makeImgByCode(t.code) : makeHaimenImg());
    }

    if (leftDrawnTile){
      const img = openLeft ? makeImgByCode(leftDrawnTile.code) : makeHaimenImg();
      img.classList.add("cpuDrawnTile");
      cpuLeftHandEl.appendChild(img);
    }
  }

  // 右CPU 手牌
  if (cpuRightHandEl){
    cpuRightHandEl.innerHTML = "";
    const nR = Array.isArray(cpuRightHand13) ? cpuRightHand13.length : 0;

    for (let i = 0; i < nR; i++){
      const t = cpuRightHand13[i];
      cpuRightHandEl.appendChild(openRight ? makeImgByCode(t.code) : makeHaimenImg());
    }

    if (rightDrawnTile){
      const img = openRight ? makeImgByCode(rightDrawnTile.code) : makeHaimenImg();
      img.classList.add("cpuDrawnTile");
      cpuRightHandEl.appendChild(img);
    }
  }
}

function renderCpuRivers(){
  const leftDeclareId =
    (typeof getCpuRiichiDisplayTileIdBySeat === "function")
      ? getCpuRiichiDisplayTileIdBySeat(2)
      : null;

  const rightDeclareId =
    (typeof getCpuRiichiDisplayTileIdBySeat === "function")
      ? getCpuRiichiDisplayTileIdBySeat(1)
      : null;

  // 左CPU 河
  if (cpuLeftRiverEl){
    cpuLeftRiverEl.innerHTML = "";
    if (Array.isArray(cpuLeftRiver)){
      for (const t of cpuLeftRiver){
        const img = makeImgByCode(t.code);
        if (t && t.id === leftDeclareId){
          img.classList.add("riichiDeclare");
        }
        cpuLeftRiverEl.appendChild(img);
      }
    }
  }

  // 右CPU 河
  if (cpuRightRiverEl){
    cpuRightRiverEl.innerHTML = "";
    if (Array.isArray(cpuRightRiver)){
      for (const t of cpuRightRiver){
        const img = makeImgByCode(t.code);
        if (t && t.id === rightDeclareId){
          img.classList.add("riichiDeclare");
        }
        cpuRightRiverEl.appendChild(img);
      }
    }
  }
}

function renderCpu(){
  renderCpuHands();
  renderCpuRivers();
}