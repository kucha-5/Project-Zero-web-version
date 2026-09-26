// Project Zero V41 Story Engine
// Independent visual-novel style story layer.
(function(global){
  "use strict";

  function pick(value, lang){
    if(value == null) return "";
    if(typeof value === "string") return value;
    return value[lang] || value.zh || value.en || "";
  }

  const portraitSources={
    "player":"assets/ui/hermit_portrait_display.png",
    "凯恩":"assets/ui/kane_portrait.png","Kane":"assets/ui/kane_portrait.png","艾洛":"assets/ui/ailo_portrait_display.png","Ailo":"assets/ui/ailo_portrait_display.png",
    "芙洛拉":"assets/ui/flora_portrait_display.png","Flora":"assets/ui/flora_portrait_display.png"
  },portraitCache={};
  function portraitKey(name){const n=String(name||"").trim();if(n==="{playerName}"||n==="隐者"||n==="Hermit"||n==="主角"||n==="Protagonist")return "player";return n;}
  function portraitFor(name){const src=portraitSources[portraitKey(name)];if(!src)return null;if(!portraitCache[src]){const img=new Image();img.src=src;portraitCache[src]=img;}return portraitCache[src];}
  Object.values(portraitSources).forEach(src=>{if(!portraitCache[src]){const img=new Image();img.src=src;portraitCache[src]=img;}});

  const Story = {
    active:false,
    id:null,
    index:0,
    choiceIndex:0,
    lang:"zh",
    lastBg:"black",

    start(id){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      if(!scripts[id]){
        console.warn("[PZStory] missing script:", id);
        return false;
      }
      this.active = true;
      this.id = id;
      this.index = 0;
      this.choiceIndex = 0;
      this.lastBg = "black";
      return true;
    },

    stop(){
      this.active = false;
      this.id = null;
      this.index = 0;
      this.choiceIndex = 0;
    },

    current(){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      const arr = scripts[this.id] || [];
      return arr[this.index] || null;
    },

    stepForward(){
      const scripts = global.PZ_STORY_SCRIPTS || {};
      const arr = scripts[this.id] || [];
      this.index++;
      if(this.index >= arr.length){
        this.stop();
      }
    },

    runEvents(){
      let guard = 0;
      while(this.active && guard++ < 20){
        const step = this.current();
        if(!step || !step.event) break;
        const fn = global.PZ_STORY_EVENTS && global.PZ_STORY_EVENTS[step.event];
        this.stepForward();
        if(typeof fn === "function") fn();
        else console.warn("[PZStory] missing event:", step.event);
      }
    },

    update(input){
      if(!this.active) return;
      this.lang = global.language === "en" ? "en" : "zh";
      this.runEvents();
      if(!this.active) return;

      const step = this.current();
      if(!step) { this.stop(); return; }
      if(step.bg) this.lastBg = step.bg;

      if(step.choice){
        if(input.up) this.choiceIndex = Math.max(0, this.choiceIndex - 1);
        if(input.down) this.choiceIndex = Math.min((step.choices || []).length - 1, this.choiceIndex + 1);

        if(input.clicked){
          const mx = input.mouseX, my = input.mouseY;
          const x = 760, y0 = 470, w = 285, h = 48, gap = 60;
          for(let i=0;i<(step.choices||[]).length;i++){
            const y = y0 + i * gap;
            if(mx >= x && mx <= x+w && my >= y && my <= y+h){
              this.choiceIndex = i;
              break;
            }
          }
        }

        if(input.clicked || input.enter || input.space){
          const choice = (step.choices || [])[this.choiceIndex];
          if(choice && choice.next){
            this.start(choice.next);
          }
        }
        return;
      }

      if(input.clicked || input.enter || input.space){
        this.stepForward();
      }
    },

    drawBg(ctx,W,H,bg){
      ctx.fillStyle = bg === "black" ? "#000" : "#080b12";
      ctx.fillRect(0,0,W,H);
    },

    drawPortraits(ctx,W,H,activeSpeaker){
      const scripts=global.PZ_STORY_SCRIPTS||{},arr=scripts[this.id]||[],step=this.current()||{},cast=[];
      for(const s of arr){const n=s&&(s.portrait||s.speaker),key=portraitKey(pick(n,this.lang));if(portraitFor(key)&&!cast.includes(key))cast.push(key);}
      this.drawPortraitCast(ctx,W,H,pick(step.portrait,this.lang)||activeSpeaker,cast);
    },
    drawPortraitCast(ctx,W,H,activeSpeaker,sceneCast=[]){
      const activeKey=portraitKey(activeSpeaker),cast=[];
      for(const name of [...sceneCast,activeKey]){const key=portraitKey(name);if(portraitFor(key)&&!cast.includes(key))cast.push(key);}
      if(!cast.length)return;const shown=cast.slice(0,4),slots=shown.length===1?[.5]:shown.length===2?[.24,.76]:shown.length===3?[.14,.5,.86]:[.08,.35,.65,.92];
      ctx.save();ctx.beginPath();ctx.rect(0,24,W,H-204);ctx.clip();shown.forEach((name,i)=>{const img=portraitFor(name);if(!img||!img.complete||!img.naturalWidth)return;const active=name===activeKey,targetH=H*(shown.length>2?.88:1.02),scale=targetH/img.naturalHeight,dw=img.naturalWidth*scale,dh=targetH,x=W*slots[i]-dw/2,y=30;ctx.save();ctx.globalAlpha=active?1:.28;ctx.filter=active?"brightness(1.12) saturate(1.08) drop-shadow(0 0 22px rgba(124,199,255,.34))":"brightness(.34) saturate(.48)";ctx.drawImage(img,x,y,dw,dh);ctx.restore();});ctx.restore();
    },

    wrap(ctx,text,x,y,maxWidth,lineHeight){
      const words = String(text).split("");
      let line = "";
      for(const ch of words){
        const test = line + ch;
        if(ctx.measureText(test).width > maxWidth && line){
          ctx.fillText(line,x,y);
          line = ch;
          y += lineHeight;
        }else{
          line = test;
        }
      }
      if(line) ctx.fillText(line,x,y);
    },

    drawButton(ctx,text,x,y,w,h,selected,color){
      ctx.fillStyle = selected ? "rgba(124,199,255,.22)" : "rgba(255,255,255,.07)";
      ctx.fillRect(x,y,w,h);
      ctx.strokeStyle = selected ? color : "rgba(255,255,255,.18)";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeRect(x,y,w,h);
      ctx.fillStyle = "#fff";
      ctx.font = "18px Arial, Microsoft YaHei, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text,x+w/2,y+31);
    },

    draw(ctx,W,H){
      if(!this.active) return;
      this.lang = global.language === "en" ? "en" : "zh";
      this.runEvents();
      if(!this.active) return;

      const step = this.current();
      if(!step) return;

      const bg = step.bg || this.lastBg || "black";
      this.lastBg = bg;
      this.drawBg(ctx,W,H,bg);

      const activeSpeaker=pick(step.speaker,this.lang);
      this.drawPortraits(ctx,W,H,activeSpeaker);

      ctx.fillStyle="rgba(0,0,0,.74)";
      ctx.fillRect(65,H-190,W-130,150);
      ctx.strokeStyle="rgba(255,255,255,.16)";
      ctx.strokeRect(65,H-190,W-130,150);

      ctx.textAlign="left";
      ctx.fillStyle="#ffe066";
      ctx.font="bold 24px Arial, Microsoft YaHei, sans-serif";
      ctx.fillText(activeSpeaker,95,H-146);

      ctx.fillStyle = step.keyword ? "#7cc7ff" : "#fff";
      ctx.font = (step.keyword ? "bold 32px " : "22px ") + "Arial, Microsoft YaHei, sans-serif";
      this.wrap(ctx,pick(step.text,this.lang),95,H-102,W-230,32);

      if(step.choice){
        const choices = step.choices || [];
        for(let i=0;i<choices.length;i++){
          this.drawButton(ctx,pick(choices[i].text,this.lang),760,470+i*60,285,48,this.choiceIndex===i,i===0?"#7cc7ff":"#ffe066");
        }
      }else{
        this.drawButton(ctx,this.lang==="en"?"NEXT":"继续",880,H-82,165,48,true,"#ffe066");
      }

      ctx.fillStyle="rgba(124,199,255,.85)";
      ctx.font="12px Arial, Microsoft YaHei, sans-serif";
      ctx.textAlign="left";
      ctx.fillText("V41 STORY MODULE",10,18);
    }
  };

  global.PZStory = Story;
})(window);
