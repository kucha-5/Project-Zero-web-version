(function(){
  "use strict";

  const tr=(zh,en)=>language==="en"?en:zh;
  let storyAuto=false, storyReview=false, storyAutoAt=0;
  let weaponPulse=null, matchRewardOpen=false, lockInfo=null;
  let registerStep="email", registerCode="", registerTicket="";
  const storyLog=[];

  function button(x,y,w,h,label,accent="#7cc7ff"){
    const hover=inRect(x,y,w,h);
    ctx.fillStyle=hover?"rgba(255,255,255,.14)":"rgba(8,13,26,.76)";
    ctx.fillRect(x,y,w,h);ctx.strokeStyle=hover?"#fff":accent;ctx.strokeRect(x,y,w,h);
    ctx.fillStyle="#fff";ctx.font="bold 13px "+FONT_UI;ctx.textAlign="center";
    ctx.fillText(label,x+w/2,y+h/2+5);
  }

  const baseEnterStory=enterStory;
  enterStory=function(id){
    baseEnterStory(id);
    storyLog.length=0;storyReview=false;storyAuto=false;storyAutoAt=0;
  };

  const baseDrawStory=drawStory;
  drawStory=function(){
    baseDrawStory();
    // Dialogue controls use the familiar gacha-game placement: history at
    // the upper-left, autoplay at the upper-right. They deliberately stay
    // clear of the speaker name and the bottom advance area.
    button(28,24,92,36,tr("对话回顾","LOG"),"#b98cff");
    button(W-120,24,92,36,storyAuto?tr("自动 ON","AUTO ON"):tr("自动","AUTO"),storyAuto?"#7cffb2":"#7cc7ff");
    if(storyReview){
      ctx.fillStyle="rgba(2,4,10,.94)";ctx.fillRect(42,34,W-84,H-68);
      ctx.strokeStyle="rgba(185,140,255,.65)";ctx.strokeRect(42,34,W-84,H-68);
      ctx.fillStyle="#fff";ctx.font="bold 26px "+FONT_UI;ctx.textAlign="left";ctx.fillText(tr("对话回顾","DIALOGUE LOG"),72,76);
      const lines=storyLog.slice(-10);let y=116;
      for(const row of lines){
        ctx.fillStyle="#ffe066";ctx.font="bold 15px "+FONT_UI;ctx.fillText(row.speaker,76,y);
        ctx.fillStyle="rgba(255,255,255,.82)";ctx.font="14px "+FONT_UI;wrapText(row.text,160,y,W-260,22);y+=46;
      }
      button(W-130,48,58,36,"×","#ff6b9b");
    }
  };

  function rememberStoryLine(){
    const line=currentStory[storyIndex];
    if(!line)return;
    const row={speaker:formatStoryText(line[0]),text:formatStoryText(line[1])};
    const last=storyLog[storyLog.length-1];
    if(!last||last.speaker!==row.speaker||last.text!==row.text)storyLog.push(row);
  }
  const baseUpdateStory=updateStory;
  updateStory=function(){
    rememberStoryLine();
    if(clicked&&inRect(28,24,92,36)){storyReview=!storyReview;clicked=false;return;}
    if(storyReview){
      if((clicked&&inRect(W-130,48,58,36))||justPressed("escape"))storyReview=false;
      clicked=false;return;
    }
    if(clicked&&inRect(W-120,24,92,36)){
      storyAuto=!storyAuto;storyAutoAt=performance.now()+1800;clicked=false;return;
    }
    if(storyAuto&&performance.now()>=storyAutoAt){
      clicked=true;storyAutoAt=performance.now()+Math.max(1400,Math.min(4200,1100+String(currentStory[storyIndex]?.[1]||"").length*55));
    }
    baseUpdateStory();
  };

  function matchRewardState(){
    const s=window.PZMatch3&&window.PZMatch3.rewardSummary?window.PZMatch3.rewardSummary():{campaign:0,endless:0};
    return [
      {name:tr("通关 5 关","Clear 5 stages"),ok:s.campaign>=5,key:"m3box5",reward:100},
      {name:tr("通关 10 关","Clear 10 stages"),ok:s.campaign>=10,key:"m3box10",reward:150},
      {name:tr("通关 20 关","Clear 20 stages"),ok:s.campaign>=20,key:"m3box20",reward:300},
      {name:tr("领取 4 个无尽里程碑","Claim 4 endless milestones"),ok:s.endless>=4,key:"m3boxend",reward:250}
    ];
  }
  const baseDrawEvent=drawEvent;
  drawEvent=function(){
    baseDrawEvent();
    if(eventTab!=="match3")return;
    const x=986,y=488;
    ctx.save();ctx.translate(x,y);ctx.fillStyle="rgba(255,224,102,.18)";ctx.fillRect(-29,-29,58,58);
    ctx.strokeStyle="#ffe066";ctx.strokeRect(-29,-29,58,58);ctx.fillStyle="#ffe066";ctx.font="30px serif";ctx.textAlign="center";ctx.fillText("🎁",0,11);ctx.restore();
    if(matchRewardOpen){
      ctx.fillStyle="rgba(0,0,0,.70)";ctx.fillRect(0,0,W,H);
      ctx.fillStyle="rgba(12,18,34,.98)";ctx.fillRect(270,105,580,430);ctx.strokeStyle="#7cc7ff";ctx.strokeRect(270,105,580,430);
      ctx.fillStyle="#fff";ctx.font="bold 26px "+FONT_UI;ctx.textAlign="left";ctx.fillText(tr("消消消消乐 · 通关奖励","X4 MATCH · CLEAR REWARDS"),304,150);
      button(784,118,42,34,"×","#ff6b9b");
      matchRewardState().forEach((r,i)=>{
        const claimed=!!uiNewSeen[r.key],yy=180+i*72;
        ctx.fillStyle="rgba(255,255,255,.055)";ctx.fillRect(304,yy,512,56);ctx.strokeStyle=r.ok&&!claimed?"#ffe066":"rgba(255,255,255,.14)";ctx.strokeRect(304,yy,512,56);
        ctx.fillStyle="#fff";ctx.font="bold 15px "+FONT_UI;ctx.fillText(r.name,322,yy+23);
        ctx.fillStyle="#7cc7ff";ctx.font="13px "+FONT_UI;ctx.fillText(tr("水晶 +","Crystals +")+r.reward,322,yy+44);
        ctx.textAlign="right";ctx.fillStyle=claimed?"#777":r.ok?"#ffe066":"#777";ctx.fillText(claimed?tr("已领取","CLAIMED"):r.ok?tr("点击领取","CLAIM"):tr("未达成","LOCKED"),794,yy+34);ctx.textAlign="left";
      });
    }
  };
  const baseUpdateEvent=updateEvent;
  updateEvent=function(){
    if(eventTab==="match3"&&clicked&&inRect(957,459,58,58)){matchRewardOpen=true;clicked=false;return;}
    if(matchRewardOpen){
      if((clicked&&inRect(784,118,42,34))||justPressed("escape")){matchRewardOpen=false;clicked=false;return;}
      if(clicked)matchRewardState().forEach((r,i)=>{
        if(inRect(304,180+i*72,512,56)&&r.ok&&!uiNewSeen[r.key]){
          uiNewSeen[r.key]=true;grantExactEventCrystals(r.reward);sfx("reward");saveGame();autoCloudSaveNow(true);
        }
      });
      clicked=false;return;
    }
    baseUpdateEvent();
  };

  const baseUpgradeWeapon=upgradeWeaponSelected;
  upgradeWeaponSelected=function(i){
    const before=roleWeaponLevelDisplay(i);
    baseUpgradeWeapon(i);
    const after=roleWeaponLevelDisplay(i);
    if(after>before)weaponPulse={role:i,from:before,to:after,until:performance.now()+1100};
  };
  const baseDrawOperatorWeaponTab=drawOperatorWeaponTab;
  drawOperatorWeaponTab=function(i,x,y,w,h){
    baseDrawOperatorWeaponTab(i,x,y,w,h);
    if(weaponPulse&&weaponPulse.role===i&&performance.now()<weaponPulse.until){
      const p=(weaponPulse.until-performance.now())/1100;
      ctx.save();ctx.globalAlpha=Math.sin((1-p)*Math.PI);ctx.strokeStyle="#ffe066";ctx.lineWidth=3;ctx.strokeRect(x+14,y+66,w-28,h-145);
      ctx.fillStyle="#7cffb2";ctx.font="bold 20px "+FONT_UI;ctx.textAlign="center";ctx.fillText("Lv."+weaponPulse.from+"  →  Lv."+weaponPulse.to,x+w/2,y+112);ctx.restore();
    }
  };

  const baseDrawOperatorDetail=drawOperatorDetailPage;
  drawOperatorDetailPage=function(){
    baseDrawOperatorDetail();
    button(510,40,96,30,tr("详情","DETAIL"),"#7cc7ff");
    button(614,40,96,30,tr("衣装","OUTFIT"),"#b98cff");
    if(lockInfo&&lockInfo.type==="operatorDetail"){
      ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);ctx.fillStyle="rgba(10,16,30,.98)";ctx.fillRect(310,150,500,340);ctx.strokeStyle="#7cc7ff";ctx.strokeRect(310,150,500,340);
      ctx.fillStyle="#fff";ctx.font="bold 28px "+FONT_UI;ctx.textAlign="left";ctx.fillText(roleName(selectedOperator),345,198);
      const rows=[tr("主要定位：","Combat Role: ")+roleStyle(selectedOperator),tr("元素属性：","Element: ")+executorElement(selectedOperator),tr("武器类型：","Weapon: ")+weaponTypeLabel(roleWeaponType(selectedOperator)),tr("队伍职责：稳定输出、破盾与连携支援","Squad Role: damage, break and chain support")];
      ctx.font="16px "+FONT_UI;rows.forEach((s,i)=>ctx.fillText(s,345,245+i*42));ctx.fillStyle="rgba(255,255,255,.45)";ctx.fillText(tr("故事档案将在后续版本开放。","Story profile will be added in a future update."),345,426);button(734,166,46,34,"×","#ff6b9b");
    }
  };
  const baseUpdateOperators=updateOperators;
  updateOperators=function(){
    if(operatorPageMode==="detail"&&clicked&&inRect(510,40,96,30)){lockInfo={type:"operatorDetail"};clicked=false;return;}
    if(operatorPageMode==="detail"&&clicked&&inRect(614,40,96,30)){showCenter(tr("衣装功能尚未开放","Outfits are not available yet"),90);clicked=false;return;}
    if(lockInfo&&lockInfo.type==="operatorDetail"){
      if((clicked&&inRect(734,166,46,34))||justPressed("escape"))lockInfo=null;
      clicked=false;return;
    }
    baseUpdateOperators();
  };

  function lockMessage(tab){
    if(tab==="dungeon")return tr("通关第零章后解锁副本。","Clear Chapter 0 to unlock Dungeons.");
    if(tab==="sideStory")return tr("支线故事尚在准备中。","Side Stories are still in development.");
    if(tab==="daydream")return tr("通关第二章后解锁白日梦重现。","Clear Chapter 2 to unlock Daydream Reconstruction.");
    return tr("请先完成前置关卡。","Complete the prerequisite stage first.");
  }
  const baseUpdateOperation=updateOperation;
  updateOperation=function(){
    if(lockInfo&&lockInfo.type==="operation"){
      if(clicked||justPressed("escape"))lockInfo=null;clicked=false;return;
    }
    if(clicked){
      const tabs=[["dungeon",390,canUseDungeon()],["sideStory",540,canUseSideStory()],["daydream",690,canUseDaydream()]];
      for(const t of tabs)if(inRect(t[1],595,135,38)&&!t[2]){lockInfo={type:"operation",title:tr("功能未解锁","LOCKED"),text:lockMessage(t[0])};clicked=false;return;}
    }
    baseUpdateOperation();
  };
  const baseDrawOperation=drawOperation;
  drawOperation=function(){
    baseDrawOperation();
    if(lockInfo&&lockInfo.type==="operation"){
      ctx.fillStyle="rgba(0,0,0,.70)";ctx.fillRect(0,0,W,H);ctx.fillStyle="rgba(11,17,32,.98)";ctx.fillRect(330,205,460,230);ctx.strokeStyle="#ffe066";ctx.strokeRect(330,205,460,230);
      ctx.fillStyle="#ffe066";ctx.font="bold 26px "+FONT_UI;ctx.textAlign="left";ctx.fillText(lockInfo.title,365,258);ctx.fillStyle="#fff";ctx.font="17px "+FONT_UI;wrapText(lockInfo.text,365,310,390,28);button(714,222,46,34,"×","#ff6b9b");
    }
  };

  const baseEnterSide=enterSideBattleArea;
  enterSideBattleArea=function(route){
    baseEnterSide(route);
    if(!battleSideArea)return;
    const key="sideCleared:"+selectedMainChapter+":"+selectedStage+":"+area+":"+route;
    if(battleExploreOpened[key]){enemies=[];areaCleared=true;}
  };
  const baseReturnMain=returnToMainBattleArea;
  returnToMainBattleArea=function(){
    if(battleSideArea&&areaCleared)battleExploreOpened["sideCleared:"+selectedMainChapter+":"+selectedStage+":"+area+":"+battleSideArea]=true;
    baseReturnMain();saveGame();
  };

  window.PZEmailRegistration={
    get step(){return registerStep;},
    async send(email){
      if(!window.PZAccount||!window.PZAccount.configured)throw new Error("ACCOUNT_API_NOT_CONFIGURED");
      const data=await window.PZAccount.requestCode(email);
      registerStep="code";registerCode="";return data;
    },
    async verify(email,code){
      const data=await window.PZAccount.verifyCode(email,code);
      registerTicket=data.verificationToken;registerStep="password";return data;
    },
    async complete(email,password){
      const data=await window.PZAccount.completeRegistration(registerTicket,password);
      registerStep="email";registerCode="";registerTicket="";return data;
    },
    reset(){registerStep="email";registerCode="";registerTicket="";}
  };
  window.PZForgotPassword=async function(email){
    throw new Error("SF_ACCOUNT_PASSWORD_RESET_NOT_AVAILABLE");
  };
})();
