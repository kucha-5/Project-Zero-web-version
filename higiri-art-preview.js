(function(){
 "use strict";
 const c=document.getElementById("stage").getContext("2d"),art=window.PZHigiriVisual;
 const scene=document.getElementById("scene"),tint=document.getElementById("tint"),state=document.getElementById("state");
 let effect="",started=0,reappear=performance.now(),cycle=false,nextCycle=Infinity;
 document.getElementById("effects").addEventListener("click",e=>{if(e.target.dataset.effect){effect=e.target.dataset.effect;started=performance.now();}});
 document.getElementById("cycle").addEventListener("click",e=>{cycle=!cycle;nextCycle=performance.now()+20000;e.target.textContent=cycle?"20秒循环：开 / 20s cycle: ON":"20秒循环：关 / 20s cycle: OFF";});
 state.addEventListener("change",()=>reappear=performance.now());
 function frame(t){
   art.drawScene(c,1120,660,scene.value,tint.value);
   art.drawCreature(c,"yaokai",410,562,150,state.value,(t-reappear)/900,{time:t/1000});
   art.drawCreature(c,"ghosto",755,545,145,"normal",1,{time:t/1000});
   c.fillStyle="#d8cfb8";c.textAlign="center";c.font="16px system-ui";c.fillText("YAOKAI · 妖怪",410,602);c.fillText("GHOSTO · 鬼",755,602);
   if(cycle&&t>=nextCycle){effect="static";started=t;nextCycle=t+20000;}
   art.drawEffect(c,1120,660,effect,(t-started)/1000);
   document.getElementById("status").textContent=art.ready()?"素材已加载 · 无战斗判定 / Assets loaded · no gameplay logic":"素材载入中；若持续显示，请检查 assets/higiri / Loading assets…";
   requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
})();
