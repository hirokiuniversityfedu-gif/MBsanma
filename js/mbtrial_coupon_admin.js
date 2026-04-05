(function(){
  "use strict";

  function $(id){
    return document.getElementById(id);
  }

  function formatDateTime(value){
    try{
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return "—";
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
    }catch(e){
      return "—";
    }
  }

  function getStatusLabel(status, expiresAt){
    if (status === "used") return "使用済み";
    const expires = Date.parse(expiresAt || "");
    if (Number.isFinite(expires) && Date.now() > expires) return "期限切れ";
    return "未使用";
  }

  function getStatusClass(status, expiresAt){
    if (status === "used") return "is-used";
    const expires = Date.parse(expiresAt || "");
    if (Number.isFinite(expires) && Date.now() > expires) return "is-expired";
    return "is-unused";
  }

  function setMessage(text, isError){
    const el = $("couponAdminMessage");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("is-error", !!isError);
  }

  function setBusy(busy){
    [$("couponCodeInput"), $("searchCouponBtn"), $("markCouponUsedBtn")].forEach((el)=>{
      if (el) el.disabled = !!busy;
    });
  }

  function renderCoupon(coupon){
    const root = $("couponAdminResult");
    const markBtn = $("markCouponUsedBtn");
    if (!root || !markBtn) return;

    if (!coupon || !coupon.code){
      root.innerHTML = `
        <div class="adminEmptyCard">
          <div class="adminEmptyTitle">クーポンが見つかりません</div>
          <div class="adminEmptyText">コードを入力して「検索」を押してください。</div>
        </div>
      `;
      markBtn.hidden = true;
      return;
    }

    const statusLabel = getStatusLabel(coupon.status, coupon.expiresAt);
    const statusClass = getStatusClass(coupon.status, coupon.expiresAt);

    root.innerHTML = `
      <div class="adminCouponHero">
        <div>
          <div class="adminCouponRank">${coupon.rankLabel}</div>
          <div class="adminCouponReward">${coupon.rewardText}</div>
        </div>
        <div class="adminCouponStatus ${statusClass}">${statusLabel}</div>
      </div>

      <div class="adminCouponCodeBox">
        <div class="adminCouponCodeLabel">クーポンコード</div>
        <div class="adminCouponCodeValue">${coupon.code}</div>
      </div>

      <div class="adminMetaGrid">
        <div class="adminMetaItem">
          <div class="adminMetaLabel">発行日</div>
          <div class="adminMetaValue">${formatDateTime(coupon.issuedAt)}</div>
        </div>
        <div class="adminMetaItem">
          <div class="adminMetaLabel">有効期限</div>
          <div class="adminMetaValue">${formatDateTime(coupon.expiresAt)}</div>
        </div>
        <div class="adminMetaItem">
          <div class="adminMetaLabel">端末ID</div>
          <div class="adminMetaValue adminMetaValueSmall">${coupon.deviceId || "—"}</div>
        </div>
        <div class="adminMetaItem">
          <div class="adminMetaLabel">使用日時</div>
          <div class="adminMetaValue">${coupon.usedAt ? formatDateTime(coupon.usedAt) : "—"}</div>
        </div>
      </div>
    `;

    markBtn.hidden = false;
    markBtn.dataset.couponCode = coupon.code;
    markBtn.disabled = (statusLabel !== "未使用");
  }

  async function searchCoupon(){
    const input = $("couponCodeInput");
    const code = String(input && input.value || "").trim().toUpperCase();
    if (!code){
      setMessage("クーポンコードを入力してください。", true);
      renderCoupon(null);
      return;
    }
    if (!window.MBTrialCouponApi || !window.MBTrialCouponApi.isConfigured()){
      setMessage("Supabase設定が未完了です。", true);
      return;
    }

    setBusy(true);
    setMessage("検索中...", false);
    try{
      const result = await window.MBTrialCouponApi.fetchCouponByCode(code);
      if (result.error){
        setMessage(`検索に失敗しました: ${result.error.message || result.error}`, true);
        renderCoupon(null);
        return;
      }
      if (!result.coupon){
        setMessage("クーポンが見つかりませんでした。", true);
        renderCoupon(null);
        return;
      }
      renderCoupon(result.coupon);
      setMessage("クーポンを読み込みました。", false);
    }catch(error){
      setMessage(`検索に失敗しました: ${error && error.message ? error.message : error}`, true);
      renderCoupon(null);
    }finally{
      setBusy(false);
    }
  }

  async function useCoupon(){
    const btn = $("markCouponUsedBtn");
    const code = String(btn && btn.dataset.couponCode || "").trim();
    if (!code){
      setMessage("先にクーポンを検索してください。", true);
      return;
    }
    if (!window.MBTrialCouponApi || !window.MBTrialCouponApi.isConfigured()){
      setMessage("Supabase設定が未完了です。", true);
      return;
    }

    setBusy(true);
    setMessage("使用済みに更新中...", false);
    try{
      const result = await window.MBTrialCouponApi.markCouponUsed(code);
      if (result.error){
        setMessage(`更新に失敗しました: ${result.error.message || result.error}`, true);
        return;
      }
      renderCoupon(result.coupon);
      setMessage("使用済みに更新しました。", false);
    }catch(error){
      setMessage(`更新に失敗しました: ${error && error.message ? error.message : error}`, true);
    }finally{
      setBusy(false);
    }
  }

  function boot(){
    const searchBtn = $("searchCouponBtn");
    const useBtn = $("markCouponUsedBtn");
    const input = $("couponCodeInput");

    if (searchBtn) searchBtn.addEventListener("click", searchCoupon);
    if (useBtn) useBtn.addEventListener("click", useCoupon);
    if (input){
      input.addEventListener("keydown", (ev)=>{
        if (ev.key === "Enter"){
          ev.preventDefault();
          searchCoupon();
        }
      });
    }

    renderCoupon(null);
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  }else{
    boot();
  }
})();
