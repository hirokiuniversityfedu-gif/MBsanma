// ========= log_metrics.js（ログ簡易集計） =========
// 役割：
// - 正規化ログから最低限の件数集計を返す
// - 将来の分析画面の土台にする

(function(global){
  "use strict";

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function ensureCounter(map, key){
    const name = String(key || "");
    if (!name) return;
    map[name] = (Number(map[name]) || 0) + 1;
  }

  function summarizeLogs(normalizedLogs){
    const logs = safeArray(normalizedLogs);
    const out = {
      matchCount: logs.length,
      kyokuCount: 0,
      rowCount: 0,
      rawEventCount: 0,

      playerDrawCount: 0,
      playerDiscardCount: 0,
      playerRiichiCount: 0,
      playerPeiCount: 0,
      playerPonCount: 0,
      playerMinkanCount: 0,
      playerAnkanCount: 0,
      playerKakanCount: 0,
      playerAgariCount: 0,
      playerHojuCount: 0,
      playerCallPromptCount: 0,
      playerCallPassCount: 0,

      settlementCount: 0,
      ryukyokuCount: 0,

      cpuDiscardCount: 0,
      cpuOpenCount: 0,
      cpuDiscardShadowComparedCount: 0,
      cpuDiscardShadowAgreeCount: 0,
      cpuDiscardExecutionSourceCounts: {},
      cpuDiscardReasonTagCounts: {},
      cpuOpenReasonTagCounts: {}
    };

    logs.forEach((log)=>{
      const kyokus = safeArray(log && log.kyokus);
      out.kyokuCount += kyokus.length;
      kyokus.forEach((kyoku)=>{
        out.rowCount += Number(kyoku && kyoku.rowCount) || 0;
        out.rawEventCount += Number(kyoku && kyoku.rawEventCount) || 0;

        const rows = safeArray(kyoku && kyoku.rows);
        rows.forEach((row)=>{
          const kind = String(row && row.kind || "");
          const eventType = String(row && row.eventType || "");
          const seatIndex = Number.isInteger(row && row.seatIndex) ? row.seatIndex : null;
          const winnerSeatIndex = Number.isInteger(row && row.winnerSeatIndex) ? row.winnerSeatIndex : null;
          const discarderSeatIndex = Number.isInteger(row && row.discarderSeatIndex) ? row.discarderSeatIndex : null;

          if (kind === "cpu_discard"){
            out.cpuDiscardCount += 1;
            if (row && (row.shadowAgree === true || row.shadowAgree === false)){
              out.cpuDiscardShadowComparedCount += 1;
              if (row.shadowAgree === true) out.cpuDiscardShadowAgreeCount += 1;
            }
            if (row && row.executionSource){
              ensureCounter(out.cpuDiscardExecutionSourceCounts, row.executionSource);
            }
            if (row && row.reasonTag){
              ensureCounter(out.cpuDiscardReasonTagCounts, row.reasonTag);
            }
            return;
          }

          if (kind === "cpu_open"){
            out.cpuOpenCount += 1;
            if (row && row.reasonTag){
              ensureCounter(out.cpuOpenReasonTagCounts, row.reasonTag);
            }
            return;
          }

          if (kind !== "default") return;

          if (eventType === "draw" && seatIndex === 0) out.playerDrawCount += 1;
          if (eventType === "discard" && seatIndex === 0) out.playerDiscardCount += 1;
          if (eventType === "riichi" && seatIndex === 0) out.playerRiichiCount += 1;
          if (eventType === "pei" && seatIndex === 0) out.playerPeiCount += 1;
          if ((eventType === "pon" || eventType === "call_pon") && seatIndex === 0) out.playerPonCount += 1;
          if ((eventType === "minkan" || eventType === "call_minkan") && seatIndex === 0) out.playerMinkanCount += 1;
          if (eventType === "ankan" && seatIndex === 0) out.playerAnkanCount += 1;
          if (eventType === "kakan" && seatIndex === 0) out.playerKakanCount += 1;
          if (eventType === "call_prompt" && seatIndex === 0) out.playerCallPromptCount += 1;
          if (eventType === "call_pass" && seatIndex === 0) out.playerCallPassCount += 1;
          if (eventType === "ryukyoku_exhaustion") out.ryukyokuCount += 1;
          if (eventType === "settlement") out.settlementCount += 1;

          if (eventType === "agari_tsumo" && winnerSeatIndex === 0){
            out.playerAgariCount += 1;
          }else if (eventType === "agari_ron"){
            if (winnerSeatIndex === 0){
              out.playerAgariCount += 1;
            }else if (discarderSeatIndex === 0){
              out.playerHojuCount += 1;
            }
          }
        });
      });
    });

    out.playerFuroCount = out.playerPonCount + out.playerMinkanCount + out.playerKakanCount;
    out.playerActionCount = out.playerDiscardCount + out.playerPeiCount + out.playerFuroCount + out.playerRiichiCount;
    out.playerRiichiRate = out.kyokuCount > 0 ? out.playerRiichiCount / out.kyokuCount : 0;
    out.playerAgariRate = out.kyokuCount > 0 ? out.playerAgariCount / out.kyokuCount : 0;
    out.playerHojuRate = out.kyokuCount > 0 ? out.playerHojuCount / out.kyokuCount : 0;
    out.playerFuroRate = out.kyokuCount > 0 ? out.playerFuroCount / out.kyokuCount : 0;
    out.playerPassRate = out.playerCallPromptCount > 0 ? out.playerCallPassCount / out.playerCallPromptCount : 0;
    out.cpuDiscardShadowAgreeRate = out.cpuDiscardShadowComparedCount > 0
      ? out.cpuDiscardShadowAgreeCount / out.cpuDiscardShadowComparedCount
      : 0;

    return out;
  }

  global.MBSanmaLogMetrics = { summarizeLogs };
})(window);
