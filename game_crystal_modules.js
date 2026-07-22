// Project Zero crystal modules: four fixed slots, fixed stats, no random affixes.
(function(global){
  "use strict";
  const SLOTS=["helmet","armor","leggings","boots"];
  const SLOT_TEXT={helmet:["头盔","Helmet"],armor:["护甲","Armor"],leggings:["护腿","Leggings"],boots:["护鞋","Boots"]};
  // Set effects are deterministic: 2-piece establishes the set identity and
  // the 4-piece tier adds its signature mechanic. No random affixes are used.
  const SETS={
    survey:{zh:"Project 4 调查组",en:"Project 4 Survey",color:"#7cc7ff",tiers:{
      2:{stats:{hp:30},zh:"2件：生命 +30",en:"2pc: HP +30"},
      4:{stats:{hp:60,healReceivedPct:.08},zh:"4件：生命 +60；受到治疗 +8%",en:"4pc: HP +60; Healing received +8%"}
    }},
    vanguard:{zh:"雷文哈多先锋",en:"Ravenhard Vanguard",color:"#ff837c",tiers:{
      2:{stats:{atk:5},zh:"2件：攻击 +5",en:"2pc: ATK +5"},
      4:{stats:{atk:10,highHpDamagePct:.08,hpPct:-.01},zh:"4件：攻击 +10；生命高于70%时伤害 +8%；生命 -1%",en:"4pc: ATK +10; +8% damage above 70% HP; HP -1%"}
    }},
    bulwark:{zh:"晶体壁垒",en:"Crystal Bulwark",color:"#7cffb2",tiers:{
      2:{stats:{def:4},zh:"2件：防御 +4",en:"2pc: DEF +4"},
      4:{stats:{def:8,damageReductionPct:.06,atkPct:-.01},zh:"4件：防御 +8；受到伤害 -6%；攻击 -1%",en:"4pc: DEF +8; Damage taken -6%; ATK -1%"}
    }},
    resonance:{zh:"共鸣术式",en:"Resonance Formula",color:"#b98cff",tiers:{
      2:{stats:{atk:4},zh:"2件：攻击 +4",en:"2pc: ATK +4"},
      4:{stats:{atk:8,speedPct:.01,skillDamagePct:.08,defPct:-.005},zh:"4件：攻击 +8、速度 +1%；技能伤害 +8%；防御 -0.5%",en:"4pc: ATK +8, Speed +1%; Skill damage +8%; DEF -0.5%"}
    }},
    runner:{zh:"裂隙行者",en:"Rift Runner",color:"#ffe066",tiers:{
      2:{stats:{speedPct:.01},zh:"2件：速度 +1%",en:"2pc: Speed +1%"},
      4:{stats:{speedPct:.02,dashRecoveryPct:.12,hpPct:-.01},zh:"4件：速度 +2%；闪避恢复 +12%；生命 -1%",en:"4pc: Speed +2%; Dodge recovery +12%; HP -1%"}
    }},
    hizan:{zh:"日斩观测",en:"Hizan Survey",color:"#f0c7d9",tiers:{
      2:{stats:{atk:4,def:2},zh:"2件：攻击 +4、防御 +2",en:"2pc: ATK +4, DEF +2"},
      4:{stats:{atk:7,skillDamagePct:.06,damageReductionPct:-.02},zh:"4件：攻击 +7；技能伤害 +6%；受到伤害 +2%",en:"4pc: ATK +7; Skill damage +6%; Damage taken +2%"}
    }},
    lucid:{zh:"清醒协议",en:"Lucid Protocol",color:"#6fe7dc",tiers:{
      2:{stats:{hp:45},zh:"2件：生命 +45",en:"2pc: HP +45"},
      4:{stats:{hp:75,healReceivedPct:.06,speedPct:-.01},zh:"4件：生命 +75；受到治疗 +6%；速度 -1%",en:"4pc: HP +75; Healing received +6%; Speed -1%"}
    }},
    bladeEcho:{zh:"刀痕回响",en:"Blade-Scar Echo",color:"#d8dbe2",tiers:{
      2:{stats:{atk:5},zh:"2件：攻击 +5",en:"2pc: ATK +5"},
      4:{stats:{atk:8,highHpDamagePct:.06,hpPct:-.015},zh:"4件：攻击 +8；生命高于70%时伤害 +6%；生命 -1.5%",en:"4pc: ATK +8; +6% damage above 70% HP; HP -1.5%"}
    }}
  };
  Object.keys(SETS).forEach(id=>{
    // Legacy aliases keep existing UI/extensions compatible.
    SETS[id].bonus=SETS[id].tiers[4].stats;
    SETS[id].bonusZh=SETS[id].tiers[4].zh;
    SETS[id].bonusEn=SETS[id].tiers[4].en;
  });
  const ITEMS=[];
  function addSet(id,level,quality,parts){
    SLOTS.forEach((slot,n)=>ITEMS.push({
      id:id+"_"+slot,setId:id,slot,level,quality,
      nameZh:SETS[id].zh+"·"+SLOT_TEXT[slot][0],nameEn:SETS[id].en+" "+SLOT_TEXT[slot][1],
      stats:parts[n].stats,drawback:parts[n].drawback,
      drawbackZh:parts[n].drawbackZh,drawbackEn:parts[n].drawbackEn,
      source:"module_dungeon"
    }));
  }
  addSet("survey",10,"standard",[
    {stats:{hp:55,def:3},drawback:{atkPct:-.005},drawbackZh:"攻击 -0.5%",drawbackEn:"ATK -0.5%"},
    {stats:{hp:90,def:5},drawback:{speedPct:-.005},drawbackZh:"移动速度 -0.5%",drawbackEn:"Move speed -0.5%"},
    {stats:{hp:45,atk:4},drawback:{defPct:-.005},drawbackZh:"防御 -0.5%",drawbackEn:"DEF -0.5%"},
    {stats:{atk:4,speedPct:.01},drawback:{hpPct:-.005},drawbackZh:"生命 -0.5%",drawbackEn:"HP -0.5%"}
  ]);
  addSet("vanguard",20,"advanced",[
    {stats:{atk:8},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"},
    {stats:{hp:75,atk:8},drawback:{speedPct:-.01},drawbackZh:"移动速度 -1%",drawbackEn:"Move speed -1%"},
    {stats:{atk:7,def:3},drawback:{hpPct:-.01},drawbackZh:"生命 -1%",drawbackEn:"HP -1%"},
    {stats:{atk:6,speedPct:.015},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"}
  ]);
  addSet("bulwark",30,"advanced",[
    {stats:{hp:100,def:6},drawback:{atkPct:-.01},drawbackZh:"攻击 -1%",drawbackEn:"ATK -1%"},
    {stats:{hp:150,def:9},drawback:{speedPct:-.015},drawbackZh:"移动速度 -1.5%",drawbackEn:"Move speed -1.5%"},
    {stats:{hp:90,def:7},drawback:{atkPct:-.01},drawbackZh:"攻击 -1%",drawbackEn:"ATK -1%"},
    {stats:{def:5},drawback:{speedPct:-.01},drawbackZh:"移动速度 -1%",drawbackEn:"Move speed -1%"}
  ]);
  addSet("resonance",40,"elite",[
    {stats:{atk:9,def:4},drawback:{hpPct:-.01},drawbackZh:"生命 -1%",drawbackEn:"HP -1%"},
    {stats:{hp:100,atk:9},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"},
    {stats:{atk:8,def:5},drawback:{speedPct:-.01},drawbackZh:"移动速度 -1%",drawbackEn:"Move speed -1%"},
    {stats:{atk:7,speedPct:.02},drawback:{hpPct:-.015},drawbackZh:"生命 -1.5%",drawbackEn:"HP -1.5%"}
  ]);
  addSet("runner",50,"elite",[
    {stats:{atk:7,speedPct:.015},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"},
    {stats:{hp:80,speedPct:.015},drawback:{atkPct:-.01},drawbackZh:"攻击 -1%",drawbackEn:"ATK -1%"},
    {stats:{def:5,speedPct:.015},drawback:{hpPct:-.01},drawbackZh:"生命 -1%",drawbackEn:"HP -1%"},
    {stats:{speedPct:.025,atk:5},drawback:{defPct:-.015},drawbackZh:"防御 -1.5%",drawbackEn:"DEF -1.5%"}
  ]);
  addSet("hizan",40,"elite",[
    {stats:{atk:8,def:3},drawback:{hpPct:-.01},drawbackZh:"生命 -1%",drawbackEn:"HP -1%"},
    {stats:{hp:85,atk:7},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"},
    {stats:{atk:7,def:4},drawback:{speedPct:-.01},drawbackZh:"速度 -1%",drawbackEn:"Speed -1%"},
    {stats:{atk:6,speedPct:.015},drawback:{hpPct:-.015},drawbackZh:"生命 -1.5%",drawbackEn:"HP -1.5%"}
  ]);
  addSet("lucid",30,"advanced",[
    {stats:{hp:90,def:4},drawback:{atkPct:-.005},drawbackZh:"攻击 -0.5%",drawbackEn:"ATK -0.5%"},
    {stats:{hp:130,def:6},drawback:{speedPct:-.01},drawbackZh:"速度 -1%",drawbackEn:"Speed -1%"},
    {stats:{hp:75,atk:4},drawback:{defPct:-.005},drawbackZh:"防御 -0.5%",drawbackEn:"DEF -0.5%"},
    {stats:{hp:55,speedPct:.01},drawback:{atkPct:-.005},drawbackZh:"攻击 -0.5%",drawbackEn:"ATK -0.5%"}
  ]);
  addSet("bladeEcho",50,"elite",[
    {stats:{atk:9},drawback:{defPct:-.015},drawbackZh:"防御 -1.5%",drawbackEn:"DEF -1.5%"},
    {stats:{hp:70,atk:9},drawback:{speedPct:-.01},drawbackZh:"速度 -1%",drawbackEn:"Speed -1%"},
    {stats:{atk:8,def:3},drawback:{hpPct:-.015},drawbackZh:"生命 -1.5%",drawbackEn:"HP -1.5%"},
    {stats:{atk:7,speedPct:.015},drawback:{defPct:-.01},drawbackZh:"防御 -1%",drawbackEn:"DEF -1%"}
  ]);
  // Every module is a finished drop. Grades 2-6 are separate fixed items;
  // they cannot be upgraded. Higher grades amplify both benefits and costs.
  const BASE_ITEMS=ITEMS.slice();ITEMS.length=0;
  const GRADE_SCALE={2:.72,3:.86,4:1,5:1.14,6:1.28};
  const DRAWBACK_SCALE={2:.70,3:.85,4:1,5:1.18,6:1.38};
  function scaledMap(src,mul){const out={};Object.keys(src||{}).forEach(k=>{const v=src[k]*mul;out[k]=k.endsWith("Pct")?Math.round(v*10000)/10000:Math.max(1,Math.round(v));});return out;}
  function drawbackText(d,grade,lang){const values=Object.entries(d.drawback||{});if(!values.length)return "";const names=lang==="en"?{hpPct:"HP",atkPct:"ATK",defPct:"DEF",speedPct:"Speed"}:{hpPct:"生命",atkPct:"攻击",defPct:"防御",speedPct:"速度"};return values.map(([k,v])=>(names[k]||k)+" "+(v>0?"+":"")+Math.round(v*1000)/10+"%").join(" / ");}
  BASE_ITEMS.forEach(base=>{for(let grade=2;grade<=6;grade++){const d=Object.assign({},base,{id:base.id+"_g"+grade,baseId:base.id,grade,level:grade,stats:scaledMap(base.stats,GRADE_SCALE[grade]),drawback:scaledMap(base.drawback,DRAWBACK_SCALE[grade])});d.drawbackZh=drawbackText(d,grade,"zh");d.drawbackEn=drawbackText(d,grade,"en");ITEMS.push(d);}});
  function emptySlots(){return {helmet:null,armor:null,leggings:null,boots:null};}
  function item(id){return ITEMS.find(v=>v.id===id)||null;}
  function normalize(chars,inventory){
    const inv=Array.isArray(inventory)?inventory.map(id=>item(id)?id:(item(id+"_g4")?id+"_g4":null)).filter(Boolean):[];
    const available={};inv.forEach(id=>available[id]=(available[id]||0)+1);
    const used={};(chars||[]).forEach(c=>{c.crystalModuleSlots=Object.assign(emptySlots(),c.crystalModuleSlots||{});SLOTS.forEach(s=>{const id=c.crystalModuleSlots[s],d=item(id);if(!d||d.slot!==s||(used[id]||0)>=(available[id]||0))c.crystalModuleSlots[s]=null;else used[id]=(used[id]||0)+1;});});
    return inv;
  }
  function totals(role,chars){
    const out={hp:0,atk:0,def:0,hpPct:0,atkPct:0,defPct:0,speedPct:0,sets:{},activeSetTiers:[]};
    const c=chars[role]||{},slots=Object.assign(emptySlots(),c.crystalModuleSlots||{});
    SLOTS.forEach(s=>{const d=item(slots[s]);if(!d)return;Object.keys(d.stats||{}).forEach(k=>out[k]=(out[k]||0)+d.stats[k]);Object.keys(d.drawback||{}).forEach(k=>out[k]=(out[k]||0)+d.drawback[k]);out.sets[d.setId]=(out.sets[d.setId]||0)+1;});
    Object.keys(out.sets).forEach(id=>{
      const set=SETS[id],count=out.sets[id];
      [2,4].forEach(need=>{
        if(count<need||!set||!set.tiers||!set.tiers[need])return;
        const tier=set.tiers[need],stats=tier.stats||{};
        Object.keys(stats).forEach(k=>out[k]=(out[k]||0)+stats[k]);
        out.activeSetTiers.push({setId:id,pieces:need});
      });
    });
    return out;
  }
  function gradeForDifficulty(difficulty){return Math.max(2,Math.min(6,Math.floor(difficulty||2)));}
  function nextDrop(inventory,difficulty,targetSetId){
    const grade=gradeForDifficulty(difficulty);
    const setId=SETS[targetSetId]?targetSetId:"survey";
    const pool=ITEMS.filter(d=>d.grade===grade&&d.setId===setId);
    return pool.length?pool[Math.floor(Math.random()*pool.length)].id:null;
  }
  global.PZModules={SLOTS,SLOT_TEXT,SETS,ITEMS,item,emptySlots,normalize,totals,nextDrop,gradeForDifficulty,BASE_ITEMS};
})(window);
