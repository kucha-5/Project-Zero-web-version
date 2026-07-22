// Project Zero V41 Story Engine
// Independent visual-novel style story layer.
(function(global){
  "use strict";

  function pick(value, lang){
    if(value == null) return "";
    if(typeof value === "string") return value;
    return value[lang] || value.zh || value.en || "";
  }

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

      ctx.fillStyle="rgba(0,0,0,.74)";
      ctx.fillRect(65,H-190,W-130,150);
      ctx.strokeStyle="rgba(255,255,255,.16)";
      ctx.strokeRect(65,H-190,W-130,150);

      ctx.textAlign="left";
      ctx.fillStyle="#ffe066";
      ctx.font="bold 24px Arial, Microsoft YaHei, sans-serif";
      ctx.fillText(pick(step.speaker,this.lang),95,H-146);

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
