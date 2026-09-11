"use strict";

const params=new URL(self.location.href).searchParams;
const BUILD=params.get("build")||"stable";
const CACHE_NAME="project-zero-web-v3-"+BUILD;
const CORE_FILES=[
  "./","./index.html","./style.css","./version.json","./account-config.js","./pz-account-api.js","./update-client.js",
  "./locales.js","./story_scripts.js","./story_events.js","./story_engine.js",
  "./story_chapter0_zh.js","./story_chapter0_en.js","./story_chapter1_zh.js","./story_chapter1_en.js",
  "./story_chapter2_zh.js","./story_chapter2_en.js","./story_chapter3_zh.js","./story_chapter3_en.js","./story_expansion_v49322.js","./game_crystal_modules.js","./game.js",
  "./game_match3.js","./game_quality_update.js","./game_patrol.js","./game_side_story.js","./game_daydream.js","./game_daydream_title.js","./game_crystal_war.js",
  "./assets/ui/project_zero_logo.png","./assets/ui/kane_portrait.png","./assets/audio/bgm/login_theme.mp3",
  "./assets/audio/bgm/chapter0_operation.mp3","./assets/audio/bgm/chapter0_battle.mp3","./assets/audio/bgm/chapter0_boss.mp3",
  "./assets/audio/bgm/chapter1_operation.mp3","./assets/audio/bgm/chapter1_battle.mp3","./assets/audio/bgm/chapter1_boss.mp3",
  "./assets/audio/bgm/chapter2_operation.mp3","./assets/audio/bgm/chapter2_battle.mp3",
  "./assets/audio/bgm/chapter3_operation.mp3","./assets/audio/bgm/chapter3_battle.mp3",
  "./assets/audio/bgm/chapter3_part2_operation.mp3","./assets/audio/bgm/operation_world.mp3",
  "./assets/audio/bgm/last_safe_city.mp3","./assets/audio/bgm/skyglass_bazaar.mp3","./assets/audio/bgm/kros_battle.mp3"
];

self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await Promise.all(CORE_FILES.map(async url=>{
      try{const response=await fetch(url,{cache:"reload"});if(response.ok) await cache.put(url,response);}catch(_){/* individual optional resource */}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith("project-zero-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await caches.open(CACHE_NAME);
  try{
    const response=await fetch(request,{cache:"no-store"});
    if(response&&response.ok) await cache.put(request,response.clone());
    return response;
  }catch(error){
    const cached=await cache.match(request,{ignoreSearch:false})||await cache.match(request,{ignoreSearch:true});
    if(cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET") return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin) return;
  if(url.pathname.endsWith("/version.json")){
    event.respondWith(fetch(request,{cache:"no-store"}));
    return;
  }
  if(request.headers.has("range")&&/\.(?:mp3|ogg|wav|m4a)$/i.test(url.pathname)){
    event.respondWith((async()=>{
      try{return await fetch(request,{cache:"no-store"});}catch(error){
        const cache=await caches.open(CACHE_NAME);
        const full=await cache.match(url.href,{ignoreSearch:true});
        if(!full) throw error;
        const bytes=await full.arrayBuffer();
        const match=/bytes=(\d+)-(\d*)/i.exec(request.headers.get("range")||"");
        const start=match?Number(match[1]):0;
        const end=match&&match[2]?Math.min(Number(match[2]),bytes.byteLength-1):bytes.byteLength-1;
        return new Response(bytes.slice(start,end+1),{status:206,headers:{
          "Content-Type":full.headers.get("Content-Type")||"audio/mpeg",
          "Content-Range":"bytes "+start+"-"+end+"/"+bytes.byteLength,
          "Content-Length":String(end-start+1),"Accept-Ranges":"bytes"
        }});
      }
    })());
    return;
  }
  if(request.mode==="navigate"||/\.(?:js|css|html|json)$/i.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    const cached=await cache.match(request);
    if(cached) return cached;
    try{const response=await fetch(request);if(response&&response.ok) await cache.put(request,response.clone());return response;}catch(error){throw error;}
  })());
});
