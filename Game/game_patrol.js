// Project Zero V46.2 Patrol System
// Independent patrol module. Do not put patrol logic into game.js.
(function(global){
  "use strict";

  function patrolKey(){const ns=global.getProjectZeroSaveNamespace?global.getProjectZeroSaveNamespace():"guest";return ns+"_patrol_v462";}
  const STAMINA_COST = 40;

  function lang(){ return global.language === "en" ? "en" : "zh"; }
  function T(zh,en){ return lang()==="en" ? en : zh; }
  function now(){ return Date.now(); }

  const Patrol = {
    state:null,
    loadedSaveKey:"",
    selectedArea:0,
    selectedDuration:1,
    team:[0,1,2],

    init(){ return this.reloadForCurrentAccount(false); },

    reloadForCurrentAccount(reset=false){
      const key=patrolKey();
      this.state=null;this.selectedArea=0;this.selectedDuration=1;this.team=[0,1,2];
      try{
        if(reset)localStorage.removeItem(key);
        const raw = localStorage.getItem(key);
        if(raw){
          const data = JSON.parse(raw);
          if(data && typeof data === "object"){
            this.state = data.state || null;
            this.selectedArea = Number.isFinite(data.selectedArea) ? data.selectedArea : 0;
            this.selectedDuration = Number.isFinite(data.selectedDuration) ? data.selectedDuration : 1;
            this.team = Array.isArray(data.team) ? data.team : [0,1,2];
          }
        }
      }catch(e){console.warn("[PZPatrol] load failed",e);try{localStorage.removeItem(key);}catch(ignore){}}
      this.loadedSaveKey=key;
      return true;
    },

    save(){
      try{
        const key=patrolKey();
        if(this.loadedSaveKey&&this.loadedSaveKey!==key){this.reloadForCurrentAccount(false);return;}
        localStorage.setItem(key, JSON.stringify({
          state:this.state,
          selectedArea:this.selectedArea,
          selectedDuration:this.selectedDuration,
          team:this.team
        }));
        if(typeof global.safeSaveGame==="function")global.safeSaveGame();
      }catch(e){ console.warn("[PZPatrol] save failed", e); }
    },

    areas(){
      return [
        {key:"project_area", name:"Project Area", recLv:10, unlocked:!!global.projectAreaCleared, bias:"balanced", desc:T("完成 Project Area 探索后开放。","Unlocked after Project Area exploration.")},
        {key:"industrial_zone", name:"Industrial Zone", recLv:20, unlocked:true, bias:"gold", desc:T("工业区附近的稳定补给路线。","Stable supply route near the industrial district.")},
        {key:"storage", name:"Storage Warehouse", recLv:15, unlocked:true, bias:"mat", desc:T("旧仓库，可能找到材料箱。","Old warehouse with material crates.")},
        {key:"power_station", name:"Power Station", recLv:25, unlocked:true, bias:"exp", desc:T("废弃电站巡逻路线。","Abandoned power station patrol route.")}
      ];
    },

    durations(){ return [1,2,4,8]; },

    remainingMs(){
      if(!this.state || this.state.status !== "running") return 0;
      return Math.max(0, this.state.endAt - now());
    },

    timeText(ms){
      const s=Math.ceil(ms/1000);
      const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
      return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
    },

    ownedList(){
      try{
        const order = typeof global.executorOrder === "function" ? global.executorOrder() : [0,1,2,3,4,5,6,7,8];
        return order.filter(id => global.owned && global.owned[id]);
      }catch(e){ return [0]; }
    },

    roleName(id){
      try{
        if(global.roles && global.roles[id] && typeof global.roleName === "function") return global.roleName(id);
      }catch(e){}
      return "Operator " + (id+1);
    },

    roleLevel(id){
      try{
        if(typeof global.roleDisplayLevel === "function") return global.roleDisplayLevel(id);
      }catch(e){}
      return global.playerLevel || 1;
    },

    teamPower(){
      let total=0, count=0;
      for(const id of this.team){
        if(id===undefined || id===null) continue;
        if(global.owned && !global.owned[id]) continue;
        total += this.roleLevel(id);
        count++;
      }
      return {total,count};
    },

    roleBonus(id){
      const table={
        0:{gold:.15,label:T("现场指挥 · 金币 +15%","Field Command · Gold +15%")},
        1:{time:.12,label:T("疾风路线 · 时间 -12%","Tailwind Route · Time -12%")},
        2:{success:10,ore:1,label:T("侦察标记 · 成功率 +10% / 矿石 +1","Recon Mark · Success +10% / Ore +1")},
        3:{books:.25,success:5,label:T("后勤支援 · 经验书 +25%","Logistics · EXP Books +25%")},
        4:{all:.08,label:T("临场适应 · 全奖励 +8%","Adaptability · All Rewards +8%")}
      };
      return table[id] || {exp:.12,label:T("协同训练 · EXP +12%","Team Drill · EXP +12%")};
    },

    teamBonuses(){
      const b={gold:0,exp:0,books:0,ore:0,all:0,time:0,success:0,labels:[]};
      const used=new Set();
      for(const id of this.team){
        if(id===undefined || id===null || used.has(id) || (global.owned && !global.owned[id])) continue;
        used.add(id);
        const rb=this.roleBonus(id);
        b.gold+=rb.gold||0; b.exp+=rb.exp||0; b.books+=rb.books||0; b.ore+=rb.ore||0;
        b.all+=rb.all||0; b.time+=rb.time||0; b.success+=rb.success||0; b.labels.push(rb.label);
      }
      b.time=Math.min(.30,b.time); b.success=Math.min(25,b.success);
      return b;
    },

    rewardPreview(area,durationHours){
      const pow=this.teamPower();
      const areaMul = area.bias==="gold" ? 1.25 : area.bias==="mat" ? 1.08 : area.bias==="exp" ? 1.08 : 1.12;
      const ratio = Math.max(.55, Math.min(1.25, pow.total / Math.max(1,area.recLv)));
      const bonus = pow.total >= area.recLv ? 1.10 : ratio;
      const tb=this.teamBonuses(), allMul=1+tb.all;
      return {
        gold: Math.floor(650 * durationHours * areaMul * bonus * (1+tb.gold) * allMul),
        expReward: Math.floor(120 * durationHours * (area.bias==="exp"?1.35:1) * bonus * (1+tb.exp) * allMul),
        expBooks: Math.max(0, Math.floor((Math.floor(durationHours/2) + (area.bias==="exp"?1:0)) * (1+tb.books) * allMul)),
        weaponOre: Math.max(0, Math.floor((Math.floor(durationHours/4) + (area.bias==="mat"?1:0) + tb.ore) * allMul)),
        crystal: durationHours>=8 ? 10 : 0,
        success: Math.min(100,Math.floor(Math.max(.55, Math.min(1, ratio)) * 100)+tb.success),
        timeCut:tb.time,
        bonusLabels:tb.labels
      };
    },

    start(){
      const area=this.areas()[this.selectedArea] || this.areas()[0];
      if(!area.unlocked){
        if(typeof global.showCenter==="function") global.showCenter(T("区域未开放","Area locked"),70);
        return;
      }
      const pow=this.teamPower();
      if(pow.count<=0){
        if(typeof global.showCenter==="function") global.showCenter(T("至少选择1名执行官","Select at least 1 operator"),70);
        return;
      }
      if(typeof global.normalizeDungeonRuntime==="function") global.normalizeDungeonRuntime();
      if((global.dungeonStamina||0) < STAMINA_COST){
        if(typeof global.openStaminaRecover==="function") global.openStaminaRecover(T("体力不足，需要40体力。","Not enough stamina. Need 40."));
        else if(typeof global.showCenter==="function") global.showCenter(T("体力不足，需要40体力","Not enough stamina. Need 40."),90);
        return;
      }
      global.dungeonStamina = Math.max(0, (global.dungeonStamina||0) - STAMINA_COST);
      const hours=this.selectedDuration;
      const reward=this.rewardPreview(area,hours);
      const effectiveMs=hours*60*60*1000*(1-reward.timeCut);
      this.state={
        status:"running",
        areaIndex:this.selectedArea,
        areaKey:area.key,
        areaName:area.name,
        durationHours:hours,
        startAt:now(),
        endAt:now()+effectiveMs,
        effectiveDurationMs:effectiveMs,
        team:this.team.slice(),
        reward
      };
      this.save();
      if(typeof global.saveGame==="function") global.saveGame();
      if(global.autoCloudSaveNow) global.autoCloudSaveNow(false);
      if(typeof global.showCenter==="function") global.showCenter(T("巡逻开始","Patrol started"),70);
    },

    claim(){
      if(!this.state) return;
      if(this.remainingMs()>0){
        if(typeof global.showCenter==="function") global.showCenter(T("巡逻尚未完成","Patrol not complete"),70);
        return;
      }
      const r=this.state.reward || {};
      global.gold += r.gold||0;
      global.totalGoldEarned += r.gold||0;
      global.expBooks += r.expBooks||0;
      global.weaponOre += r.weaponOre||0;
      if(r.crystal){
        if(global.grantPZCrystalReward) r.crystal=global.grantPZCrystalReward(r.crystal);
        else global.crystals += r.crystal;
        global.totalCrystalsEarned += r.crystal;
      }
      if(typeof global.addPlayerExp==="function") global.addPlayerExp(r.expReward||0);
      this.state=null;
      this.save();
      if(typeof global.saveGame==="function") global.saveGame();
      if(global.autoCloudSaveNow) global.autoCloudSaveNow(false);
      if(typeof global.showCenter==="function") global.showCenter(T("巡逻奖励已领取","Patrol reward claimed"),90);
    },

    cycleTeam(slot){
      if(this.state && this.state.status==="running") return;
      const list=this.ownedList();
      if(!list.length) return;
      const cur=this.team[slot];
      let idx=list.indexOf(cur);
      const occupied=new Set(this.team.filter((_,i)=>i!==slot));
      for(let tries=0;tries<list.length;tries++){
        idx=(idx+1)%list.length;
        if(!occupied.has(list[idx])){ this.team[slot]=list[idx]; break; }
      }
      this.save();
    },

    drawDetail(){
      const ctx=global.ctx, W=global.W, FONT_UI=global.FONT_UI;
      const areas=this.areas();
      this.selectedArea=Math.max(0, Math.min(areas.length-1, this.selectedArea));
      const area=areas[this.selectedArea];

      ctx.fillStyle="#fff";
      ctx.font="bold 26px "+FONT_UI;
      ctx.textAlign="left";
      ctx.fillText(T("巡逻","Patrol"),95,190);
      ctx.fillStyle="rgba(255,255,255,.55)";
      ctx.font="14px "+FONT_UI;
      ctx.fillText(T("派遣执行官 / 离线资源路线","Dispatch operators / offline resource route"),97,214);
      global.drawBtn(T("返回","Back"),"",930,165,90,36,false,"#fff");

      if(global.uiPanel) global.uiPanel(95,245,390,250,"rgba(255,224,102,.65)","rgba(28,31,42,.94)");
      else{ctx.fillStyle="rgba(255,224,102,.10)";ctx.fillRect(95,245,390,250);ctx.strokeStyle="rgba(255,224,102,.55)";ctx.strokeRect(95,245,390,250);}

      global.drawBtn("<","",108,260,42,38,true,"#fff");
      global.drawBtn(">","",424,260,42,38,true,"#fff");
      ctx.textAlign="center";
      ctx.fillStyle=area.unlocked?"#ffe066":"rgba(255,255,255,.45)";
      ctx.font="bold 25px "+FONT_UI;
      ctx.fillText(area.name,287,292);
      ctx.fillStyle="rgba(255,255,255,.55)";
      ctx.font="12px "+FONT_UI;
      ctx.fillText((this.selectedArea+1)+" / "+areas.length,287,318);

      ctx.textAlign="left";
      ctx.fillStyle="rgba(255,255,255,.74)";
      ctx.font="15px "+FONT_UI;
      ctx.fillText((T("推荐等级 Lv.","Recommended Lv."))+area.recLv,120,342);
      ctx.fillText(area.desc,120,372);

      ctx.fillStyle="#ffe066";
      ctx.font="bold 15px "+FONT_UI;
      ctx.fillText(T("时间","Duration"),120,414);
      const ds=this.durations();
      for(let i=0;i<ds.length;i++){
        const x=120+i*78;
        global.drawBtn(ds[i]+"h","",x,430,62,36,this.selectedDuration===ds[i],"#ffe066");
      }

      ctx.fillStyle="rgba(255,255,255,.72)";
      ctx.font="bold 14px "+FONT_UI;
      ctx.fillText(T("当前体力：","Stamina: ")+Math.floor(global.dungeonStamina||0)+" / 240",120,486);
      ctx.fillText(T("开始消耗：40体力","Start Cost: 40 Stamina"),280,486);

      const reward=this.rewardPreview(area,this.selectedDuration);
      ctx.fillStyle="rgba(20,25,36,.95)";
      ctx.fillRect(520,245,485,250);
      ctx.strokeStyle="rgba(124,255,178,.32)";
      ctx.strokeRect(520,245,485,250);

      ctx.fillStyle="#7cffb2";
      ctx.font="bold 18px "+FONT_UI;
      ctx.fillText(T("巡逻小队","Patrol Team"),545,282);
      for(let i=0;i<3;i++){
        const x=545+i*145;
        const id=this.team[i];
        const has = id!==undefined && id!==null && (!global.owned || global.owned[id]);
        global.drawBtn(has ? this.roleName(id) : T("空位","Empty"),T("点击","Click"),x,305,132,42,has,"#7cffb2");
        if(has){
          ctx.fillStyle="rgba(255,255,255,.58)"; ctx.font="9px "+FONT_UI; ctx.textAlign="center";
          const label=this.roleBonus(id).label;
          ctx.fillText(label.length>19?label.slice(0,18)+"…":label,x+66,360);
          ctx.textAlign="left";
        }
      }

      ctx.fillStyle="#ffe066";
      ctx.font="bold 16px "+FONT_UI;
      ctx.fillText(T("奖励预览","Reward Preview"),545,386);
      ctx.fillStyle="rgba(255,255,255,.78)";
      ctx.font="14px "+FONT_UI;
      ctx.fillText(T("成功率 ","Success ")+reward.success+"%"+(reward.timeCut?"   "+T("耗时 -","Time -")+Math.round(reward.timeCut*100)+"%":""),545,410);
      ctx.fillText(T("金币 +","Gold +")+reward.gold+"   EXP +"+reward.expReward,545,434);
      ctx.fillText(T("经验书 +","EXP Books +")+reward.expBooks+"   "+T("武器矿石 +","Weapon Ore +")+reward.weaponOre,545,458);
      if(reward.crystal) ctx.fillText(T("水晶 +","Crystal +")+reward.crystal,545,482);

      if(this.state && this.state.status==="running"){
        const left=this.remainingMs();
        ctx.fillStyle=left<=0?"#7cffb2":"#ffe066";
        ctx.font="bold 18px "+FONT_UI;
        ctx.fillText(left<=0 ? T("巡逻完成","Patrol Complete") : (T("剩余 ","Remaining ")+this.timeText(left)),120,486);
        global.drawBtn(left<=0 ? T("领取","Claim") : T("巡逻中","In Progress"),"",805,445,185,48,left<=0,"#ffe066");
      }else{
        global.drawBtn(area.unlocked ? (((global.dungeonStamina||0) >= STAMINA_COST) ? T("开始巡逻","Start Patrol") : T("体力不足","No Stamina")) : T("未开放","Locked"),"",805,445,185,48,area.unlocked && ((global.dungeonStamina||0) >= STAMINA_COST),"#ffe066");
      }
    },

    handleDungeonClick(){
      if(global.inRect(930,165,90,36)){
        global.dungeonPanelMode="home";
        global.clicked=false;
        return true;
      }
      const running=!!(this.state && this.state.status==="running");
      if(!running && global.inRect(108,260,42,38)){
        this.selectedArea=(this.selectedArea+this.areas().length-1)%this.areas().length;
        global.clicked=false;
        return true;
      }
      if(!running && global.inRect(424,260,42,38)){
        this.selectedArea=(this.selectedArea+1)%this.areas().length;
        global.clicked=false;
        return true;
      }
      const ds=this.durations();
      for(let i=0;i<ds.length;i++){
        const x=120+i*78;
        if(!running && global.inRect(x,430,62,36)){
          this.selectedDuration=ds[i];
          this.save();
          global.clicked=false;
          return true;
        }
      }
      for(let i=0;i<3;i++){
        const x=545+i*145;
        if(!running && global.inRect(x,305,132,42)){
          this.cycleTeam(i);
          global.clicked=false;
          return true;
        }
      }
      if(global.inRect(805,445,185,48)){
        if(this.state && this.state.status==="running") this.claim();
        else this.start();
        global.clicked=false;
        return true;
      }
      return false;
    }
  };

  Patrol.init();
  global.PZPatrol = Patrol;
})(window);
