// Project Zero V46.4 Side Story Separate Tab
// Placeholder only. No categories, no Hizan, no story content.
(function(global){
  "use strict";

  function T(zh,en){ return global.language === "en" ? en : zh; }

  const SideStory = {
    popup:false,
    pulse:0,

    draw(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      this.pulse += 0.035;

      ctx.save();

      // simple background distinct from Dungeon
      global.uiPanel ? global.uiPanel(70,145,980,390,"rgba(195,92,255,.28)","rgba(5,8,18,.82)") : (ctx.fillStyle="rgba(5,8,18,.82)",ctx.fillRect(70,145,980,390));
      if(global.uiSectionTitle) global.uiSectionTitle("Side Story", T("外传内容入口。当前版本仅开放 UI。","Side Story entry. UI placeholder only in this build."),95,195);
      else{
        ctx.fillStyle="#fff"; ctx.font="bold 30px "+FONT_UI; ctx.textAlign="left"; ctx.fillText("Side Story",95,195);
      }

      // center panel
      const x=170, y=260, w=780, h=200;
      if(global.uiPanel) global.uiPanel(x,y,w,h,"rgba(195,92,255,.55)","rgba(195,92,255,.08)");
      else{ctx.fillStyle="rgba(195,92,255,.08)";ctx.fillRect(x,y,w,h);ctx.strokeStyle="rgba(195,92,255,.55)";ctx.strokeRect(x,y,w,h);}

      ctx.textAlign="center";
      ctx.fillStyle="#c35cff";
      ctx.font="bold 38px "+FONT_UI;
      ctx.fillText("SIDE STORY",W/2,y+62);

      ctx.fillStyle="rgba(255,255,255,.78)";
      ctx.font="16px "+FONT_UI;
      ctx.fillText(T("该内容正在开发中。","This content is currently in development."),W/2,y+105);
      ctx.fillText(T("预计将在后续版本开放。","Expected to open in a future version."),W/2,y+133);

      ctx.fillStyle="rgba(255,255,255,.10)";
      ctx.fillRect(W/2-190,y+153,380,18);
      ctx.strokeStyle="rgba(255,255,255,.18)";
      ctx.strokeRect(W/2-190,y+153,380,18);
      ctx.fillStyle="rgba(195,92,255,.75)";
      ctx.fillRect(W/2-190,y+153,110 + Math.sin(this.pulse)*5,18);

      global.drawBtn(T("开发中","Coming Soon"),"",W/2-95,y+220,190,46,true,"#c35cff");

      if(this.popup) this.drawPopup();
      ctx.restore();
    },

    drawPopup(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      ctx.save();
      ctx.fillStyle="rgba(0,0,0,.62)";
      ctx.fillRect(0,0,W,H);

      const x=W/2-260, y=210, w=520, h=240;
      ctx.fillStyle="rgba(8,8,18,.97)";
      ctx.fillRect(x,y,w,h);
      ctx.strokeStyle="rgba(195,92,255,.80)";
      ctx.lineWidth=2;
      ctx.strokeRect(x,y,w,h);

      ctx.fillStyle="#c35cff";
      ctx.font="bold 30px "+FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(T("开发中","Coming Soon"),W/2,y+62);

      ctx.fillStyle="rgba(255,255,255,.78)";
      ctx.font="16px "+FONT_UI;
      ctx.fillText(T("Side Story 正在开发中。","Side Story is currently in development."),W/2,y+115);
      ctx.fillText(T("请等待后续版本。","Please wait for a future version."),W/2,y+145);

      global.drawBtn(T("确定","OK"),"",W/2-90,y+178,180,44,true,"#fff");
      ctx.restore();
    },

    handleClick(){
      if(this.popup){
        const W=global.W, y=210;
        if(global.inRect(W/2-90,y+178,180,44)){
          this.popup=false;
        }
        global.clicked=false;
        return true;
      }
      if(global.inRect(global.W/2-95,480,190,46)){
        this.popup=true;
        global.clicked=false;
        return true;
      }
      return false;
    },

    handleEscape(){
      if(!this.popup) return false;
      this.popup=false;
      return true;
    }
  };

  global.PZSideStory = SideStory;
})(window);
