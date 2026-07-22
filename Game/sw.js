"use strict";

const params=new URL(self.location.href).searchParams;
const BUILD=params.get("build")||"stable";
const CACHE_NAME="project-zero-runtime-"+BUILD;
const CORE_FILES=[
  "./","./index.html","./style.css","./version.json","./update-client.js",
  "./locales.js","./story_scripts.js","./story_events.js","./story_engine.js",
  "./story_chapter0_zh.js","./story_chapter0_en.js","./story_chapter1_zh.js","./story_chapter1_en.js",
  "./story_chapter2_zh.js","./story_chapter2_en.js","./game_crystal_modules.js","./game.js",
  "./game_match3.js","./game_patrol.js","./game_side_story.js","./game_daydream.js","./game_daydream_title.js",
  "./assets/ui/project_zero_logo.png"
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
    await Promise.all(keys.filter(key=>key.startsWith("project-zero-runtime-")&&key!==CACHE_NAME).map(key=>caches.delete(key)));
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
  if(request.mode==="navigate"||/\.(?:js|css|html)$/i.test(url.pathname)){
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
