// Phase-one art library. No enemies, timers, damage, rewards or save writes.
(function(g){
  "use strict";
  const colors={sakura:"#d98b9d",yamabuki:"#d6a52b",fuji:"#8d78a8",gunjo:"#315a78",shu:"#b13a2f",sumi:"#171513"};
  const scenes=["wau","shrine","torii","shop","rest","battle","elite","boss"];
  const cache=new Map();
  // Same faceted color blocks, bevel outlines and restrained highlights as PZ.
  // No raster asset loading and no generated artwork.
  function poly(c,points,fill,edge="#718494"){
    c.fillStyle=fill;c.strokeStyle=edge;c.lineWidth=1.5;c.lineJoin="bevel";
    c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));
    c.closePath();c.fill();c.stroke();
  }
  function stroke(c,points,color,width){
    c.save();c.strokeStyle=color;c.lineWidth=width;c.lineCap="butt";c.lineJoin="miter";
    c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();
    c.globalAlpha=.24;c.lineWidth=1;c.translate(2,-2);c.stroke();c.restore();
  }
  function gate(c,x,y,s){
    stroke(c,[[x-68*s,y-110*s],[x,y-105*s],[x+68*s,y-110*s]],colors.shu,10*s);
    stroke(c,[[x-55*s,y-88*s],[x+55*s,y-88*s]],colors.shu,5*s);
    for(const side of [-1,1])stroke(c,[[x+side*40*s,y-105*s],[x+side*44*s,y]],"#502e2c",9*s);
  }
  function shelter(c,x,y,s,shop=false){
    c.save();c.fillStyle="#161c22";c.beginPath();c.moveTo(x-85*s,y-60*s);c.lineTo(x,y-110*s);c.lineTo(x+85*s,y-60*s);c.lineTo(x+60*s,y-50*s);c.lineTo(x-60*s,y-50*s);c.closePath();c.fill();
    stroke(c,[[x-82*s,y-60*s],[x,y-106*s],[x+82*s,y-60*s]],"#6c6461",3*s);
    c.fillRect(x-54*s,y-53*s,108*s,53*s);
    for(const dx of [-42,0,42])stroke(c,[[x+dx*s,y-53*s],[x+dx*s,y]],"#62544a",3*s);
    if(shop){c.fillStyle="#99856a";for(let i=0;i<4;i++)c.fillRect(x+(-50+i*26)*s,y-50*s,23*s,21*s);c.fillStyle="#b79d66";c.fillRect(x-48*s,y-10*s,96*s,5*s);}
    c.restore();
  }
  function lantern(c,x,y,s=1,lit=true){
    stroke(c,[[x,y],[x,y-58*s]],"#313741",4*s);poly(c,[[x-10*s,y-58*s],[x+10*s,y-58*s],[x+14*s,y-38*s],[x-14*s,y-38*s]],lit?"#72533f":"#303744",lit?"#d6a52b":"#667481");
    if(lit){c.save();const glow=c.createRadialGradient(x,y-48*s,1,x,y-48*s,32*s);glow.addColorStop(0,"rgba(214,165,43,.28)");glow.addColorStop(1,"rgba(214,165,43,0)");c.fillStyle=glow;c.fillRect(x-34*s,y-82*s,68*s,68*s);c.restore();}
  }
  function crystalPillar(c,x,y,s=1,color="#315a78"){
    poly(c,[[x-19*s,y],[x-26*s,y-38*s],[x-7*s,y-84*s],[x+20*s,y-48*s],[x+16*s,y]],color,"#718da0");
    poly(c,[[x-7*s,y-84*s],[x-2*s,y-31*s],[x+20*s,y-48*s]],"rgba(124,171,192,.35)","rgba(161,196,210,.34)");
  }
  function paintScene(c,w,h,kind,tint){
    c.save();c.scale(w/1120,h/660);
    const sky=c.createLinearGradient(0,0,0,660);
    sky.addColorStop(0,"#141a2b");sky.addColorStop(.5,"#283143");sky.addColorStop(1,"#0c1420");
    c.fillStyle=sky;c.fillRect(0,0,1120,660);
    for(let layer=0;layer<3;layer++){
      const pts=[[0,365]];
      for(let x=0;x<=1200;x+=80)pts.push([x,155+layer*60+Math.sin(x*.009+layer*2)*38+(x%160?22:0)]);
      pts.push([1120,365]);
      poly(c,pts,["#20283b","#222d3e","#1b2937"][layer],"rgba(127,159,182,.10)");
    }
    poly(c,[[155,352],[965,352],[1110,660],[10,660]],"#142330","#374253");
    c.strokeStyle="rgba(144,176,195,.12)";c.lineWidth=1;
    for(let i=1;i<=7;i++){const y=352+i*i*6.2;stroke(c,[[155-(y-352)*.47,y],[965+(y-352)*.47,y]],"rgba(144,176,195,.12)",1);}
    for(let i=0;i<=8;i++)stroke(c,[[155+i*101.25,352],[10+i*137.5,660]],"rgba(144,176,195,.10)",1);
    for(const x of [70,1035]){
      poly(c,[[x,360],[x-18,331],[x-7,288],[x+19,324],[x+15,361]],"#315264","#77a9b8");
      poly(c,[[x-7,288],[x+1,332],[x+19,324]],"#52778b","#77a9b8");
      c.fillStyle="rgba(103,185,206,.08)";c.beginPath();c.ellipse(x,365,32,8,0,0,Math.PI*2);c.fill();
    }
    // Foreground geometry is a separate layer, never collision geometry.
    c.fillStyle="rgba(13,17,23,.22)";c.fillRect(0,0,1120,660);
    if(kind==="shrine"){shelter(c,150,352,1.45);gate(c,925,363,.75);lantern(c,755,365,.8);lantern(c,1040,365,.8);}
    if(kind==="torii"){gate(c,170,363,1.5);gate(c,945,360,1.15);lantern(c,360,372,.72,false);}
    if(kind==="shop"){shelter(c,170,358,1.45,true);shelter(c,950,352,1.1,true);lantern(c,710,366,.85);}
    if(kind==="rest"){shelter(c,155,359,1.2);stroke(c,[[885,380],[1030,380]],"#716b62",8);stroke(c,[[898,380],[898,405]],"#292a28",7);stroke(c,[[1015,380],[1015,405]],"#292a28",7);lantern(c,800,372,.78);}
    if(kind==="wau"){gate(c,140,347,.8);lantern(c,860,369,.75);crystalPillar(c,1015,366,.65,"#315a78");}
    if(kind==="battle"){
      poly(c,[[85,474],[126,422],[171,470],[148,507],[103,511]],"#243547","#577083");
      poly(c,[[950,475],[988,419],[1034,467],[1010,509],[968,510]],"#342f43","#776b8d");
      lantern(c,210,386,.72,false);lantern(c,905,386,.72,false);crystalPillar(c,72,408,.72,"#273b53");
    }
    if(kind==="elite"){gate(c,970,353,1.6);stroke(c,[[70,420],[115,295],[128,310],[104,426]],"#26252e",9);crystalPillar(c,180,397,1.0,"#523849");crystalPillar(c,870,395,.78,"#523849");lantern(c,755,375,.7,false);}
    if(kind==="boss"){
      gate(c,140,355,1.6);gate(c,980,355,1.6);
      c.strokeStyle="rgba(216,207,184,.15)";c.lineWidth=2;c.beginPath();c.ellipse(560,520,325,67,0,0,Math.PI*2);c.stroke();
      crystalPillar(c,345,415,1.35,"#512e3e");crystalPillar(c,775,415,1.35,"#512e3e");
      c.strokeStyle="rgba(177,58,47,.26)";c.lineWidth=3;for(let i=0;i<5;i++){c.beginPath();c.moveTo(560,515);c.lineTo(390+i*86,570+(i%2)*22);c.stroke();}
    }
    // Quiet playable ground, keeping actors and attack telegraphs readable.
    const floor=c.createLinearGradient(0,360,0,660);floor.addColorStop(0,"rgba(18,23,28,0)");floor.addColorStop(1,"rgba(10,13,18,.65)");c.fillStyle=floor;c.fillRect(0,360,1120,300);
    c.fillStyle=colors[tint]||colors.gunjo;c.globalAlpha=.10;c.fillRect(0,0,1120,660);c.restore();
  }
  function drawScene(c,w,h,kind="battle",tint="gunjo"){
    if(!scenes.includes(kind))kind="battle";
    const key=kind+":"+tint;
    let surface=cache.get(key);
    if(!surface){
      surface=document.createElement("canvas");surface.width=1120;surface.height=660;
      paintScene(surface.getContext("2d"),1120,660,kind,tint);
      if(cache.size>=4)cache.delete(cache.keys().next().value);
      cache.set(key,surface);
    }
    c.save();c.drawImage(surface,0,0,w,h);c.restore();
  }
  function drawCreature(c,id,x,y,height,state="normal",phase=1,pose={}){
    if(id!=="yaokai"&&id!=="ghosto")return false;
    if(state==="absent")return true; // Completely invisible, no hidden hitbox changes.
    const p=Math.max(0,Math.min(1,phase)),s=height/120;
    const t=Number(pose.time)||0,step=pose.moving?Math.sin(t*7)*5:0;
    c.save();c.translate(x,y);
    c.globalAlpha=state==="phased"?.28:state==="reappear"?p:1;
    if(state==="reappear"){c.beginPath();c.rect(-height*.65,-height*p,height*1.3,height*p);c.clip();}
    c.scale((pose.facing===-1?-1:1)*s,s);
    c.fillStyle="rgba(0,0,0,.28)";c.beginPath();c.ellipse(0,-3,28,6,0,0,Math.PI*2);c.fill();
    if(id==="yaokai"){
      // Grounded, split-legged silhouette, broad mask and asymmetric crystal arm.
      poly(c,[[-17,-40],[-23,-9+step],[-8,-7+step],[-2,-42]],"#263242");
      poly(c,[[4,-43],[9,-8-step],[24,-6-step],[19,-42]],"#263242");
      poly(c,[[-24,-80],[-31,-42],[-7,-29],[24,-39],[21,-77],[0,-89]],"#354053","#869bad");
      poly(c,[[0,-89],[-7,-29],[11,-35],[17,-76]],"#4a5a68","#718494");
      poly(c,[[-22,-78],[-37,-68],[-40,-42],[-29,-47],[-20,-61]],"#29384a");
      poly(c,[[20,-76],[32,-87],[45,-60],[37,-31],[23,-43]],"#49415c","#a290b5");
      poly(c,[[32,-87],[35,-58],[45,-60]],"#74617f","#b09bc1");
      poly(c,[[-19,-105],[-12,-117],[9,-116],[22,-103],[13,-82],[-11,-85]],"#b7bdc1","#e0e3dc");
      poly(c,[[-19,-105],[-30,-120],[-21,-93]],"#69536b","#b09bc1");
      poly(c,[[14,-108],[28,-119],[21,-95]],"#69536b","#b09bc1");
      stroke(c,[[-11,-100],[-3,-98]],colors.shu,3);stroke(c,[[5,-99],[13,-102]],colors.shu,3);
      poly(c,[[-4,-71],[4,-80],[10,-65],[2,-54]],"#b16b69","#d9a3a0");
    }else{
      // Floating narrow core, detached facets and long asymmetric wing panels.
      c.translate(0,Math.sin(t*2)*2);
      poly(c,[[-15,-92],[-30,-55],[-18,-28],[0,-13],[19,-36],[25,-67],[10,-96]],"#30384e","#9ba4c6");
      poly(c,[[0,-90],[-6,-30],[0,-13],[13,-46],[10,-96]],"#555779","#a49dc4");
      poly(c,[[-17,-82],[-43,-65],[-35,-35],[-47,-17],[-20,-31],[-7,-57]],"#38455e","#8ba9c4");
      poly(c,[[17,-84],[40,-71],[47,-43],[31,-55],[21,-35],[12,-62]],"#38455e","#8ba9c4");
      poly(c,[[-12,-110],[2,-120],[17,-107],[12,-89],[-9,-90]],"#616c82","#b7c9d6");
      c.fillStyle="#b3e4e8";c.fillRect(-6,-105,5,3);c.fillRect(6,-105,5,3);
      poly(c,[[-3,-75],[5,-84],[11,-69],[3,-56]],"#9282b6","#d3c5e5");
      for(let i=0;i<3;i++){const dx=-16+i*17,dy=-12+(i%2)*6;poly(c,[[dx,dy-6],[dx+4,dy],[dx,dy+6],[dx-4,dy]],"#53658b","#91a6bd");}
    }
    c.restore();return true;
  }
  function drawBoss(c,id,x,y,height,pose={}){
    const ids=["hundred_eye","silent_bell","mirror_shade","torii_maw","moonless"];if(!ids.includes(id))return false;
    const s=height/170,t=Number(pose.time)||0;c.save();c.translate(x,y+Math.sin(t*1.6)*2);c.scale((pose.facing===-1?-1:1)*s,s);
    c.fillStyle="rgba(0,0,0,.35)";c.beginPath();c.ellipse(0,2,58,11,0,0,Math.PI*2);c.fill();
    if(id==="hundred_eye"){
      poly(c,[[-52,-92],[-18,-132],[27,-125],[55,-83],[38,-30],[0,-12],[-42,-34]],"#343748","#9aa4b3");
      for(let i=0;i<5;i++){const a=-2.5+i*.48,ex=Math.cos(a)*33,ey=-76+Math.sin(a)*22;c.fillStyle=i===2?"#d6a52b":"#b13a2f";c.beginPath();c.ellipse(ex,ey,7,4,0,0,Math.PI*2);c.fill();}
      poly(c,[[28,-112],[62,-98],[73,-56],[48,-70]],"#51354d","#b18aa8");
    }else if(id==="silent_bell"){
      poly(c,[[-42,-25],[-55,-62],[-33,-122],[0,-145],[34,-121],[56,-61],[41,-25]],"#4a423d","#b9aa8a");
      poly(c,[[-28,-101],[0,-130],[29,-100],[36,-61],[-35,-61]],"#6b5e4d","#d6a52b");
      c.strokeStyle="#d6a52b";c.lineWidth=4;c.beginPath();c.arc(0,-66,55,0,Math.PI*2);c.stroke();stroke(c,[[0,-60],[0,-12]],"#c9b481",6);
    }else if(id==="mirror_shade"){
      poly(c,[[-54,-108],[0,-146],[54,-108],[42,-26],[0,-9],[-42,-26]],"#2d3145","#9b9fc7");
      poly(c,[[-28,-109],[0,-132],[30,-107],[23,-53],[0,-32],[-24,-54]],"#64708c","#c7d2e4");
      c.globalAlpha=.55;poly(c,[[-78,-86],[-55,-111],[-44,-32],[-68,-15]],"#504b72","#8d78a8");poly(c,[[78,-86],[55,-111],[44,-32],[68,-15]],"#504b72","#8d78a8");c.globalAlpha=1;
    }else if(id==="torii_maw"){
      stroke(c,[[-66,-128],[0,-122],[67,-128]],"#7f2928",13);stroke(c,[[-50,-103],[51,-103]],"#b13a2f",7);stroke(c,[[-42,-122],[-47,-20]],"#542324",11);stroke(c,[[42,-122],[47,-20]],"#542324",11);
      poly(c,[[-45,-94],[0,-116],[45,-94],[34,-44],[0,-13],[-35,-44]],"#242833","#aa6b68");
      poly(c,[[-25,-72],[0,-91],[26,-71],[0,-44]],"#07090d","#b13a2f");
    }else{
      poly(c,[[-54,-84],[-34,-128],[0,-149],[35,-128],[55,-84],[38,-24],[0,-8],[-39,-24]],"#202b3c","#7890a5");
      c.strokeStyle="#8fb9d8";c.lineWidth=5;c.beginPath();c.arc(0,-92,49,.18,Math.PI*1.75);c.stroke();c.fillStyle="#0b111c";c.beginPath();c.arc(13,-99,38,0,Math.PI*2);c.fill();
      for(let i=0;i<4;i++){const a=t*.35+i*Math.PI/2,px=Math.cos(a)*65,py=-72+Math.sin(a)*28;poly(c,[[px,py-9],[px+7,py],[px,py+9],[px-7,py]],"#315a78","#9ac2d7");}
    }
    c.restore();return true;
  }
  function drawEffect(c,w,h,effect,elapsed,player={x:w*.5,y:h*.7}){
    // Caller supplies preview time; this library NEVER schedules in-game effects.
    const duration=effect==="static"?.6:2;
    if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=duration)return;
    const p=elapsed/duration;c.save();
    if(effect==="static"){
      c.fillStyle="rgba(23,21,19,.72)";c.fillRect(0,0,w,h);
      for(let i=0;i<24;i++){c.fillStyle=Object.values(colors)[i%6];c.globalAlpha=.1+(i%3)*.07;c.fillRect((i*83)%w,((i*97+Math.floor(elapsed*18)*31)%h),w*.55,2+i%6);}
    }else if(effect==="blackout"){
      c.fillStyle="rgba(0,0,0,.94)";c.fillRect(0,0,w,h);c.strokeStyle="#d8cfb8";c.lineWidth=2;c.beginPath();c.ellipse(player.x,player.y-22,13,25,0,0,Math.PI*2);c.stroke();c.beginPath();c.arc(player.x,player.y-20,38,0,Math.PI*2);c.stroke();
    }else if(effect==="flicker"){
      // Slow dark pulses, deliberately no high-contrast white strobe.
      c.globalAlpha=.12+.22*(.5+.5*Math.cos(elapsed*Math.PI*2));c.fillStyle=colors.sumi;c.fillRect(0,0,w,h);
    }else if(effect==="decoys"){
      for(let i=0;i<3;i++)drawCreature(c,"ghosto",w*(.3+i*.2),h*.78,160,"phased");
    }else if(effect==="ranged"){
      const x=w*.72-(w*.44*p),y=h*.62+Math.sin(p*Math.PI)*20;
      stroke(c,[[x+30,y-4],[x,y],[x+18,y+8]],colors.fuji,4);
    }
    c.restore();
  }
  g.PZHigiriVisual={colors,scenes,drawScene,drawCreature,drawBoss,drawEffect,ready:()=>true};
})(window);
