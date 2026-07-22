(function(){
  "use strict";

  const VERSION_URL="version.json";
  const BUILD_KEY="pz_runtime_build";
  const VERSION_KEY="pz_runtime_version";
  const MANIFEST_KEY="pz_runtime_manifest";
  const LOCAL_SCRIPTS=[
    "locales.js",
    "story_scripts.js","story_events.js","story_engine.js",
    "story_chapter0_zh.js","story_chapter0_en.js",
    "story_chapter1_zh.js","story_chapter1_en.js",
    "story_chapter2_zh.js","story_chapter2_en.js",
    "game_crystal_modules.js","game.js","game_match3.js",
    "game_patrol.js","game_side_story.js","game_daydream.js","game_daydream_title.js"
  ];
  const FIREBASE_SCRIPTS=[
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js"
  ];

  const screen=document.getElementById("bootScreen");
  const status=document.getElementById("bootStatus");
  const versionLabel=document.getElementById("bootVersion");
  const setStatus=(text,state)=>{
    if(status) status.textContent=text;
    if(screen){screen.classList.toggle("boot-update",state==="update");screen.classList.toggle("boot-error",state==="error");}
  };

  function readSavedManifest(){
    try{return JSON.parse(localStorage.getItem(MANIFEST_KEY)||"null");}catch(_){return null;}
  }

  async function fetchManifest(){
    const response=await fetch(VERSION_URL+"?t="+Date.now(),{cache:"no-store",headers:{"Accept":"application/json"}});
    if(!response.ok) throw new Error("VERSION_HTTP_"+response.status);
    const manifest=await response.json();
    if(!manifest||!manifest.build||!manifest.version) throw new Error("INVALID_VERSION_MANIFEST");
    return manifest;
  }

  function loadScript(src){
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      script.src=src;
      script.async=false;
      script.onload=resolve;
      script.onerror=()=>reject(new Error("SCRIPT_LOAD_FAILED: "+src));
      document.body.appendChild(script);
    });
  }

  async function installWorker(build){
    if(!("serviceWorker" in navigator)||location.protocol==="file:") return null;
    const registration=await navigator.serviceWorker.register("sw.js?build="+encodeURIComponent(build),{scope:"./",updateViaCache:"none"});
    await registration.update().catch(()=>{});
    return registration;
  }

  async function preflightRuntime(build){
    const suffix=build?"?build="+encodeURIComponent(build):"";
    await Promise.all(LOCAL_SCRIPTS.map(async src=>{
      const response=await fetch(src+suffix,{cache:"no-store"});
      if(!response.ok) throw new Error("RUNTIME_PREFLIGHT_FAILED: "+src+" / "+response.status);
    }));
  }

  async function loadRuntime(build){
    for(const src of FIREBASE_SCRIPTS) await loadScript(src);
    const suffix=build?"?build="+encodeURIComponent(build):"";
    for(const src of LOCAL_SCRIPTS) await loadScript(src+suffix);
  }

  function versionStaticStyle(build){
    if(!build) return;
    const style=document.querySelector('link[rel="stylesheet"][href^="style.css"]');
    if(style) style.href="style.css?build="+encodeURIComponent(build);
  }

  async function start(){
    const previousBuild=localStorage.getItem(BUILD_KEY)||"";
    let manifest=null;
    let online=true;
    try{
      manifest=await fetchManifest();
      localStorage.setItem(MANIFEST_KEY,JSON.stringify(manifest));
    }catch(error){
      online=false;
      manifest=readSavedManifest();
      console.warn("[ProjectZero Update] version check failed; using stable cache",error);
    }

    const build=manifest&&manifest.build?String(manifest.build):previousBuild;
    const version=manifest&&manifest.version?String(manifest.version):(localStorage.getItem(VERSION_KEY)||"OFFLINE");
    const updating=!!(online&&previousBuild&&build&&previousBuild!==build);
    window.PZ_UPDATE_INFO={manifest,build,version,online,updating};
    if(versionLabel){
      const headline=updating&&manifest&&manifest.changelog&&manifest.changelog[0]?"  /  "+manifest.changelog[0]:"";
      versionLabel.textContent="VERSION "+version+(online?headline:"  /  OFFLINE CACHE");
    }
    setStatus(updating?"SYNCING LATEST PROJECT ZERO BUILD":"VERIFYING GAME FILES",updating?"update":"");
    versionStaticStyle(build);

    let selectedBuild=build;
    try{
      await installWorker(selectedBuild||"stable");
      await preflightRuntime(selectedBuild);
    }catch(error){
      console.error("[ProjectZero Update] update preflight failed",error);
      if(previousBuild&&previousBuild!==selectedBuild){
        selectedBuild=previousBuild;
        setStatus("UPDATE FAILED — USING STABLE BUILD","error");
        await installWorker(selectedBuild).catch(()=>{});
        await preflightRuntime(selectedBuild);
      }else throw error;
    }

    try{
      await loadRuntime(selectedBuild);
      if(selectedBuild) localStorage.setItem(BUILD_KEY,selectedBuild);
      if(version) localStorage.setItem(VERSION_KEY,version);
      if(updating&&selectedBuild===build) localStorage.setItem("pz_last_update_notice",JSON.stringify({version,build,changelog:manifest.changelog||[],at:Date.now()}));
      window.dispatchEvent(new CustomEvent("pz-runtime-ready",{detail:window.PZ_UPDATE_INFO}));
    }catch(error){
      console.error("[ProjectZero Update] runtime start failed",error);
      setStatus(online?"UPDATE FAILED — RESTART TO RETRY":"OFFLINE CACHE UNAVAILABLE","error");
      if(versionLabel) versionLabel.textContent="CHECK CONNECTION AND RESTART";
    }
  }

  start();
})();
