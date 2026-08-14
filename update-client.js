(function(){
  "use strict";

  const VERSION_URL="version.json";
  const LOCAL_VERSION="49.19.11";
  const LOCAL_BUILD="20260813-web-audio-range-fix";
  const FILE_RUNTIME=location.protocol==="file:";
  const BUILD_KEY="pz_runtime_build";
  const VERSION_KEY="pz_runtime_version";
  const MANIFEST_KEY="pz_runtime_manifest";
  const MANIFEST_TIMEOUT_MS=6500;

  // Only these files are required for the main canvas runtime. Feature modules
  // are isolated below so one incomplete GitHub upload cannot block the game.
  const REQUIRED_BEFORE_GAME=["locales.js","game_crystal_modules.js"];
  const OPTIONAL_BEFORE_GAME=[
    "story_scripts.js","story_events.js","story_engine.js",
    "story_chapter0_zh.js","story_chapter0_en.js",
    "story_chapter1_zh.js","story_chapter1_en.js",
    "story_chapter2_zh.js","story_chapter2_en.js"
  ];
  const REQUIRED_GAME="game.js";
  const OPTIONAL_AFTER_GAME=[
    "game_match3.js","game_quality_update.js","game_patrol.js",
    "game_side_story.js","game_daydream.js","game_daydream_title.js"
  ];

  const screen=document.getElementById("bootScreen");
  const status=document.getElementById("bootStatus");
  const versionLabel=document.getElementById("bootVersion");
  const detail=document.getElementById("bootDetail");
  const actions=document.getElementById("bootActions");
  const retryButton=document.getElementById("bootRetry");
  const resetButton=document.getElementById("bootReset");

  const setStatus=(text,state="")=>{
    if(status) status.textContent=text;
    if(screen){
      screen.classList.toggle("boot-update",state==="update");
      screen.classList.toggle("boot-error",state==="error");
    }
  };

  function setDetail(text){if(detail) detail.textContent=String(text||"");}
  function showRecovery(show){if(actions) actions.classList.toggle("hidden",!show);}

  function withTimeout(promise,ms,label){
    let timer;
    return Promise.race([
      promise,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(label+"_TIMEOUT")),ms);})
    ]).finally(()=>clearTimeout(timer));
  }

  function readSavedManifest(){
    try{return JSON.parse(localStorage.getItem(MANIFEST_KEY)||"null");}catch(_){return null;}
  }

  async function fetchManifest(){
    const request=fetch(VERSION_URL+"?buildCheck="+Date.now(),{
      cache:"no-store",
      headers:{"Accept":"application/json"}
    });
    const response=await withTimeout(request,MANIFEST_TIMEOUT_MS,"VERSION_REQUEST");
    if(!response.ok) throw new Error("VERSION_HTTP_"+response.status);
    const manifest=await response.json();
    if(!manifest||!manifest.build||!manifest.version) throw new Error("INVALID_VERSION_MANIFEST");
    return manifest;
  }

  function loadScript(src,timeoutMs=20000){
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      let settled=false;
      const finish=(error)=>{
        if(settled) return;
        settled=true;
        clearTimeout(timer);
        script.onload=null;
        script.onerror=null;
        if(error){script.remove();reject(error);}else resolve(src);
      };
      const timer=setTimeout(()=>finish(new Error("SCRIPT_LOAD_TIMEOUT: "+src)),timeoutMs);
      script.src=src;
      script.async=false;
      script.onload=()=>finish();
      script.onerror=()=>finish(new Error("SCRIPT_LOAD_FAILED: "+src));
      document.body.appendChild(script);
    });
  }

  function scriptUrl(src,build){
    return src+(build?"?build="+encodeURIComponent(build):"");
  }

  async function loadOptionalList(files,build,failures){
    for(const src of files){
      try{await loadScript(scriptUrl(src,build));}
      catch(error){
        failures.push(src);
        console.warn("[ProjectZero Boot] optional module unavailable:",src,error);
      }
    }
  }

  async function loadRuntime(build){
    const optionalFailures=[];
    for(const src of REQUIRED_BEFORE_GAME) await loadScript(scriptUrl(src,build));
    await loadOptionalList(OPTIONAL_BEFORE_GAME,build,optionalFailures);
    await loadScript(scriptUrl(REQUIRED_GAME,build),30000);
    await loadOptionalList(OPTIONAL_AFTER_GAME,build,optionalFailures);
    return optionalFailures;
  }

  function versionStaticStyle(build){
    if(!build) return;
    const style=document.querySelector('link[rel="stylesheet"][href^="style.css"]');
    if(style) style.href="style.css?build="+encodeURIComponent(build);
  }

  async function installWorkerLater(build){
    if(!("serviceWorker" in navigator)||FILE_RUNTIME) return;
    try{
      const registration=await navigator.serviceWorker.register(
        "sw.js?build="+encodeURIComponent(build||LOCAL_BUILD),
        {scope:"./",updateViaCache:"none"}
      );
      registration.update().catch(()=>{});
    }catch(error){
      // Offline caching is an enhancement, never a boot requirement.
      console.warn("[ProjectZero Boot] service worker unavailable",error);
    }
  }

  async function clearRuntimeCaches(){
    try{
      if("serviceWorker" in navigator){
        const registrations=await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration=>registration.unregister()));
      }
      if("caches" in window){
        const keys=await caches.keys();
        await Promise.all(keys.filter(key=>key.startsWith("project-zero-")).map(key=>caches.delete(key)));
      }
    }catch(error){
      console.warn("[ProjectZero Boot] cache reset warning",error);
    }
    for(const key of [BUILD_KEY,VERSION_KEY,MANIFEST_KEY]) localStorage.removeItem(key);
  }

  function friendlyError(error){
    const message=String(error&&error.message||error||"");
    if(message.includes("game.js")) return "核心游戏文件 game.js 未成功加载，请确认它位于仓库根目录。";
    if(message.includes("locales.js")) return "语言资源 locales.js 未成功加载。";
    if(message.includes("game_crystal_modules.js")) return "养成模块 game_crystal_modules.js 未成功加载。";
    return "必要文件未能加载。请重试；若刚更新 GitHub，请等待 Pages 部署完成。";
  }

  let starting=false;
  async function start(){
    if(starting) return;
    starting=true;
    showRecovery(false);
    setDetail("");
    setStatus("CHECKING PROJECT ZERO BUILD");

    const previousBuild=localStorage.getItem(BUILD_KEY)||"";
    const previousVersion=localStorage.getItem(VERSION_KEY)||LOCAL_VERSION;
    let manifest=null;
    let online=true;
    try{
      if(FILE_RUNTIME) throw new Error("DESKTOP_LOCAL_RUNTIME");
      manifest=await fetchManifest();
      localStorage.setItem(MANIFEST_KEY,JSON.stringify(manifest));
    }catch(error){
      online=false;
      manifest=FILE_RUNTIME
        ? {version:LOCAL_VERSION,build:LOCAL_BUILD,changelog:[]}
        : (readSavedManifest()||{version:LOCAL_VERSION,build:LOCAL_BUILD,changelog:[]});
      console.warn("[ProjectZero Boot] online version check unavailable; loading packaged build",error);
    }

    const build=String(manifest.build||LOCAL_BUILD);
    const version=String(manifest.version||previousVersion||LOCAL_VERSION);
    const updating=!!(online&&previousBuild&&previousBuild!==build);
    window.PZ_UPDATE_INFO={manifest,build,version,online,updating};
    if(versionLabel){
      versionLabel.textContent="VERSION "+version+"  /  BUILD "+build+(online?"":"  /  OFFLINE");
    }
    setStatus(updating?"LOADING LATEST PROJECT ZERO BUILD":"LOADING PROJECT ZERO",updating?"update":"");
    versionStaticStyle(build);

    try{
      const optionalFailures=await loadRuntime(build);
      localStorage.setItem(BUILD_KEY,build);
      localStorage.setItem(VERSION_KEY,version);
      if(updating){
        localStorage.setItem("pz_last_update_notice",JSON.stringify({
          version,build,changelog:manifest.changelog||[],at:Date.now()
        }));
      }
      window.PZ_UPDATE_INFO={manifest,build,version,online,updating,optionalFailures};
      window.dispatchEvent(new CustomEvent("pz-runtime-ready",{detail:window.PZ_UPDATE_INFO}));
      installWorkerLater(build);
      if(optionalFailures.length){
        console.warn("[ProjectZero Boot] started with optional modules disabled:",optionalFailures);
      }
    }catch(error){
      console.error("[ProjectZero Boot] required runtime failed",error);
      setStatus("PROJECT ZERO COULD NOT START","error");
      setDetail(friendlyError(error));
      if(versionLabel) versionLabel.textContent="VERSION "+version+"  /  REQUIRED FILE MISSING";
      showRecovery(true);
    }finally{
      starting=false;
    }
  }

  if(retryButton) retryButton.addEventListener("click",()=>location.reload());
  if(resetButton) resetButton.addEventListener("click",async()=>{
    resetButton.disabled=true;
    setStatus("CLEARING OLD WEB CACHE","update");
    await clearRuntimeCaches();
    location.reload();
  });

  start();
})();
