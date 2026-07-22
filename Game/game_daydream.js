// Project Zero V49 - Daydream Reconstruction Gameplay
// Independent roguelite investigation module. No battle-core edits.
(function(global){
  "use strict";

  function saveKey(){const ns=global.getProjectZeroSaveNamespace?global.getProjectZeroSaveNamespace():"guest";return ns+"_daydream_v49";}
  const RUN_VERSION = 53;
  const MAX_POLLUTION = 100;
  const BASE_WILL = 72;
  const MAX_RECONSTRUCTION_LEVEL = 120;
  const LEVEL_EXP_REQUIRED = 120;
  const traitPool = [
    {id:"lucid",zh:"清醒余韵",en:"Lucid Afterglow",descZh:"初始意志 +12",descEn:"Starting Will +12",will:12},
    {id:"finder",zh:"寻迹者",en:"Trace Seeker",descZh:"初始线索 +2",descEn:"Starting Clue +2",clue:2},
    {id:"ward",zh:"旧日御守",en:"Old Omamori",descZh:"初始污染 -10%",descEn:"Starting Pollution -10%",pollution:-10},
    {id:"edge",zh:"断刃回声",en:"Broken Blade Echo",descZh:"首场战斗获得强化",descEn:"First battle empowered",buff:1},
    {id:"reserve",zh:"应急储备",en:"Emergency Reserve",descZh:"全队精神值 +10",descEn:"Squad Spirit +10",spirit:10},
    {id:"mirror",zh:"镜中预兆",en:"Mirror Omen",descZh:"额外显现一个前方节点",descEn:"Reveal one extra node",reveal:1}
  ];

  // Project 1 is the entry difficulty. Project 0 is the deepest and most
  // dangerous reconstruction. Every tier deliberately carries one benefit
  // and one drawback so difficulty changes decisions, not only enemy HP.
  const difficultyDefs = [
    {id:1,rank:1,posZh:"清醒：初始意志 +8",posEn:"Lucidity: Starting Will +8",negZh:"浅层回声：战斗强度 +0%",negEn:"Shallow Echo: Combat power +0%",will:8,enemy:0,boss:0,branches:0,eventChoices:0,reward:1.00,pollution:0},
    {id:2,rank:2,posZh:"储备：初始梦境碎片 +1",posEn:"Reserve: Starting Dream Shard +1",negZh:"躁动：敌人强度 +6%",negEn:"Agitation: Enemy power +6%",shards:1,enemy:.06,boss:.08,branches:0,eventChoices:0,reward:1.08,pollution:1},
    {id:3,rank:3,posZh:"寻迹：初始线索 +1",posEn:"Trace: Starting Clue +1",negZh:"侵染：每层额外污染 +2%",negEn:"Taint: +2% extra pollution per floor",clue:1,enemy:.11,boss:.14,branches:1,eventChoices:0,reward:1.16,pollution:2},
    {id:4,rank:4,posZh:"共鸣：战斗增益 +1",posEn:"Resonance: Combat buff +1",negZh:"硬化：敌人强度 +17%",negEn:"Hardening: Enemy power +17%",combatBuff:1,enemy:.17,boss:.22,branches:1,eventChoices:0,reward:1.24,pollution:3},
    {id:5,rank:5,posZh:"辨路：额外显现 1 个节点",posEn:"Pathfinding: Reveal 1 extra node",negZh:"低语：事件污染效果 +25%",negEn:"Whispers: Event pollution +25%",reveal:1,enemy:.23,boss:.31,branches:1,eventChoices:1,reward:1.34,pollution:4,eventPollution:.25},
    {id:6,rank:6,posZh:"回收：战斗奖励碎片 +1",posEn:"Recovery: +1 Shard from battles",negZh:"追猎：追踪者提前 1 个节点发动",negEn:"Pursuit: Hunter attacks 1 node earlier",battleShard:1,enemy:.30,boss:.41,branches:2,eventChoices:1,reward:1.46,pollution:5,pursuit:1},
    {id:7,rank:7,posZh:"逆流：每层进入时意志 +4",posEn:"Counterflow: Will +4 on each floor",negZh:"裂解：敌人强度 +38%",negEn:"Fracture: Enemy power +38%",floorWill:4,enemy:.38,boss:.53,branches:2,eventChoices:1,reward:1.60,pollution:6},
    {id:8,rank:8,posZh:"深层记录：剧情节点线索额外 +1",posEn:"Deep Record: Story nodes grant +1 Clue",storyClue:1,negZh:"梦蚀：梦魇副作用 +35%",negEn:"Dream Erosion: Nightmare drawbacks +35%",enemy:.47,boss:.67,branches:2,eventChoices:1,reward:1.76,pollution:7,nightmareScale:.35},
    {id:9,rank:9,posZh:"高危回报：调查经验 +90%",posEn:"High-Risk Return: Investigation EXP +90%",negZh:"失序：敌人 +57%，初始污染 +10%",negEn:"Disorder: Enemies +57%, starting Pollution +10%",enemy:.57,boss:.82,branches:3,eventChoices:1,reward:1.90,pollution:10},
    {id:0,rank:10,posZh:"零级观测：线索 +2、经验 +120%",posEn:"Project Zero Survey: Clue +2, EXP +120%",negZh:"绝对梦境：敌人 +70%，Boss +100%，初始污染 +15%",negEn:"Absolute Dream: Enemies +70%, Boss +100%, starting Pollution +15%",clue:2,enemy:.70,boss:1.00,branches:4,eventChoices:1,reward:2.20,pollution:15,pursuit:1,nightmareScale:.50}
  ];
  function difficultyById(id){return difficultyDefs.find(d=>d.id===Number(id))||difficultyDefs[0];}

  function lang(){ return global.language === "en" ? "en" : "zh"; }
  function T(zh,en){ return lang()==="en" ? en : zh; }
  function now(){ return Date.now(); }
  function rand(seed){
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function clickRect(x,y,w,h){ return global.clicked && global.inRect && global.inRect(x,y,w,h); }
  function pulseColor(base="#9b7cff"){ return base; }
  function playerLevel(){
    const p = global.player || {};
    return Number(p.level || p.lv || global.playerLevel || 1) || 1;
  }
  function crystal(){ return Number(global.crystal || global.crystals || 0) || 0; }
  function safeCenter(text, frames=90){ if(global.showCenter) global.showCenter(text, frames); }
  function sfx(name){ if(global.sfx) global.sfx(name); }

  const nodeTypes = {
    story:{zh:"剧情",en:"Story",color:"#9b7cff"},
    event:{zh:"事件",en:"Event",color:"#ffe066"},
    battle:{zh:"战斗",en:"Battle",color:"#ff6b9b"},
    safe:{zh:"休整",en:"Rest",color:"#7cffb2"},
    nightmare:{zh:"梦魇",en:"Nightmare",color:"#b15cff"},
    portal:{zh:"传送",en:"Portal",color:"#5ce1e6"},
    boss:{zh:"追猎者",en:"Pursuer",color:"#ff6b6b"},
    exit:{zh:"层级终点",en:"Floor Exit",color:"#ff9955"}
  };

  const nightmarePool = [
    {id:"bell", zh:"神乐铃", en:"Kagura Bell", descZh:"铃声让路径变得清晰，但污染轻微上升。", descEn:"The bell clarifies the path, but raises pollution slightly.", clue:1, pollution:5},
    {id:"torii", zh:"鸟居残片", en:"Torii Fragment", descZh:"残片指向了日斩的入口。", descEn:"The fragment points toward Hizan's entrance.", clue:2, pollution:3},
    {id:"blade", zh:"断刃", en:"Broken Blade", descZh:"断刃会强化下一次战斗判定。", descEn:"The broken blade strengthens the next combat check.", buff:"combat", pollution:6},
    {id:"omamori", zh:"御守", en:"Omamori", descZh:"旧御守暂时压住了精神污染。", descEn:"An old charm briefly suppresses contamination.", pollution:-8},
    {id:"paper", zh:"纸人", en:"Paper Doll", descZh:"纸人记录了一个不属于你的记忆。", descEn:"The paper doll records a memory that is not yours.", clue:1, pollution:8},
    {id:"mask", zh:"狐狸面", en:"Fox Mask", descZh:"面具让你看见了另一条路。", descEn:"The mask reveals another route.", clue:1, will:6},
    {id:"mirror", zh:"镜", en:"Mirror", descZh:"镜中倒影确认了一个关键真相。", descEn:"The reflection confirms a key truth.", clue:3, pollution:10},
    {id:"finality", zh:"终焉", en:"Finality", descZh:"它不应该在这里出现。", descEn:"It should not appear here.", clue:2, pollution:14},
    {id:"redThread", zh:"断裂红线", en:"Severed Red Thread", descZh:"红线记住了曾经同行的人，意志提高但污染也随之靠近。", descEn:"The thread remembers a former companion. Will rises, but contamination draws closer.", will:10, pollution:7},
    {id:"raincoat", zh:"无主雨衣", en:"Ownerless Raincoat", descZh:"雨衣隔绝了回声，却遮住了一部分道路。", descEn:"The coat blocks the echoes, but hides part of the route.", will:8, clue:-1, pollution:-4},
    {id:"ticket", zh:"末班车票", en:"Last Train Ticket", descZh:"车票记录着不存在的终点站。", descEn:"The ticket names a terminal that never existed.", clue:2, pollution:9},
    {id:"musicBox", zh:"停摆八音盒", en:"Silent Music Box", descZh:"缺失的旋律让队伍恢复片刻清醒。", descEn:"The missing melody grants the squad a moment of clarity.", will:12, pollution:-3},
    {id:"glassEye", zh:"玻璃眼", en:"Glass Eye", descZh:"它能看见隐藏节点，也会放大梦境中的异常。", descEn:"It sees hidden nodes while magnifying dream anomalies.", clue:2, pollution:11},
    {id:"ashLetter", zh:"灰烬信件", en:"Ashen Letter", descZh:"信中只有收件人的名字仍可辨认。", descEn:"Only the recipient's name remains readable.", clue:2, will:5, pollution:5},
    {id:"emptyKey", zh:"空心钥匙", en:"Hollow Key", descZh:"钥匙能打开错位门扉，但会带走一段记忆。", descEn:"The key opens displaced gates, but takes a memory in return.", clue:-1, buff:"combat", pollution:8},
    {id:"whiteFeather", zh:"逆落白羽", en:"Rising White Feather", descZh:"羽毛向上坠落，提醒调查者这里没有可靠的方向。", descEn:"The feather falls upward, warning that direction cannot be trusted here.", will:7, clue:1, pollution:6},
    {id:"silentRadio",zh:"静默电台",en:"Silent Radio",descZh:"电台只在无人说话时播报下一处坐标。",descEn:"The radio announces the next coordinates only when no one speaks.",clue:2,will:-4,pollution:5},
    {id:"blueCandle",zh:"逆燃蓝烛",en:"Reverse Blue Candle",descZh:"火焰向烛芯深处燃烧，暂时稳定队伍的精神。",descEn:"Its flame burns inward, briefly stabilizing the squad.",will:10,pollution:-5},
    {id:"foldedMap",zh:"折叠街图",en:"Folded Street Map",descZh:"展开后出现一条现实中不存在的支路。",descEn:"Unfolded, it reveals a side road absent from reality.",clue:1,buff:"combat",pollution:7},
    {id:"clock13",zh:"第十三刻钟",en:"Thirteenth Minute",descZh:"指针多走了一格，追猎者的脚步因此短暂停顿。",descEn:"The hand advances once too far, briefly delaying the pursuer.",will:5,pollution:6,pursuitDelay:1},
    {id:"glassFlower",zh:"玻璃花",en:"Glass Flower",descZh:"花瓣保存着一段清醒记忆，但触碰会放大回声。",descEn:"Its petals preserve a lucid memory, but touch magnifies the echo.",clue:2,will:6,pollution:10},
    {id:"blackUmbrella",zh:"无雨黑伞",en:"Rainless Umbrella",descZh:"伞下听不见低语，也无法看清远处节点。",descEn:"Whispers vanish beneath it, along with distant nodes.",will:12,clue:-1,pollution:-4},
    {id:"archiveSeal",zh:"失效档案封条",en:"Broken Archive Seal",descZh:"封条证明这段记录曾被人为隐藏。",descEn:"The seal proves that this record was deliberately hidden.",clue:3,pollution:12},
    {id:"twinCoin",zh:"双面同纹币",en:"Twin-Faced Coin",descZh:"硬币两面完全相同，每次选择都留下另一种结果。",descEn:"Both sides are identical; every choice leaves behind another outcome.",clue:1,will:8,pollution:8},
    {id:"inkBlade",zh:"墨染残刃",en:"Ink-Stained Blade",descZh:"刀身没有锋刃，挥动时却能切开一层伪装。",descEn:"The bladeless sword can still cut through one layer of deception.",clue:2,buff:"combat",pollution:8},
    {id:"sakuraAsh",zh:"灰樱",en:"Ashen Sakura",descZh:"落下的花瓣不会触地，收集后能稳定片刻意识。",descEn:"The falling petals never land; gathering them briefly steadies the mind.",will:9,pollution:-3},
    {id:"namelessTablet",zh:"无名灵牌",en:"Nameless Tablet",descZh:"空白木牌保存了剑客任务的片段，但会混淆队伍记忆。",descEn:"The blank tablet holds a fragment of the swordsman's mission, but blurs the squad's memory.",clue:3,will:-5,pollution:7},
    {id:"reverseTorii",zh:"逆立鸟居",en:"Inverted Torii",descZh:"倒悬的鸟居显现捷径，也会让追猎者更快察觉调查。",descEn:"The inverted gate reveals a shortcut while drawing the pursuer's attention.",clue:2,pursuitDelay:-1,pollution:6},
    {id:"emptyScabbard",zh:"空鞘",en:"Empty Scabbard",descZh:"刀鞘仍残留出鞘的回声，下一次战斗获得强化。",descEn:"The scabbard retains the echo of a drawn blade, empowering the next battle.",buff:"combat",will:5,pollution:5},
    {id:"moonWater",zh:"月影水盏",en:"Moonlit Water Cup",descZh:"饮下倒映月光的水，污染下降，但一条线索随倒影消失。",descEn:"Drinking the reflected moonlight lowers contamination, but one clue vanishes with it.",clue:-1,pollution:-10},
    {id:"brokenBell",zh:"断绳风铃",en:"Severed Wind Chime",descZh:"没有风也会作响，能延缓追猎者一个节点。",descEn:"It rings without wind and delays the pursuer by one node.",will:5,pursuitDelay:1,pollution:6},
    {id:"shojiEye",zh:"障子后的眼",en:"Eye Behind the Shoji",descZh:"它替调查员观察未显现的路线，同时放大精神噪声。",descEn:"It watches unrevealed paths for the investigator while amplifying mental noise.",clue:2,will:-4,pollution:9}
  ];

  const eventPool = [
    {
      id:"station", titleZh:"无人车站", titleEn:"Empty Station",
      bodyZh:"站台广播不断重复你的代号。远处有一张掉落的调查卡。",
      bodyEn:"The platform broadcast repeats your code name. A dropped investigation card lies nearby.",
      choices:[
        {zh:"拾起调查卡", en:"Take the card", clue:2, pollution:7, msgZh:"获得线索 +2，污染 +7%。", msgEn:"Clue +2, Pollution +7%."},
        {zh:"关闭广播", en:"Shut down the broadcast", will:8, pollution:3, msgZh:"意志 +8，污染 +3%。", msgEn:"Will +8, Pollution +3%."},
        {zh:"直接离开", en:"Leave", pollution:1, msgZh:"你没有停留。污染 +1%。", msgEn:"You do not stay. Pollution +1%."}
      ]
    },
    {
      id:"shrine", titleZh:"破旧神社", titleEn:"Ruined Shrine",
      bodyZh:"神社中央有一口干井，井底传来敲击声。",
      bodyEn:"At the center of the shrine is a dry well. Knocking echoes from below.",
      choices:[
        {zh:"向井底呼喊", en:"Call into the well", clue:1, pollution:5, msgZh:"线索 +1，污染 +5%。", msgEn:"Clue +1, Pollution +5%."},
        {zh:"封住井口", en:"Seal the well", will:10, msgZh:"意志 +10。", msgEn:"Will +10."},
        {zh:"投入晶体碎片", en:"Drop a crystal shard", clue:2, pollution:10, nightmare:true, msgZh:"线索 +2，污染 +10%，梦魇显现。", msgEn:"Clue +2, Pollution +10%, a Nightmare appears."}
      ]
    },
    {
      id:"classroom", titleZh:"旧教室", titleEn:"Old Classroom",
      bodyZh:"黑板上写着：不要相信醒来后的第一句话。",
      bodyEn:"On the blackboard: Do not trust the first sentence after waking.",
      choices:[
        {zh:"记录文字", en:"Record the sentence", clue:2, pollution:4, msgZh:"线索 +2，污染 +4%。", msgEn:"Clue +2, Pollution +4%."},
        {zh:"擦掉黑板", en:"Erase the board", will:6, pollution:-3, msgZh:"意志 +6，污染 -3%。", msgEn:"Will +6, Pollution -3%."},
        {zh:"翻找课桌", en:"Search desks", clue:1, item:"note", msgZh:"获得线索 +1，并记录一页笔记。", msgEn:"Clue +1 and a note recorded."}
      ]
    },
    {
      id:"river", titleZh:"黑水河", titleEn:"Blackwater River",
      bodyZh:"河面倒映着没有发生过的结局。你可以涉水，也可以绕路。",
      bodyEn:"The river reflects endings that never happened. You can cross or detour.",
      choices:[
        {zh:"涉水穿过", en:"Cross the river", clue:2, pollution:12, msgZh:"线索 +2，污染 +12%。", msgEn:"Clue +2, Pollution +12%."},
        {zh:"沿岸调查", en:"Investigate the bank", clue:1, will:4, msgZh:"线索 +1，意志 +4。", msgEn:"Clue +1, Will +4."},
        {zh:"绕开", en:"Take a detour", pollution:-4, msgZh:"污染 -4%。", msgEn:"Pollution -4%."}
      ]
    },
    {
      id:"phone", titleZh:"无人来电", titleEn:"Call From No One",
      bodyZh:"一部没有电池的电话正在响，屏幕上显示的是调查开始前一分钟。",
      bodyEn:"A phone without a battery is ringing. Its screen shows one minute before the investigation began.",
      choices:[
        {zh:"接听",en:"Answer",clue:3,pollution:12,msgZh:"你听见了自己的警告。线索 +3，污染 +12%。",msgEn:"You hear your own warning. Clue +3, Pollution +12%."},
        {zh:"记录号码",en:"Record the number",clue:2,pollution:5,msgZh:"号码被记入档案。线索 +2，污染 +5%。",msgEn:"The number is archived. Clue +2, Pollution +5%."},
        {zh:"破坏电话",en:"Destroy the phone",will:8,pollution:2,msgZh:"铃声停止。意志 +8，污染 +2%。",msgEn:"The ringing stops. Will +8, Pollution +2%."}
      ]
    },
    {
      id:"hotel", titleZh:"重复旅馆", titleEn:"Repeating Hotel",
      bodyZh:"走廊里的每扇门都通向同一个房间，桌上摆着三把不同的钥匙。",
      bodyEn:"Every door opens into the same room. Three different keys rest on the desk.",
      choices:[
        {zh:"选择生锈钥匙",en:"Take the rusted key",clue:2,pollution:7,msgZh:"门后留下旧调查队的编号。线索 +2，污染 +7%。",msgEn:"An old investigation number waits beyond the door. Clue +2, Pollution +7%."},
        {zh:"选择白色钥匙",en:"Take the white key",will:10,pollution:4,msgZh:"房间恢复安静。意志 +10，污染 +4%。",msgEn:"The room becomes quiet. Will +10, Pollution +4%."},
        {zh:"不拿钥匙",en:"Take no key",pollution:-5,msgZh:"你拒绝进入循环。污染 -5%。",msgEn:"You refuse the loop. Pollution -5%."}
      ]
    },
    {
      id:"gallery", titleZh:"缺席者画廊", titleEn:"Gallery of the Absent",
      bodyZh:"墙上的肖像会在你移开视线时改变位置，其中一幅没有脸。",
      bodyEn:"The portraits change places whenever you look away. One has no face.",
      choices:[
        {zh:"检查无脸肖像",en:"Inspect the faceless portrait",clue:3,pollution:10,msgZh:"画框背面刻着新的坐标。线索 +3，污染 +10%。",msgEn:"New coordinates are carved behind the frame. Clue +3, Pollution +10%."},
        {zh:"为肖像编号",en:"Catalog the portraits",clue:2,will:4,msgZh:"变化出现了规律。线索 +2，意志 +4。",msgEn:"A pattern emerges. Clue +2, Will +4."},
        {zh:"闭眼离开",en:"Leave with eyes closed",will:6,pollution:-2,msgZh:"你没有再回头。意志 +6，污染 -2%。",msgEn:"You do not look back. Will +6, Pollution -2%."}
      ]
    },
    {
      id:"canteen", titleZh:"空席餐厅", titleEn:"Table for the Missing",
      bodyZh:"餐桌摆着五套餐具，只有四把椅子。第五份食物仍有温度。",
      bodyEn:"Five settings wait at a table with only four chairs. The fifth meal is still warm.",
      choices:[
        {zh:"检查第五套餐具",en:"Inspect the fifth setting",clue:2,pollution:8,msgZh:"餐具底部写着日斩。线索 +2，污染 +8%。",msgEn:"Hizan is written beneath the plate. Clue +2, Pollution +8%."},
        {zh:"移走多余餐具",en:"Remove the extra setting",will:8,pollution:3,msgZh:"房间的回声减弱。意志 +8，污染 +3%。",msgEn:"The room's echo weakens. Will +8, Pollution +3%."},
        {zh:"留下梦境碎片",en:"Leave a Dream Shard",clue:1,nightmare:true,msgZh:"某个座位被拉开。线索 +1，梦魇显现。",msgEn:"A chair pulls itself out. Clue +1, a Nightmare appears."}
      ]
    },
    {
      id:"elevator",titleZh:"负一层之下",titleEn:"Below Floor B1",bodyZh:"电梯面板只有向下键，楼层数字却在不断上升。",bodyEn:"The elevator has only a down button, while its floor number keeps rising.",
      choices:[
        {zh:"按下向下键",en:"Press Down",clue:2,pollution:9,msgZh:"电梯停在一段被删除的楼层。线索 +2，污染 +9%。",msgEn:"It stops at a deleted floor. Clue +2, Pollution +9%."},
        {zh:"拆开控制面板",en:"Open the Panel",will:8,clue:1,msgZh:"你切断了循环线路。意志 +8，线索 +1。",msgEn:"You disconnect the loop circuit. Will +8, Clue +1."},
        {zh:"走安全梯",en:"Take the Stairs",pollution:-4,msgZh:"脚步声始终比队伍多一个。污染 -4%。",msgEn:"There is always one extra set of footsteps. Pollution -4%."}
      ]
    },
    {
      id:"museum",titleZh:"未来遗物馆",titleEn:"Museum of Future Relics",bodyZh:"展柜里陈列着尚未发生的调查记录，其中一份写着你的代号。",bodyEn:"The cases display investigation records that have not happened. One bears your code name.",
      choices:[
        {zh:"阅读自己的记录",en:"Read Your Record",clue:3,pollution:13,msgZh:"结局页被撕走。线索 +3，污染 +13%。",msgEn:"The ending page is missing. Clue +3, Pollution +13%."},
        {zh:"对照其他档案",en:"Compare Records",clue:2,will:5,msgZh:"重复内容暴露了梦境规律。线索 +2，意志 +5。",msgEn:"Repeated details reveal a pattern. Clue +2, Will +5."},
        {zh:"封闭展柜",en:"Seal the Cases",will:9,pollution:2,msgZh:"展馆暂时安静。意志 +9，污染 +2%。",msgEn:"The museum falls quiet. Will +9, Pollution +2%."}
      ]
    },
    {
      id:"crossroad",titleZh:"四向同路口",titleEn:"Four-Way Same Road",bodyZh:"四条道路拥有完全相同的路牌，却传来不同队员的呼喊。",bodyEn:"Four roads carry identical signs, but each echoes a different teammate.",
      choices:[
        {zh:"跟随铃声",en:"Follow the Bell",clue:2,pollution:6,msgZh:"铃声指向隐藏档案。线索 +2，污染 +6%。",msgEn:"The bell leads to a hidden archive. Clue +2, Pollution +6%."},
        {zh:"标记后随机选择",en:"Mark and Choose",will:7,clue:1,msgZh:"标记没有改变位置。意志 +7，线索 +1。",msgEn:"The marks remain in place. Will +7, Clue +1."},
        {zh:"原地等待",en:"Wait",pollution:8,nightmare:true,msgZh:"第五条道路在身后出现。污染 +8%，梦魇显现。",msgEn:"A fifth road appears behind you. Pollution +8%, a Nightmare appears."}
      ]
    },
    {
      id:"greenhouse",titleZh:"夜色温室",titleEn:"Midnight Greenhouse",bodyZh:"植物随着队伍的记忆开花，玻璃外却始终是同一分钟。",bodyEn:"Plants bloom with the squad's memories, while the same minute persists beyond the glass.",
      choices:[
        {zh:"采集花粉样本",en:"Collect Pollen",clue:2,pollution:10,msgZh:"样本记录了精神波形。线索 +2，污染 +10%。",msgEn:"The sample records a mental waveform. Clue +2, Pollution +10%."},
        {zh:"打开遮光板",en:"Open the Shutters",will:10,pollution:-2,msgZh:"虚假的夜色消退。意志 +10，污染 -2%。",msgEn:"The false night recedes. Will +10, Pollution -2%."},
        {zh:"寻找园丁日志",en:"Find the Log",clue:1,item:"note",msgZh:"获得一页观察日志。线索 +1。",msgEn:"An observation log is recovered. Clue +1."}
      ]
    },
    {
      id:"broadcast",titleZh:"延迟广播室",titleEn:"Delayed Broadcast Room",bodyZh:"广播正在播报队伍几分钟后才会说出的句子。",bodyEn:"The broadcast repeats sentences the squad will not speak for several minutes.",
      choices:[
        {zh:"记录全部内容",en:"Record Everything",clue:3,pollution:11,msgZh:"未来片段被写入档案。线索 +3，污染 +11%。",msgEn:"Future fragments enter the archive. Clue +3, Pollution +11%."},
        {zh:"改变下一句话",en:"Change the Next Line",will:9,pollution:5,msgZh:"广播短暂失去同步。意志 +9，污染 +5%。",msgEn:"The broadcast briefly loses sync. Will +9, Pollution +5%."},
        {zh:"切断电源",en:"Cut Power",pollution:-5,msgZh:"黑暗中仍有播报声。污染 -5%。",msgEn:"The broadcast continues in darkness. Pollution -5%."}
      ]
    }
  ];

  eventPool.push(
    {id:"thousandTorii",titleZh:"千重鸟居",titleEn:"Thousand Torii",bodyZh:"每一道鸟居后都站着一名相同的剑客，只有刀鞘磨损的位置不同。",bodyEn:"An identical swordsman stands beyond every gate; only the wear on each scabbard differs.",choices:[
      {zh:"核对任务档案",en:"Check the Mission File",clue:3,pollution:7,msgZh:"磨损位置与档案中的惯用手一致。线索 +3，污染 +7%。",msgEn:"The wear matches the handedness in the file. Clue +3, Pollution +7%."},
      {zh:"相信最近的身影",en:"Trust the Nearest Figure",will:7,pollution:9,msgZh:"身影没有回答，只为队伍让开道路。意志 +7，污染 +9%。",msgEn:"The figure gives no answer, but opens a path. Will +7, Pollution +9%."},
      {zh:"拒绝辨认",en:"Refuse to Identify",pollution:-3,msgZh:"队伍撤回入口重新标记路线。污染 -3%。",msgEn:"The squad returns to the entrance and marks the route again. Pollution -3%."}
    ]},
    {id:"silentShrine",titleZh:"寂静神社",titleEn:"Silent Shrine",bodyZh:"协会记录仪显示钟声震动，调查员却听不见任何声音。",bodyEn:"Association instruments detect a bell's vibration, though the investigator hears nothing.",choices:[
      {zh:"记录震动频率",en:"Record the Frequency",clue:2,will:5,msgZh:"频率与剑客失踪前的通讯相同。线索 +2，意志 +5。",msgEn:"It matches the swordsman's final transmission. Clue +2, Will +5."},
      {zh:"敲响神社铃",en:"Ring the Shrine Bell",clue:1,pollution:11,nightmare:true,msgZh:"另一道铃声从队伍身后回应。线索 +1，梦魇显现。",msgEn:"Another bell answers from behind the squad. Clue +1, a Nightmare appears."},
      {zh:"封锁区域",en:"Seal the Area",will:9,pollution:2,msgZh:"标准调查程序稳定了队伍。意志 +9，污染 +2%。",msgEn:"Standard investigation procedure steadies the squad. Will +9, Pollution +2%."}
    ]},
    {id:"scarHall",titleZh:"刀痕回廊",titleEn:"Blade-Scar Hall",bodyZh:"墙上的刀痕组成两份互相矛盾的行动记录。",bodyEn:"Sword scars across the walls form two conflicting mission records.",choices:[
      {zh:"读取较旧的刀痕",en:"Read the Older Scars",clue:3,pollution:8,msgZh:"旧痕记录了任务目标被临时更改。线索 +3，污染 +8%。",msgEn:"The older scars show the objective was changed mid-mission. Clue +3, Pollution +8%."},
      {zh:"读取较新的刀痕",en:"Read the Newer Scars",will:8,clue:1,msgZh:"新痕反复写着“不要相信第一眼”。意志 +8，线索 +1。",msgEn:"The newer scars repeat: 'Do not trust the first sight.' Will +8, Clue +1."},
      {zh:"扫描后离开",en:"Scan and Leave",pollution:-4,msgZh:"数据交由协会设备解析。污染 -4%。",msgEn:"Association equipment keeps the data for later analysis. Pollution -4%."}
    ]}
  );

  const storyPool = [
    {id:"reopened",zh:"重启的失踪档案",en:"The Reopened Missing-Person File",bodyZh:"厄落伊白日梦消除协会重新开启沉寂多年的案件。作为本次调查员，你带领执行官进入由失踪剑客执念形成的白日梦。",bodyEn:"The Eloi Daydream Elimination Association reopens a long-dormant case. As its investigator, you lead the Executors into a Daydream shaped by a missing swordsman's obsession."},
    {id:"firstTorii",zh:"第一重鸟居",en:"The First Torii",bodyZh:"鸟居、神社与樱花并不属于同一段记忆。调查设备确认，它们被某种执念强行拼接。",bodyEn:"The torii, shrine, and sakura do not belong to the same memory. Survey equipment confirms that an obsession forced them together."},
    {id:"scarMap",zh:"遍布世界的刀痕",en:"Scars Across the World",bodyZh:"刀痕不是破坏留下的痕迹，而是一张地图：剑客曾反复尝试寻找离开白日梦的路线。",bodyEn:"The scars are not mere damage but a map: the swordsman repeatedly tried to find a way out of the Daydream."},
    {id:"falseVoice",zh:"不属于队伍的呼喊",en:"A Voice Outside the Squad",bodyZh:"通讯频道出现了调查员自己的声音，要求队伍偏离协会标记。记录显示，这段通讯从未发送。",bodyEn:"The investigator's own voice orders the squad away from Association markers. The log confirms that message was never sent."},
    {id:"twoSwordsmen",zh:"两名剑客",en:"Two Swordsmen",bodyZh:"庭院中出现两名相同的剑客。一人请求救援，另一人警告队伍不要靠近。仅凭外表无法判断谁是真正目标。",bodyEn:"Two identical swordsmen appear in the courtyard. One asks for rescue; the other warns the squad away. Appearance alone cannot identify the real target."},
    {id:"missionChange",zh:"被更改的任务",en:"The Altered Mission",bodyZh:"残留档案证明，剑客失踪前收到了一份被篡改的任务指令。白日梦一直在重演他最后一次判断。",bodyEn:"A recovered file proves the swordsman's last orders were altered. The Daydream has been replaying his final judgment ever since."},
    {id:"sakuraTest",zh:"樱落测试",en:"Falling Sakura Test",bodyZh:"真实剑客记得花瓣会避开旧刀伤；梦魇复制了外表，却不知道这段习惯。",bodyEn:"The real swordsman remembers that petals drift around an old sword scar. The Nightmare copied his appearance, but not that habit."},
    {id:"associationChoice",zh:"调查员的判断",en:"The Investigator's Judgment",bodyZh:"协会无法替你确认目标。线索、精神状态与此前每一次选择，将共同决定这次调查的结局。",bodyEn:"The Association cannot confirm the target for you. Your evidence, mental state, and every earlier choice will determine the outcome."},
    {id:"truthOfHizan",zh:"日斩的诞生",en:"The Birth of Hizan",bodyZh:"日斩并非剑客的名字，而是案件代号。它由任务被篡改的恐惧、未能完成职责的执念，以及梦魇的模仿共同形成。",bodyEn:"Hizan is not the swordsman's name, but the case code. It formed from fear of the altered mission, obsession with unfinished duty, and the Nightmare's imitation."},
    {id:"finalGate",zh:"最后的鸟居",en:"The Final Torii",bodyZh:"出口只允许调查队与一名目标通过。你必须决定带走谁、相信什么，以及是否还有人需要留下维持通道。",bodyEn:"The exit admits the investigation squad and only one target. You must decide whom to take, what to believe, and whether anyone must remain to hold the route."},
    {id:"archiveEcho",zh:"协会回收记录",en:"Association Recovery Log",bodyZh:"每次调查都会留下不同版本的报告。五份结局档案互相矛盾，却都包含一部分真实。",bodyEn:"Each investigation leaves a different report. The five ending files contradict one another, yet each contains part of the truth."},
    {id:"afterimage",zh:"归档后的残响",en:"Echo After Archiving",bodyZh:"任务结束后，记录仪仍偶尔捕捉到刀刃出鞘的声音。案件是否真正结束，取决于调查员带回了什么。",bodyEn:"After the mission, recorders still occasionally capture a blade leaving its scabbard. Whether the case truly ended depends on what the investigator brought back."}
  ];

  const battlePool = [
    {id:"village", zh:"废弃村落", en:"Abandoned Village", power:38, rewardClue:1, pollution:6},
    {id:"street", zh:"结晶街道", en:"Crystalized Street", power:45, rewardClue:2, pollution:8},
    {id:"lantern", zh:"灯笼回廊", en:"Lantern Corridor", power:52, rewardClue:2, pollution:10},
    {id:"gate", zh:"深层门前", en:"Before the Deep Gate", power:60, rewardClue:3, pollution:12}
  ];

  const endingDefs = {
    truth:{nameZh:"刀痕下的真相", nameEn:"Truth Beneath the Scars", hintZh:"调查员带回了被篡改的任务记录，案件的真实轮廓终于显现。", hintEn:"The investigator returns with the altered orders, finally revealing the case's true outline."},
    nightmare:{nameZh:"梦魇的谎言", nameEn:"The Nightmare's Lie", hintZh:"队伍相信了被复制的记忆，将错误的目标带回协会。", hintEn:"The squad trusts a copied memory and returns with the wrong target."},
    contamination:{nameZh:"失真", nameEn:"Dissolution", hintZh:"精神污染使判断失去可靠性，调查被协会紧急中止。", hintEn:"Contamination makes every judgment unreliable, forcing the Association to terminate the investigation."},
    redemption:{nameZh:"真正的剑客", nameEn:"The True Swordsman", hintZh:"调查员识破伪装，带着真正的剑客与执行官一同离开日斩。", hintEn:"The investigator sees through the disguise and leaves Hizan with the true swordsman and the Executors."},
    sacrifice:{nameZh:"留在日斩", nameEn:"Left in Hizan", hintZh:"任务完成，但出口在最后一刻闭合；协会只收到调查员留在日斩中的微弱信号。", hintEn:"The mission succeeds, but the exit closes at the final moment; the Association receives only a faint signal from the investigator still inside Hizan."}
  };

  const Daydream = {
    page:"home", // home / setupTraits / setupSquad / run / level / codex / endings / result / defeat
    pulse:0,
    message:"",
    state:null,
    result:null,
    entryAnim:1,
    entryPlaying:false,
    setupTraits:[],
    selectedTrait:null,
    selectedDifficulty:1,
    setupSquad:[0,1,2],
    defeatSummary:null,
    loadedSaveKey:"",
    pendingLayer:0,
    restOffers:[],
    selectedLevel:1,
    levelTrackPage:0,

    freshState(){
      return {version:RUN_VERSION,totalRuns:0,bestClue:0,unlockedEndings:{},unlockedNightmares:{},reconstructionExp:0,levelClaimed:{},activeRun:null};
    },

    reloadForCurrentAccount(reset=false){
      const key=saveKey();
      // Never carry runtime state across guest/email accounts. The storage key
      // is account-scoped, but this module previously kept the old object in
      // memory after the main account changed.
      this.state=null;
      this.run=null;
      this.result=null;
      this.defeatSummary=null;
      this.message="";
      this.page="home";
      this.selectedDaydreamScenario=null;
      this.archiveInline=true;
      if(reset){
        try{ localStorage.removeItem(key); }catch(e){}
      }
      try{
        const raw=localStorage.getItem(key);
        if(raw){
          const data=JSON.parse(raw);
          if(data&&typeof data==="object"&&!Array.isArray(data))this.state=data;
        }
      }catch(e){
        console.warn("[PZDaydream] account save load failed",e);
        try{ localStorage.removeItem(key); }catch(ignore){}
      }
      if(!this.state)this.state=this.freshState();
      this.state.version=RUN_VERSION;
      this.state.unlockedEndings=this.state.unlockedEndings&&typeof this.state.unlockedEndings==="object"?this.state.unlockedEndings:{};
      this.state.unlockedNightmares=this.state.unlockedNightmares&&typeof this.state.unlockedNightmares==="object"?this.state.unlockedNightmares:{};
      this.state.reconstructionExp=Math.max(0,Number(this.state.reconstructionExp)||0);
      this.state.levelClaimed=this.state.levelClaimed&&typeof this.state.levelClaimed==="object"?this.state.levelClaimed:{};
      if(this.state.activeRun&&!this.state.activeRun.completed){
        this.run=this.state.activeRun;
        this.run.dreamShards=Math.max(0,Number(this.run.dreamShards)||0);
        // A browser close or account transition cannot keep a live combat
        // scene. Make that node enterable again instead of permanently stuck.
        this.run.awaitingBattle=false;
        if(this.run.structureVersion!==6){
          this.run.structureVersion=6;this.run.difficultyId=Number.isFinite(Number(this.run.difficultyId))?Number(this.run.difficultyId):1;this.run.difficultyRank=difficultyById(this.run.difficultyId).rank;this.run.layer=clamp(Number(this.run.layer)||1,1,4);this.run.currentNode=0;
          this.run.route=this.makeRoute(this.run.layer);this.run.layerBossDefeated=false;this.run.pursuer=null;
        }
        this.page="run";
      }else{
        this.state.activeRun=null;
      }
      this.loadedSaveKey=key;
      this.save();
      return true;
    },

    startEntryAnimation(){
      this.entryAnim = 0;
      this.entryPlaying = true;
      this.page = "home";
      this.message = T("精神同步中……","Synchronizing...");
    },

    updateEntryAnimation(){
      if(!this.entryPlaying) return;
      const fs = global.frameScale || 1;
      this.entryAnim = Math.min(1, this.entryAnim + 0.022 * fs);
      if(this.entryAnim >= 1) this.entryPlaying = false;
    },

    entryEase(t){
      return 1 - Math.pow(1 - clamp(t,0,1), 3);
    },

    init(){
      this.reloadForCurrentAccount(false);
    },

    save(){
      try{
        // If another account became active, reload it before writing. This is
        // a final guard against saving the previous account's progress under
        // the new namespace.
        if(this.loadedSaveKey&&this.loadedSaveKey!==saveKey()){
          this.reloadForCurrentAccount(false);
          return;
        }
        if(this.state) this.state.activeRun = this.run && !this.run.completed ? this.run : null;
        localStorage.setItem(saveKey(), JSON.stringify(this.state));
        if(typeof global.safeSaveGame==="function")global.safeSaveGame();
      }
      catch(e){ console.warn("[PZDaydream] save failed", e); }
    },

    scenarioName(){ return T("Project Zero：日斩","Project Zero: Hizan"); },
    title(){ return T("白日梦重现","Daydream Reconstruction"); },
    isFullscreen(){ return this.page!=="home" || !!this.selectedDaydreamScenario; },
    endingCount(){ return Object.keys(this.state.unlockedEndings || {}).length; },
    nightmareCount(){ return Object.keys(this.state.unlockedNightmares || {}).length; },
    nightmareTotal(){ return nightmarePool.length; },
    reconstructionLevel(){ return Math.min(MAX_RECONSTRUCTION_LEVEL,1+Math.floor((this.state.reconstructionExp||0)/LEVEL_EXP_REQUIRED)); },
    levelProgress(){ return (this.state.reconstructionExp||0)%LEVEL_EXP_REQUIRED; },
    levelReward(level){
      if(level===120) return {crystals:600,gold:12000,expBooks:12,weaponOre:6};
      if(level%30===0) return {crystals:260,gold:6000,expBooks:6,weaponOre:3};
      if(level%10===0) return {crystals:120,gold:3000,expBooks:3,weaponOre:2};
      if(level%5===0) return {crystals:55,gold:1600,expBooks:2,weaponOre:1};
      if(level%3===0) return {gold:1200,expBooks:2};
      return level%2===0?{crystals:30,gold:700}:{gold:950,expBooks:1};
    },
    rewardLabel(pack){
      const a=[];
      if(pack.crystals)a.push(T("水晶 ×","Crystal ×")+pack.crystals);
      if(pack.gold)a.push(T("金币 ×","Gold ×")+pack.gold);
      if(pack.expBooks)a.push(T("经验书 ×","EXP Book ×")+pack.expBooks);
      if(pack.weaponOre)a.push(T("精炼合金 ×","Weapon Ore ×")+pack.weaponOre);
      return a.join("  ·  ");
    },
    claimLevelReward(level){
      if(level>this.reconstructionLevel()||this.state.levelClaimed[level]) return;
      const r=this.levelReward(level);
      if(global.grantPZDaydreamReward)global.grantPZDaydreamReward(r);
      else{
        if(r.crystals) global.crystals=(global.crystals||0)+r.crystals;
        if(r.gold) global.gold=(global.gold||0)+r.gold;
        if(r.expBooks) global.expBooks=(global.expBooks||0)+r.expBooks;
        if(r.weaponOre) global.weaponOre=(global.weaponOre||0)+r.weaponOre;
      }
      this.state.levelClaimed[level]=true;
      if(global.saveGame) global.saveGame();
      this.save(); sfx("reward"); safeCenter(T("等级奖励已领取","Level reward claimed"),70);
    },

    runDifficulty(){return difficultyById(this.run?this.run.difficultyId:this.selectedDifficulty);},

    makeRoute(layer=1){
      const seed = (now()+layer*7919) % 999999;
      const diff=this.runDifficulty();
      const opening=storyPool[(layer-1)%storyPool.length];
      const route=[{type:"story",zh:opening.zh,en:opening.en,story:opening,resolved:false,mapX:110,mapY:330}];
      const pool=["event","battle","safe","nightmare","event","battle","portal"];
      const interiorCount=14+Math.min(8,Math.floor((diff.branches||0)*1.75));
      const bossIndex=layer>=3?Math.max(6,Math.floor(interiorCount*.62)): -1;
      for(let i=1;i<=interiorCount;i++){
        let type=pool[Math.floor(rand(seed+i*29)*pool.length)];
        if(i%5===2) type="battle";
        if(i%7===5) type="story";
        if(i%8===4) type="safe";
        if(i%9===6) type="portal";
        if(i===bossIndex) type="boss";
        const node={type,resolved:false,mapX:110+i*108,mapY:150+Math.floor(rand(seed+i*43)*320),layer};
        if(type==="event"){
          const base=eventPool[Math.floor(rand(seed+i*17)*eventPool.length)];
          const ev={...base,choices:base.choices.slice()};
          if(diff.eventChoices)ev.choices.push({zh:"深入异常中心",en:"Enter the Anomaly",clue:3,pollution:10+diff.rank,msgZh:"发现高危记录。线索 +3，污染上升。",msgEn:"A high-risk record is recovered. Clue +3, Pollution rises."});
          node.event=ev;node.zh=ev.titleZh;node.en=ev.titleEn;
        }else if(type==="story"){
          const story=storyPool[Math.floor(rand(seed+i*23)*storyPool.length)];node.story=story;node.zh=story.zh;node.en=story.en;
        }else if(type==="battle"){
          const b=battlePool[Math.floor(rand(seed+i*19)*battlePool.length)];node.battle=b;node.zh=b.zh;node.en=b.en;
        }else if(type==="safe"){node.zh="短暂清醒";node.en="Lucid Rest";}
        else if(type==="nightmare"){node.zh="梦魇残响";node.en="Nightmare Echo";}
        else if(type==="portal"){node.zh="错位门扉";node.en="Displaced Gate";node.portalSteps=2;}
        else if(type==="boss"){node.zh=layer===4?"日斩追猎体":"深层追猎体";node.en=layer===4?"Hizan Pursuer":"Depth Pursuer";node.optionalBoss=true;}
        route.push(node);
      }
      route.push({type:"exit",zh:layer===4?"日斩终点":"下层入口",en:layer===4?"Hizan Terminus":"Next Floor",resolved:false,mapX:110+(interiorCount+1)*108,mapY:330,layer});
      for(let i=0;i<route.length-1;i++){
        route[i].next=[i+1];
        const chance=.62-Math.min(.38,(diff.branches||0)*.08);
        if(i>0&&i<route.length-3&&rand(seed+i*71)>chance) route[i].next.push(i+2);
        if((diff.branches||0)>=3&&i>1&&i<route.length-4&&rand(seed+i*97)>.68)route[i].next.push(i+3);
      }
      if(bossIndex>1&&bossIndex+1<route.length)route[bossIndex-1].next=[bossIndex,bossIndex+1];
      return route;
    },

    rollLayerTraits(){
      const seed=now();this.setupTraits=[];
      for(let tries=0;this.setupTraits.length<3&&tries<30;tries++){
        const t=traitPool[Math.floor(rand(seed+tries*47)*traitPool.length)];
        if(!this.setupTraits.some(x=>x.id===t.id))this.setupTraits.push(t);
      }
      this.selectedTrait=null;
    },

    beginSetup(){
      this.pendingLayer=0;this.selectedDifficulty=1;this.rollLayerTraits();
      this.setupSquad=(global.team||[0,1,2]).slice(0,3);this.setupSlot=0;this.page="setupDifficulty";sfx("ui");
    },

    openMainTeamSetup(){if(global.openPZDaydreamTeamSetup)global.openPZDaydreamTeamSetup(this.setupSquad);else this.page="setupSquad";},
    confirmMainTeam(squad){this.setupSquad=(squad||[0,1,2]).slice(0,3);this.createRun();},

    prepareNextLayer(){
      if(!this.run||this.run.layer>=4)return;
      this.pendingLayer=this.run.layer+1;this.rollLayerTraits();this.page="setupTraits";
      this.message=T("选择下一层的随机词条。","Choose a trait for the next floor.");this.save();sfx("ui");
    },

    applyLayerTrait(){
      if(!this.run||!this.pendingLayer||!this.selectedTrait)return;
      const t=this.selectedTrait;
      this.applyEffect(t);
      if(t.spirit)for(const m of (this.run.squad||[]))m.spirit=clamp(m.spirit+t.spirit,0,110);
      if(t.reveal)this.run.flags.reveal=(this.run.flags.reveal||0)+t.reveal;
      if(typeof t.buff==="number")this.run.flags.combatBuff=(this.run.flags.combatBuff||0)+t.buff;
      this.run.floorTraits=this.run.floorTraits||[];this.run.floorTraits.push({layer:this.pendingLayer,id:t.id});
      this.enterNextLayer(this.pendingLayer);this.pendingLayer=0;
    },

    createRun(){
      const trait=this.selectedTrait||this.setupTraits[0]||traitPool[0];
      const diff=difficultyById(this.selectedDifficulty);
      this.run = {
        structureVersion:6,
        difficultyId:diff.id,difficultyRank:diff.rank,
        layer:1,
        floor:1,
        currentNode:0,
        pollution:clamp((trait.pollution||0)+(diff.pollution||0),0,MAX_POLLUTION),
        clue:(trait.clue||0)+(diff.clue||0),
        will:BASE_WILL + Math.min(18, playerLevel())+(trait.will||0)+(diff.will||0),
        nightmares:[],
        dreamShards:4+(diff.shards||0),
        flags:{combatBuff:(trait.buff||0)+(diff.combatBuff||0), notes:0,reveal:(trait.reveal||0)+(diff.reveal||0)},
        trait:trait.id,
        squad:(this.setupSquad||[0,1,2]).slice(0,3).map(role=>({role,spirit:clamp(100+(trait.spirit||0),0,110),hp:100})),
        route:this.makeRoute(1),
        layerBossDefeated:false,pursuer:null,pursuerEncounter:false,cameraX:0,cameraY:0,
        activeChoice:-1,
        log:[T("调查开始 · 难度 Project ","Investigation started · Project ")+diff.id],
        completed:false
      };
      this.page="run";
      this.message=T("调查开始。","Investigation started.");
      this.resolveCurrentNode(true);
      this.save();
      sfx("reward");
    },

    availableNext(){
      if(!this.run)return[];const n=this.currentNode();if(!n||!n.resolved)return[];
      return (n.next||[this.run.currentNode+1]).filter(i=>i<this.run.route.length);
    },

    chooseNext(index){
      if(!this.run||!this.availableNext().includes(index))return false;
      const previous=this.run.currentNode;
      const choices=(this.run.route[previous]&&this.run.route[previous].next)||[];
      const bossChoice=choices.find(i=>this.run.route[i]&&this.run.route[i].type==="boss");
      const diff=this.runDifficulty();
      if(this.run.layer>=3&&!this.run.layerBossDefeated&&bossChoice!==undefined&&index!==bossChoice&&!this.run.pursuer)this.run.pursuer={active:true,steps:0,max:Math.max(3,4-(diff.pursuit||0))};
      this.run.currentNode=index;this.run.visitedCount=(this.run.visitedCount||1)+1;this.run.floor=this.run.visitedCount;
      if(this.run.pursuer&&this.run.pursuer.active&&!this.run.layerBossDefeated){
        this.run.pursuer.steps++;
        if(this.run.pursuer.steps>=(this.run.pursuer.max||4)){this.run.pursuerEncounter=true;this.launchPursuerBattle();this.save();return true;}
      }
      this.resolveCurrentNode();this.save();sfx("ui");return true;
    },

    launchPursuerBattle(){
      if(!this.run||this.run.awaitingBattle)return;
      const diff=this.runDifficulty();
      this.run.awaitingBattle=true;this.save();
      if(global.startPZDaydreamBattle)global.startPZDaydreamBattle({id:"pursuer_l"+this.run.layer,name:T("追猎者强制遭遇","Pursuer Encounter"),difficulty:58+this.run.layer*10+diff.rank*3,areas:1,boss:true,pursuer:true,pollution:this.run.pollution,combatBuff:this.run.flags.combatBuff||0,difficultyTier:diff.rank,enemyScale:diff.enemy,bossScale:diff.boss,squad:(this.run.squad||[]).map(x=>x.role)});
    },

    abandonRun(){
      if(!this.run)return;const cleared=this.run.route.filter(n=>n.resolved).length,diff=this.runDifficulty(),earned=Math.max(10,Math.round(cleared*8*diff.reward));
      this.state.reconstructionExp=(this.state.reconstructionExp||0)+earned;
      this.defeatSummary={nodes:cleared,clue:this.run.clue,pollution:this.run.pollution,exp:earned};
      this.run.completed=true;this.state.activeRun=null;this.page="defeat";this.save();sfx("hit");
    },

    currentNode(){ return this.run && this.run.route ? this.run.route[this.run.currentNode] : null; },
    nodeName(node){ return T(node.zh || "???", node.en || node.zh || "???"); },

    addLog(text){
      if(!this.run) return;
      this.run.log.unshift(text);
      this.run.log = this.run.log.slice(0,5);
      this.message = text;
    },

    applyEffect(effect,isNightmare=false,isEvent=false){
      if(!this.run || !effect) return;
      const diff=this.runDifficulty();
      if(effect.clue) this.run.clue = clamp(this.run.clue + effect.clue, 0, 99);
      if(effect.will) this.run.will = clamp(this.run.will + effect.will, 0, 120);
      if(effect.pollution){
        let pollution=effect.pollution;
        if(pollution>0&&isNightmare)pollution=Math.ceil(pollution*(1+(diff.nightmareScale||0)));
        if(pollution>0&&isEvent)pollution=Math.ceil(pollution*(1+(diff.eventPollution||0)));
        this.run.pollution = clamp(this.run.pollution + pollution, 0, MAX_POLLUTION);
      }
      if(effect.pursuitDelay&&this.run.pursuer)this.run.pursuer.steps=Math.max(0,(this.run.pursuer.steps||0)-effect.pursuitDelay);
      if(effect.item === "note") this.run.flags.notes = (this.run.flags.notes||0) + 1;
      if(effect.buff === "combat") this.run.flags.combatBuff = (this.run.flags.combatBuff||0) + 1;
      if(effect.nightmare) this.gainNightmare();
    },

    gainNightmare(){
      if(!this.run) return null;
      const seed = now() + this.run.currentNode*31 + this.run.nightmares.length*7;
      let n = nightmarePool[Math.floor(rand(seed) * nightmarePool.length)];
      let tries = 0;
      while(this.run.nightmares.includes(n.id) && tries++ < 12){
        n = nightmarePool[Math.floor(rand(seed+tries*13) * nightmarePool.length)];
      }
      if(!this.run.nightmares.includes(n.id)) this.run.nightmares.push(n.id);
      this.state.unlockedNightmares[n.id] = true;
      this.applyEffect(n,true,false);
      this.save();
      return n;
    },

    resolveCurrentNode(first=false){
      const node = this.currentNode();
      if(!node || node.resolved || !this.run) return;
      if(this.run.pursuerEncounter){this.launchPursuerBattle();return;}
      this.run.activeChoice = -1;

      if(node.type === "story"){
        node.resolved = true;
        const storyClue=1+(this.runDifficulty().storyClue||0);
        this.run.clue += storyClue;
        const story=node.story||storyPool[0];
        this.addLog(T(story.bodyZh,story.bodyEn)+T(" 线索 +"," Clue +")+storyClue+"。");
        this.save();
        return;
      }
      if(node.type === "safe"){
        this.openRestStation();
        return;
      }
      if(node.type === "nightmare"){
        node.resolved = true;
        const n = this.gainNightmare();
        this.addLog(T("梦魇词条解锁：","Nightmare unlocked: ") + (n ? T(n.zh,n.en) : "???"));
        this.save();
        return;
      }
      if(node.type === "portal"){
        node.resolved=true;
        this.run.flags.portalJump=Math.max(2,node.portalSteps||2);
        this.run.pollution=clamp(this.run.pollution+6,0,MAX_POLLUTION);
        this.addLog(T("错位门扉将前方两个节点折叠在一起。污染 +6%。","The displaced gate folds two nodes together. Pollution +6%."));
        this.save();
        return;
      }
      if(node.type === "battle"){
        if(this.run.awaitingBattle) return;
        this.run.awaitingBattle = true;
        this.save();
        if(global.startPZDaydreamBattle){
          const diff=this.runDifficulty();
          global.startPZDaydreamBattle({
            id:node.battle.id,
            name:this.nodeName(node),
            difficulty:node.battle.power+(this.run.layer-1)*9+diff.rank*2,
            areas:2,
            boss:false,
            pollution:this.run.pollution,
            combatBuff:this.run.flags.combatBuff||0,
            difficultyTier:diff.rank,enemyScale:diff.enemy,bossScale:diff.boss,
            squad:(this.run.squad||[]).map(x=>x.role)
          });
        }else{
          this.run.awaitingBattle = false;
          this.addLog(T("战斗模块未能启动。","Battle module could not start."));
        }
        return;
      }
      if(node.type === "event"){
        this.addLog(T("事件出现：","Event: ") + this.nodeName(node));
        return;
      }
      if(node.type === "boss"){
        if(this.run.awaitingBattle) return;
        this.run.awaitingBattle = true;
        this.save();
        if(global.startPZDaydreamBattle){
          const diff=this.runDifficulty();
          global.startPZDaydreamBattle({id:"hizan_depth_l"+this.run.layer,name:this.nodeName(node),difficulty:58+this.run.layer*10+diff.rank*3,areas:1,boss:true,pursuer:true,pollution:this.run.pollution,combatBuff:this.run.flags.combatBuff||0,difficultyTier:diff.rank,enemyScale:diff.enemy,bossScale:diff.boss,squad:(this.run.squad||[]).map(x=>x.role)});
        }else{
          this.run.awaitingBattle=false;
          this.addLog(T("终点战斗模块未能启动。","Final battle module could not start."));
        }
        return;
      }
      if(node.type === "exit"){
        node.resolved=true;
        this.addLog(this.run.layer<4?T("通往下一层的道路已经打开。","The route to the next floor is open."):T("日斩的终点已经显现。","Hizan's terminus is revealed."));
        this.save();
      }
    },

    completeBattle(success){
      if(!this.run) return;
      const node=this.currentNode();
      const forced=!!this.run.pursuerEncounter;
      if(!node || (!forced&&node.type!=="battle"&&node.type!=="boss")) return;
      this.run.awaitingBattle=false;
      if(success){
        const diff=this.runDifficulty();
        if(forced||node.type==="boss"){
          if(node.type==="boss")node.resolved=true;
          this.run.pursuerEncounter=false;this.run.layerBossDefeated=true;this.run.pursuer=null;
          this.state.reconstructionExp=(this.state.reconstructionExp||0)+Math.round(55*diff.reward);
          this.addLog(T("追猎者已被击退，本层路线恢复稳定。","The pursuer is defeated. This floor's route stabilizes."));
          if(forced)this.resolveCurrentNode();
          this.page="run";this.save();sfx("break");
          return;
        }
        node.resolved=true;
        const b=node.battle;
        this.state.reconstructionExp=(this.state.reconstructionExp||0)+Math.round(35*diff.reward);
        this.run.dreamShards=(this.run.dreamShards||0)+2+(diff.battleShard||0);
        this.run.clue=clamp(this.run.clue+b.rewardClue,0,99);
        this.run.pollution=clamp(this.run.pollution+b.pollution,0,MAX_POLLUTION);
        if(this.run.flags.combatBuff) this.run.flags.combatBuff=Math.max(0,this.run.flags.combatBuff-1);
        this.addLog(T("战斗胜利：","Battle cleared: ")+this.nodeName(node)+T("，线索 +",", Clue +")+b.rewardClue+T("，污染 +",", Pollution +")+b.pollution+"%");
        sfx("break");
      }else{
        if(forced)this.run.pursuerEncounter=true;
        this.run.pollution=clamp(this.run.pollution+15,0,MAX_POLLUTION);
        this.run.will=clamp(this.run.will-12,0,120);
        for(const member of (this.run.squad||[])){member.spirit=clamp(member.spirit-10,0,100);member.hp=clamp(member.hp-8,0,100);}
        this.addLog(T("重现中断：污染 +15%，意志 -12。可重新进入该战斗节点。","Reconstruction interrupted: Pollution +15%, Will -12. You may retry this battle node."));
        sfx("hit");
      }
      this.page="run";
      this.save();
      if(this.run.pollution>=MAX_POLLUTION) this.finishRun();
    },

    openRestStation(){
      if(!this.run)return;const seed=now()+this.run.layer*101+this.run.currentNode*17;this.restOffers=[];
      for(let i=0;i<3;i++){let item=nightmarePool[Math.floor(rand(seed+i*37)*nightmarePool.length)],guard=0;while(this.restOffers.some(o=>o.item.id===item.id)&&guard++<12)item=nightmarePool[Math.floor(rand(seed+i*37+guard*11)*nightmarePool.length)];this.restOffers.push({item,price:2+i,bought:false});}
      this.page="rest";this.save();sfx("ui");
    },

    buyRestOffer(index){
      const offer=this.restOffers[index];if(!this.run||!offer||offer.bought)return;
      if((this.run.dreamShards||0)<offer.price){safeCenter(T("梦境碎片不足","Not enough Dream Shards"),70);return;}
      this.run.dreamShards-=offer.price;offer.bought=true;
      if(!this.run.nightmares.includes(offer.item.id))this.run.nightmares.push(offer.item.id);
      this.state.unlockedNightmares[offer.item.id]=true;this.applyEffect(offer.item);this.save();sfx("reward");
    },

    leaveRestStation(){
      if(!this.run)return;const node=this.currentNode();if(node&&node.type==="safe")node.resolved=true;
      this.run.pollution=clamp(this.run.pollution-8,0,MAX_POLLUTION);this.run.will=clamp(this.run.will+6,0,120);
      this.addLog(T("离开休息站：污染 -8%，意志 +6。","Left the rest station: Pollution -8%, Will +6."));this.page="run";this.save();sfx("ui");
    },

    chooseEvent(choiceIndex){
      const node = this.currentNode();
      if(!node || node.type !== "event" || node.resolved) return;
      const choice = node.event.choices[choiceIndex];
      if(!choice) return;
      node.resolved = true;
      this.run.dreamShards=(this.run.dreamShards||0)+1;
      this.applyEffect(choice,false,true);
      this.addLog(T(choice.msgZh, choice.msgEn));
      sfx("ui");
      this.save();
      if(this.run.pollution >= MAX_POLLUTION) this.finishRun();
    },

    advance(){
      if(!this.run) return;
      if(this.run.pursuerEncounter){this.launchPursuerBattle();return;}
      const node = this.currentNode();
      if(node && node.type === "event" && !node.resolved){
        this.addLog(T("请先选择事件处理方式。","Choose how to handle the event first."));
        return;
      }
      if(node && (node.type==="battle" || node.type==="boss") && !node.resolved){
        this.resolveCurrentNode();
        return;
      }
      if(this.run.pollution >= MAX_POLLUTION){ this.finishRun(); return; }
      if(node&&node.type==="exit"&&node.resolved){
        if(this.run.layer>=4)this.finishRun();else this.prepareNextLayer();
        return;
      }
      if(this.run.currentNode < this.run.route.length - 1){
        const jump=Math.max(1,this.run.flags.portalJump||1);
        this.run.flags.portalJump=0;
        if(jump>1){const target=Math.min(this.run.route.length-1,this.run.currentNode+jump);this.run.currentNode=target;this.run.visitedCount=(this.run.visitedCount||1)+1;this.run.floor=this.run.visitedCount;if(this.run.pursuer&&this.run.pursuer.active&&!this.run.layerBossDefeated){this.run.pursuer.steps++;if(this.run.pursuer.steps>=(this.run.pursuer.max||4)){this.run.pursuerEncounter=true;this.launchPursuerBattle();this.save();return;}}this.resolveCurrentNode();this.save();return;}
        const options=this.availableNext();
        if(options.length>1){this.addLog(T("请选择下一处调查节点。","Select the next investigation node."));return;}
        if(options.length===1)this.chooseNext(options[0]);
      }else{
        this.finishRun();
      }
    },

    enterNextLayer(targetLayer){
      if(!this.run||this.run.layer>=4)return;
      this.run.layer=clamp(targetLayer||this.run.layer+1,2,4);
      this.run.currentNode=0;this.run.route=this.makeRoute(this.run.layer);
      this.run.layerBossDefeated=false;this.run.pursuer=null;this.run.pursuerEncounter=false;
      this.run.dreamShards=(this.run.dreamShards||0)+3;
      this.run.cameraX=0;this.run.cameraY=0;
      const diff=this.runDifficulty();
      this.run.pollution=clamp(this.run.pollution+4+this.run.layer*2+(diff.pollution||0),0,MAX_POLLUTION);
      this.run.will=clamp(this.run.will-3+(diff.floorWill||0),0,120);
      this.addLog(T("进入第 ","Entered Floor ")+this.run.layer+T(" 层。敌人强度与污染上升。",". Enemy strength and contamination increased."));
      this.resolveCurrentNode(true);this.save();sfx("reward");
    },

    judgeEnding(){
      const r = this.run;
      if(!r) return "sacrifice";
      if(r.pollution >= 100) return "contamination";
      if(r.nightmares.length >= 5 && r.clue < 9) return "nightmare";
      if(r.clue >= 12 && r.pollution < 78) return "truth";
      if(r.clue >= 9 && r.will >= 88 && r.pollution < 72) return "redemption";
      return "sacrifice";
    },

    finishRun(){
      if(!this.run || this.run.completed) return;
      this.run.completed = true;
      const ending = this.judgeEnding();
      const def = endingDefs[ending];
      this.state.totalRuns = (this.state.totalRuns || 0) + 1;
      this.state.bestClue = Math.max(this.state.bestClue || 0, this.run.clue || 0);
      const diff=this.runDifficulty();
      this.state.reconstructionExp=(this.state.reconstructionExp||0)+Math.round(80*diff.reward);
      this.state.unlockedEndings[ending] = true;
      this.save();
      this.result = {
        ending,
        name:T(def.nameZh,def.nameEn),
        hint:T(def.hintZh,def.hintEn),
        clue:this.run.clue,
        pollution:this.run.pollution,
        will:this.run.will,
        nightmares:this.run.nightmares.length,
        difficultyId:this.run.difficultyId
      };
      this.page="result";
      this.message=T("调查结束。","Investigation complete.");
      sfx("reward");
      safeCenter(T("结局解锁：","Ending unlocked: ") + this.result.name, 120);
    },

    exitRun(){ this.run=null; this.page="home"; this.message=""; this.save(); },

    drawBasePanel(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      this.pulse += 0.035;
      ctx.save();
      const bg=ctx.createLinearGradient(0,0,W,H);
      bg.addColorStop(0,"#111b38"); bg.addColorStop(.48,"#17102d"); bg.addColorStop(1,"#05060c");
      ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
      if(global.uiPanel) global.uiPanel(28,28,W-56,H-56,"rgba(155,124,255,.38)","rgba(5,8,18,.68)");
      else { ctx.fillStyle="rgba(5,8,18,.68)"; ctx.fillRect(28,28,W-56,H-56); ctx.strokeStyle="rgba(155,124,255,.38)"; ctx.strokeRect(28,28,W-56,H-56); }
      ctx.fillStyle="rgba(155,124,255,.10)";
      for(let i=0;i<8;i++){
        ctx.beginPath(); ctx.arc(220,275,40+i*28+Math.sin(this.pulse+i)*3,0,Math.PI*2); ctx.strokeStyle="rgba(155,124,255,"+(0.10-i*0.008)+")"; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(W-55,55,22,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.32)"; ctx.stroke();
      ctx.fillStyle="#fff"; ctx.font="bold 22px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("×",W-55,54);
      ctx.restore();
    },

    drawHeader(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      ctx.fillStyle="#9b7cff"; ctx.font="bold 28px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(this.title(),95,158);
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="14px "+FONT_UI;
      ctx.fillText(this.scenarioName()+"  ·  "+T("多结局调查 / 精神污染 / 梦魇词条","Multi-ending Investigation / Mental Pollution / Nightmare Tags"),97,181);
    },

    drawPage(){
      if(!this.state) this.init();
      this.updateEntryAnimation();
      if(this.page==="setupDifficulty" || this.page==="setupTraits" || this.page==="setupSquad") this.drawSetup();
      else if(this.page==="run" && this.run) this.drawRun();
      else if(this.page==="rest" && this.run) this.drawRestStation();
      else if(this.page==="level") this.drawLevelTrack();
      else if(this.page==="codex") this.drawCodex();
      else if(this.page==="endings") this.drawEndings();
      else if(this.page==="result") this.drawResult();
      else if(this.page==="defeat") this.drawDefeat();
      else this.drawHome();
    },

    drawSetup(){
      const ctx=global.ctx,FONT_UI=global.FONT_UI,W=global.W||1120;this.drawBasePanel();
      const setupTitle=this.page==="setupDifficulty"?T("选择重现难度","Choose Reconstruction Difficulty"):(this.page==="setupTraits"?(this.pendingLayer?T("第 ","Floor ")+this.pendingLayer+T(" 层词条选择"," Trait Selection"):T("选择随机词条","Choose a Random Trait")):T("选择调查队伍","Choose Investigation Squad"));
      ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 34px "+FONT_UI;
      ctx.fillText(setupTitle,62,92);
      const setupDesc=this.page==="setupDifficulty"?T("Project 1 最稳定，Project 0 最危险；每级同时拥有正面与负面规则。","Project 1 is the most stable; Project 0 is the most dangerous. Every tier has a boon and a drawback."):(this.page==="setupTraits"?T("每个层级开始前都可以选择一项新的随机增益。","Choose a new random bonus before every floor."):T("点击角色替换当前选中的队伍位置。","Select a slot, then choose an operator."));
      ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="14px "+FONT_UI;ctx.fillText(setupDesc,64,120);
      if(this.page==="setupDifficulty"){
        for(let i=0;i<difficultyDefs.length;i++){
          const d=difficultyDefs[i],col=i%5,row=Math.floor(i/5),x=50+col*207,y=158+row*164,w=190,h=146,active=Number(this.selectedDifficulty)===d.id;
          ctx.fillStyle=active?"rgba(255,224,102,.16)":"rgba(255,255,255,.055)";ctx.fillRect(x,y,w,h);ctx.strokeStyle=active?"#ffe066":"rgba(155,124,255,.28)";ctx.lineWidth=active?3:1;ctx.strokeRect(x,y,w,h);
          ctx.fillStyle=active?"#ffe066":"#fff";ctx.font="bold 21px "+FONT_UI;ctx.fillText("PROJECT "+d.id,x+14,y+30);
          ctx.fillStyle="#7cffb2";ctx.font="11px "+FONT_UI;if(global.wrapText)global.wrapText(T(d.posZh,d.posEn),x+14,y+55,w-26,15);else ctx.fillText(T(d.posZh,d.posEn),x+14,y+55);
          ctx.fillStyle="#ff909a";ctx.font="11px "+FONT_UI;if(global.wrapText)global.wrapText(T(d.negZh,d.negEn),x+14,y+102,w-26,15);else ctx.fillText(T(d.negZh,d.negEn),x+14,y+102);
        }
        global.drawBtn(T("确认难度","CONFIRM DIFFICULTY"),"",W-302,530,240,58,true,"#ffe066");
      }else if(this.page==="setupTraits"){
        for(let i=0;i<3;i++){const t=this.setupTraits[i],x=76+i*332,y=190,w=300,h=260,active=this.selectedTrait&&this.selectedTrait.id===t.id;ctx.fillStyle=active?"rgba(155,124,255,.25)":"rgba(255,255,255,.06)";ctx.fillRect(x,y,w,h);ctx.strokeStyle=active?"#ffe066":"rgba(255,255,255,.20)";ctx.lineWidth=active?3:1;ctx.strokeRect(x,y,w,h);ctx.fillStyle="#9b7cff";ctx.font="bold 54px Arial";ctx.fillText("◇",x+28,y+72);ctx.fillStyle="#fff";ctx.font="bold 24px "+FONT_UI;ctx.fillText(T(t.zh,t.en),x+28,y+128);ctx.fillStyle="rgba(255,255,255,.66)";ctx.font="15px "+FONT_UI;ctx.fillText(T(t.descZh,t.descEn),x+28,y+170);}
        global.drawBtn(T("确认词条","CONFIRM TRAIT"),"",W-302,530,240,58,!!this.selectedTrait,"#9b7cff");
      }else{
        for(let i=0;i<3;i++){const x=90+i*300,y=165,role=this.setupSquad[i];ctx.fillStyle=this.setupSlot===i?"rgba(255,224,102,.18)":"rgba(255,255,255,.07)";ctx.fillRect(x,y,260,150);ctx.strokeStyle=this.setupSlot===i?"#ffe066":"rgba(255,255,255,.20)";ctx.strokeRect(x,y,260,150);ctx.fillStyle=["#7cc7ff","#ffe066","#c35cff"][role%3];ctx.beginPath();ctx.arc(x+62,y+70,38,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 22px "+FONT_UI;ctx.fillText((global.roles&&global.roles[role]?T(global.roles[role].zh||global.roles[role].name,global.roles[role].name):T("角色 ","Operator ")+(role+1)),x+120,y+78);}
        for(let i=0;i<6;i++){const x=86+i*160,y=380;ctx.fillStyle="rgba(255,255,255,.06)";ctx.fillRect(x,y,140,90);ctx.strokeStyle="rgba(155,124,255,.28)";ctx.strokeRect(x,y,140,90);ctx.fillStyle=["#7cc7ff","#ffe066","#c35cff"][i%3];ctx.beginPath();ctx.arc(x+35,y+42,24,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 13px "+FONT_UI;ctx.fillText(T("角色 ","OP ")+(i+1),x+68,y+48);}
        global.drawBtn(T("开始调查","START INVESTIGATION"),"",W-322,530,260,58,true,"#9b7cff");
      }
    },

    drawDefeat(){
      const ctx=global.ctx,FONT_UI=global.FONT_UI,s=this.defeatSummary||{nodes:0,clue:0,pollution:0,exp:10};this.drawBasePanel();
      ctx.textAlign="center";ctx.fillStyle="#ff6b7a";ctx.font="bold 54px Arial";ctx.fillText("MISSION DEFEAT",560,170);ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="15px "+FONT_UI;ctx.fillText(T("本次调查已中止，但记录仍转化为白日梦经验。","The investigation ended, but recovered records still grant Daydream EXP."),560,205);
      const rows=[[T("经过节点","Nodes Visited"),s.nodes],[T("获得线索","Clues"),s.clue],[T("最终污染","Final Pollution"),s.pollution+"%"],[T("获得经验","EXP Earned"),"+"+s.exp]];for(let i=0;i<4;i++){const x=150+i*215;ctx.fillStyle="rgba(255,255,255,.07)";ctx.fillRect(x,270,180,110);ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="13px "+FONT_UI;ctx.fillText(rows[i][0],x+90,305);ctx.fillStyle=i===3?"#ffe066":"#fff";ctx.font="bold 27px Arial";ctx.fillText(rows[i][1],x+90,350);}global.drawBtn(T("返回白日梦","RETURN"),"",440,470,240,58,true,"#9b7cff");
    },

    drawHome(){
      const ctx=global.ctx, W=global.W, H=global.H, FONT_UI=global.FONT_UI;
      this.pulse += 0.025;

      // V49.1 Daydream main page: reference-style exploration lobby.
      // Layout direction: large scenario banner, left investigation systems,
      // right operators silhouette, bottom-right start exploration.
      ctx.save();

      // Simple entry animation when opening Daydream from the bottom tab.
      // PZ direction: fade-in, slight camera push, sync text overlay.
      const enterT = this.entryEase(this.entryAnim);
      if(this.entryPlaying){
        ctx.globalAlpha = 0.18 + enterT * 0.82;
        ctx.translate(0, (1-enterT) * 18);
      }

      // Full inner scene panel
      const x0=70, y0=118, w0=980, h0=442;
      const bg=ctx.createLinearGradient(x0,y0,x0+w0,y0+h0);
      bg.addColorStop(0,"#182236");
      bg.addColorStop(0.42,"#dbe8ff");
      bg.addColorStop(1,"#08101c");
      ctx.fillStyle=bg;
      ctx.fillRect(x0,y0,w0,h0);

      // cold fog overlay
      const fog=ctx.createRadialGradient(535,320,40,535,320,560);
      fog.addColorStop(0,"rgba(255,255,255,.48)");
      fog.addColorStop(0.45,"rgba(172,205,255,.18)");
      fog.addColorStop(1,"rgba(5,9,18,.78)");
      ctx.fillStyle=fog;
      ctx.fillRect(x0,y0,w0,h0);

      // snow / broken world horizon
      ctx.globalAlpha=.72;
      ctx.strokeStyle="rgba(255,255,255,.55)";
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(94,408); ctx.bezierCurveTo(250,382,360,428,520,391); ctx.bezierCurveTo(690,354,810,384,1028,345); ctx.stroke();
      ctx.globalAlpha=.28;
      for(let i=0;i<34;i++){
        const xx=92+i*30;
        const yy=400+Math.sin(i*1.7+this.pulse)*22;
        ctx.beginPath(); ctx.moveTo(xx,yy); ctx.lineTo(xx+38,yy-18-Math.sin(i)*18); ctx.stroke();
      }
      ctx.globalAlpha=1;

      // distant torn pillars
      function shard(cx,cy,h,tilt,alpha){
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(tilt);
        ctx.fillStyle="rgba(220,235,255,"+alpha+")";
        ctx.beginPath(); ctx.moveTo(-10,0); ctx.lineTo(8,-h); ctx.lineTo(20,0); ctx.closePath(); ctx.fill();
        ctx.strokeStyle="rgba(255,255,255,"+(alpha+.12)+")"; ctx.stroke(); ctx.restore();
      }
      shard(560,365,170,-.12,.22); shard(642,350,220,.16,.18); shard(710,372,130,.25,.20); shard(460,370,95,-.25,.16);

      // left dark title wash
      const wash=ctx.createLinearGradient(70,118,540,118);
      wash.addColorStop(0,"rgba(5,8,18,.78)"); wash.addColorStop(.75,"rgba(5,8,18,.10)"); wash.addColorStop(1,"rgba(5,8,18,0)");
      ctx.fillStyle=wash; ctx.fillRect(x0,y0,560,h0);

      // right character silhouettes, PZ original style rather than copied characters
      ctx.save();
      ctx.translate(760,282);
      ctx.fillStyle="rgba(12,17,36,.70)";
      ctx.beginPath(); ctx.ellipse(0,82,105,24,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(220,235,255,.42)"; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(-35,110); ctx.lineTo(-20,20); ctx.lineTo(-48,-55); ctx.moveTo(-20,20); ctx.lineTo(36,105); ctx.stroke();
      ctx.fillStyle="rgba(36,32,64,.82)"; ctx.beginPath(); ctx.arc(-48,-70,23,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(28,24,52,.86)"; ctx.beginPath(); ctx.moveTo(-36,-44); ctx.lineTo(22,10); ctx.lineTo(-2,80); ctx.lineTo(-80,15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle="rgba(155,205,255,.62)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(18,-40); ctx.lineTo(78,-100); ctx.moveTo(18,-40); ctx.lineTo(82,-18); ctx.stroke();
      ctx.globalAlpha=.78;
      ctx.fillStyle="rgba(230,240,255,.72)"; ctx.beginPath(); ctx.arc(112,-54,19,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(210,230,255,.65)"; ctx.beginPath(); ctx.moveTo(110,-36); ctx.lineTo(94,70); ctx.moveTo(105,-6); ctx.lineTo(146,-72); ctx.stroke();
      ctx.restore();

      // Header / title
      ctx.textAlign="left";
      ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="bold 17px "+FONT_UI;
      ctx.fillText("DAYDREAM RECONSTRUCTION",106,172);
      ctx.fillStyle="rgba(255,255,255,.92)"; ctx.font="bold 38px "+FONT_UI;
      ctx.fillText(this.title(),105,214);
      ctx.fillStyle="rgba(255,255,255,.56)"; ctx.font="bold 30px "+FONT_UI;
      ctx.fillText(this.scenarioName(),107,250);

      // subtitle line
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="14px "+FONT_UI;
      ctx.fillText(T("精神污染 / 多结局 / 梦魇词条 / 节点探索","Mental Pollution / Multi-ending / Nightmare Tags / Node Route"),108,279);

      // logo ring at top-left
      ctx.save(); ctx.translate(116,323);
      for(let i=0;i<4;i++){
        ctx.beginPath(); ctx.arc(0,0,14+i*5+Math.sin(this.pulse+i)*1.5,Math.PI*.15,Math.PI*1.85);
        ctx.strokeStyle="rgba(220,245,255,"+(0.55-i*.08)+")"; ctx.lineWidth=2; ctx.stroke();
      }
      ctx.restore();

      // Left activity cards like reference
      function refCard(x,y,w,h,color,title,value,tag){
        ctx.save();
        ctx.fillStyle="rgba(7,15,27,.62)"; ctx.fillRect(x,y,w,h);
        ctx.strokeStyle=color; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
        ctx.fillStyle=color; ctx.font="bold 14px "+FONT_UI; ctx.fillText(title,x+48,y+23);
        ctx.fillStyle="rgba(255,255,255,.92)"; ctx.font="bold 20px "+FONT_UI; ctx.fillText(value,x+48,y+50);
        ctx.fillStyle="rgba(255,255,255,.45)"; ctx.font="11px "+FONT_UI; ctx.fillText(tag,x+48,y+70);
        ctx.beginPath(); ctx.arc(x+24,y+38,17,0,Math.PI*2); ctx.strokeStyle=color; ctx.lineWidth=3; ctx.stroke();
        ctx.beginPath(); ctx.arc(x+24,y+38,8,0,Math.PI*2); ctx.strokeStyle="rgba(255,255,255,.7)"; ctx.lineWidth=2; ctx.stroke();
        ctx.restore();
      }
      refCard(106,335,230,78,"rgba(180,225,255,.72)",T("冬夜展览馆","Winter Night"),T("调查开放","New Route"),T("主线模拟关卡","Scenario"));
      refCard(106,424,230,78,"rgba(120,215,255,.86)",T("文化比较","Cultural Trace"),String(this.nightmareCount())+" / "+nightmarePool.length,T("梦魇图鉴记录","Codex Record"));

      // Initial investigation system block
      ctx.save();
      ctx.translate(360,424);
      ctx.fillStyle="rgba(5,18,23,.62)"; ctx.fillRect(0,0,230,78);
      ctx.strokeStyle="rgba(80,255,210,.72)"; ctx.lineWidth=2; ctx.strokeRect(0,0,230,78);
      ctx.beginPath(); ctx.moveTo(26,15); ctx.lineTo(48,55); ctx.lineTo(5,55); ctx.closePath(); ctx.strokeStyle="rgba(80,255,210,.85)"; ctx.lineWidth=3; ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.70)"; ctx.font="bold 13px "+FONT_UI; ctx.fillText(T("初始性投资系统","Initial Investigation System"),62,25);
      ctx.fillStyle="rgba(120,255,230,.95)"; ctx.font="bold 26px "+FONT_UI; ctx.fillText(String(this.state.bestClue||0),62,58);
      ctx.restore();

      // right top monthly task style
      ctx.save();
      ctx.fillStyle="rgba(4,12,20,.55)"; ctx.fillRect(828,148,180,52);
      ctx.strokeStyle="rgba(185,235,255,.32)"; ctx.strokeRect(828,148,180,52);
      ctx.fillStyle="rgba(210,242,255,.75)"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="right";
      ctx.fillText(T("本月委托相关","Monthly Commission"),998,180);
      ctx.restore();

      // bottom left small buttons
      if(global.drawBtn){
        global.drawBtn(T("梦魇图鉴","Codex"),"",104,514,128,36,false,"#d9ecff");
        global.drawBtn(T("结局一览","Endings"),"",246,514,128,36,false,"#d9ecff");
      }

      // main start button reference-style
      ctx.save();
      const sx=828, sy=486, sw=184, sh=58;
      ctx.fillStyle="rgba(3,18,25,.82)"; ctx.fillRect(sx,sy,sw,sh);
      ctx.strokeStyle="rgba(145,255,255,.95)"; ctx.lineWidth=2; ctx.strokeRect(sx,sy,sw,sh);
      ctx.fillStyle="rgba(145,255,255,.18)"; ctx.fillRect(sx+4,sy+4,sw-8,sh-8);
      ctx.fillStyle="#eaffff"; ctx.font="bold 26px "+FONT_UI; ctx.textAlign="center";
      ctx.fillText(T("开始探索","START"),sx+sw/2,sy+38);
      ctx.strokeStyle="rgba(145,255,255,.75)"; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(sx+sw-32,sy+18); ctx.lineTo(sx+sw-16,sy+29); ctx.lineTo(sx+sw-32,sy+40); ctx.stroke();
      ctx.restore();

      // Entry overlay: fades out over the page.
      if(this.entryPlaying){
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        const t = enterT;
        const black = Math.max(0, 1 - t * 1.15);
        ctx.fillStyle = "rgba(0,0,0," + (0.82 * black).toFixed(3) + ")";
        ctx.fillRect(0,0,W,H);

        const titleAlpha = Math.max(0, 1 - Math.abs(t - 0.32) / 0.42);
        ctx.globalAlpha = titleAlpha;
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(235,245,255,.96)";
        ctx.font = "bold 28px " + FONT_UI;
        ctx.fillText("DAYDREAM RECONSTRUCTION", W/2, H/2 - 28);
        ctx.fillStyle = "rgba(155,124,255,.88)";
        ctx.font = "15px " + FONT_UI;
        ctx.fillText(T("精神同步中……","Synchronizing..."), W/2, H/2 + 8);

        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.strokeStyle = "rgba(155,205,255,.38)";
        ctx.lineWidth = 2;
        const scanY = 140 + t * 370;
        ctx.beginPath();
        ctx.moveTo(170, scanY);
        ctx.lineTo(W-170, scanY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    },

    visibleRouteIndexes(){
      const route=this.run.route,available=this.availableNext(),set=new Set([this.run.currentNode,...available]);
      route.forEach((n,i)=>{if(n.resolved)set.add(i);});
      if((this.run.flags.reveal||0)>0)available.forEach(a=>(route[a].next||[]).forEach(i=>set.add(i)));
      return set;
    },

    updateMapPan(){
      if(!global.getPZPointerState||!this.run)return;
      const p=global.getPZPointerState(),inside=p.x>=28&&p.x<=840&&p.y>=96&&p.y<=616;
      if(p.down&&inside){
        if(!this.mapDragging){this.mapDragging=true;this.mapDragX=p.x;this.mapDragY=p.y;}
        const visible=this.visibleRouteIndexes();let maxX=110,maxY=330,minY=330;
        visible.forEach(i=>{const n=this.run.route[i];if(n){maxX=Math.max(maxX,n.mapX||0);maxY=Math.max(maxY,n.mapY||0);minY=Math.min(minY,n.mapY||0);}});
        const dx=p.x-this.mapDragX,dy=p.y-this.mapDragY;this.mapDragX=p.x;this.mapDragY=p.y;
        this.run.cameraX=clamp((this.run.cameraX||0)+dx,Math.min(0,760-(maxX+70)),0);
        const minCamY=Math.min(0,560-(maxY+70)),maxCamY=Math.max(0,120-(minY-70));
        this.run.cameraY=clamp((this.run.cameraY||0)+dy,minCamY,maxCamY);
      }else if(!p.down)this.mapDragging=false;
    },

    drawRoute(){
      const ctx=global.ctx,FONT_UI=global.FONT_UI,route=this.run.route;this.updateMapPan();
      const camX=this.run.cameraX||0,camY=this.run.cameraY||0,available=this.availableNext(),visible=this.visibleRouteIndexes();
      ctx.save();ctx.beginPath();ctx.rect(28,96,812,520);ctx.clip();ctx.fillStyle="#010207";ctx.fillRect(28,96,812,520);
      const current=route[this.run.currentNode],cx=(current.mapX||110)+camX,cy=(current.mapY||330)+camY;
      const fog=ctx.createRadialGradient(cx,cy,18,cx,cy,245);fog.addColorStop(0,"rgba(48,55,90,.62)");fog.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=fog;ctx.fillRect(28,96,812,520);
      for(let i=0;i<route.length;i++){
        if(!visible.has(i))continue;const n=route[i],info=nodeTypes[n.type]||nodeTypes.event,x=(n.mapX||0)+camX,y=(n.mapY||330)+camY;
        for(let p=0;p<route.length;p++)if(visible.has(p)&&(route[p].next||[]).includes(i)&&(route[p].resolved||p===this.run.currentNode)){const prev=route[p];ctx.strokeStyle=available.includes(i)?"rgba(255,224,102,.70)":"rgba(125,191,220,.34)";ctx.lineWidth=available.includes(i)?3:2;ctx.beginPath();ctx.moveTo((prev.mapX||0)+camX,(prev.mapY||330)+camY);ctx.lineTo(x,y);ctx.stroke();}
        ctx.beginPath();ctx.arc(x,y,i===this.run.currentNode?22:18,0,Math.PI*2);ctx.fillStyle=i===this.run.currentNode?info.color:(n.resolved?"rgba(125,191,220,.42)":available.includes(i)?"rgba(255,224,102,.28)":"rgba(255,255,255,.10)");ctx.fill();ctx.strokeStyle=i===this.run.currentNode?"#fff":available.includes(i)?"#ffe066":"rgba(255,255,255,.32)";ctx.lineWidth=available.includes(i)?3:2;ctx.stroke();
        ctx.fillStyle=i===this.run.currentNode?"#061018":"#fff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="center";ctx.fillText(n.type==="portal"?"◇":n.type==="boss"?"B":String(i+1),x,y+4);if(i===this.run.currentNode||available.includes(i)){ctx.fillStyle=available.includes(i)?"#ffe066":"rgba(255,255,255,.72)";ctx.font="10px "+FONT_UI;ctx.fillText(T(info.zh,info.en),x,y+34);}
      }
      ctx.fillStyle="rgba(255,255,255,.46)";ctx.font="11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(T("按住左键拖动地图 · 未显现区域不可查看","Hold left mouse to drag · Hidden areas remain locked"),48,596);ctx.restore();
    },

    drawRun(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      const run=this.run, node=this.currentNode();
      if(!run.squad) run.squad=[{role:0,spirit:100,hp:100},{role:1,spirit:100,hp:100},{role:2,spirit:100,hp:100}];
      for(let i=0;i<run.route.length;i++){const n=run.route[i];if(!Number.isFinite(n.mapX)){n.mapX=120+i*60;n.mapY=160+((i*83)%320);}}
      this.drawBasePanel(); this.drawRoute();
      ctx.fillStyle="#fff";ctx.font="bold 26px "+FONT_UI;ctx.textAlign="left";ctx.fillText(T("白日梦调查","DAYDREAM INVESTIGATION"),44,58);
      ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="13px "+FONT_UI;ctx.fillText(T("未知节点只有在接近后才会显现","Unknown nodes emerge only as the team approaches"),44,82);
      ctx.textAlign="right";ctx.fillStyle="#ffe066";ctx.font="bold 15px "+FONT_UI;ctx.fillText("PROJECT "+run.difficultyId,1090,58);ctx.textAlign="left";
      const stats=[[T("层级","Floor"),run.layer+" / 4"],[T("线索","Clue"),run.clue],[T("污染","Pollution"),run.pollution+"%"],[T("追踪","Pursuit"),run.pursuer&&!run.layerBossDefeated?run.pursuer.steps+" / "+(run.pursuer.max||4):"—"]];
      for(let i=0;i<stats.length;i++){const sx=836+(i%2)*132,sy=98+Math.floor(i/2)*66;ctx.fillStyle="rgba(255,255,255,.075)";ctx.fillRect(sx,sy,124,56);ctx.strokeStyle="rgba(155,124,255,.18)";ctx.strokeRect(sx,sy,124,56);ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="11px "+FONT_UI;ctx.fillText(stats[i][0],sx+11,sy+20);ctx.fillStyle="#fff";ctx.font="bold 19px "+FONT_UI;ctx.fillText(stats[i][1],sx+11,sy+44);}
      ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.fillText(node?this.nodeName(node):"???",840,252);
      ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="13px "+FONT_UI;
      if(node && node.type === "event" && !node.resolved){
        ctx.fillText(T(node.event.bodyZh,node.event.bodyEn),840,280);
        for(let i=0;i<node.event.choices.length;i++){
          const c=node.event.choices[i]; const x=836, y=298+i*48, w=256, h=40;
          if(global.uiCard) global.uiCard(x,y,w,h,"#ffe066",false);
          ctx.fillStyle="rgba(255,255,255,.90)";ctx.font="bold 12px "+FONT_UI;ctx.fillText((i+1)+". "+T(c.zh,c.en),x+12,y+26);
        }
      }else{
        const logs=run.log||[];for(let i=0;i<Math.min(3,logs.length);i++){ctx.fillStyle=i===0?"#ffe066":"rgba(255,255,255,.50)";ctx.font=(i===0?"bold ":"")+"12px "+FONT_UI;ctx.fillText("· "+logs[i],840,282+i*23);}
      }
      const roleNames=global.roles||[];
      if(!(node&&node.type==="event"&&!node.resolved))for(let i=0;i<(run.squad||[]).length;i++){const m=run.squad[i],rx=836+i*87,ry=424;ctx.fillStyle="rgba(8,12,22,.90)";ctx.fillRect(rx,ry,79,130);ctx.strokeStyle=i===0?"#9b7cff":"rgba(255,255,255,.25)";ctx.lineWidth=1.5;ctx.strokeRect(rx,ry,79,130);const col=roleNames[m.role]&&roleNames[m.role].color||["#7cc7ff","#ffe066","#c35cff"][i];ctx.fillStyle=col;ctx.beginPath();ctx.arc(rx+39.5,ry+33,24,0,Math.PI*2);ctx.fill();ctx.fillStyle="rgba(255,255,255,.74)";ctx.font="10px "+FONT_UI;ctx.fillText(T("精神","SP")+" "+m.spirit,rx+8,ry+76);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(rx+8,ry+84,63,7);ctx.fillStyle="#9b7cff";ctx.fillRect(rx+8,ry+84,63*m.spirit/100,7);ctx.fillStyle="rgba(255,255,255,.74)";ctx.fillText("HP "+m.hp,rx+8,ry+106);ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(rx+8,ry+114,63,7);ctx.fillStyle="#ff6b7a";ctx.fillRect(rx+8,ry+114,63*m.hp/100,7);}
      const actionLabel=run.pursuerEncounter?T("迎击追猎者","FACE PURSUER"):(node&&(node.type==="battle"||node.type==="boss")&&!node.resolved?T("进入战斗","ENTER BATTLE"):(this.availableNext().length>1?T("选择发光节点","SELECT A NODE"):T("前往节点","ADVANCE")));
      global.drawBtn(actionLabel,"",836,566,256,50,true,"#9b7cff");
    },

    drawRestStation(){
      const ctx=global.ctx,FONT_UI=global.FONT_UI,W=global.W||1120;this.drawBasePanel();
      ctx.textAlign="left";ctx.fillStyle="#7cffb2";ctx.font="bold 16px "+FONT_UI;ctx.fillText("REST STATION / FLOOR "+this.run.layer,66,92);
      ctx.fillStyle="#fff";ctx.font="bold 38px "+FONT_UI;ctx.fillText(T("梦境休息站","Daydream Rest Station"),66,140);
      ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="14px "+FONT_UI;ctx.fillText(T("使用梦境碎片购买本次调查生效的梦魇道具，也可以拒绝交易。","Spend Dream Shards on Nightmare items for this run, or leave without buying."),68,170);
      ctx.textAlign="right";ctx.fillStyle="#ffe066";ctx.font="bold 19px "+FONT_UI;ctx.fillText(T("梦境碎片 ","Dream Shards ")+(this.run.dreamShards||0),W-72,118);
      for(let i=0;i<3;i++){const o=this.restOffers[i],x=68+i*340,y=215,w=308,h=255;if(!o)continue;ctx.fillStyle=o.bought?"rgba(65,110,96,.18)":"rgba(255,255,255,.065)";ctx.fillRect(x,y,w,h);ctx.strokeStyle=o.bought?"#7cffb2":"rgba(155,124,255,.48)";ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);ctx.fillStyle="#b478ff";ctx.font="bold 54px Arial";ctx.textAlign="left";ctx.fillText("◇",x+24,y+70);ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.fillText(T(o.item.zh,o.item.en),x+28,y+115);ctx.fillStyle="rgba(255,255,255,.60)";ctx.font="13px "+FONT_UI;ctx.fillText(T(o.item.descZh,o.item.descEn),x+28,y+150);ctx.fillStyle=o.bought?"#7cffb2":"#ffe066";ctx.font="bold 17px "+FONT_UI;ctx.fillText(o.bought?T("已购买","PURCHASED"):T("碎片 ×","SHARDS ×")+o.price,x+28,y+205);}
      global.drawBtn(T("拒绝交易并离开","LEAVE WITHOUT BUYING"),"ESC",W-350,520,280,54,false,"#fff");
    },

    drawLevelTrack(){
      const ctx=global.ctx,FONT_UI=global.FONT_UI,W=global.W||1120;this.drawBasePanel();
      const lv=this.reconstructionLevel();this.selectedLevel=clamp(this.selectedLevel||lv,1,MAX_RECONSTRUCTION_LEVEL);const selected=this.selectedLevel,reward=this.levelReward(selected),ready=selected<=lv,claimed=!!this.state.levelClaimed[selected];
      ctx.fillStyle="#82ffe2";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="left";ctx.fillText("DAYDREAM RECONSTRUCTION / REWARD ARCHIVE",62,76);
      ctx.fillStyle="#fff";ctx.font="bold 38px "+FONT_UI;ctx.fillText(T("白日梦等级奖励","Daydream Level Rewards"),62,122);
      ctx.textAlign="right";ctx.fillStyle="#82ffe2";ctx.font="bold 46px Arial";ctx.fillText("LV "+lv,W-72,94);ctx.fillStyle="rgba(255,255,255,.16)";ctx.fillRect(W-360,108,288,8);ctx.fillStyle="#82ffe2";ctx.fillRect(W-360,108,288*this.levelProgress()/LEVEL_EXP_REQUIRED,8);ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="13px Arial";ctx.fillText(this.levelProgress()+" / "+LEVEL_EXP_REQUIRED+" EXP",W-72,139);
      const grad=ctx.createLinearGradient(54,170,1060,470);grad.addColorStop(0,"rgba(10,18,24,.96)");grad.addColorStop(.6,"rgba(22,32,42,.90)");grad.addColorStop(1,"rgba(34,15,48,.86)");ctx.fillStyle=grad;ctx.fillRect(54,170,1012,300);ctx.strokeStyle="rgba(130,255,226,.28)";ctx.strokeRect(54,170,1012,300);
      ctx.textAlign="left";ctx.fillStyle="#82ffe2";ctx.font="bold 18px "+FONT_UI;ctx.fillText(T("等级奖励","LEVEL REWARD")+"  "+selected,90,215);ctx.fillStyle="#fff";ctx.font="bold 31px "+FONT_UI;ctx.fillText(selected%30===0?T("高价值调查补给","High-Value Investigation Supply"):T("调查记录补给","Investigation Record Supply"),90,264);ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="14px "+FONT_UI;ctx.fillText(T("提升白日梦等级，解锁调查资源与成长材料。","Raise your Daydream level to unlock investigation resources and growth materials."),90,298);
      ctx.fillStyle="rgba(130,255,226,.08)";ctx.fillRect(90,330,660,72);ctx.strokeStyle="rgba(130,255,226,.22)";ctx.strokeRect(90,330,660,72);ctx.fillStyle="#fff";ctx.font="bold 19px "+FONT_UI;ctx.fillText(this.rewardLabel(reward),116,375);
      global.drawBtn(claimed?T("已领取","CLAIMED"):(ready?T("领取奖励","CLAIM REWARD"):T("等级未达到","LEVEL LOCKED")),"",790,332,225,66,ready&&!claimed,"#82ffe2");
      const start=clamp(this.levelTrackPage||0,0,14)*8+1;ctx.strokeStyle="rgba(130,255,226,.48)";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(104,548);ctx.lineTo(1010,548);ctx.stroke();
      for(let j=0;j<8;j++){const level=start+j;if(level>MAX_RECONSTRUCTION_LEVEL)break;const x=126+j*124,rdy=level<=lv,clm=!!this.state.levelClaimed[level],sel=level===selected;ctx.beginPath();ctx.arc(x,548,sel?24:18,0,Math.PI*2);ctx.fillStyle=clm?"#347f73":rdy?"#72e6cf":"#252b32";ctx.fill();ctx.strokeStyle=sel?"#fff":"rgba(255,255,255,.30)";ctx.lineWidth=sel?3:1.5;ctx.stroke();ctx.fillStyle=sel?"#07120f":"#fff";ctx.font="bold 11px Arial";ctx.textAlign="center";ctx.fillText(level,x,552);ctx.fillStyle=sel?"#82ffe2":"rgba(255,255,255,.55)";ctx.font="bold 13px Arial";ctx.fillText(level,x,592);if(clm){ctx.fillStyle="#7cffb2";ctx.font="bold 14px Arial";ctx.fillText("✓",x,520);}}
      ctx.fillStyle="#fff";ctx.font="bold 30px Arial";ctx.fillText("‹",65,558);ctx.fillText("›",1060,558);
    },

    drawCodex(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#9b7cff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("梦魇图鉴","Nightmare Codex"),95,190);
      for(let i=0;i<nightmarePool.length;i++){
        const n=nightmarePool[i]; const unlocked=!!this.state.unlockedNightmares[n.id];
        const col=i%2, row=Math.floor(i/2); const x=110+col*465, y=208+row*39, w=430, h=33;
        if(global.uiCard) global.uiCard(x,y,w,h,unlocked?"#9b7cff":"#666",false);
        ctx.fillStyle=unlocked?"#fff":"rgba(255,255,255,.35)"; ctx.font="bold 13px "+FONT_UI; ctx.textAlign="left";
        ctx.fillText(unlocked ? T(n.zh,n.en) : "???",x+12,y+21);
        ctx.textAlign="right";ctx.fillStyle=unlocked?"rgba(180,145,255,.82)":"rgba(255,255,255,.22)";ctx.font="10px "+FONT_UI;
        ctx.fillText(unlocked?T("已记录","RECORDED"):T("未记录","LOCKED"),x+w-12,y+21);
      }
      global.drawBtn(T("返回","Back"),"",865,520,150,44,false,"#fff");
    },

    drawEndings(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#9b7cff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("结局一览","Ending Archive"),95,215);
      const ids=Object.keys(endingDefs);
      for(let i=0;i<ids.length;i++){
        const id=ids[i], e=endingDefs[id], unlocked=!!this.state.unlockedEndings[id];
        const x=135, y=252+i*52, w=850, h=42;
        if(global.uiCard) global.uiCard(x,y,w,h,unlocked?"#9b7cff":"#666",false);
        ctx.fillStyle=unlocked?"#fff":"rgba(255,255,255,.38)"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="left";
        ctx.fillText((i+1)+"/5  "+(unlocked?T(e.nameZh,e.nameEn):"???"),x+18,y+25);
        ctx.fillStyle="rgba(255,255,255,.50)"; ctx.font="12px "+FONT_UI;
        ctx.fillText(unlocked?T(e.hintZh,e.hintEn):T("尚未解锁。","Locked."),x+260,y+25);
      }
      global.drawBtn(T("返回","Back"),"",865,520,150,44,false,"#fff");
    },

    drawResult(){
      const ctx=global.ctx, FONT_UI=global.FONT_UI;
      const r=this.result;
      this.drawBasePanel(); this.drawHeader();
      ctx.fillStyle="#ffe066"; ctx.font="bold 22px "+FONT_UI; ctx.textAlign="left";
      ctx.fillText(T("调查完成","Investigation Complete"),135,230);
      ctx.fillStyle="#fff"; ctx.font="bold 42px "+FONT_UI;
      ctx.fillText(r ? r.name : "???",135,285);
      ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="15px "+FONT_UI;
      ctx.fillText(r ? r.hint : "",138,315);
      ctx.fillStyle="#ffe066";ctx.font="bold 13px "+FONT_UI;ctx.fillText(r?"PROJECT "+r.difficultyId:"",138,340);
      const lines = r ? [
        T("线索：","Clue: ")+r.clue,
        T("污染：","Pollution: ")+r.pollution+"%",
        T("意志：","Will: ")+r.will,
        T("梦魇：","Nightmares: ")+r.nightmares
      ] : [];
      for(let i=0;i<lines.length;i++){
        const x=150+i*195, y=370, w=160, h=62;
        if(global.uiCard) global.uiCard(x,y,w,h,"#9b7cff",false);
        ctx.fillStyle="#fff"; ctx.font="bold 17px "+FONT_UI; ctx.fillText(lines[i],x+16,y+38);
      }
      global.drawBtn(T("再次调查","Run Again"),"",645,505,145,44,true,"#9b7cff");
      global.drawBtn(T("结局一览","Endings"),"",805,505,145,44,false,"#fff");
      global.drawBtn(T("返回首页","Home"),"",485,505,145,44,false,"#fff");
    },

    handleClick(){
      if(!this.state) this.init();
      if(this.page!=="home" && clickRect((global.W||1120)-82,28,54,54)){
        this.handleEscape(); global.clicked=false; return true;
      }
      if(this.page==="home"){
        if(this.entryPlaying){ global.clicked=false; return true; }
        if(clickRect((global.W||1120)-280,528,240,72)){ this.beginSetup(); global.clicked=false; return true; }
        if(clickRect(48,550,168,48)){ this.page="codex"; global.clicked=false; return true; }
        if(clickRect(230,550,168,48)){ this.page="endings"; global.clicked=false; return true; }
      }else if(this.page==="setupDifficulty"){
        for(let i=0;i<difficultyDefs.length;i++){
          const col=i%5,row=Math.floor(i/5),x=50+col*207,y=158+row*164;
          if(clickRect(x,y,190,146)){this.selectedDifficulty=difficultyDefs[i].id;sfx("ui");global.clicked=false;return true;}
        }
        if(clickRect((global.W||1120)-302,530,240,58)){this.page="setupTraits";global.clicked=false;return true;}
      }else if(this.page==="setupTraits"){
        for(let i=0;i<3;i++)if(clickRect(76+i*332,190,300,260)){this.selectedTrait=this.setupTraits[i];sfx("ui");global.clicked=false;return true;}
        if(this.selectedTrait&&clickRect((global.W||1120)-302,530,240,58)){if(this.pendingLayer)this.applyLayerTrait();else this.openMainTeamSetup();global.clicked=false;return true;}
      }else if(this.page==="setupSquad"){
        for(let i=0;i<3;i++)if(clickRect(90+i*300,165,260,150)){this.setupSlot=i;global.clicked=false;return true;}
        for(let i=0;i<6;i++)if(clickRect(86+i*160,380,140,90)){if(!this.setupSquad.includes(i)||this.setupSquad[this.setupSlot]===i){this.setupSquad[this.setupSlot]=i;this.setupSlot=(this.setupSlot+1)%3;sfx("ui");}global.clicked=false;return true;}
        if(clickRect((global.W||1120)-322,530,260,58)){this.createRun();global.clicked=false;return true;}
      }else if(this.page==="run"){
        const node=this.currentNode();
        for(const index of this.availableNext()){
          const n=this.run.route[index],x=(n.mapX||0)+(this.run.cameraX||0),y=(n.mapY||0)+(this.run.cameraY||0);
          if(clickRect(x-28,y-28,56,56)){this.chooseNext(index);global.clicked=false;return true;}
        }
        if(node && node.type==="event" && !node.resolved){
          for(let i=0;i<node.event.choices.length;i++){
            if(clickRect(836,298+i*48,256,40)){ this.chooseEvent(i); global.clicked=false; return true; }
          }
        }
        if(clickRect(836,566,256,50)){ this.advance(); global.clicked=false; return true; }
      }else if(this.page==="rest"){
        for(let i=0;i<3;i++)if(clickRect(68+i*340,215,308,255)){this.buyRestOffer(i);global.clicked=false;return true;}
        if(clickRect((global.W||1120)-350,520,280,54)){this.leaveRestStation();global.clicked=false;return true;}
      }else if(this.page==="level"){
        const start=clamp(this.levelTrackPage||0,0,14)*8+1;
        for(let j=0;j<8;j++){const level=start+j,x=126+j*124;if(level<=MAX_RECONSTRUCTION_LEVEL&&clickRect(x-35,505,70,100)){this.selectedLevel=level;global.clicked=false;return true;}}
        if(clickRect(35,515,50,75)){this.levelTrackPage=clamp((this.levelTrackPage||0)-1,0,14);this.selectedLevel=this.levelTrackPage*8+1;global.clicked=false;return true;}
        if(clickRect(1025,515,70,75)){this.levelTrackPage=clamp((this.levelTrackPage||0)+1,0,14);this.selectedLevel=this.levelTrackPage*8+1;global.clicked=false;return true;}
        if(clickRect(790,332,225,66)){this.claimLevelReward(this.selectedLevel);global.clicked=false;return true;}
      }else if(this.page==="codex" || this.page==="endings"){
        if(clickRect(865,520,150,44)){ this.page="home"; global.clicked=false; return true; }
      }else if(this.page==="result"){
        if(clickRect(645,505,145,44)){ this.beginSetup(); global.clicked=false; return true; }
        if(clickRect(805,505,145,44)){ this.page="endings"; global.clicked=false; return true; }
        if(clickRect(485,505,145,44)){ this.exitRun(); global.clicked=false; return true; }
      }else if(this.page==="defeat"){
        if(clickRect(440,470,240,58)){this.run=null;this.page="home";this.save();global.clicked=false;return true;}
      }
      return false;
    },

    handleEscape(){
      if(this.page==="codex" || this.page==="endings" || this.page==="result" || this.page==="level" || this.page==="defeat"){
        this.page="home";
        return true;
      }
      if(this.page==="run"){
        this.page="home";
        this.save();
        return true;
      }
      if(this.page==="rest"){this.leaveRestStation();return true;}
      if(this.page==="setupDifficulty"){this.page="home";return true;}
      if(this.page==="setupTraits"){this.page=this.pendingLayer?"run":"setupDifficulty";return true;}
      if(this.page==="setupSquad"){this.page="setupTraits";return true;}
      if(this.page==="home" && this.selectedDaydreamScenario){
        this.selectedDaydreamScenario=null;
        return true;
      }
      return false;
    }
  };

  global.PZDaydream = Daydream;
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => Daydream.init());
  else Daydream.init();
})(window);
