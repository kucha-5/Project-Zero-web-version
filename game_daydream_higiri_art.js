// Visual-only HIGIRI theme: original controls, rules and saves are preserved.
(function(g){
"use strict";
const D=g.PZDaydream;if(!D)return;
const paper="#d8cfb8",red="#b13a2f";
function sceneForPage(){
  if(this.page==="rest")return "rest";
  if(this.page==="result"||this.page==="defeat")return "boss";
  if(this.page!=="run"||!this.run)return "wau";
  const n=typeof this.currentNode==="function"?this.currentNode():null;
  if(!n)return "wau";
  if(n.type==="boss"||this.run.pursuerEncounter)return "boss";
  if(n.type==="battle")return (Number(this.run.difficultyId)||1)>=7?"elite":"battle";
  if(n.type==="safe")return "rest";
  if(n.type==="nightmare"||n.type==="portal")return "torii";
  if(n.type==="event"){
    const id=n.event&&n.event.id;
    if(id==="shrine")return "shrine";
    if(id==="canteen"||id==="hotel")return "shop";
    return "wau";
  }
  return "wau";
}
function frame(c,x,y,w,h,color){c.save();c.strokeStyle=color;c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);c.globalAlpha=.4;c.beginPath();c.moveTo(x+2,y+3);c.lineTo(x+w*.42,y+2);c.stroke();c.restore();}
function button(label,key,x,y,w,h,active=false,color=red){
const c=g.ctx;c.save();
// Original seventh argument means emphasis, not disabled.
c.fillStyle=active?"rgba(177,58,47,.24)":"rgba(216,207,184,.07)";c.fillRect(x,y,w,h);
frame(c,x,y,w,h,active?color:"rgba(216,207,184,.42)");
if(active){c.fillStyle=color;c.fillRect(x+1,y+1,3,h-2);}
const reserve=key?Math.min(64,w*.25):12;
c.fillStyle=paper;c.textAlign="center";c.textBaseline="middle";c.font="bold "+Math.max(12,Math.min(17,h*.32))+"px "+(g.FONT_UI||"sans-serif");
c.fillText(label,x+(w-reserve+12)/2,y+h/2,w-reserve-20);
if(key){c.textAlign="right";c.font="10px Arial";c.fillStyle="rgba(216,207,184,.65)";c.fillText(key,x+w-10,y+h/2,reserve-8);}c.restore();
}
function card(x,y,w,h,color=red,selected=false){
const c=g.ctx;c.save();c.fillStyle=selected?"rgba(177,58,47,.18)":"rgba(17,17,18,.78)";c.fillRect(x,y,w,h);
frame(c,x,y,w,h,selected?color:"rgba(216,207,184,.22)");c.fillStyle=color;c.globalAlpha=selected?.9:.55;c.fillRect(x+1,y+1,2,h-2);c.restore();
}
D.drawBasePanel=function(){
const c=g.ctx,W=g.W||1120,H=g.H||660;this.pulse+=.025;c.save();
if(g.PZHigiriVisual&&typeof g.PZHigiriVisual.drawScene==="function"){
  g.PZHigiriVisual.drawScene(c,W,H,sceneForPage.call(this),"sumi");
  c.fillStyle="rgba(8,9,12,.53)";c.fillRect(0,0,W,H);
}else{
  const bg=c.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#282623");bg.addColorStop(.55,"#191c20");bg.addColorStop(1,"#101113");c.fillStyle=bg;c.fillRect(0,0,W,H);
}
c.fillStyle="rgba(216,207,184,.045)";for(let i=0;i<180;i++)c.fillRect(28+i*79%(W-56),28+i*43%(H-56),1+i%3,1);
frame(c,28,28,W-56,H-56,"rgba(216,207,184,.16)");
c.fillStyle="rgba(216,207,184,.08)";c.fillRect(W-82,28,54,54);c.fillStyle=paper;c.textAlign="center";c.textBaseline="middle";c.font="24px "+(g.FONT_UI||"sans-serif");c.fillText("×",W-55,55);c.restore();
};
const drawPage=D.drawPage;
D.drawPage=function(){const prev=g.drawBtn,prevCard=g.uiCard;g.drawBtn=button;g.uiCard=card;try{return drawPage.apply(this,arguments);}finally{g.drawBtn=prev;g.uiCard=prevCard;}};
const drawStory=D.drawStoryScene;
D.drawStoryScene=function(){const result=drawStory.apply(this,arguments);if(this.storyScene){const c=g.ctx;c.save();c.fillStyle=red;c.fillRect(67,421,3,180);frame(c,66,420,(g.W||1120)-132,182,"rgba(216,207,184,.45)");c.restore();}return result;};
D.higiriArtPhase="PHASE1_BRUSH_UI_20261013_R3";
})(window);
