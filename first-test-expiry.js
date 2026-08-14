(function(){
  "use strict";

  // First Test release-only gate. Do not copy this file or its script tag into
  // the continuing development build.
  const CUTOFF_ISO="2026-08-20T12:00:00-07:00";
  const CUTOFF_AT=Date.parse(CUTOFF_ISO);
  const CLEANUP_MARKER="pz_first_test_local_save_removed_20260820_v1";

  function expired(){return Date.now()>=CUTOFF_AT;}

  function isLocalProgressKey(key){
    const value=String(key||"");
    return value==="project_zero_v25_save" ||
      value.startsWith("project_zero_v25_guest_save") ||
      value.startsWith("project_zero_v25_cloud_") ||
      value.startsWith("project_zero_pending_cloud_sync_") ||
      value==="project_zero_guest_session_active_v1" ||
      value==="project_zero_guest_migration_pending_uid";
  }

  function removeLocalProgress(){
    if(!expired())return {removed:0,expired:false};
    let removed=0;
    try{
      if(localStorage.getItem(CLEANUP_MARKER)==="1")return {removed:0,expired:true,alreadyRemoved:true};
      const keys=[];
      for(let index=0;index<localStorage.length;index++)keys.push(localStorage.key(index));
      for(const key of keys){
        if(isLocalProgressKey(key)){
          localStorage.removeItem(key);
          removed++;
        }
      }
      // This marker is not gameplay progress; it prevents repeated destructive
      // scans and is intentionally retained for this temporary release only.
      localStorage.setItem(CLEANUP_MARKER,"1");
    }catch(error){console.warn("[First Test] local save cleanup warning",error);}
    return {removed,expired:true};
  }

  function message(){
    const language=String(localStorage.getItem("project_zero_ui_language")||"").toLowerCase();
    return language==="en"
      ? "The test has ended. Thank you for playing."
      : "测试已结束，感谢您的游玩";
  }

  function showEndedMessage(){
    removeLocalProgress();
    let overlay=document.getElementById("pzFirstTestEnded");
    if(!overlay){
      overlay=document.createElement("div");
      overlay.id="pzFirstTestEnded";
      overlay.setAttribute("role","dialog");
      overlay.setAttribute("aria-modal","true");
      overlay.innerHTML='<div class="pz-first-test-ended-card"><div class="pz-first-test-ended-kicker">PROJECT ZERO · FIRST TEST</div><div class="pz-first-test-ended-title"></div><div class="pz-first-test-ended-date">2026.08.08 — 2026.08.20</div></div>';
      document.body.appendChild(overlay);
    }
    const title=overlay.querySelector(".pz-first-test-ended-title");
    if(title)title.textContent=message();
    overlay.classList.add("visible");
    return true;
  }

  function blockStartIfExpired(){
    if(!expired())return false;
    showEndedMessage();
    return true;
  }

  window.PZFirstTestExpiry={
    cutoffAt:CUTOFF_AT,
    cutoffIso:CUTOFF_ISO,
    isExpired:expired,
    removeLocalProgress,
    blockStartIfExpired,
    showEndedMessage
  };

  // Browsers cannot execute while the page is closed. Cleanup therefore runs
  // immediately on the first page load at or after the cutoff.
  if(expired())removeLocalProgress();
})();
