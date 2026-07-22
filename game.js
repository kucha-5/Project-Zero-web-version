/* =========================================================
   PROJECT ZERO - MAIN GAME RUNTIME
   V41 Script Optimized

   Story content:        story_scripts.js
   Story engine:         story_engine.js
   Story gameplay events: story_events.js

   Rule:
   New systems should be separate scripts, not huge patches
   inside game.js.
   ========================================================= */


// Build info for quick debugging
window.PZ_BUILD_INFO = window.PZ_BUILD_INFO || {
  build: "V49_18_FEATURE_GATES_SHOP_OPEN",
  storyModule: true,
  optimized: true
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// === PZ Custom Cursor System ===
const pzCursorImg = new Image();
pzCursorImg.src = "assets/ui/pz_cursor.png";
const lobbyBackgroundImg = new Image();
lobbyBackgroundImg.src = "assets/ui/lobby_background.png";
let lobbyBackgroundReady = false;
lobbyBackgroundImg.onload = () => { lobbyBackgroundReady = true; };
const hermitPortraitImg = new Image();
hermitPortraitImg.src = "assets/ui/hermit_portrait_display.png";
let hermitPortraitReady = false;
hermitPortraitImg.onload = () => { hermitPortraitReady = true; };
const crystalCurrencyImg = new Image();
crystalCurrencyImg.src = "assets/ui/currency_crystal.png";
let crystalCurrencyReady = false;
crystalCurrencyImg.onload = () => { crystalCurrencyReady = true; };
const goldCurrencyImg = new Image();
goldCurrencyImg.src = "assets/ui/currency_gold.png";
let goldCurrencyReady = false;
goldCurrencyImg.onload = () => { goldCurrencyReady = true; };
const staminaCurrencyImg = new Image();
staminaCurrencyImg.src = "assets/ui/currency_stamina.png";
let staminaCurrencyReady = false;
staminaCurrencyImg.onload = () => { staminaCurrencyReady = true; };
const CRYSTAL_TOPUP_TIERS = [
  {crystals:70,price:"$0.99",image:""},
  {crystals:400,price:"$4.99",image:"assets/ui/crystal_topup_400.png"},
  {crystals:1080,price:"$9.99",image:"assets/ui/crystal_topup_1080.png"},
  {crystals:2980,price:"$19.99",image:"assets/ui/crystal_topup_2980.png"},
  {crystals:5280,price:"$29.99",image:"assets/ui/crystal_topup_5280.png"},
  {crystals:7480,price:"$39.99",image:"assets/ui/crystal_topup_7480.png"}
];
const crystalTopupTierImgs=CRYSTAL_TOPUP_TIERS.map(t=>{
  if(!t.image)return null;
  const img=new Image();img.src=t.image;return img;
});
let hermitLobbyBorderlessLayer = null;
let pzCursorReady = false;
let pzCursorPulse = 0;
pzCursorImg.onload = () => { pzCursorReady = true; };

function pzCursorIsHoveringUI(){
  try{
    if(gameMode === "lobby"){
      return mouseY > H - 170 || mouseX < 260 || mouseX > W - 280;
    }
    if(gameMode === "battle" || gameMode === "tutorialBattle"){
      return mouseY > H - 160 || mouseX < 240 || mouseX > W - 260;
    }
    if(window.PZStory && window.PZStory.active){
      return mouseY > H - 220;
    }
  }catch(e){}
  return false;
}

function drawPZCustomCursor(){
  if(!pzCursorReady) return;

  pzCursorPulse += 0.16 * frameScale;
  const hovering = pzCursorIsHoveringUI();
  const pressed = !!mouseDown;

  const baseH = hovering ? 50 : 46;
  const h = pressed ? baseH * 0.92 : baseH;
  const aspect = pzCursorImg.width / Math.max(1, pzCursorImg.height);
  const w = h * aspect;

  const hotX = w * 0.78;
  const hotY = h * 0.48;

  ctx.save();
  ctx.globalAlpha = 0.98;
  ctx.imageSmoothingEnabled = true;
  if("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";

  if(hovering){
    ctx.shadowColor = "rgba(124,199,255,.85)";
    ctx.shadowBlur = 14 + Math.sin(pzCursorPulse) * 3;
  }else{
    ctx.shadowColor = "rgba(120,140,255,.45)";
    ctx.shadowBlur = 7;
  }

  ctx.drawImage(pzCursorImg, mouseX - hotX, mouseY - hotY, w, h);
  ctx.restore();
}
// === End PZ Custom Cursor System ===


// V40 Display Quality Patch
// Logic stays at 1120x660 so UI / battle / mouse coordinates do not move.
// Only the real canvas backing resolution is raised for cleaner fullscreen output.
const LOGICAL_W = 1120;
const LOGICAL_H = 660;

let renderQuality = "AUTO"; // "STANDARD" / "1080P" / "2K" / "AUTO"
let targetFPS = 60;          // 30 / 60
let lastLoopRenderTime = 0;

function detectAutoQuality(){
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const dpr = clamp(window.devicePixelRatio || 1,1,3);
  const physicalH = Math.min(window.innerHeight || LOGICAL_H,(window.innerWidth || LOGICAL_W)*LOGICAL_H/LOGICAL_W)*dpr;
  if(cores >= 8 && mem >= 8 && physicalH >= 1250) return "2K";
  if(cores >= 4 && mem >= 4 && physicalH >= 850) return "1080P";
  return "STANDARD";
}

function activeRenderQuality(){
  return renderQuality === "AUTO" ? detectAutoQuality() : renderQuality;
}

function getRenderScale(){
  const q = activeRenderQuality();
  if(q === "2K") return 1440 / LOGICAL_H;
  if(q === "1080P") return 1080 / LOGICAL_H;
  return 1;
}

function getAutoRenderScale(){
  const wrap=document.getElementById("gameWrap");
  const rect=wrap&&typeof wrap.getBoundingClientRect==="function"?wrap.getBoundingClientRect():null;
  const cssW=Math.max(1,rect&&rect.width||Math.min(window.innerWidth||LOGICAL_W,(window.innerHeight||LOGICAL_H)*LOGICAL_W/LOGICAL_H));
  const cssH=Math.max(1,rect&&rect.height||Math.min(window.innerHeight||LOGICAL_H,(window.innerWidth||LOGICAL_W)*LOGICAL_H/LOGICAL_W));
  const dpr=clamp(window.devicePixelRatio||1,1,3);
  const desired=Math.max(cssW/LOGICAL_W,cssH/LOGICAL_H)*dpr;
  const cores=navigator.hardwareConcurrency||4,mem=navigator.deviceMemory||4;
  const cap=(cores>=12&&mem>=12)?3:(cores>=8&&mem>=8)?(1440/LOGICAL_H):(cores>=4&&mem>=4)?(1080/LOGICAL_H):1;
  return clamp(desired,1,cap);
}

function qualityName(q=renderQuality){
  if(q === "STANDARD") return language === "en" ? "Standard" : "标准";
  if(q === "1080P") return "1080P";
  if(q === "2K") return "2K";
  if(q === "AUTO") return language === "en" ? "Auto" : "自动";
  return q;
}

function deviceMayHeatFor(q=activeRenderQuality(), fps=targetFPS){
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  if(q === "2K" && (cores < 6 || mem < 6)) return true;
  if(q === "2K" && fps >= 60 && cores < 8) return true;
  if(fps >= 60 && mem && mem < 4) return true;
  return false;
}

function confirmPerformanceChoice(q=activeRenderQuality(), fps=targetFPS){
  if(!deviceMayHeatFor(q, fps)) return true;
  return window.confirm(
    language === "en"
      ? "Confirm? This setting may make your device heat up. Recommended: Standard / 30 FPS."
      : "确定？您的设备极有可能会发烫发热。建议使用标准画质或30帧。"
  );
}

function applyRenderQuality(){
  const scale = renderQuality === "AUTO" ? getAutoRenderScale() : getRenderScale();
  const renderW = Math.round(LOGICAL_W * scale);
  const renderH = Math.round(LOGICAL_H * scale);

  if(canvas.width!==renderW) canvas.width = renderW;
  if(canvas.height!==renderH) canvas.height = renderH;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
}

function setRenderQualitySetting(q){
  const effective = q === "AUTO" ? detectAutoQuality() : q;
  if(!confirmPerformanceChoice(effective, targetFPS)) return;
  renderQuality = q;
  applyRenderQuality();
  saveGame();
  showCenter((language==="en"?"Quality: ":"画质：") + qualityName(q), 80);
}

function setTargetFPSSetting(fps){
  if(!confirmPerformanceChoice(activeRenderQuality(), fps)) return;
  targetFPS = fps;
  saveGame();
  showCenter((language==="en"?"FPS: ":"帧数：") + fps, 80);
}

applyRenderQuality();
let renderResizeTimer = 0;
function scheduleAdaptiveResize(){
  clearTimeout(renderResizeTimer);
  renderResizeTimer = setTimeout(applyRenderQuality, 120);
}
window.addEventListener("resize", scheduleAdaptiveResize, {passive:true});
window.addEventListener("orientationchange", scheduleAdaptiveResize, {passive:true});
if(window.visualViewport) window.visualViewport.addEventListener("resize",scheduleAdaptiveResize,{passive:true});
if(typeof ResizeObserver!=="undefined"){
  const gameWrap=document.getElementById("gameWrap");
  if(gameWrap) new ResizeObserver(scheduleAdaptiveResize).observe(gameWrap);
}
let audioCtx = null;
const BUILD_TARGET = "PC";
const I18N_RES = window.PROJECT_ZERO_I18N || {};

const MSG_TEXT = I18N_RES.MSG_TEXT || {
  zh: {
    defaultNotice:"点击右侧「作战」进入第0章",
    shopDefault:"商店测试版：内部模拟购买，不接真钱",
    packDefault:"礼包测试版：内部模拟购买，不接真钱",
    mailDefault:"新手补给邮件可领取",
    eventDefault:"开服活动进行中",
    warehouseDefault:"仓库已开放",
    floraOwned:"芙洛拉已拥有",
    floraBought:"购买成功：芙洛拉已解锁",
    floraNoCrystal:"水晶不足：芙洛拉需要3000水晶",
    buy600:"模拟购买成功：+600水晶",
    buy1280:"模拟购买成功：+1280水晶",
    buy3280:"模拟购买成功：+3280水晶",
    buy6480:"模拟购买成功：+6480水晶",
    monthlyOwned:"月卡已购买",
    monthlyBought:"模拟购买成功：月卡已开启",
    monthlyNeedBuy:"请先购买月卡",
    monthlyClaimed:"今日已经领取过",
    monthlyClaimSuccess:"领取成功：+150水晶",
    starterBought:"新手礼包已购买",
    starterBuySuccess:"购买成功：新手启程礼包",
    growthBought:"成长礼包已购买",
    growthBuySuccess:"购买成功：执行官成长礼包",
    weaponBought:"武器礼包已购买",
    weaponBuySuccess:"购买成功：武器强化礼包",
    mailClaimSuccess:"领取成功：水晶300 / 金币1000 / 经验书5",
    mailAlready:"这封邮件已经领取过",
    eventAlreadyToday:"今日已经领取过，明日再来",
    eventAllDone:"七日签到已全部领取完成",
    eventRewardClaimed:"该奖励已领取",
    eventNeedOrder:"请按顺序领取每日奖励",
    eventLevelLow:"等级不足：需要 Lv.",
    eventSupplyClaimed:"初入奖励已领取",
    eventSupplySuccess:"领取成功：初入奖励",
    codeTooShort:"名字需要2-12个有效字符",
    codeSaved:"名字确认完成",
    guardPrompt:"GUARD! 按R弹刀",
    chainEntry:" 连携入场",
    switchCooldown:"切换冷却 ",
    moveRight:"前往右侧区域",
    missionFailed:"任务失败",
    missionComplete:"委托完成",
    prologueComplete:"凯恩加入队伍",
    lobbyGuide:"先准备一下再去事务处吧。",
    tutorialMove:"新手教程 1/4｜移动：使用 WASD 移动到光圈处",
    tutorialAttack:"新手教程 2/4｜攻击：点击左键打碎训练木箱",
    tutorialEnemy:"新手教程 3/4｜实战：击败训练目标",
    tutorialParry:"新手教程 4/4｜弹刀：敌人攻击预警时按R",
    tutorialSuccess:"教程完成｜奖励已加入背包",
    nameNeedOne:"请输入2-12个有效字符",
    chainSelect:"CHAIN SELECT  左键/右键选择连携",
    bossPhase2:"BOSS PHASE 2  护盾展开",
    bossPhase3:"BOSS PHASE 3  连续红光",
    eventClaimPrefix:"领取成功："
  },
  en: {
    defaultNotice:"Click Operation to enter Chapter 0",
    shopDefault:"Shop test version: simulated purchases only.",
    packDefault:"Pack test version: simulated purchases only.",
    mailDefault:"Welcome Reward mail is ready to claim.",
    eventDefault:"The launch event is now active.",
    warehouseDefault:"Inventory is now available.",
    floraOwned:"Flora is already recruited.",
    floraBought:"Flora recruited.",
    floraNoCrystal:"Not enough Crystals. Flora requires 3,000.",
    buy600:"Simulated purchase: +600 Crystal",
    buy1280:"Simulated purchase: +1280 Crystal",
    buy3280:"Simulated purchase: +3280 Crystal",
    buy6480:"Simulated purchase: +6480 Crystal",
    monthlyOwned:"Monthly card already active",
    monthlyBought:"Monthly card activated",
    monthlyNeedBuy:"Buy monthly card first",
    monthlyClaimed:"Already claimed today",
    monthlyClaimSuccess:"Claimed: +150 Crystal",
    starterBought:"Starter Pack already bought",
    starterBuySuccess:"Purchased: Starter Pack",
    growthBought:"Growth Pack already bought",
    growthBuySuccess:"Purchased: Executor Growth Pack",
    weaponBought:"Weapon Pack already bought",
    weaponBuySuccess:"Purchased: Weapon Upgrade Pack",
    mailClaimSuccess:"Claimed: Crystal 300 / Gold 1000 / EXP Books 5",
    mailAlready:"This mail has already been claimed",
    eventAlreadyToday:"Already claimed today. Come back tomorrow.",
    eventAllDone:"Seven-day check-in completed.",
    eventRewardClaimed:"This reward has already been claimed.",
    eventNeedOrder:"Please claim daily rewards in order.",
    eventLevelLow:"Level too low: requires Lv.",
    eventSupplyClaimed:"Arrival Rewards already claimed.",
    eventSupplySuccess:"Claimed: Arrival Rewards",
    codeTooShort:"Name must contain 2-12 valid characters",
    codeSaved:"Name confirmed",
    guardPrompt:"GUARD! Press R to Parry",
    chainEntry:" Chain Entry",
    switchCooldown:"Switch CD ",
    moveRight:"Move to the right area",
    missionFailed:"Mission Failed",
    missionComplete:"Mission Complete",
    prologueComplete:"Kane joined the team",
    lobbyGuide:"Prepare first, then head to the Affairs Office.",
    tutorialMove:"Tutorial 1/4 | Move: use WASD to reach the marker",
    tutorialAttack:"Tutorial 2/4 | Attack: left click to break the crate",
    tutorialEnemy:"Tutorial 3/4 | Combat: defeat the training target",
    tutorialParry:"Tutorial 4/4 | Parry: press R during the enemy warning",
    tutorialSuccess:"Tutorial Complete | Rewards added",
    nameNeedOne:"Please enter 2-12 valid characters",
    chainSelect:"CHAIN SELECT  Left/Right Click to choose chain",
    bossPhase2:"BOSS PHASE 2  Shield Deployed",
    bossPhase3:"BOSS PHASE 3  Continuous Red Warning",
    eventClaimPrefix:"Claimed: "
  }
};

function msg(key){
  return L(MSG_TEXT, key, key);
}
function skillPointLabel(){ return language==="en" ? "Skill Point" : "技能点"; }


function tr(zh, en){
  return language === "en" ? en : zh;
}

function currentLang(){
  return language === "en" ? "en" : "zh";
}

function langPack(obj){
  const lang = currentLang();
  if(!obj) return {};
  return obj[lang] || obj.zh || {};
}

function L(obj, key, fallback=""){
  const pack = langPack(obj);
  if(Object.prototype.hasOwnProperty.call(pack, key)) return pack[key];
  const zh = obj && obj.zh ? obj.zh[key] : undefined;
  return zh !== undefined ? zh : fallback || key;
}

function i18nPack(name){
  const src = I18N_RES && I18N_RES[name];
  if(!src) return null;
  return src[currentLang()] || src.zh || null;
}



/*
  V37.1 Language Core
  - UI_TEXT and MSG_TEXT remain as independent zh/en resource packs.
  - New text must be added to resource packs first, then accessed through ui(), msg(), roleName(), buildStageText(), or story providers.
  - localizeText is now legacy-only and no longer globally patches ctx.fillText.
*/
const LANG_CORE = I18N_RES.LANG_CORE || {
  zh: {
    chapterTitle:"第零章：初入",
    chapterTitleEn:"第零章：初入",
    stagePrefix:"第零章：初入 / 00-",
    operationSubtitle:"11关 / 水晶：",
    nameInputTitle:"请输入你的名字",
    nameInputHint:"2-12个字符，仅支持中文/英文/数字",
    prologueTitle:"序章：抵达雷文哈多",
    protagonist:"主角",
    retry:"重新挑战",
    backMap:"返回地图",
    defeatHint:"Enter / 点击：重新挑战    Esc：返回地图",
    hp:"生命",
    atk:"攻击",
    skillPoint:"技能点",
    normalUpgrade:"普攻强化  Lv.",
    eSkillUpgrade:"E技能强化 Lv.",
    qUltUpgrade:"Q大招强化  Lv.",
    shopSubtitle:"执行官、武器与资源中心",
    floraPriceLow:"水晶不足：芙洛拉需要4100水晶",
    recruitFloraFirst:"请先招募芙洛拉",
    everwinterOwned:"永冬之歌已拥有",
    everwinterBought:"购买成功：永冬之歌",
    everwinterLow:"水晶不足：永冬之歌需要888水晶",
    packDemo:"礼包为真钱购买内容，当前Demo仅展示。",
    supportDemo:"感谢支持开发。Demo中不会进行真实收费。",
    crystalGainPrefix:"水晶 +",
    rewardLabel:"奖励：",
    missionFailedTitle:"任务失败",
    teamHint:"可选择1—3名执行官，并保存4套队伍预设",
    slotPrefix:"位置 ",
    launchSupply:"欢迎奖励",
    mailRewardLine:"水晶300 / 金币1000 / 经验书5",
    tipPrefix:"提示：",
    areaLabel:"区域：",
    typeLabel:"类型：",
    statusLabel:"状态：",
    stageCodePrefix:"00-",
    settlementRewardLine:"EXP +500 / 金币 / 经验书 / 精炼合金 已加入背包",
    operatorTabs:"等级 / 技能 / 武器",
    goldCostPrefix:"金币 ",
    atkLabel:"攻击  ",
    hpLabel:"生命  ",
    levelCostLine:"升级消耗：经验书 x1 / 金币 ",
    weaponLevelPrefix:"武器等级  Lv.",
    atkBonusPrefix:"攻击加成  +",
    weaponCostLine:"强化消耗：精炼合金 x1 / 金币 ",
    floraDisplayName:"芙洛拉",
    floraDisplayFull:"Flora / 芙洛拉",
    floraRankLine:"S级 · 冰 · 法术",
    floraFeatureLine:"圆形群伤 / 控场 / 对单较弱",
    sfsVersion:"V37.2 Language Audit",
    dailyLaunchText:"Launch event ongoing",
    rewardCrystalPrefix:"水晶 +",
    availableStatus:"可领取",
    notReachedStatus:"未达成",
    claimedStatus:"已领取",
    rookieGrowthDesc:"提升等级，领取奖励",
    rookieGrowth:"成长计划",
    weaponUpgradeMat:"武器强化材料",
    characterLevelMat:"角色升级材料",
    upgradeWeaponHint:"升级角色 / 强化武器",
    operatorBuyShop:"角色购买 / 商店",
    currentlyDeployed:"当前出战",
    notCompletedStatus:"未完成",
    ownedStatus:"已完成",
    weaponOreWord:"精炼合金",
    expBookWord:"经验书",
    goldWord:"金币",
    crystalWord:"水晶"
  },
  en: {
    chapterTitle:"Chapter 0: Arrival",
    chapterTitleEn:"Chapter 0: Arrival",
    stagePrefix:"Chapter 0: Arrival / 00-",
    operationSubtitle:"11 Stages / Crystal: ",
    nameInputTitle:"Enter your name",
    nameInputHint:"2-12 characters, Chinese / English / numbers only",
    prologueTitle:"Prologue: Arrival in Ravenhado",
    protagonist:"Protagonist",
    retry:"Retry",
    backMap:"Back to Map",
    defeatHint:"Enter / Click: Retry    Esc: Back to Map",
    hp:"HP",
    atk:"ATK",
    skillPoint:"Skill Points",
    normalUpgrade:"Normal Upgrade  Lv.",
    eSkillUpgrade:"E Skill Upgrade Lv.",
    qUltUpgrade:"Q Ultimate Upgrade Lv.",
    shopSubtitle:"Executors, weapons, and resources",
    floraPriceLow:"Not enough Crystals. Flora requires 4,100.",
    recruitFloraFirst:"Recruit Flora first",
    everwinterOwned:"Song of Everwinter already owned",
    everwinterBought:"Purchased: Song of Everwinter",
    everwinterLow:"Not enough Crystals. Song of Everwinter requires 888.",
    packDemo:"Packs are real-money items. Demo display only.",
    supportDemo:"Thanks for supporting development. No real payment in this demo.",
    crystalGainPrefix:"Crystal +",
    rewardLabel:"Reward: ",
    sfsVersion:"V37.4 Language Patch",
    floraFeatureLine:"Circular AoE / Crowd Control / Weaker against single targets",
    floraRankLine:"S Rank · Ice · Caster",
    floraDisplayFull:"Flora",
    floraDisplayName:"Flora",
    weaponCostLine:"Upgrade cost: Weapon Ore x1 / Gold ",
    atkBonusPrefix:"ATK Bonus  +",
    weaponLevelPrefix:"Weapon Level  Lv.",
    levelCostLine:"Level cost: EXP Book x1 / Gold ",
    hpLabel:"HP  ",
    atkLabel:"ATK  ",
    goldCostPrefix:"Gold ",
    operatorTabs:"Level / Skill / Weapon",
    settlementRewardLine:"EXP +500 / Gold / EXP Books / Weapon Ore added to inventory",
    stageCodePrefix:"00-",
    statusLabel:"Status: ",
    typeLabel:"Type: ",
    areaLabel:"Area: ",
    tipPrefix:"Tip: ",
    mailRewardLine:"Crystal 300 / Gold 1000 / EXP Books 5",
    launchSupply:"Launch Supply",
    slotPrefix:"Slot ",
    teamHint:"Deploy 1–3 executors and save up to 4 team presets",
    missionFailedTitle:"Mission Failed",
    dailyLaunchText:"Launch Event Active",
    rewardCrystalPrefix:"Crystal +",
    availableStatus:"Available",
    notReachedStatus:"Incomplete",
    claimedStatus:"Claimed",
    rookieGrowthDesc:"Reach levels and claim rewards",
    rookieGrowth:"Rookie Growth",
    weaponUpgradeMat:"Weapon upgrade material",
    characterLevelMat:"Character level material",
    upgradeWeaponHint:"Level characters / Upgrade weapons",
    operatorBuyShop:"Recruit operators in the Shop",
    currentlyDeployed:"Deployed",
    notCompletedStatus:"Not Completed",
    ownedStatus:"Completed",
    weaponOreWord:"Weapon Ore",
    expBookWord:"EXP Books",
    goldWord:"Gold",
    crystalWord:"Crystal"
  }
};

function tx(key){
  return L(LANG_CORE, key, key);
}

const ACCOUNT_TEXT = {
  zh:{loginTitle:"账号登录",registerTitle:"账号注册",email:"邮箱",password:"密码",login:"登录",register:"注册",guest:"游客体验",enterEmail:"请输入邮箱",enterPassword:"请输入密码",noAccount:"没有账号？注册",haveAccount:"已有账号？登录",syncing:"正在同步云存档...",checkingSave:"正在检查云端存档...",noCloudSave:"云端暂无存档，请创建代号",loginSuccess:"登录成功",registerSuccess:"注册成功",guestNotice:"游客模式只使用本地存档",autoSynced:"已自动同步",syncFailed:"自动同步失败",invalidEmail:"邮箱格式不正确",weakPassword:"密码至少需要6位",emailExists:"邮箱已注册，请登录",wrongPassword:"密码错误",userNotFound:"账号不存在",permissionDenied:"云存档权限不足",networkError:"网络错误",unknownError:"账号系统错误"},
  en:{loginTitle:"Account Login",registerTitle:"Account Register",email:"Email",password:"Password",login:"Login",register:"Register",guest:"Guest Mode",enterEmail:"Enter email",enterPassword:"Enter password",noAccount:"No account? Register",haveAccount:"Have account? Login",syncing:"Syncing cloud save...",checkingSave:"Checking cloud save...",noCloudSave:"No cloud save. Create your code name.",loginSuccess:"Login successful",registerSuccess:"Account created",guestNotice:"Guest mode only uses local save",autoSynced:"Auto synced",syncFailed:"Auto sync failed",invalidEmail:"Invalid email",weakPassword:"Password must be at least 6 characters",emailExists:"Email already registered. Please login.",wrongPassword:"Wrong password",userNotFound:"Account not found",permissionDenied:"Cloud save permission denied",networkError:"Network error",unknownError:"Account system error"}
};
function accTx(key){ return L(ACCOUNT_TEXT, key, key); }
function accountErrorText(err){
  const code = err && err.code ? String(err.code) : "";
  const msg = err && err.message ? String(err.message) : "";
  if(code.includes("invalid-email")) return accTx("invalidEmail");
  if(code.includes("weak-password")) return accTx("weakPassword");
  if(code.includes("email-already-in-use")) return accTx("emailExists");
  if(code.includes("wrong-password") || code.includes("invalid-credential")) return accTx("wrongPassword");
  if(code.includes("user-not-found")) return accTx("userNotFound");
  if(code.includes("permission-denied") || msg.includes("permission")) return accTx("permissionDenied");
  if(code.includes("network") || msg.toLowerCase().includes("network")) return accTx("networkError");
  return accTx("unknownError") + (code ? ": " + code : "");
}

const CLOUD_TEXT = {
  zh:{cloudTitle:"云存档",cloudEmail:"邮箱",cloudLogin:"登录",cloudRegister:"注册",cloudUpload:"上传存档",cloudDownload:"下载存档",cloudLogout:"退出登录",cloudOffline:"未登录",cloudLoggedIn:"已登录",cloudNeedLogin:"请先登录云存档账号",cloudEmailMissing:"请输入邮箱和密码",cloudLoginOk:"登录成功",cloudRegisterOk:"注册成功",cloudUploadOk:"云存档上传成功",cloudDownloadOk:"云存档下载成功，已写入本地",cloudLogoutOk:"已退出登录",cloudNoSave:"云端暂无存档",cloudNoLocalSave:"本地还没有存档，请先进入游戏并完成代号创建",cloudInitFail:"Firebase 初始化失败",cloudUnavailable:"Firebase 未加载，请用 Netlify/网页环境打开",cloudDownloading:"正在读取云存档...",cloudUploading:"正在上传云存档...",cloudPromptEmail:"输入邮箱",cloudPromptPassword:"输入密码（至少6位）",cloudAutoRegisterHint:"首次创建代号后会绑定邮箱，用于自动云存档",cloudRegisterFailed:"账号注册失败，本地存档已保留",cloudAutoSaveOk:"云端已自动保存"},
  en:{cloudTitle:"Cloud Save",cloudEmail:"Email",cloudLogin:"Login",cloudRegister:"Register",cloudUpload:"Upload Save",cloudDownload:"Download Save",cloudLogout:"Sign Out",cloudOffline:"Not signed in",cloudLoggedIn:"Signed in",cloudNeedLogin:"Please sign in first",cloudEmailMissing:"Enter email and password",cloudLoginOk:"Login successful",cloudRegisterOk:"Account created",cloudUploadOk:"Cloud save uploaded",cloudDownloadOk:"Cloud save downloaded and applied locally",cloudLogoutOk:"Signed out",cloudNoSave:"No cloud save found",cloudNoLocalSave:"No local save yet. Create your code name and enter the game first.",cloudInitFail:"Firebase initialization failed",cloudUnavailable:"Firebase not loaded. Open via Netlify / web hosting.",cloudDownloading:"Downloading cloud save...",cloudUploading:"Uploading cloud save...",cloudPromptEmail:"Enter email",cloudPromptPassword:"Enter password, at least 6 chars",cloudAutoRegisterHint:"Email binding after code-name creation enables auto cloud save",cloudRegisterFailed:"Account registration failed. Local save is kept.",cloudAutoSaveOk:"Cloud auto-saved"}
};
function cloudTx(key){ return L(CLOUD_TEXT, key, key); }


let audioUnlocked = false;

function unlockAudio(){
  if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if(audioCtx.state === "suspended") audioCtx.resume();
  audioUnlocked = true;
  if(gameMode === "login") requestLoginBgmPlay();
}

function audioEase01(x){
  x = clamp(Number(x) || 0, 0, 1);
  return x < .5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2;
}

function effectiveSfxGain(gain){
  if(audioMuted) return 0;
  return Math.max(0.0001, (Number(gain) || 0) * clamp(sfxVolume,0,1));
}

function ensureLoginBgm(){
  if(loginBgmAudio || loginBgmUnavailable) return loginBgmAudio;
  try{
    const src = LOGIN_BGM_PATHS[loginBgmPathIndex] || LOGIN_BGM_PATHS[0];
    const a = new Audio(src);
    a.loop = true;
    a.preload = "auto";
    a.volume = 0;
    a.addEventListener("error", () => {
      loginBgmAudio = null;
      loginBgmPathIndex++;
      if(loginBgmPathIndex >= LOGIN_BGM_PATHS.length){
        loginBgmUnavailable = true;
      }
    }, { once:true });
    loginBgmAudio = a;
  }catch(e){
    loginBgmPathIndex++;
    if(loginBgmPathIndex >= LOGIN_BGM_PATHS.length) loginBgmUnavailable = true;
  }
  return loginBgmAudio;
}

function requestLoginBgmPlay(){
  const a = ensureLoginBgm();
  if(!a || loginBgmUnavailable) return;
  if(!a.paused) return;
  if(loginBgmPlayPending) return;
  loginBgmPlayPending = true;
  const done = () => { loginBgmPlayPending = false; };
  try{
    const p = a.play();
    if(p && typeof p.then === "function") p.then(done).catch(done);
    else done();
  }catch(e){ done(); }
}

function updateLoginBgm(){
  const wantsLoginMusic = gameMode === "login";
  loginBgmTargetVolume = (!audioMuted && wantsLoginMusic) ? clamp(bgmVolume,0,1) : 0;

  if(wantsLoginMusic && loginBgmTargetVolume > 0.001) requestLoginBgmPlay();

  const diff = loginBgmTargetVolume - loginBgmCurrentVolume;
  const step = 0.045 * (frameScale || 1);
  loginBgmCurrentVolume += diff * clamp(step, 0.01, 0.18);
  if(Math.abs(diff) < 0.002) loginBgmCurrentVolume = loginBgmTargetVolume;

  const a = ensureLoginBgm();
  if(a){
    const eased = audioEase01(clamp(loginBgmCurrentVolume,0,1));
    a.volume = clamp(eased,0,1);
    if(loginBgmTargetVolume <= 0.001 && loginBgmCurrentVolume <= 0.003 && !a.paused){
      try{ a.pause(); }catch(e){}
    }
  }
}

function tone(freq=440, dur=0.08, type="sine", gain=0.08, start=0){
  if(!audioUnlocked || !audioCtx) return;
  gain = effectiveSfxGain(gain);
  if(gain <= 0.0001) return;
  const t = audioCtx.currentTime + start;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur=0.08, gain=0.08, start=0){
  if(!audioUnlocked || !audioCtx) return;
  gain = effectiveSfxGain(gain);
  if(gain <= 0.0001) return;
  const t = audioCtx.currentTime + start;
  const n = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
  const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * (1-i/n);
  const src = audioCtx.createBufferSource();
  const g = audioCtx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.buffer = buffer;
  src.connect(g);
  g.connect(audioCtx.destination);
  src.start(t);
}

function metallicPing(base=880, gain=0.09){
  if(!audioUnlocked || !audioCtx) return;
  tone(base,0.16,"triangle",gain);
  tone(base*1.5,0.13,"sine",gain*0.55,0.012);
  tone(base*2.01,0.10,"triangle",gain*0.35,0.024);
  tone(base*2.72,0.08,"sine",gain*0.22,0.036);
}

function sweepTone(from=1200,to=360,dur=.09,type="sawtooth",gain=.035,start=0){
  if(!audioUnlocked || !audioCtx) return;
  gain=effectiveSfxGain(gain);if(gain<=.0001)return;
  const t=audioCtx.currentTime+start,osc=audioCtx.createOscillator(),g=audioCtx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(Math.max(20,from),t);osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(gain,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  osc.connect(g);g.connect(audioCtx.destination);osc.start(t);osc.stop(t+dur+.02);
}

function filteredNoise(dur=.07,gain=.025,freq=1400,q=.8,start=0){
  if(!audioUnlocked || !audioCtx) return;
  gain=effectiveSfxGain(gain);if(gain<=.0001)return;
  const t=audioCtx.currentTime+start,n=Math.max(1,Math.floor(audioCtx.sampleRate*dur));
  const buffer=audioCtx.createBuffer(1,n,audioCtx.sampleRate),data=buffer.getChannelData(0);
  for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);
  const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();
  filter.type="bandpass";filter.frequency.setValueAtTime(freq,t);filter.Q.setValueAtTime(q,t);
  g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(audioCtx.destination);src.start(t);
}

function sfxElementImpact(roleId,label=""){
  if(audioMuted||!audioUnlocked||!audioCtx)return;
  const periodic=label==="GALE"||label==="FROST"||label==="DOMAIN"||label==="BIND";
  const scale=periodic?.42:1,element=(roles[roleId]&&roles[roleId].element)||"physical";
  if(element==="physical"){
    metallicPing(620,.045*scale);sweepTone(1650,480,.075,"sawtooth",.026*scale);
  }else if(element==="wind"){
    filteredNoise(.10,.035*scale,1050,.55);tone(680,.075,"sine",.028*scale,.012);
  }else if(element==="dark"){
    tone(82,.11,"sawtooth",.050*scale);sweepTone(520,105,.13,"square",.030*scale);
  }else if(element==="ice"){
    tone(1480,.09,"sine",.045*scale);tone(2220,.07,"triangle",.026*scale,.018);
  }else{
    metallicPing(1040,.038*scale);sweepTone(1380,260,.09,"triangle",.024*scale);
  }
}


function sfx(name){
  if(audioMuted) return;
  if(!audioUnlocked) return;
  switch(name){
    case "ui":
      tone(760,0.045,"triangle",0.045);
      tone(980,0.04,"triangle",0.025,0.035);
      break;
    case "slash1":
      metallicPing(760,0.045);
      noise(0.025,0.018);
      break;
    case "slash2":
      metallicPing(860,0.055);
      noise(0.03,0.022);
      break;
    case "slash3":
      metallicPing(680,0.075);
      tone(180,0.10,"square",0.035);
      noise(0.055,0.035);
      break;
    case "hit":
      // Dry collision + a short scrape gives normal attacks a clearer
      // weapon-on-surface feel without turning every hit into a parry clang.
      metallicPing(820,0.068);
      metallicPing(1380,0.032);
      sweepTone(1900,420,.085,"sawtooth",.032,.008);
      filteredNoise(.075,.028,1750,.7,.006);
      break;
    case "skill":
      tone(240,0.08,"sawtooth",0.08);
      tone(520,0.12,"triangle",0.06,0.04);
      noise(0.10,0.06,0.03);
      break;
    case "ultStart":
      tone(90,0.35,"sawtooth",0.05);
      tone(180,0.32,"triangle",0.04,0.05);
      break;
    case "ultBoom":
      noise(0.22,0.12);
      tone(70,0.22,"square",0.12);
      tone(260,0.15,"sawtooth",0.06);
      break;
    case "chain":
      metallicPing(980,0.075);
      tone(520,0.08,"triangle",0.05,0.04);
      tone(1320,0.10,"triangle",0.05,0.11);
      break;
    case "break":
      metallicPing(740,0.10);
      noise(0.16,0.09);
      tone(120,0.16,"square",0.08);
      break;
    case "parry":
      // V40.8 Combat Feel: 95% metal / 5% electro. Strong weapon-on-weapon ring.
      metallicPing(1280,0.18);
      metallicPing(1720,0.15);
      metallicPing(2160,0.10);
      tone(310,0.10,"square",0.018);
      noise(0.035,0.012);
      break;
    case "parryBoss":
      // Boss parry gets a second heavy clang layer.
      metallicPing(1180,0.22);
      metallicPing(1650,0.16);
      metallicPing(2320,0.12);
      tone(180,0.16,"square",0.045,0.015);
      tone(92,0.13,"sawtooth",0.018,0.035);
      noise(0.04,0.014);
      break;
    case "reward":
      tone(660,0.08,"triangle",0.07);
      tone(880,0.08,"triangle",0.07,0.08);
      tone(1320,0.12,"triangle",0.06,0.16);
      break;
    case "matchSwap":
      tone(520,0.045,"triangle",0.045);
      tone(760,0.055,"triangle",0.035,0.035);
      break;
    case "matchPop":
      tone(740,0.055,"sine",0.055);
      tone(1040,0.075,"triangle",0.040,0.035);
      noise(0.028,0.012,0.018);
      break;
    case "matchCombo":
      tone(660,0.06,"triangle",0.065);
      tone(990,0.07,"triangle",0.055,0.055);
      tone(1480,0.10,"sine",0.045,0.115);
      break;
    case "matchClear":
      tone(520,0.08,"triangle",0.070);
      tone(780,0.08,"triangle",0.070,0.07);
      tone(1170,0.10,"triangle",0.065,0.14);
      tone(1760,0.14,"sine",0.055,0.22);
      break;
    case "buy":
      tone(360,0.08,"triangle",0.06);
      tone(720,0.10,"triangle",0.07,0.07);
      break;
  }
}



const FONT_UI = '"Segoe UI", Arial, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif';
const FONT_JP = '"Segoe UI", Arial, "Noto Sans JP", "Yu Gothic", "Meiryo", "Microsoft YaHei", sans-serif';

function setFont(size=16, weight="", jp=false){
  ctx.font = (weight ? weight + " " : "") + size + "px " + (jp ? FONT_JP : FONT_UI);
}

function fitText(text, maxWidth, size=16, weight="", minSize=10){
  let s = size;
  do{
    setFont(s, weight);
    if(ctx.measureText(String(text)).width <= maxWidth) break;
    s -= 1;
  }while(s >= minSize);
  return s;
}

const ULT_MAX = 2000;
const ULT_START_AMOUNT = 0;

const ATTACK_CD_FRAMES = 30;   // 0.5 sec at 60fps base
const SWITCH_CD_FRAMES = 60;   // 1.0 sec at 60fps base
const MAX_PARTICLES_FINAL = 60;
const MAX_SLASHES_FINAL = 20;
const MAX_TEXTS_FINAL = 35;
const MAX_PROJECTILES_FINAL = 32;
const MAX_ENEMIES_FINAL = 18;
const MOVE_SPEED_MULT = 1.02;
const SKILL_ENERGY_COST = 40;
const W = LOGICAL_W, H = LOGICAL_H;

// Flora illustration removed: use original white-head / blue-body executor model.
const floraPortraitImg = null;

const keys = {};
let mouseX = 0, mouseY = 0, mouseDown = false, clicked = false, mouseAttackConsumed = false, attackInputLock = 0, prev = {};

const mobileInput = {
  enabled:false,
  pointerActive:false,
  joyId:null,
  joyBaseX:0,
  joyBaseY:0,
  joyX:0,
  joyY:0,
  moveX:0,
  moveY:0,
  activeButtons:{}
};

function isMobileLike(){
  return false;
}

function shouldShowMobileControls(){
  return false;
}

function setKeyVirtual(key, down){
  keys[key] = !!down;
}

function mobileButtonRects(){
  // MV2.2: hand-drawn layout from designer.
  // Right hand zone:
  //          Q / 大招
  //          E / 技能
  //    R / 切换     ATK / 普攻
  //          DODGE / 冲刺
  return {
    attack:{x:W-158,y:H-145,r:58,label:language==="en"?"ATK":"普攻",key:"mouse1",kind:"main"},
    dash:{x:W-96,y:H-56,r:42,label:language==="en"?"DODGE":"冲刺",key:"shift",kind:"dash"},
    skill:{x:W-215,y:H-246,r:38,label:language==="en"?"SKILL":"技能",key:"e",kind:"skill"},
    ult:{x:W-126,y:H-286,r:42,label:language==="en"?"ULT":"大招",key:"q",kind:"ult"},
    swap:{x:W-280,y:H-150,r:36,label:language==="en"?"SWAP":"切换",key:"r",kind:"swap"},
    menu:{x:W-52,y:52,r:31,label:"MENU",key:"escape",kind:"menu"}
  };
}

function canvasPointFromTouch(t){
  const r = canvas.getBoundingClientRect();
  return {
    x:(t.clientX - r.left) * W / r.width,
    y:(t.clientY - r.top) * H / r.height
  };
}

function pointInRect(p, rc){
  if(rc.r){
    return Math.hypot(p.x-rc.x, p.y-rc.y) <= rc.r;
  }
  return p.x>=rc.x && p.x<=rc.x+rc.w && p.y>=rc.y && p.y<=rc.y+rc.h;
}

function pressMobileButton(name){
  const rc = mobileButtonRects()[name];
  if(!rc) return;
  if(name === "attack"){
    mouseDown = true;
    clicked = false;
  }else{
    setKeyVirtual(rc.key, true);
  }
  mobileInput.activeButtons[name] = true;
}

function releaseMobileButtons(){
  for(const name of Object.keys(mobileInput.activeButtons)){
    const rc = mobileButtonRects()[name];
    if(!rc) continue;
    if(name === "attack"){
      mouseDown = false;
      mouseAttackConsumed = false;
    }else{
      setKeyVirtual(rc.key, false);
    }
  }
  mobileInput.activeButtons = {};
}

function updateMobileMoveKeys(){
  const dead = 0.18;
  setKeyVirtual("a", mobileInput.moveX < -dead);
  setKeyVirtual("d", mobileInput.moveX > dead);
  setKeyVirtual("w", mobileInput.moveY < -dead);
  setKeyVirtual("s", mobileInput.moveY > dead);
}

function clearMobileMoveKeys(){
  mobileInput.moveX = 0;
  mobileInput.moveY = 0;
  updateMobileMoveKeys();
}

function handleMobileTouchStart(e){
  // PC build: touch controls disabled.
}

function handleMobileTouchMove(e){
  // PC build: touch controls disabled.
}

function handleMobileTouchEnd(e){
  // PC build: touch controls disabled.
}

// PC build: touch listener disabled for performance.
// PC build: touch listener disabled for performance.
// PC build: touch listener disabled for performance.
// PC build: touch listener disabled for performance.



function handleAccountTextKey(e){
  if(gameMode !== "login" || cloudUser) return false;
  if(accountBusy) return false;
  const k = e.key;
  const lower = String(k || "").toLowerCase();

  if(guestCloudOverwritePromptActive){
    if(lower==="escape"){
      guestCloudOverwritePromptActive=false;
      accountFocusedField="password";
    }else if(lower==="enter"){
      guestCloudOverwritePromptActive=false;
      accountLoginFlow(true);
    }
    e.preventDefault();
    return true;
  }

  if(!accountFocusedField) accountFocusedField = "email";

  if(lower === "tab"){
    accountFocusedField = accountFocusedField === "email" ? "password" : "email";
    e.preventDefault();
    return true;
  }
  if(lower === "enter"){
    e.preventDefault();
    if(accountMode === "register") accountRegisterFlow();
    else accountLoginFlow();
    return true;
  }
  if(lower === "backspace"){
    e.preventDefault();
    if(accountFocusedField === "password") accountPassword = accountPassword.slice(0, -1);
    else accountEmail = accountEmail.slice(0, -1);
    return true;
  }
  if(lower === "escape"){
    accountFocusedField = "";
    e.preventDefault();
    return true;
  }
  if(k && k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
    e.preventDefault();
    if(accountFocusedField === "password"){
      if(accountPassword.length < 64) accountPassword += k;
    }else{
      if(!/\s/.test(k) && accountEmail.length < 96) accountEmail += k;
    }
    accountMsg = "";
    return true;
  }
  return false;
}

function handleTeamRenameTextKey(e){
  if(gameMode!=="team" || teamRenamePreset<0) return false;
  if(e.isComposing || e.key==="Process" || e.keyCode===229) return false;
  const key=String(e.key||"");
  const lower=key.toLowerCase();
  if(lower==="enter"){
    e.preventDefault();
    commitTeamPresetRename();
    return true;
  }
  if(lower==="escape"){
    e.preventDefault();
    cancelTeamPresetRename();
    return true;
  }
  if(lower==="backspace"){
    e.preventDefault();
    if(teamRenameReplaceOnType){teamRenameDraft="";teamRenameReplaceOnType=false;}
    else teamRenameDraft=Array.from(teamRenameDraft).slice(0,-1).join("");
    if(pzHiddenTextInput)pzHiddenTextInput.value=teamRenameDraft;
    return true;
  }
  if(key.length===1 && !e.ctrlKey && !e.metaKey && !e.altKey){
    e.preventDefault();
    if(teamRenameReplaceOnType){teamRenameDraft="";teamRenameReplaceOnType=false;}
    if(Array.from(teamRenameDraft).length<16){
      const candidate=(teamRenameDraft+key).slice(0,16);
      if(!checkWritableText(candidate).ok){textSafetyWarning();return true;}
      teamRenameDraft=candidate;
      if(pzHiddenTextInput)pzHiddenTextInput.value=teamRenameDraft;
    }
    return true;
  }
  return false;
}

window.addEventListener("keydown", e => {
  if(gameMode === "boot"){
    unlockAudio();
    if(bootSkipReady || (performance.now()-bootStartTime)>900){
      gameMode = bootNextMode || "login";
      if(gameMode === "login") requestLoginBgmPlay();
    }
    return;
  }
  unlockAudio();

  if(handleTeamRenameTextKey(e)) return;
  if(handleAccountTextKey(e)) return;

  // Do not let global game shortcuts block real text fields / IME composition.
  // This fixes name typing in Electron and keeps future HTML inputs safe.
  if (isTypingTarget(document.activeElement)) {
    return;
  }

  keys[e.key.toLowerCase()] = true;
  if(gameMode === "nameInput"){
    if(e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){
      if(/[一-龥a-zA-Z0-9]/.test(e.key) && nameInput.length < 12){
        const candidate=nameInput+e.key;
        if(!checkWritableText(candidate).ok){nameError=textSafetyWarning();return;}
        nameInput = candidate;
        nameError = "";
      }else if(e.key !== " "){
        nameError = msg("nameNeedOne");
      }
    }
    if([" ","backspace","enter"].includes(e.key.toLowerCase())) e.preventDefault();
  }
  if ([" ","shift","tab"].includes(e.key.toLowerCase())) e.preventDefault();
});
window.addEventListener("keyup", e => {
  if (isTypingTarget(document.activeElement)) return;
  keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * W / r.width;
  mouseY = (e.clientY - r.top) * H / r.height;
  if(gameMode === "match3" && mouseDown && window.PZMatch3) window.PZMatch3.pointerMove(mouseX,mouseY);
});
canvas.addEventListener("mousedown", e => {
  if(gameMode === "boot"){
    unlockAudio();
    if(bootSkipReady || (performance.now()-bootStartTime)>900){
      gameMode = bootNextMode || "login";
      if(gameMode === "login") requestLoginBgmPlay();
    }
    return;
  }
  const r = canvas.getBoundingClientRect();
  mouseX = (e.clientX - r.left) * W / r.width;
  mouseY = (e.clientY - r.top) * H / r.height;
  if(gameMode === "match3" && e.button === 0 && window.PZMatch3){
    unlockAudio();
    mouseDown = true;
    // Match-3 uses drag input for the board and click input for its UI buttons.
    // Keep the click flag so Back/Retry/Next remain mouse-operable.
    clicked = true;
    window.PZMatch3.pointerDown(mouseX,mouseY);
    return;
  }
  if (e.button === 0) { unlockAudio(); mouseDown = true; clicked = true; sfx("ui"); }
  if (e.button === 2) { unlockAudio(); keys["mouse2"] = true; }
});
canvas.addEventListener("mouseup", e => { if(e.button===0) { if(gameMode==="match3" && window.PZMatch3) window.PZMatch3.pointerUp(mouseX,mouseY); mouseDown = false; mouseAttackConsumed = false; } if(e.button===2) keys["mouse2"]=false; });
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("wheel", e => {
  if(gameMode === "operators" && operatorPageMode === "list"){
    operatorListWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
  if(gameMode === "warehouse"){
    warehouseWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
  if(gameMode === "team"){
    teamRosterWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
  if(gameMode === "actionRecord"){
    actionRecordWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
  if(gameMode === "operation" && selectedTab === "dungeon" && dungeonPanelMode === "material" && materialDungeonSelected === 3){
    moduleArchiveWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
  if(gameMode === "operators" && operatorPageMode === "detail" && operatorTab === "module" && moduleWarehouseSlot){
    moduleWarehouseWheelDelta += (e.deltaY || e.deltaX || 0);
    e.preventDefault();
  }
}, {passive:false});
canvas.addEventListener("mouseleave", resetPointerAndKeysAfterFocusLoss);
canvas.addEventListener("mouseout", resetPointerAndKeysAfterFocusLoss);

function justPressed(k){ return keys[k] && !prev[k]; }

function resetPointerAndKeysAfterFocusLoss(){
  try{
    mouseDown = false;
    clicked = false;
    mouseAttackConsumed = false;
    attackInputLock = 0;
    attackBuffer = 0;
    skillBuffer = 0;
    ultBuffer = 0;
    dashBuffer = 0;
    keys = {};
    prev = {};
    if(typeof releaseMobileButtons === "function") releaseMobileButtons();
    if(typeof clearMobileMoveKeys === "function") clearMobileMoveKeys();
  }catch(e){}
}


// Persist tutorial resume state through the single global exit-save path.
// Keeping one writer avoids duplicate local/cloud save attempts during unload.
function prepareTutorialResumeSave(){
  try{
    if(hasCreatedProfile && !prologueDone && (tutorialInProgress || gameMode === "tutorialBattle" || (window.PZStory && window.PZStory.active))){
      if(gameMode === "tutorialBattle") tutorialResumeMode = "battle";
      else if(tutorialResumeMode !== "afterBattle") tutorialResumeMode = tutorialResumeMode || "intro";
      tutorialInProgress = true;
      return true;
    }
  }catch(e){ console.warn("[TutorialResume]",e); }
  return false;
}

// Fix: when switching browser tabs/pages and returning,
// the browser may miss mouseup/keyup events, leaving UI input locked.
window.addEventListener("blur", resetPointerAndKeysAfterFocusLoss);
window.addEventListener("focus", resetPointerAndKeysAfterFocusLoss);
window.addEventListener("pageshow", resetPointerAndKeysAfterFocusLoss);
document.addEventListener("visibilitychange", () => {
  if(document.hidden) resetPointerAndKeysAfterFocusLoss();
  else setTimeout(resetPointerAndKeysAfterFocusLoss, 30);
});

function inRect(x,y,w,h){ return mouseX>=x && mouseX<=x+w && mouseY>=y && mouseY<=y+h; }
window.getPZPointerState=()=>({x:mouseX,y:mouseY,down:mouseDown});
function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function dist(a,b,c,d){ return Math.hypot(a-c,b-d); }
function dist2(a,b,c,d){ const dx=a-c, dy=b-d; return dx*dx+dy*dy; }
function withinDist(a,b,c,d,r){ return dist2(a,b,c,d) < r*r; }



function detectSystemLanguage(){
  try{
    const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"]).map(v => String(v).toLowerCase());
    for(const l of langs){
      if(l.startsWith("zh")) return "zh";
      if(l.startsWith("en")) return "en";
    }
  }catch(e){}
  return "en";
}

let prologueDone = false;
let lobbyGuideDone = false;
let lobbyGuideStep = 0;

// V49.14 UI Feature Guide: first-time, player-triggered feature explanations.
let uiGuideSeen = {};
let uiNewSeen = {};
let uiGuidePrompt = null;

let tutorialStep = 0;
let tutorialTarget = null;
let tutorialEnemy = null;
let tutorialCrates = [];
let tutorialArea = 1;
let tutorialPanelActive = false;
let tutorialPanelTitle = "";
let tutorialPanelText = "";
let tutorialPanelAction = null;
let tutorialSkipConfirm = false;
let tutorialUsedAttack = false;
let tutorialUsedSkill = false;
let tutorialUsedDash = false;
let tutorialUsedUltimate = false;
let tutorialUsedChain = false;
let tutorialParried = false;
let profileTab = "overview";
let prologueLine = 0;
let prologueAfterBattle = false;
// V49.17.8 Tutorial resume: if player exits before finishing new-player tutorial, resume tutorial next launch.
let tutorialInProgress = false;
let tutorialResumeMode = ""; // intro / battle / afterBattle
let gameMode = "boot";
let bootNextMode = "login";
let bootStartTime = performance.now();
let bootSkipReady = false;
let bootGlitchPlayed = false;
let frameScale = 1;
let lastFrameTime = performance.now();
let commercialTransitionMode = "boot";
let commercialTransitionTimer = 0;

// Time Based Gameplay Patch V40.8
// 60FPS remains the baseline. 30FPS / 60FPS now keep the same movement speed.
// Velocity damping also uses frameScale, so targetFPS no longer changes movement feel.
function fpsScale(){
  // Compatibility helper: frameScale already represents delta time.
  // Returning frameScale here caused some movement paths to apply delta twice,
  // making 30 FPS gameplay move faster/slower than 60 FPS.
  return 1;
}
let chainSelect = false, chainSelectTimer = 0;
let loadingTimer = 0, loadingProgress = 0, loadingTarget = "lobby", loadingMessage = "Initializing...";
let settingsTab = "graphics", logoutConfirm = false, localDeleteConfirm = false;
let settingsReturnMode = "lobby";
const UI_LANGUAGE_PREFERENCE_KEY = "project_zero_ui_language";
function readUiLanguagePreference(){
  try{
    const value = localStorage.getItem(UI_LANGUAGE_PREFERENCE_KEY);
    if(value === "zh" || value === "en") return value;
  }catch(e){}
  return detectSystemLanguage();
}
function rememberUiLanguage(value){
  if(value !== "zh" && value !== "en") return;
  try{ localStorage.setItem(UI_LANGUAGE_PREFERENCE_KEY, value); }catch(e){}
  try{ document.documentElement.lang = value === "zh" ? "zh-CN" : "en"; }catch(e){}
}
function restoreCachedAccountLanguage(uid){
  if(!uid) return false;
  try{
    const raw = localStorage.getItem(cloudAccountSaveKey(uid));
    const cached = raw ? JSON.parse(raw) : null;
    if(!cached || (cached.language !== "zh" && cached.language !== "en")) return false;
    language = cached.language;
    rememberUiLanguage(language);
    refreshLanguageRuntimeText();
    return true;
  }catch(e){ return false; }
}
let language = readUiLanguagePreference();
rememberUiLanguage(language);
let audioMuted = false, particlesEnabled = true, damageTextEnabled = true;
// Audio volume defaults: BGM 40%, SFX 100%.
let bgmVolume = 0.40;
let sfxVolume = 1.00;
const LOGIN_BGM_PATHS = [
  "assets/audio/bgm/login_theme.mp3"
];
let loginBgmPathIndex = 0;
let loginBgmAudio = null;
let loginBgmCurrentVolume = 0;
let loginBgmTargetVolume = 0;
let loginBgmUnavailable = false;
let loginBgmPlayPending = false;
let menuPulse = 0;
let selectedStage = 1;
let dungeonSelected = 0;
let dungeonPanelMode = "list";
let materialDungeonSelected = 0;
let materialDungeonDifficulty = 1;
let materialDungeonDifficulties = {gold:1,exp:1,weapon:1,module:2,skill:1};
let moduleDungeonTarget = "survey";
let moduleArchiveScroll = 0;
let moduleArchiveWheelDelta = 0;
// Keep startup defaults literal here: PROTAGONIST_ROLE is declared later in
// the runtime, and reading that const during top-level initialization causes a
// temporal-dead-zone crash that leaves the game stuck on Loading.
let profileAvatarRole = 4;
let profileAvatarFrame = "zero";
let profileShowcase = [4,0,1];
let profilePickerMode = "";
let profileShowcaseSlot = 0;
let dungeonRewardMultiplier = 1;
let dungeonStamina = 240;
let dungeonWeeklyCrystalLeft = 3;
let dungeonCrystalWeekKey = "";
let dungeonLastStaminaDate = "";
let dungeonCandy = 2400;
let dungeonStimulant = 0;
let dungeonCandyMonthKey = "";
let dungeonCandyDailyUsed = 0;
let dungeonCandyDailyKey = "";
let staminaRecoverOpen = false;
let staminaRecoverMsg = "";
let materialDungeonRun = null;
let projectAreaRun = null;
let paState = null;
let projectAreaCleared = false;
let projectAreaMapIndex = 0;
let projectAreaObjects = [];
let battleExploreObjects = [];
let battleExploreOpened = {};
let battleRewardNotices = [];
let chapterObjectivePrompted = false;
let battleRoute = "center";
let battleExitDelay = 0;
let battleSideArea = "";
let battleRoleHp = [];
let battleRoleEnergy = [];
let battleRoleUlt = [];
let bossKrosRun = null;
let bossSelectedIndex = 0;
let teamRosterScrollX = 0;
let teamRosterWheelDelta = 0;
let bossMultiplier = 1;
let bossKrosWeeklyKey = "";
let dragonClaw = 0;
let bossHazards = [];
let krosPhaseTransitionTimer = 0;
let krosPhaseTransitionPhase = 1;
let krosPhaseTransitionText = "";
let playerPoisonTimer = 0;
let playerPoisonTick = 0;
let playerBleedTimer = 0;
let playerBleedTick = 0;
let operationDetailVisible = false;
let battleModeSource = "main";
let battlePaused = false;
let battleResumeSnapshot = null;
let showcaseRole = 0;
let showcasePreviousState = null;
let daydreamBattleConfig = null;
let daydreamTeamSetupPending = false;
let selectedTab = "main";
let mainChapterView = "chapters"; // chapters -> stage map
let selectedMainChapter = 0;
let crystals = 0;
let notice = (typeof msg==="function" ? msg("defaultNotice") : "点击右侧「作战」进入第0章");
let lobbyNoticeOpen = false;
let lobbyNoticeCategory = 0;
let lobbyNoticeSelected = 0;
let lobbyCheckinOpen = false;
let lobbyParallaxX = 0;
let lobbyParallaxY = 0;
let lobbyDialogueText = "";
let lobbyDialogueStartedAt = 0;
let lobbyDialogueUntil = 0;
let lobbyDialogueNextAt = Date.now() + 30000 + Math.random()*30000;
let lobbyDialogueLastIndex = {};
let lobbyAssistantSelectorOpen = false;
let lobbyAssistantSelectorTab = "executor";
let lobbyAssistantPreviewRole = 0;
let lobbyBackgroundTheme = "raven";
let lobbyBackgroundPreviewTheme = "raven";
let centerText = "", centerTimer = 0;
let combo = 0, comboTimer = 0;
let shake = 0, hitStop = 0, slowMo = 0, flash = 0;
let area = 1, areaCleared = false, commissionComplete = false;
let selectedCommissionChapter = 0;
let commissionTimeLeft = 0;
let commissionTimeMax = 0;
let chapter2EvacTimeLeft = 0;
let areaDialogueShown = {};
let lockTarget = null;
let actionPrompt = "";
let attackBuffer = 0;
let skillBuffer = 0;
let ultBuffer = 0;
let dashBuffer = 0;
let actionPromptTimer = 0;
let chainReady = false;
let chainTarget = null;

let achievements = {};
let achievementNotice = "";
let achievementNoticeTimer = 0;
let achievementCheckCooldown = 0;
let achievementMsg = "";
let totalKills = 0;
let totalParries = 0;
let totalChains = 0;
let totalBossKills = 0;
let totalGoldEarned = 0;
let totalCrystalsEarned = 0;
let combatRank = "D";
let stylishScore = 0;


const ROADMAP_NOTES = {
  v38: "Mainline polish and Chapter 1 flow",
  v39: "Expanded exploration and combat tuning",
  v40: "CG system and story presentation upgrade"
};

const LEGACY_SAVE_KEY = "project_zero_v25_save";
const GUEST_SAVE_KEY = "project_zero_v25_guest_save";
const GUEST_SESSION_ACTIVE_KEY = "project_zero_guest_session_active_v1";
const CLOUD_SAVE_KEY_PREFIX = "project_zero_v25_cloud_";
function storedGuestSessionActive(){
  try{ return localStorage.getItem(GUEST_SESSION_ACTIVE_KEY) === "1"; }
  catch(e){ return false; }
}
function setStoredGuestSessionActive(active){
  try{
    if(active) localStorage.setItem(GUEST_SESSION_ACTIVE_KEY,"1");
    else localStorage.removeItem(GUEST_SESSION_ACTIVE_KEY);
  }catch(e){}
}
function cloudAccountSaveKey(uid){ return CLOUD_SAVE_KEY_PREFIX + String(uid || "unknown"); }
function activeSaveKey(){
  return (!guestMode && cloudUser && cloudUser.uid) ? cloudAccountSaveKey(cloudUser.uid) : GUEST_SAVE_KEY;
}
window.getProjectZeroSaveNamespace = activeSaveKey;
function daydreamSaveKeyForNamespace(namespace){ return String(namespace || GUEST_SAVE_KEY) + "_daydream_v49"; }
function externalProgressKeys(namespace=activeSaveKey()){
  const ns=String(namespace||GUEST_SAVE_KEY);
  return {daydream:daydreamSaveKeyForNamespace(ns),match3:ns+"_match3_progress",patrol:ns+"_patrol_v462"};
}
function collectExternalProgress(namespace=activeSaveKey()){
  const out={},keys=externalProgressKeys(namespace);let totalBytes=0;
  for(const name of Object.keys(keys)){
    try{
      const raw=localStorage.getItem(keys[name]);
      const bytes=typeof raw==="string"?new Blob([raw]).size:0;
      // Firestore documents have a strict size ceiling. Keep the combined
      // minigame snapshot bounded so a large/corrupt extension save cannot
      // prevent the player's primary save from syncing.
      if(bytes>0&&bytes<=300000&&totalBytes+bytes<=600000){out[name]=raw;totalBytes+=bytes;}
      else if(bytes>0)console.warn("[ExternalProgress] skipped oversized",name,bytes);
    }
    catch(err){console.warn("[ExternalProgress] read failed",name,err);}
  }
  return out;
}
function restoreExternalProgress(data,namespace=activeSaveKey()){
  if(!data||typeof data!=="object"||Array.isArray(data))return;
  const keys=externalProgressKeys(namespace);
  for(const name of Object.keys(keys)){
    const raw=data[name];if(typeof raw!=="string"||raw.length===0||new Blob([raw]).size>300000)continue;
    try{
      if(name==="match3")localStorage.setItem(keys[name],typeof raw==="string"?raw:JSON.stringify(raw));
      else{const parsed=JSON.parse(raw);if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed))localStorage.setItem(keys[name],JSON.stringify(parsed));}
    }catch(err){console.warn("[ExternalProgress] ignored invalid",name,err);}
  }
}
function clearExternalProgress(namespace=activeSaveKey()){
  const keys=externalProgressKeys(namespace);
  for(const name of Object.keys(keys)){try{localStorage.removeItem(keys[name]);}catch(err){console.warn("[ExternalProgress] clear failed",name,err);}}
}
function reloadAccountScopedGameplay(resetDaydream=false){
  try{
    if(window.PZDaydream && typeof window.PZDaydream.reloadForCurrentAccount === "function"){
      window.PZDaydream.reloadForCurrentAccount(!!resetDaydream);
    }else if(resetDaydream){
      localStorage.removeItem(daydreamSaveKeyForNamespace(activeSaveKey()));
    }
    if(window.PZPatrol&&typeof window.PZPatrol.reloadForCurrentAccount==="function")window.PZPatrol.reloadForCurrentAccount(!!resetDaydream);
  }catch(err){ console.warn("[AccountScopedGameplay]", err); }
}
// One-time migration: an older shared save becomes the guest/local save only.
// It is never silently uploaded or adopted by a newly registered account.
try{
  if(!localStorage.getItem(GUEST_SAVE_KEY) && localStorage.getItem(LEGACY_SAVE_KEY)){
    localStorage.setItem(GUEST_SAVE_KEY, localStorage.getItem(LEGACY_SAVE_KEY));
  }
}catch(e){}
const SAVE_VERSION = 56;
const SAVE_BACKUP_SUFFIX = "_backup_";
const SAVE_TEMP_SUFFIX = "_writing";
let saveCooldown = 0;
let saveRecoveryNoticePending = false;
const CLOUD_PENDING_SYNC_PREFIX = "project_zero_pending_cloud_sync_";

function parseSaveRecord(raw){
  if(typeof raw!=="string"||raw.length<2)return null;
  try{
    const data=JSON.parse(raw);
    return data&&typeof data==="object"&&!Array.isArray(data)?data:null;
  }catch(err){return null;}
}

function safeSaveBackupKey(key,index){return String(key)+SAVE_BACKUP_SUFFIX+String(index);}

function readSaveRecordWithRecovery(key){
  let primaryRaw="";
  try{primaryRaw=localStorage.getItem(key)||"";}catch(err){return null;}
  const primary=parseSaveRecord(primaryRaw);
  if(primary)return {raw:primaryRaw,parsed:primary,recovered:false,source:"primary"};
  const candidates=[safeSaveBackupKey(key,1),safeSaveBackupKey(key,2),key+"_corrupt_backup"];
  for(const backupKey of candidates){
    let raw="";
    try{raw=localStorage.getItem(backupKey)||"";}catch(err){continue;}
    const parsed=parseSaveRecord(raw);
    if(!parsed)continue;
    try{
      if(primaryRaw)localStorage.setItem(key+"_corrupt_backup",primaryRaw);
      localStorage.setItem(key,raw);
      saveRecoveryNoticePending=true;
      console.warn("[SaveRecovery] restored",key,"from",backupKey);
    }catch(err){console.warn("[SaveRecovery] restore write failed",err);}
    return {raw,parsed,recovered:true,source:backupKey};
  }
  return null;
}

function writeSaveRecordSafely(key,data){
  const raw=JSON.stringify(data);
  if(!parseSaveRecord(raw))throw new Error("Save serialization validation failed");
  const tempKey=String(key)+SAVE_TEMP_SUFFIX;
  let previousRaw="";
  try{previousRaw=localStorage.getItem(key)||"";}catch(err){}
  try{
    try{localStorage.setItem(tempKey,raw);}
    catch(firstWriteError){
      // Free only the oldest safety copy when browser storage is tight, then
      // retry. The current primary and newest backup remain untouched.
      try{localStorage.removeItem(safeSaveBackupKey(key,2));}catch(ignore){}
      localStorage.setItem(tempKey,raw);
    }
    const verifyRaw=localStorage.getItem(tempKey)||"";
    if(verifyRaw!==raw||!parseSaveRecord(verifyRaw))throw new Error("Temporary save verification failed");
    const previous=parseSaveRecord(previousRaw);
    if(previous){
      try{
        const backup1=localStorage.getItem(safeSaveBackupKey(key,1));
        if(parseSaveRecord(backup1))localStorage.setItem(safeSaveBackupKey(key,2),backup1);
        localStorage.setItem(safeSaveBackupKey(key,1),previousRaw);
      }catch(backupError){console.warn("[SaveBackup] rotation skipped",backupError);}
    }
    localStorage.setItem(key,verifyRaw);
    const committed=localStorage.getItem(key)||"";
    if(committed!==raw||!parseSaveRecord(committed))throw new Error("Committed save verification failed");
    localStorage.removeItem(tempKey);
    return raw;
  }catch(err){
    try{localStorage.removeItem(tempKey);}catch(ignore){}
    throw err;
  }
}

function clearSaveRecordFamily(key){
  for(const item of [key,String(key)+SAVE_TEMP_SUFFIX,safeSaveBackupKey(key,1),safeSaveBackupKey(key,2),String(key)+"_corrupt_backup"]){
    try{localStorage.removeItem(item);}catch(err){console.warn("[SaveClear]",item,err);}
  }
}

function cloudPendingSyncKey(){
  return CLOUD_PENDING_SYNC_PREFIX + (cloudUser && cloudUser.uid ? String(cloudUser.uid) : "guest");
}

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCha1gk_D3kqYW63d2AfILy3AoBNv6XyXA",
  authDomain: "project-zero-256d3.firebaseapp.com",
  projectId: "project-zero-256d3",
  storageBucket: "project-zero-256d3.firebasestorage.app",
  messagingSenderId: "907785881698",
  appId: "1:907785881698:web:e6c18aa31e2cc94bf5e93b"
};

function makeFirestoreSafe(value, insideArray=false){
  if(value === undefined || typeof value === "function") return null;
  if(value === null) return null;
  if(typeof value === "number") return Number.isFinite(value) ? value : 0;
  if(typeof value === "string" || typeof value === "boolean") return value;
  if(value instanceof Date) return value.toISOString();
  if(Array.isArray(value)){
    const arr = value.map(item => makeFirestoreSafe(item, true));
    return insideArray ? {items: arr} : arr;
  }
  if(typeof value === "object"){
    const out = {};
    for(const key of Object.keys(value)){
      const safe = makeFirestoreSafe(value[key], false);
      if(safe !== undefined) out[key] = safe;
    }
    return out;
  }
  return String(value);
}

let cloudAuth = null, cloudDb = null, cloudUser = null;
let cloudReady = false, cloudBusy = false;
let cloudEmailInput = "", cloudPasswordInput = "";
let cloudMsg = "", cloudMsgTimer = 0;
let accountEmail = "";
let accountPassword = "";
let accountMode = "login";
let accountMsg = "";
let accountBusy = false;
let accountFocusedField = "email";
let accountAuthed = false;
let guestMode = storedGuestSessionActive();
let cloudSyncStatus = "";
let cloudSyncTimer = 0;

let cloudAutoSaveCooldown = 0;
let cloudLastAutoSaveAt = 0;
let cloudAutoSaveEnabled = true;
let cloudPendingSave = false;
let cloudPersistenceReady = null;
let cloudSessionToken = 0;
let cloudLastSyncedRaw = "";
let cloudInitialSyncDone = false;
let cloudApplyingRemote = false;
let cloudBootListenerAttached = false;
let cloudAuthStateResolved = false;
let explicitGuestSession = guestMode;
let deletionPromptActive = false;
let deletionScheduledAtMs = 0;
let guestCloudOverwritePromptActive = false;
let discardGuestAfterAccountStart = false;
const GUEST_MIGRATION_PENDING_KEY = "project_zero_guest_migration_pending_uid";




function legacyCloudSetMsg(text, frames=180){
  cloudMsg = text || "";
  cloudMsgTimer = frames;
  if(text) showCenter(text, Math.min(frames, 120));
}
function legacyInitCloudSave(){
  if(cloudReady) return true;
  try{
    if(typeof firebase === "undefined"){ cloudSetMsg(cloudTx("cloudUnavailable")); return false; }
    if(!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(FIREBASE_CONFIG);
    cloudAuth = firebase.auth();
    cloudDb = firebase.firestore();
    cloudAuth.onAuthStateChanged(user => { cloudUser = user || null; });
    cloudReady = true;
    return true;
  }catch(err){
    console.error(err);
    cloudSetMsg(cloudTx("cloudInitFail") + ": " + (err && err.message ? err.message : err), 240);
    return false;
  }
}
function legacyGetLocalSaveForCloud(){
  try{
    saveGame();
    const record=readSaveRecordWithRecovery(activeSaveKey());
    return record?{raw:record.raw,parsed:record.parsed}:null;
  }catch(err){ console.error(err); return null; }
}
function legacyApplyCloudSaveToLocal(saveBox){
  try{
    if(!saveBox) return false;
    const parsed = typeof saveBox.raw === "string" ? parseSaveRecord(saveBox.raw) : JSON.parse(JSON.stringify(saveBox.parsed || saveBox));
    if(!parsed)return false;
    migrateSaveData(parsed);
    writeSaveRecordSafely(activeSaveKey(),parsed);
    loadGame();
    refreshLanguageRuntimeText();
    return true;
  }catch(err){ console.error(err); return false; }
}
async function legacyCloudUploadSaveSilent(){
  if(!cloudAutoSaveEnabled) return;
  if(cloudBusy) return;
  if(!await ensureCloudPersistenceReady()) return;
  if(!cloudUser) return;
  const now = Date.now();
  if(now - cloudLastAutoSaveAt < 12000) return;
  const localSave = getLocalSaveForCloud();
  if(!localSave) return;
  cloudBusy = true;
  try{
    await cloudDb.collection("users").doc(cloudUser.uid).set(buildCloudDocPayloadSafe(localSave), {merge:true});
    cloudLastAutoSaveAt = now;
    cloudSetMsg(cloudTx("cloudAutoSaveOk"), 70);
  }catch(err){ console.error(err); }
  finally{ cloudBusy = false; }
}
function legacyScheduleCloudAutoSave(frames=1800){
  if(!cloudAutoSaveEnabled) return;
  cloudAutoSaveCooldown = Math.max(cloudAutoSaveCooldown, frames);
}
async function legacyCloudRegisterAfterProfile(email, password){
  if(!initCloudSave()) return false;
  if(!email || !password){ cloudSetMsg(cloudTx("cloudEmailMissing")); return false; }
  cloudBusy = true;
  try{
    let cred = null;
    try{
      cred = await cloudAuth.createUserWithEmailAndPassword(email.trim(), password);
      cloudSetMsg(cloudTx("cloudRegisterOk"), 100);
    }catch(createErr){
      cred = await cloudAuth.signInWithEmailAndPassword(email.trim(), password);
      cloudSetMsg(cloudTx("cloudLoginOk"), 100);
    }
    cloudUser = cred.user;
    cloudEmailInput = email.trim();
    cloudPasswordInput = password;
    saveGame();
    await cloudUploadSaveSilent();
    return true;
  }catch(err){
    console.error(err);
    cloudSetMsg(cloudTx("cloudRegisterFailed") + ": " + (err && err.message ? err.message : err), 240);
    return false;
  }finally{ cloudBusy = false; }
}
function legacyRequestCloudAccountAfterProfile(){
  const regEmail = window.prompt(cloudTx("cloudPromptEmail"), cloudEmailInput || "");
  if(regEmail === null){ cloudSetMsg(cloudTx("cloudNeedLogin"), 180); return; }
  const regPass = window.prompt(cloudTx("cloudPromptPassword"), cloudPasswordInput || "");
  if(regPass === null){ cloudSetMsg(cloudTx("cloudNeedLogin"), 180); return; }
  cloudRegisterAfterProfile(String(regEmail).trim(), String(regPass));
}
function legacyCloudPromptCredentials(){
  const email = window.prompt(cloudTx("cloudPromptEmail"), cloudEmailInput || "");
  if(email === null) return false;
  const pass = window.prompt(cloudTx("cloudPromptPassword"), cloudPasswordInput || "");
  if(pass === null) return false;
  cloudEmailInput = String(email).trim();
  cloudPasswordInput = String(pass);
  if(!cloudEmailInput || !cloudPasswordInput){ cloudSetMsg(cloudTx("cloudEmailMissing")); return false; }
  return true;
}
async function legacyCloudRegister(){
  if(cloudBusy) return; if(!initCloudSave()) return; if(!cloudPromptCredentials()) return; cloudBusy=true;
  try{ const cred=await cloudAuth.createUserWithEmailAndPassword(cloudEmailInput, cloudPasswordInput); cloudUser=cred.user; cloudSetMsg(cloudTx("cloudRegisterOk")); }
  catch(err){ cloudSetMsg(err && err.message ? err.message : String(err), 240); } finally{ cloudBusy=false; }
}
async function legacyCloudLogin(){
  if(cloudBusy) return; if(!initCloudSave()) return; if(!cloudPromptCredentials()) return; cloudBusy=true;
  try{ const cred=await cloudAuth.signInWithEmailAndPassword(cloudEmailInput, cloudPasswordInput); cloudUser=cred.user; cloudSetMsg(cloudTx("cloudLoginOk")); }
  catch(err){ cloudSetMsg(err && err.message ? err.message : String(err), 240); } finally{ cloudBusy=false; }
}
async function legacyCloudLogout(){
  await signOutAndClearLocal();
}
async function legacyCloudUploadSave(){
  if(cloudBusy) return; if(!initCloudSave()) return;
  if(!cloudUser){ cloudSetMsg(cloudTx("cloudNeedLogin")); return; }
  const localSave = getLocalSaveForCloud();
  if(!localSave){ cloudSetMsg(cloudTx("cloudNoLocalSave")); return; }
  cloudBusy=true; cloudSetMsg(cloudTx("cloudUploading"), 80);
  try{
    await cloudDb.collection("users").doc(cloudUser.uid).set(buildCloudDocPayloadSafe(localSave), {merge:true});
    cloudSetMsg(cloudTx("cloudUploadOk"));
  }catch(err){ cloudSetMsg(err && err.message ? err.message : String(err), 240); }
  finally{ cloudBusy=false; }
}
async function legacyCloudDownloadSave(){
  if(cloudBusy) return; if(!initCloudSave()) return;
  if(!cloudUser){ cloudSetMsg(cloudTx("cloudNeedLogin")); return; }
  cloudBusy=true; cloudSetMsg(cloudTx("cloudDownloading"), 80);
  try{
    const snap = await cloudDb.collection("users").doc(cloudUser.uid).get();
    const data = snap.exists ? snap.data() : null;
    const saveBox = data && (data.saveData ? {parsed:data.saveData} : data.saveBox);
    if(!saveBox){ cloudSetMsg(cloudTx("cloudNoSave")); return; }
    if(!applyCloudSaveToLocal(saveBox)){ cloudSetMsg(cloudTx("cloudNoSave")); return; }
    cloudSetMsg(cloudTx("cloudDownloadOk"));
    gameMode = "lobby";
  }catch(err){ cloudSetMsg(err && err.message ? err.message : String(err), 240); }
  finally{ cloudBusy=false; }
}



function setAccountMsg(text, frames=180){
  accountMsg = text || "";
  cloudMsg = text || "";
  cloudMsgTimer = frames;
  cloudSyncStatus = text || "";
  cloudSyncTimer = frames;
  if(text) showCenter(text, Math.min(frames, 100));
}

function initCloudSave(){
  if(cloudReady) return true;
  try{
    if(typeof firebase === "undefined"){
      setAccountMsg(cloudTx("cloudUnavailable"));
      return false;
    }
    if(!firebase.apps || firebase.apps.length === 0) firebase.initializeApp(FIREBASE_CONFIG);
    cloudAuth = firebase.auth();
    cloudDb = firebase.firestore();
    if(!cloudPersistenceReady){
      cloudPersistenceReady = cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch(err => console.warn("[CloudAuth]", err));
    }
    cloudReady = true;
    return true;
  }catch(err){
    console.error("[CloudInit]", err);
    setAccountMsg(cloudTx("cloudInitFail") + ": " + accountErrorText(err), 240);
    return false;
  }
}

function getLocalSaveForCloud(forceSave=false){
  try{
    if(forceSave) saveGame();
    const record=readSaveRecordWithRecovery(activeSaveKey());
    return record?{raw:record.raw,parsed:record.parsed}:null;
  }catch(err){
    console.error(err);
    return null;
  }
}

function applyCloudSaveToLocal(saveBox){
  try{
    if(!saveBox) return false;
    const parsed = typeof saveBox.raw === "string" ? JSON.parse(saveBox.raw) : JSON.parse(JSON.stringify(saveBox.parsed || saveBox));
    if(!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    if(cloudUser && parsed.accountUid && parsed.accountUid !== cloudUser.uid){
      console.error("[CloudSave] Refused save owned by a different account.");
      return false;
    }
    if(cloudUser) parsed.accountUid = cloudUser.uid;
    migrateSaveData(parsed);
    cloudApplyingRemote = true;
    resetRuntimeDefaults();
    const raw=writeSaveRecordSafely(activeSaveKey(),parsed);
    loadGame();
    reloadAccountScopedGameplay(false);
    cloudApplyingRemote = false;
    cloudPendingSave = false;
    try{ localStorage.removeItem(cloudPendingSyncKey()); }catch(e){}
    cloudAutoSaveCooldown = 0;
    cloudLastSyncedRaw = raw;
    refreshLanguageRuntimeText();
    return true;
  }catch(err){
    cloudApplyingRemote = false;
    console.error(err);
    return false;
  }
}

function buildCloudDocPayloadSafe(localSave){
  // Cloud save must be UPDATE/REPLACE, not append.
  // Store only the current parsed saveData in a fixed user document:
  // users/{uid}.saveData
  // Do NOT store both raw + parsed, and do NOT keep history arrays.
  const parsed = localSave && localSave.parsed ? JSON.parse(JSON.stringify(localSave.parsed)) : {};
  parsed.accountUid = cloudUser ? cloudUser.uid : (parsed.accountUid || "");
  parsed.updatedAt = Date.now();

  const payload = {
    saveData: makeFirestoreSafe(parsed),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    buildTarget: BUILD_TARGET || "PC",
    saveKey: activeSaveKey(),
    saveVersion: SAVE_VERSION,
    playerName: playerName || "",
    playerUID: playerUID || "",
    hasCreatedProfile: !!hasCreatedProfile,
    tutorialCompleted: !!tutorialCompleted,
    accountUid: cloudUser ? cloudUser.uid : "",
    accountEmail: cloudUser && cloudUser.email ? cloudUser.email : "",
    clientUpdatedAt: new Date().toISOString()
  };

  // Remove older duplicated formats if they exist in Firestore.
  // This prevents cloud documents from growing by keeping old saveBox/history fields.
  try{
    payload.saveBox = firebase.firestore.FieldValue.delete();
    payload.saves = firebase.firestore.FieldValue.delete();
    payload.saveHistory = firebase.firestore.FieldValue.delete();
    payload.history = firebase.firestore.FieldValue.delete();
  }catch(e){}

  return payload;
}
async function fetchCloudSaveBox(){
  if(!cloudUser || !cloudDb) return null;
  const snap = await cloudDb.collection("users").doc(cloudUser.uid).get();
  const data = snap.exists ? snap.data() : null;
  if(!data) return null;
  // New compact format
  if(data.saveData) return {parsed:data.saveData};
  // Backward compatibility for old builds
  return data.saveBox || null;
}

// Guards against wiping a real profile when the cloud document hasn't
// caught up yet (slow write, missed upload, etc). Only returns a save
// that was created under THIS account's uid, so switching to a
// different account never inherits another account's local cache.
function getMatchingLocalSaveForAccount(uid){
  const key = cloudAccountSaveKey(uid);
  try{
    if(!uid) return null;
    const record=readSaveRecordWithRecovery(key);
    if(!record)return null;
    let {raw,parsed}=record;
    if(!parsed || !parsed.hasCreatedProfile) return null;
    if(parsed.accountUid && parsed.accountUid !== uid) return null;
    if(!parsed.accountUid){
      parsed.accountUid = uid;
      const migratedRaw = writeSaveRecordSafely(key,parsed);
      return {raw:migratedRaw, parsed};
    }
    return {raw, parsed};
  }catch(err){
    console.error(err);
    return null;
  }
}

function readGuestTransferSnapshot(){
  try{
    const record=readSaveRecordWithRecovery(GUEST_SAVE_KEY);
    if(!record)return null;
    const {raw,parsed}=record;
    if(!parsed||typeof parsed!=="object"||Array.isArray(parsed)||!parsed.hasCreatedProfile)return null;
    parsed.externalProgress=collectExternalProgress(GUEST_SAVE_KEY);
    return {raw:JSON.stringify(parsed),parsed};
  }catch(err){
    console.warn("[GuestTransfer] invalid guest save",err);
    return null;
  }
}

function hasTransferableGuestSave(){ return !!readGuestTransferSnapshot(); }

function clearGuestSaveSlot(){
  try{
    clearSaveRecordFamily(GUEST_SAVE_KEY);
    clearExternalProgress(GUEST_SAVE_KEY);
  }catch(err){ console.warn("[GuestTransfer] clear failed",err); }
}

function markGuestMigrationPending(uid){
  try{localStorage.setItem(GUEST_MIGRATION_PENDING_KEY,String(uid||""));}catch(e){}
}

function finalizeGuestMigration(uid){
  try{
    const pending=localStorage.getItem(GUEST_MIGRATION_PENDING_KEY);
    if(pending&&String(pending)===String(uid||"")){
      clearGuestSaveSlot();
      localStorage.removeItem(GUEST_MIGRATION_PENDING_KEY);
    }
  }catch(err){console.warn("[GuestTransfer] finalize failed",err);}
}

function finishConfirmedGuestOverwrite(){
  if(!discardGuestAfterAccountStart)return;
  clearGuestSaveSlot();
  discardGuestAfterAccountStart=false;
}


function resetRuntimeForFreshAccount(){
  try{
    clearSaveRecordFamily(activeSaveKey());
    clearExternalProgress(activeSaveKey());
  }catch(e){}
  resetRuntimeDefaults();
  reloadAccountScopedGameplay(true);
  playerName = "";
}
async function startLoggedInAccountGame(){
  if(accountBusy) return;
  if(!initCloudSave()) return;
  if(!cloudUser){ setAccountMsg(cloudTx("cloudNeedLogin"),120); return; }
  // Account storage must be selected before any local/cloud read. This also
  // prevents a previous explicit guest session from redirecting an account
  // save into the guest namespace.
  explicitGuestSession = false;
  guestMode = false;
  accountAuthed = true;
  const startingUid = cloudUser.uid;
  const sessionToken = cloudSessionToken;
  accountBusy = true;
  setAccountMsg(accTx("checkingSave"),90);
  try{
    const meta = await readAccountMeta();
    if(sessionToken !== cloudSessionToken || !cloudUser || cloudUser.uid !== startingUid) return;
    if(await blockExpiredDeletion(meta)) return;
    if(hasPendingDeletion(meta)){
      openDeletionPrompt(meta);
      return;
    }
    const saveBox = await fetchCloudSaveBox();
    if(sessionToken !== cloudSessionToken || !cloudUser || cloudUser.uid !== startingUid) return;
    const localMatch = getMatchingLocalSaveForAccount(startingUid);
    const cloudParsed = saveBox && (saveBox.parsed || saveBox);
    const cloudBelongsToAccount = !!(cloudParsed && typeof cloudParsed === "object" && !Array.isArray(cloudParsed) && cloudParsed.hasCreatedProfile && (!cloudParsed.accountUid || cloudParsed.accountUid === startingUid));
    if(saveBox && !cloudBelongsToAccount && !localMatch){
      throw new Error(language === "en" ? "Cloud save is invalid or belongs to another account." : "云存档无效或账号校验失败。");
    }
    const localUpdatedAt = localMatch ? Number(localMatch.parsed.updatedAt) || 0 : 0;
    const cloudUpdatedAt = cloudParsed ? Number(cloudParsed.updatedAt) || 0 : 0;
    if(localMatch && (!cloudBelongsToAccount || localUpdatedAt > cloudUpdatedAt)){
      resetRuntimeDefaults();
      loadGame();
      reloadAccountScopedGameplay(false);
      cloudInitialSyncDone = true;
      autoCloudSaveNow(true);
      finishConfirmedGuestOverwrite();
      startLoading(startTargetAfterAuth());
    }else if(cloudBelongsToAccount){
      if(!applyCloudSaveToLocal(saveBox)) throw new Error(language === "en" ? "Cloud save is invalid." : "云存档数据无效。");
      cloudInitialSyncDone = true;
      finishConfirmedGuestOverwrite();
      startLoading(startTargetAfterAuth());
    }else{
      resetRuntimeForFreshAccount();
      cloudInitialSyncDone = true;
      finishConfirmedGuestOverwrite();
      gameMode = "nameInput";
      nameInput = "";
      nameError = "";
    }
  }catch(err){ console.error("[StartAccount]", err); setAccountMsg(accountErrorText(err),240); }
  finally{ accountBusy = false; }
}


async function ensureCloudPersistenceReady(){
  if(!initCloudSave()) return false;
  if(cloudPersistenceReady){
    try{ await cloudPersistenceReady; }catch(err){ console.warn("[CloudPersistence]", err); }
  }
  return true;
}

async function accountLoginFlow(overwriteConfirmed=false){
  if(accountBusy) return;
  const email = (accountEmail || "").trim();
  const password = accountPassword || "";
  if(!email || !password){ setAccountMsg(accTx("cloudEmailMissing"),150); return; }
  if(!overwriteConfirmed && guestMode && hasTransferableGuestSave()){
    guestCloudOverwritePromptActive=true;
    accountFocusedField="";
    return;
  }
  if(!await ensureCloudPersistenceReady()) return;
  accountBusy = true;
  explicitGuestSession = false;
  const sessionToken = ++cloudSessionToken;
  setAccountMsg(accTx("checkingSave"),120);
  try{
    const cred = await cloudAuth.signInWithEmailAndPassword(email, password);
    if(sessionToken !== cloudSessionToken) return;
    cloudUser = cred.user;
    accountAuthed = true;
    guestMode = false;
    setStoredGuestSessionActive(false);
    cloudInitialSyncDone = false;
    cloudPendingSave = false;
    discardGuestAfterAccountStart=!!(overwriteConfirmed&&hasTransferableGuestSave());
    const meta = await readAccountMeta();
    if(await blockExpiredDeletion(meta)) return;
    if(hasPendingDeletion(meta)){
      openDeletionPrompt(meta);
      return;
    }
    // Authentication alone does not delete the guest slot. The confirmed
    // overwrite is finalized only after Tap to Start resolves this UID's save.
    gameMode = "login";
    accountPassword = "";
    setAccountMsg(language==="en" ? "Signed in. Tap to Start to load this account." : "登录成功，请点击开始载入该账号存档。",150);
  }catch(err){ console.error("[AccountLogin]", err); setAccountMsg(accountErrorText(err),240); }
  finally{ accountBusy = false; }
}

async function accountRegisterFlow(){
  if(accountBusy) return;
  const email = (accountEmail || "").trim();
  const password = accountPassword || "";
  if(!email || !password){ setAccountMsg(accTx("cloudEmailMissing"),150); return; }
  // Capture the guest slot before Firebase changes the active namespace.
  // It is only removed after the new account save reaches Firestore.
  if(guestMode)saveGame();
  const guestTransfer=guestMode?readGuestTransferSnapshot():null;
  let guestTransferCloudSynced=!guestTransfer;
  if(!await ensureCloudPersistenceReady()) return;
  accountBusy = true;
  explicitGuestSession = false;
  const sessionToken = ++cloudSessionToken;
  setAccountMsg(language==="en" ? "Creating account..." : "正在注册账号……",120);
  try{
    const cred = await cloudAuth.createUserWithEmailAndPassword(email, password);
    if(sessionToken !== cloudSessionToken) return;
    cloudUser = cred.user;
    accountAuthed = true;
    guestMode = false;
    setStoredGuestSessionActive(false);
    cloudInitialSyncDone = false;
    cloudPendingSave = false;
    const accountKey=cloudAccountSaveKey(cloudUser.uid);
    if(guestTransfer){
      const migrated=JSON.parse(JSON.stringify(guestTransfer.parsed));
      migrated.accountUid=cloudUser.uid;
      migrated.updatedAt=Date.now();
      migrated.saveVersion=SAVE_VERSION;
      writeSaveRecordSafely(accountKey,migrated);
      restoreExternalProgress(migrated.externalProgress,accountKey);
      markGuestMigrationPending(cloudUser.uid);
      resetRuntimeDefaults();
      loadGame();
      reloadAccountScopedGameplay(false);
      cloudInitialSyncDone=true;
      const localSave=getLocalSaveForCloud(false);
      try{
        await cloudDb.collection("users").doc(cloudUser.uid).set(buildCloudDocPayloadSafe(localSave),{merge:true});
        cloudLastSyncedRaw=localSave&&localSave.raw?localSave.raw:"";
        cloudLastAutoSaveAt=Date.now();
        finalizeGuestMigration(cloudUser.uid);
        guestTransferCloudSynced=true;
        cloudPendingSave=false;
      }catch(syncErr){
        console.warn("[GuestTransfer] cloud upload pending",syncErr);
        cloudPendingSave=true;
        cloudAutoSaveCooldown=120;
      }
    }else{
      // Registration outside a guest profile starts with a clean UID slot.
      try{clearSaveRecordFamily(accountKey);clearExternalProgress(accountKey);}catch(e){}
      reloadAccountScopedGameplay(true);
    }
    accountPassword = "";
    setAccountMsg(guestTransfer
      ? (guestTransferCloudSynced
          ? (language==="en" ? "Account created. Guest progress has been transferred." : "注册成功，游客进度已迁移至该账号。")
          : (language==="en" ? "Account created. Progress is safe locally; cloud sync will retry." : "注册成功，进度已安全迁移到账号本地，云端正在重试同步。"))
      : (language==="en" ? "Account created. Tap to Start for a new game." : "注册成功，请点击开始进入全新进度。"),150);
    gameMode = "login";
  }catch(err){ console.error("[AccountRegister]", err); setAccountMsg(accountErrorText(err),240); }
  finally{ accountBusy = false; }
}

async function accountGuestFlow(){
  if(accountBusy) return;
  accountBusy = true;
  const sessionToken = ++cloudSessionToken;
  // Firebase Auth persistence may still hold a previous email account. A
  // guest session must not share that identity or be hijacked by the delayed
  // onAuthStateChanged callback.
  explicitGuestSession = true;
  try{
    if(await ensureCloudPersistenceReady() && cloudAuth && cloudAuth.currentUser){
      await cloudAuth.signOut();
    }
  }catch(err){
    console.warn("[GuestSignOut]", err);
  }
  if(sessionToken !== cloudSessionToken){ accountBusy = false; return; }
  cloudUser = null;
  guestMode = true;
  setStoredGuestSessionActive(true);
  accountAuthed = false;
  cloudInitialSyncDone = false;
  cloudPendingSave = false;
  guestCloudOverwritePromptActive=false;
  discardGuestAfterAccountStart=false;
  setAccountMsg(accTx("guestNotice"), 100);
  resetRuntimeDefaults();
  loadGame();
  reloadAccountScopedGameplay(false);
  if(hasCreatedProfile && validPlayerName(playerName)) startLoading(startTargetAfterAuth());
  else{
    gameMode = "nameInput";
    nameInput = "";
    nameError = "";
  }
  accountBusy = false;
}

function openAccountCredentialPanel(mode="login"){
  // Preserve the current guest state before leaving it. The account panel is
  // canvas-native and works in browser/Electron without window.prompt.
  if(guestMode || !cloudUser) saveGame();
  accountMode = mode === "register" ? "register" : "login";
  accountEmail = "";
  accountPassword = "";
  accountFocusedField = "email";
  accountMsg = "";
  guestCloudOverwritePromptActive=false;
  gameMode = "login";
}

function promptAccountCredentials(mode="login"){
  const email = window.prompt(accTx("enterEmail"), accountEmail || "");
  if(email === null) return false;
  const password = window.prompt(accTx("enterPassword"), "");
  if(password === null) return false;
  accountEmail = String(email).trim();
  accountPassword = String(password);
  accountMode = mode;
  return true;
}

async function bindCurrentLocalSaveToNewAccount(){
  if(accountBusy) return;
  openAccountCredentialPanel("register");
}

async function autoCloudSaveNow(force=false){
  if(guestMode) return;
  if(!cloudAutoSaveEnabled) return;
  if(accountBusy || cloudBusy) return;
  if(!await ensureCloudPersistenceReady()) return;
  if(!cloudUser) return;
  // Never upload until this account's cloud/local conflict has been resolved.
  // `force` may bypass throttling, but must not bypass account isolation.
  if(!cloudInitialSyncDone) return;
  const savingUid = cloudUser.uid;
  const savingSessionToken = cloudSessionToken;
  const now = Date.now();
  if(!force && now - cloudLastAutoSaveAt < 10000){ cloudPendingSave = true; return; }
  const localSave = getLocalSaveForCloud(true);
  if(!localSave || !localSave.parsed || !localSave.parsed.hasCreatedProfile) return;
  if(localSave.raw === cloudLastSyncedRaw){
    cloudPendingSave = false;
    try{ localStorage.removeItem(cloudPendingSyncKey()); }catch(e){}
    return;
  }
  cloudBusy = true;
  cloudSyncStatus = accTx("syncing");
  cloudSyncTimer = 90;
  try{
    await cloudDb.collection("users").doc(savingUid).set(buildCloudDocPayloadSafe(localSave), {merge:true});
    // The write belongs to the captured account, but UI/cache state must not
    // be applied to a different account selected while the request was in flight.
    if(savingSessionToken !== cloudSessionToken || !cloudUser || cloudUser.uid !== savingUid) return;
    cloudLastAutoSaveAt = now;
    cloudLastSyncedRaw = localSave.raw;
    cloudPendingSave = false;
    finalizeGuestMigration(savingUid);
    try{ localStorage.removeItem(cloudPendingSyncKey()); }catch(e){}
    cloudSyncStatus = accTx("autoSynced");
    cloudSyncTimer = 120;
  }catch(err){
    console.error("[AutoCloudSave]", err);
    // Preserve the dirty state and retry after a short cooldown. Previously a
    // transient network failure could leave the newest local save unsynced for
    // the rest of the session.
    cloudPendingSave = true;
    cloudAutoSaveCooldown = Math.max(cloudAutoSaveCooldown, 300);
    try{ localStorage.setItem(cloudPendingSyncKey(), String(Date.now())); }catch(e){}
    cloudSyncStatus = accTx("syncFailed") + ": " + accountErrorText(err);
    cloudSyncTimer = 180;
  }finally{ cloudBusy = false; }
}

function scheduleCloudAutoSave(frames=1800){
  if(guestMode) return;
  if(!cloudAutoSaveEnabled) return;
  if(cloudApplyingRemote) return;
  cloudPendingSave = true;
  cloudAutoSaveCooldown = Math.max(cloudAutoSaveCooldown, frames);
}

async function cloudLogout(){ return signOutAndClearLocal(); }


const DELETE_GRACE_DAYS = 7;
const DELETE_GRACE_MS = DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000;

function clearLocalSaveCache(){
  try{
    const key=activeSaveKey();
    clearSaveRecordFamily(key);
    clearExternalProgress(key);
  }catch(err){ console.warn("[SaveClear]",err); }
  resetRuntimeDefaults();
}

async function readAccountMeta(){
  if(!cloudUser || !cloudDb) return null;
  const snap = await cloudDb.collection("users").doc(cloudUser.uid).get();
  return snap.exists ? snap.data() : null;
}

function deletionTimeMs(value){
  if(!value) return 0;
  if(typeof value.toMillis === "function") return value.toMillis();
  if(typeof value.seconds === "number") return value.seconds * 1000;
  if(typeof value === "number") return Number.isFinite(value) ? value : 0;
  if(typeof value === "string"){
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
function hasPendingDeletion(meta){
  const scheduled = deletionTimeMs(meta && meta.deletionScheduledAt);
  return scheduled > Date.now();
}
function hasExpiredDeletion(meta){
  const scheduled = deletionTimeMs(meta && meta.deletionScheduledAt);
  return scheduled > 0 && scheduled <= Date.now();
}
async function blockExpiredDeletion(meta){
  if(!hasExpiredDeletion(meta)) return false;
  await signOutAndClearLocal(true);
  setAccountMsg(language === "en" ? "Account deletion is being processed." : "账号注销正在处理中。", 240);
  return true;
}
function openDeletionPrompt(meta){
  deletionScheduledAtMs = deletionTimeMs(meta && meta.deletionScheduledAt);
  deletionPromptActive = true;
  gameMode = "login";
  setAccountMsg(language==="en" ? "Account is still in the deletion period." : "账号仍处于注销期。", 240);
}
async function cancelDeleteRequest(){
  if(!cloudUser || !cloudDb) return;
  accountBusy = true;
  try{
    await cloudDb.collection("users").doc(cloudUser.uid).set({
      deletionRequestedAt: firebase.firestore.FieldValue.delete(),
      deletionScheduledAt: firebase.firestore.FieldValue.delete()
    }, {merge:true});
    deletionPromptActive = false;
    deletionScheduledAtMs = 0;
    accountBusy = false;
    await startLoggedInAccountGame();
  }catch(err){ setAccountMsg(accountErrorText(err),240); }
  finally{ accountBusy = false; }
}
async function checkAndCancelPendingDelete(){
  const meta = await readAccountMeta();
  if(hasPendingDeletion(meta)) openDeletionPrompt(meta);
  return hasPendingDeletion(meta);
}
async function requestDeleteAccount(){
  if(!cloudUser || !cloudDb) return;
  const now = Date.now();
  const scheduled = now + DELETE_GRACE_MS;
  accountBusy = true;
  try{
    const deletingUid = cloudUser.uid;
    await cloudDb.collection("users").doc(cloudUser.uid).set({
      deletionRequestedAt: firebase.firestore.Timestamp.fromMillis(now),
      deletionScheduledAt: firebase.firestore.Timestamp.fromMillis(scheduled)
    }, {merge:true});
    deletionScheduledAtMs = scheduled;
    await signOutAndClearLocal(true);
    try{
      localStorage.removeItem(cloudAccountSaveKey(deletingUid));
      clearExternalProgress(cloudAccountSaveKey(deletingUid));
    }catch(e){}
  }catch(err){ setAccountMsg(accountErrorText(err),240); }
  finally{ accountBusy = false; }
}

async function signOutAndClearLocal(skipCloudSave=false){
  cloudSessionToken++;
  explicitGuestSession = false;
  setStoredGuestSessionActive(false);
  if(!skipCloudSave){ try{ if(cloudUser && hasCreatedProfile) await autoCloudSaveNow(true); }catch(err){ console.warn("[SignOutSave]", err); } }
  try{ if(cloudAuth) await cloudAuth.signOut(); }catch(err){ console.warn("[SignOut]", err); }
  cloudUser = null;
  accountAuthed = false;
  guestMode = false;
  cloudInitialSyncDone = false;
  cloudPendingSave = false;
  cloudLastSyncedRaw = "";
  cloudSyncStatus = "";
  cloudSyncTimer = 0;
  accountPassword = "";
  deletionPromptActive = false;
  deletionScheduledAtMs = 0;
  guestCloudOverwritePromptActive = false;
  discardGuestAfterAccountStart = false;
  // Retain the UID-scoped cache as an offline safety copy. It is never loaded
  // as guest data and is checked against the authenticated UID before use.
  resetRuntimeDefaults();
  reloadAccountScopedGameplay(false);
  gameMode = "login";
  setAccountMsg(language==="en" ? "Signed out" : "已退出登录",100);
}

async function bootAccountSession(){
  if(!initCloudSave()) return;
  if(cloudBootListenerAttached) return;
  cloudBootListenerAttached = true;
  cloudAuth.onAuthStateChanged(async user => {
    cloudAuthStateResolved = true;
    // An explicitly selected guest session always wins over a persisted Auth
    // callback. Do not let it expose or save an email account's runtime data.
    if(explicitGuestSession && user){
      try{ await cloudAuth.signOut(); }catch(err){ console.warn("[GuestAuthIsolation]", err); }
      return;
    }
    if(explicitGuestSession && !user){
      cloudUser = null;
      accountAuthed = false;
      return;
    }
    const hadActiveAccount = !!(accountAuthed && !guestMode && cloudUser);
    cloudUser = user || null;
    accountAuthed = !!cloudUser;
    if(!cloudUser && hadActiveAccount){
      cloudSessionToken++;
      cloudInitialSyncDone = false;
      cloudPendingSave = false;
      cloudLastSyncedRaw = "";
      deletionPromptActive = false;
      resetRuntimeDefaults();
      gameMode = "login";
      setAccountMsg(language === "en" ? "Your session ended. Please sign in again." : "登录状态已失效，请重新登录。", 180);
      return;
    }
    if(cloudUser) restoreCachedAccountLanguage(cloudUser.uid);
    if(cloudUser) reloadAccountScopedGameplay(false);
    if(cloudUser && gameMode === "login"){
      setAccountMsg(language==="en" ? "Signed in. Tap to Start to load this account." : "已登录，点击开始载入该账号存档。",90);
    }
  });
}

function resetRuntimeDefaults(){
  prologueDone = false;
  lobbyGuideDone = false;
  lobbyGuideStep = 0;
  tutorialCompleted = false;
  tutorialInProgress = false;
  tutorialResumeMode = "";
  battleResumeSnapshot = null;
  tutorialStep = 0;
  tutorialTarget = null;
  tutorialEnemy = null;
  tutorialCrates = [];
  prologueLine = 0;
  prologueAfterBattle = false;

  gameMode = "login";
  loadingTimer = 0;
  loadingProgress = 0;
  loadingTarget = "lobby";
  loadingMessage = "Initializing...";
  settingsTab = "graphics";
  logoutConfirm = false;
  localDeleteConfirm = false;
  renderQuality = "AUTO";
  targetFPS = 60;
  audioMuted = false;
  bgmVolume = 0.40;
  sfxVolume = 1.00;
  particlesEnabled = true;
  damageTextEnabled = true;
  selectedStage = 1;
  projectAreaCleared = false;
  dungeonSelected = 0;
  dungeonPanelMode = "list";
  materialDungeonSelected = 0;
  materialDungeonDifficulty = 1;
  profileAvatarRole = PROTAGONIST_ROLE;
  profileAvatarFrame = "zero";
  profileShowcase = [PROTAGONIST_ROLE,0,1];
  profilePickerMode = "";
  profileShowcaseSlot = 0;
  dungeonRewardMultiplier = 1;
  dungeonStamina = Math.max(dungeonStamina || 0, 240);
  dungeonWeeklyCrystalLeft = 3;
  dungeonCrystalWeekKey = currentWeekKey();
  dungeonLastStaminaDate = currentDateKey();
  dungeonCandy = 2400;
  dungeonStimulant = 0;
  dungeonCandyMonthKey = currentMonthKey();
  staminaRecoverOpen = false;
  selectedTab = "main";
  crystals = 0;
  gold = 1200;
  expBooks = 8;
  weaponOre = 5;
  skillBooks = 6;
  skillMaterials = {normal:6,skill:4,ultimate:2};
  notice = msg("defaultNotice");

  centerText = "";
  centerTimer = 0;
  combo = 0;
  comboTimer = 0;
  shake = 0;
  hitStop = 0;
  slowMo = 0;
  flash = 0;
  area = 1;
  areaCleared = false;
  commissionComplete = false;
  areaDialogueShown = {};
  lockTarget = null;
  actionPrompt = "";
  actionPromptTimer = 0;
  chainReady = false;
  chainTarget = null;
  chainSelect = false;
  chainSelectTimer = 0;

  achievements = {};
  achievementNotice = "";
  achievementNoticeTimer = 0;
  achievementCheckCooldown = 0;
  achievementMsg = "";
  totalKills = 0;
  totalParries = 0;
  totalChains = 0;
  totalBossKills = 0;
  totalGoldEarned = 0;
  totalCrystalsEarned = 0;
  combatRank = "D";
  stylishScore = 0;

  // Starter roster: Kane, Ailo, Nox and the protagonist. Flora remains locked.
  owned = [true,true,true,false,true,false];
  cleared = {};
  charData = roles.map((r,i)=>({
    level:1,
    skillPoints:0,
    normal:1,
    skill:1,
    ultimate:1,
    weaponLevel:1,
    weapon:["烈阳之刃","风语法典","终夜双刃","霜月长枪","灰白核心刃","拉文德"][i]
  }));

  ownedWeapons = {flora:false};
  shopSubTab = "limited";
  shopTab = "featured";
  crystalExchangePurchases = {};
  shopMsg = msg("shopDefault");
  monthlyOwned = false;
  monthlyClaimed = false;
  monthlyClaimDate = "";
  selectedOperator = 0;
  lobbyExecutor = 0;
  lobbyBackgroundTheme = "raven";
  lobbyAssistantSelectorOpen = false;
  operatorTab = "level";
  moduleWarehouseSlot = null; moduleWarehouseScroll = 0; moduleWarehouseWheelDelta = 0; moduleWarehouseSetFilter="all"; moduleWarehouseSortMode="grade";
  playerName = "PLAYER";
  playerUID = "";
  nameInput = "";
  nameError = "";
  hasCreatedProfile = false;
  playerLevel = 1;
  playerExp = 0;
  playerExpNeed = 1600;
  protagonistStoryLevel = 1;
  mailClaimed = false;
  mailDeleted = false;
  eventClaimed = false;
  mailMsg = msg("mailDefault");
  eventMsg = msg("eventDefault");
  eventTab = "login";
  lastLoginClaimDate = "";
  loginClaimIndex = 0;
  monthlyLoginCheckin = {month:"", dates:[], totalDates:[], milestones:{}};
  versionLoginCheckin = {build:"2026072205", claimedDays:[], lastClaimDate:""};
  monthlyCheckinMsg = "";
  warehouseMsg = msg("warehouseDefault");
  loginDay = 1;

  crystals = 0;
  gold = 1200;
  expBooks = 8;
  weaponOre = 5;
  skillBooks = 6;
  skillMaterials = {normal:6,skill:4,ultimate:2};
  owned = [true,true,true,false,true,false];
  charData = roles.map((r,i)=>({level:1,skillPoints:0,normal:1,skill:1,ultimate:1,weaponLevel:1,weapon:["烈阳之刃","风语法典","终夜双刃","霜月长枪","灰白核心刃","拉文德"][i]}));
  cleared = {};
  achievements = {};
  totalKills = 0; totalParries = 0; totalChains = 0; totalBossKills = 0;
  totalGoldEarned = 0; totalCrystalsEarned = 0;
  monthlyOwned = false; monthlyClaimDate = "";
  growthGuidePage = 0;
  growthGuidePageClaimed = Array(10).fill(false);
  growthGuideTaskClaimed = Array.from({length:10},()=>Array(5).fill(false));
  battleManualDailyClaimed = {key:"",tasks:{},page:false};
  actionRecordLevel = 1; actionRecordExp = 0; actionRecordExpNeed = 500; actionRecordPage = 0;
  actionRecordAdvanced = false; actionRecordUltimate = false;
  actionRecordClaimed = {free:{},advanced:{},ultimate:{}};
  actionRecordTaskClaimed = {dailyKey:"",weeklyKey:"",monthlyKey:"",daily:{},weekly:{},monthly:{}};
  ownedWeapons = {flora:false};
  weaponInventory = null;
  crystalExchangePurchases = {};
  crystalModuleInventory = [];
  dungeonStamina = 240; dungeonWeeklyCrystalLeft = 3; dungeonCrystalWeekKey = "";
  dungeonLastStaminaDate = ""; dungeonCandy = 2400; dungeonStimulant = 0;
  dungeonCandyMonthKey = ""; dungeonCandyDailyUsed = 0; dungeonCandyDailyKey = "";
  dungeonRewardMultiplier = 1; materialDungeonDifficulty = 1; materialDungeonSelected = 0;
  materialDungeonDifficulties = {gold:1,exp:1,weapon:1,module:2,skill:1};
  moduleDungeonTarget = "survey"; moduleArchiveScroll = 0; moduleArchiveWheelDelta = 0;
  bossMultiplier = 1; bossKrosWeeklyKey = ""; dragonClaw = 0;
  uiGuideSeen = {};
  uiNewSeen = {};

  if(Array.isArray(loginRewards)){
    for(const r of loginRewards) r.claimed = false;
  }
  if(Array.isArray(levelRewards)){
    for(const r of levelRewards) r.claimed = false;
  }

  // The protagonist is always the initially controlled executor outside the
  // scripted tutorial assist. Ailo and Nox are immediately available.
  team = [PROTAGONIST_ROLE,1,2];
  teamPresets = [[PROTAGONIST_ROLE,1,2],[PROTAGONIST_ROLE],[0,2],[1,2]];
  teamPresetNames = ["","","",""];
  teamSelectSlot = 0;
  packMsg = msg("packDefault");
  boughtPacks = {starter:false, growth:false, weapon:false};

  clearTransientBattleState();
}

function resetLocalAccount(){
  const key=activeSaveKey();
  try{
    clearSaveRecordFamily(key);
    clearExternalProgress(key);
  }catch(e){}
  if(key===GUEST_SAVE_KEY){
    setStoredGuestSessionActive(false);
    guestMode=false;
    explicitGuestSession=false;
  }
  resetRuntimeDefaults();
  reloadAccountScopedGameplay(true);
  cloudPendingSave=false;
  cloudInitialSyncDone=false;
  showCenter("", 0);
  notice = msg("defaultNotice");
  gameMode = "login";
}

function exitLocalGuestSession(){
  if(!guestMode) return;
  saveGame();
  setStoredGuestSessionActive(false);
  explicitGuestSession=false;
  guestMode=false;
  accountAuthed=false;
  accountMode="login";
  accountEmail="";
  accountPassword="";
  accountFocusedField="email";
  resetRuntimeDefaults();
  reloadAccountScopedGameplay(false);
  settingsReturnMode="lobby";
  gameMode="login";
  setAccountMsg(language==="en" ? "Local save exited. Sign in or select Guest to continue." : "已退出本地存档，请登录账号或重新选择游客登录。",180);
}

function needsTutorialResume(){
  return !!(hasCreatedProfile && validPlayerName(playerName) && !prologueDone && !tutorialCompleted);
}

function startTargetAfterAuth(){
  if(!hasCreatedProfile || !validPlayerName(playerName)) return "nameInput";
  if(needsTutorialResume()) return "tutorialResume";
  if(validBattleResumeSnapshot(battleResumeSnapshot)) return "battleResumePrompt";
  return "lobby";
}

function cloneBattleResumeValue(value, fallback){
  try{return JSON.parse(JSON.stringify(value));}catch(e){return fallback;}
}

function validBattleResumeSnapshot(s){
  return !!(s && typeof s==="object" && s.version===1 && Array.isArray(s.team) && s.team.length && Array.isArray(s.enemies) && s.player && typeof s.player==="object" && ["main","commission","materialDungeon","bossKros","daydream"].includes(s.source));
}

function captureBattleResumeSnapshot(){
  if(gameMode!=="battle" || battleModeSource==="showcase") return null;
  if(areaCleared && area>=battleAreaLimit()) return null;
  saveCurrentRoleResources();
  return {
    version:1,savedAt:Date.now(),source:battleModeSource,
    selectedTab,selectedMainChapter,selectedStage,selectedCommissionChapter,
    team:team.slice(),area,areaCleared,commissionComplete,
    commissionTimeLeft,commissionTimeMax,chapter2EvacTimeLeft,
    battleRoute,battleSideArea,battleExitDelay,
    battleRoleHp:battleRoleHp.slice(),battleRoleEnergy:battleRoleEnergy.slice(),battleRoleUlt:battleRoleUlt.slice(),
    player:cloneBattleResumeValue(player,{}),enemies:cloneBattleResumeValue(enemies,[]),
    projectiles:cloneBattleResumeValue(projectiles,[]),frostFields:cloneBattleResumeValue(frostFields,[]),windFields:cloneBattleResumeValue(windFields,[]),bossHazards:cloneBattleResumeValue(bossHazards,[]),
    ult:cloneBattleResumeValue(ult,null),protagonistBindings:cloneBattleResumeValue(protagonistBindings,[]),protagonistSweeps:cloneBattleResumeValue(protagonistSweeps,[]),protagonistDomain:cloneBattleResumeValue(protagonistDomain,null),
    teamDamageAmpTimer,kaneSigils:cloneBattleResumeValue(kaneSigils,[]),noxDamageAmpTimer,ailoUltimateBurst:cloneBattleResumeValue(ailoUltimateBurst,null),
    battleExploreObjects:cloneBattleResumeValue(battleExploreObjects,[]),battleExploreOpened:cloneBattleResumeValue(battleExploreOpened,{}),areaDialogueShown:cloneBattleResumeValue(areaDialogueShown,{}),
    bossKrosRun:cloneBattleResumeValue(bossKrosRun,null),materialDungeonRun:cloneBattleResumeValue(materialDungeonRun,null),daydreamBattleConfig:cloneBattleResumeValue(daydreamBattleConfig,null),
    krosPhaseTransitionTimer,krosPhaseTransitionPhase,krosPhaseTransitionText,playerPoisonTimer,playerPoisonTick,playerBleedTimer,playerBleedTick,
    combo,comboTimer,stylishScore,combatRank
  };
}

function discardBattleResumeSnapshot(){
  battleResumeSnapshot=null;
  saveGame();
}

function restoreBattleResumeSnapshot(){
  const s=battleResumeSnapshot;
  if(!validBattleResumeSnapshot(s)){battleResumeSnapshot=null;enterLobby();return false;}
  selectedTab=s.selectedTab||"main";
  selectedMainChapter=clamp(Math.floor(Number(s.selectedMainChapter)||0),0,99);
  selectedStage=Math.max(1,Math.floor(Number(s.selectedStage)||1));
  selectedCommissionChapter=Math.max(0,Math.floor(Number(s.selectedCommissionChapter)||0));
  battleModeSource=s.source;team=normalizeBattleTeam(s.team);
  bossKrosRun=cloneBattleResumeValue(s.bossKrosRun,null);materialDungeonRun=cloneBattleResumeValue(s.materialDungeonRun,null);daydreamBattleConfig=cloneBattleResumeValue(s.daydreamBattleConfig,null);
  startBattle();
  area=Math.max(1,Math.floor(Number(s.area)||1));areaCleared=!!s.areaCleared;commissionComplete=!!s.commissionComplete;
  commissionTimeLeft=Math.max(0,Number(s.commissionTimeLeft)||0);commissionTimeMax=Math.max(0,Number(s.commissionTimeMax)||0);chapter2EvacTimeLeft=Math.max(0,Number(s.chapter2EvacTimeLeft)||0);
  battleRoute=s.battleRoute||"center";battleSideArea=s.battleSideArea||"";battleExitDelay=Math.max(0,Number(s.battleExitDelay)||0);
  battleRoleHp=Array.isArray(s.battleRoleHp)?s.battleRoleHp.slice():battleRoleHp;battleRoleEnergy=Array.isArray(s.battleRoleEnergy)?s.battleRoleEnergy.slice():battleRoleEnergy;battleRoleUlt=Array.isArray(s.battleRoleUlt)?s.battleRoleUlt.slice():battleRoleUlt;
  enemies=cloneBattleResumeValue(s.enemies,[]);projectiles=cloneBattleResumeValue(s.projectiles,[]);frostFields=cloneBattleResumeValue(s.frostFields,[]);windFields=cloneBattleResumeValue(s.windFields,[]);bossHazards=cloneBattleResumeValue(s.bossHazards,[]);
  if(s.ult)ult=cloneBattleResumeValue(s.ult,ult);protagonistBindings=cloneBattleResumeValue(s.protagonistBindings,[]);protagonistSweeps=cloneBattleResumeValue(s.protagonistSweeps,[]);if(s.protagonistDomain)protagonistDomain=cloneBattleResumeValue(s.protagonistDomain,protagonistDomain);
  teamDamageAmpTimer=Math.max(0,Number(s.teamDamageAmpTimer)||0);kaneSigils=cloneBattleResumeValue(s.kaneSigils,[]);noxDamageAmpTimer=Math.max(0,Number(s.noxDamageAmpTimer)||0);if(s.ailoUltimateBurst)ailoUltimateBurst=cloneBattleResumeValue(s.ailoUltimateBurst,ailoUltimateBurst);
  battleExploreObjects=cloneBattleResumeValue(s.battleExploreObjects,[]);battleExploreOpened=cloneBattleResumeValue(s.battleExploreOpened,{});areaDialogueShown=cloneBattleResumeValue(s.areaDialogueShown,{});
  Object.assign(player,cloneBattleResumeValue(s.player,{}));player.role=clamp(Math.floor(Number(player.role)||0),0,roles.length-1);ensureBattleRoleResources();syncPlayerResourcesFromRole();
  krosPhaseTransitionTimer=Math.max(0,Number(s.krosPhaseTransitionTimer)||0);krosPhaseTransitionPhase=Math.max(1,Number(s.krosPhaseTransitionPhase)||1);krosPhaseTransitionText=String(s.krosPhaseTransitionText||"");
  playerPoisonTimer=Math.max(0,Number(s.playerPoisonTimer)||0);playerPoisonTick=Math.max(0,Number(s.playerPoisonTick)||0);playerBleedTimer=Math.max(0,Number(s.playerBleedTimer)||0);playerBleedTick=Math.max(0,Number(s.playerBleedTick)||0);
  combo=Math.max(0,Number(s.combo)||0);comboTimer=Math.max(0,Number(s.comboTimer)||0);stylishScore=Math.max(0,Number(s.stylishScore)||0);combatRank=String(s.combatRank||"D");
  battleResumeSnapshot=null;battlePaused=false;lockTarget=null;chainTarget=null;player.parryTarget=null;mouseDown=false;clicked=false;
  showCenter(language==="en"?"BATTLE RESUMED":"继续未完成战斗",80);
  return true;
}

function saveGame(){
  try{
    // With no selected local guest session and no authenticated cloud account,
    // the login screen is only a gateway. Never let its Settings shortcut
    // overwrite the retained guest slot with an empty runtime profile.
    if(!guestMode && !cloudUser) return false;
    // Authentication is complete before the account save is loaded. During
    // that short window runtime memory may still be guest data.
    if(!guestMode && cloudUser && !cloudInitialSyncDone) return false;
    const now = Date.now();
    const key = activeSaveKey();
    let previous = {};
    try{
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      if(parsed && typeof parsed === "object" && !Array.isArray(parsed)) previous = parsed;
    }catch(e){}
    const current = {
      saveVersion:SAVE_VERSION,
      saveRevision:Math.max(0,Math.floor(Number(previous.saveRevision)||0))+1,
      updatedAt:now,
      accountUid:(!guestMode && cloudUser) ? cloudUser.uid : "",
      crystals, gold, expBooks, weaponOre, skillBooks, skillMaterials, playerLevel, playerExp, playerExpNeed, protagonistStoryLevel, playerName, playerUID, hasCreatedProfile, profileAvatarRole, profileAvatarFrame, profileShowcase,
      owned, cleared, projectAreaCleared, charData, lobbyExecutor, lobbyBackgroundTheme, team, teamPresets, teamPresetNames, renderQuality, targetFPS, monthlyOwned, monthlyClaimed, monthlyClaimDate, mailClaimed, mailDeleted, eventClaimed, lastLoginClaimDate, loginClaimIndex, monthlyLoginCheckin, versionLoginCheckin,
      loginRewards, levelRewards, boughtPacks, ownedWeapons, weaponInventory, crystalExchangePurchases, dungeonStamina, dungeonWeeklyCrystalLeft, dungeonCrystalWeekKey, dungeonLastStaminaDate, dungeonCandy, dungeonStimulant, dungeonCandyMonthKey, dungeonCandyDailyUsed, dungeonCandyDailyKey, dungeonRewardMultiplier, materialDungeonDifficulty, materialDungeonDifficulties, materialDungeonSelected, moduleDungeonTarget, audioMuted, bgmVolume, sfxVolume, particlesEnabled, damageTextEnabled, tutorialCompleted, tutorialInProgress, tutorialResumeMode, language, prologueDone, lobbyGuideDone, lobbyGuideStep, achievements, totalKills, totalParries, totalChains, totalBossKills, totalGoldEarned, totalCrystalsEarned, growthGuidePage, growthGuidePageClaimed, growthGuideTaskClaimed, bossMultiplier, bossKrosWeeklyKey, dragonClaw, uiGuideSeen, uiNewSeen, actionRecordLevel, actionRecordExp, actionRecordExpNeed, actionRecordPage, actionRecordAdvanced, actionRecordUltimate, actionRecordClaimed, actionRecordWeaponChoice, actionRecordTab, actionRecordTaskTab, actionRecordTaskClaimed, battleManualDailyClaimed,
      battleResume:captureBattleResumeSnapshot()
    };
    current.crystalModuleInventory = crystalModuleInventory;
    current.externalProgress = collectExternalProgress(key);
    // Save updates are merged into the current record. Existing extension fields
    // survive a client update, while obsolete history containers are removed.
    const data = Object.assign({}, previous, current);
    delete data.saveBox;
    delete data.saves;
    delete data.saveHistory;
    delete data.history;
    writeSaveRecordSafely(key,data);
    if(!cloudApplyingRemote) scheduleCloudAutoSave(1800);
    return true;
  }catch(e){console.error("[SaveWrite]",e);}
  return false;
}


function migrateSaveData(d){
  if(!d || typeof d !== "object") return false;
  const fromVersion = Number.isFinite(Number(d.saveVersion)) ? Number(d.saveVersion) : 0;
  let changed = false;
  const addMissing = (key, value) => {
    if(d[key] !== undefined) return;
    d[key] = value;
    changed = true;
  };
  if(typeof d.language !== "string" || (d.language !== "zh" && d.language !== "en")){
    d.language = detectSystemLanguage();
    changed = true;
  }
  if(!Array.isArray(d.loginRewards)){ d.loginRewards = null; changed = true; }
  if(!Array.isArray(d.levelRewards)){ d.levelRewards = null; changed = true; }
  addMissing("monthlyLoginCheckin", {month:"",dates:[],totalDates:[],milestones:{}});
  addMissing("versionLoginCheckin", {build:"2026072205",claimedDays:[],lastClaimDate:""});
  addMissing("uiGuideSeen", {});
  addMissing("lobbyGuideStep", 0);
  addMissing("uiNewSeen", {});
  addMissing("actionRecordClaimed", {free:{},advanced:{},ultimate:{}});
  addMissing("actionRecordTaskClaimed", {dailyKey:"",weeklyKey:"",monthlyKey:"",daily:{},weekly:{},monthly:{}});
  addMissing("battleManualDailyClaimed", {key:"",tasks:{},page:false});
  addMissing("mailDeleted", false);
  addMissing("projectAreaCleared", false);
  addMissing("team", [PROTAGONIST_ROLE,1,2]);
  addMissing("teamPresets", [[PROTAGONIST_ROLE,1,2],[PROTAGONIST_ROLE],[0,2],[1,2]]);
  addMissing("teamPresetNames", ["","","",""]);
  addMissing("lobbyBackgroundTheme", "raven");
  addMissing("crystalModuleInventory", []);
  addMissing("moduleDungeonTarget", "survey");
  addMissing("materialDungeonDifficulties", {gold:d.materialDungeonDifficulty||1,exp:d.materialDungeonDifficulty||1,weapon:d.materialDungeonDifficulty||1,module:Math.max(2,d.materialDungeonDifficulty||2)});
  addMissing("skillBooks", 6);
  addMissing("skillMaterials", {normal:6,skill:4,ultimate:2});
  addMissing("externalProgress", {});
  addMissing("battleResume", null);
  addMissing("saveRevision", 0);
  // V54 repairs profiles created by builds that accidentally omitted Ailo or
  // Nox from the starter roster. This changes ownership only; progression and
  // upgrade data remain untouched.
  if(!Array.isArray(d.owned)){ d.owned=[true,true,true,false,true,false]; changed=true; }
  while(d.owned.length<6){ d.owned.push(false); changed=true; }
  for(const roleId of [0,1,2,PROTAGONIST_ROLE]){
    if(d.owned[roleId]!==true){ d.owned[roleId]=true; changed=true; }
  }
  // Equipment was removed from the game. Strip its obsolete save payload so
  // merged local/cloud saves cannot silently restore abandoned equipment data.
  if(Object.prototype.hasOwnProperty.call(d,"equipmentInventory")){
    delete d.equipmentInventory;
    changed=true;
  }
  if(Array.isArray(d.charData)){
    for(const role of d.charData){
      if(!role || typeof role!=="object") continue;
      if(Object.prototype.hasOwnProperty.call(role,"equipmentSlots")){
        delete role.equipmentSlots;
        changed=true;
      }
      // Saves before the four-stage level system used two caps (20/40/60).
      if(fromVersion<40){
        const oldStage=Math.max(0,Math.min(2,Math.floor(Number(role.breakStage)||0)));
        role.breakStage=oldStage===2?4:oldStage===1?2:0;
      }
    }
  }
  if(fromVersion !== SAVE_VERSION){
    d.saveVersion = SAVE_VERSION;
    d.migratedFromVersion = fromVersion;
    d.migratedAt = Date.now();
    changed = true;
  }
  for(const legacyKey of ["saveBox","saves","saveHistory","history"]){
    if(Object.prototype.hasOwnProperty.call(d, legacyKey)){
      delete d[legacyKey];
      changed = true;
    }
  }
  return changed;
}

function safeSaveGame(){
  saveCooldown = 20;
}

function loadGame(){
  const key = activeSaveKey();
  let raw = "";
  try{
    const record=readSaveRecordWithRecovery(key);
    if(!record)return false;
    raw=record.raw;
    const d=record.parsed;
    const migrated = migrateSaveData(d);
    if(migrated) raw=writeSaveRecordSafely(key,d);
    restoreExternalProgress(d.externalProgress,key);
    if(typeof d.crystals === "number") crystals = d.crystals;
    if(typeof d.gold === "number") gold = d.gold;
    if(typeof d.expBooks === "number") expBooks = d.expBooks;
    if(typeof d.weaponOre === "number") weaponOre = d.weaponOre;
    if(typeof d.skillBooks === "number") skillBooks = Math.max(0,Math.floor(d.skillBooks));
    if(d.skillMaterials && typeof d.skillMaterials === "object") skillMaterials = {
      normal:Math.max(0,Math.floor(d.skillMaterials.normal||0)),
      skill:Math.max(0,Math.floor(d.skillMaterials.skill||0)),
      ultimate:Math.max(0,Math.floor(d.skillMaterials.ultimate||0))
    };
    if(typeof d.playerLevel === "number") playerLevel = d.playerLevel;
    if(typeof d.playerExp === "number") playerExp = d.playerExp;
    if(typeof d.playerExpNeed === "number") playerExpNeed = d.playerExpNeed;
    // V49.19 early progression: existing fresh saves adopt the slower opening curve.
    if(playerLevel<=3) playerExpNeed=Math.max(playerExpNeed,1600);
    if(typeof d.protagonistStoryLevel === "number") protagonistStoryLevel = clamp(Math.floor(d.protagonistStoryLevel),1,60);
    if(typeof d.playerName === "string") playerName = cleanPlayerName(d.playerName);
    if(typeof d.playerUID === "string") playerUID = d.playerUID;
    if(typeof d.hasCreatedProfile === "boolean") hasCreatedProfile = d.hasCreatedProfile;
    if(Array.isArray(d.owned)) owned = d.owned;
    while(owned.length<roles.length) owned.push(false);
    ensureStarterRoster();
    team=normalizeBattleTeam(d.team,[PROTAGONIST_ROLE,1,2]);
    teamPresets=normalizeTeamPresets(d.teamPresets);
    teamPresetNames=normalizeTeamPresetNames(d.teamPresetNames);
    if(typeof d.profileAvatarRole === "number") profileAvatarRole=clamp(Math.floor(d.profileAvatarRole),0,roles.length-1);
    if(typeof d.profileAvatarFrame === "string" && ["zero","crystal","raven","dream"].includes(d.profileAvatarFrame)) profileAvatarFrame=d.profileAvatarFrame;
    if(Array.isArray(d.profileShowcase)) profileShowcase=d.profileShowcase.slice(0,3).map(v=>clamp(Math.floor(v||0),0,roles.length-1));
    while(profileShowcase.length<3) profileShowcase.push(PROTAGONIST_ROLE);
    if(!owned[profileAvatarRole]) profileAvatarRole=PROTAGONIST_ROLE;
    profileShowcase=profileShowcase.map(v=>owned[v]?v:PROTAGONIST_ROLE);
    if(d.cleared) cleared = d.cleared;
    if(typeof d.projectAreaCleared === "boolean") projectAreaCleared = d.projectAreaCleared;
    if(Array.isArray(d.charData)) charData = d.charData;
    while(charData.length<roles.length) charData.push({level:1,skillPoints:0,normal:1,skill:1,ultimate:1,weaponLevel:1,weapon:weaponName(charData.length)});
    crystalModuleInventory=window.PZModules?window.PZModules.normalize(charData,Array.isArray(d.crystalModuleInventory)?d.crystalModuleInventory:[]):[];
    if(typeof d.moduleDungeonTarget === "string" && window.PZModules){
      if(window.PZModules.SETS[d.moduleDungeonTarget]) moduleDungeonTarget=d.moduleDungeonTarget;
      else { const legacy=window.PZModules.BASE_ITEMS.find(v=>v.id===d.moduleDungeonTarget); if(legacy) moduleDungeonTarget=legacy.setId; }
    }
    if(typeof d.lobbyExecutor === "number") lobbyExecutor = clamp(d.lobbyExecutor,0,roles.length-1);
    if(typeof d.lobbyBackgroundTheme === "string" && ["raven","night","crystal","zero"].includes(d.lobbyBackgroundTheme)) lobbyBackgroundTheme=d.lobbyBackgroundTheme;
    if(typeof d.renderQuality === "string" && ["STANDARD","1080P","2K","AUTO"].includes(d.renderQuality)) renderQuality = d.renderQuality;
    if(typeof d.targetFPS === "number") targetFPS = d.targetFPS === 30 ? 30 : 60;
    applyRenderQuality();

    if(typeof d.monthlyOwned === "boolean") monthlyOwned = d.monthlyOwned;
    if(typeof d.monthlyClaimed === "boolean") monthlyClaimed = d.monthlyClaimed;
    if(typeof d.monthlyClaimDate === "string") monthlyClaimDate = d.monthlyClaimDate;
    normalizeMonthlyCardRuntime();
    if(typeof d.mailClaimed === "boolean") mailClaimed = d.mailClaimed;
    if(typeof d.mailDeleted === "boolean") mailDeleted = d.mailDeleted;
    if(typeof d.eventClaimed === "boolean") eventClaimed = d.eventClaimed;
    if(typeof d.lastLoginClaimDate === "string") lastLoginClaimDate = d.lastLoginClaimDate;
    if(typeof d.loginClaimIndex === "number") loginClaimIndex = d.loginClaimIndex;
    if(d.monthlyLoginCheckin && typeof d.monthlyLoginCheckin === "object") monthlyLoginCheckin = {
      month:typeof d.monthlyLoginCheckin.month === "string" ? d.monthlyLoginCheckin.month : "",
      dates:Array.isArray(d.monthlyLoginCheckin.dates) ? d.monthlyLoginCheckin.dates.filter(v=>typeof v==="string").slice(0,30) : [],
      totalDates:Array.isArray(d.monthlyLoginCheckin.totalDates) ? d.monthlyLoginCheckin.totalDates.filter(v=>typeof v==="string").slice(0,2000) : (Array.isArray(d.monthlyLoginCheckin.dates) ? d.monthlyLoginCheckin.dates.filter(v=>typeof v==="string").slice(0,30) : []),
      milestones:d.monthlyLoginCheckin.milestones && typeof d.monthlyLoginCheckin.milestones === "object" ? Object.assign({},d.monthlyLoginCheckin.milestones) : {}
    };
    if(d.versionLoginCheckin && typeof d.versionLoginCheckin==="object") versionLoginCheckin={
      build:"2026072205",
      claimedDays:Array.isArray(d.versionLoginCheckin.claimedDays)?d.versionLoginCheckin.claimedDays.map(Number).filter(v=>v>=0&&v<7):[],
      lastClaimDate:typeof d.versionLoginCheckin.lastClaimDate==="string"?d.versionLoginCheckin.lastClaimDate:""
    };
    if(Array.isArray(d.loginRewards)){
      const old=d.loginRewards;
      loginRewards=loginRewards.map((base,i)=>Object.assign({},base,{claimed:!!(old[i]&&old[i].claimed)}));
    }
    if(Array.isArray(d.levelRewards)) levelRewards = d.levelRewards;
    if(d.boughtPacks) boughtPacks = d.boughtPacks;
    if(d.crystalExchangePurchases && typeof d.crystalExchangePurchases==="object") crystalExchangePurchases=Object.assign({},d.crystalExchangePurchases);
    if(d.ownedWeapons) ownedWeapons = Object.assign(ownedWeapons || {}, d.ownedWeapons);
    if(Array.isArray(d.weaponInventory)){
      weaponInventory = d.weaponInventory
        .filter(item => item && typeof item.id === "string")
        .map(item => ({
          id:item.id,
          level:Math.max(1, Number(item.level) || 1),
          owned:item.owned !== false
        }));
    }
    if(loginClaimIndex>=3){ while(owned.length<roles.length)owned.push(false); owned[5]=true; }
    if(loginClaimIndex>=6){ ensureWeaponBag(); const lw=weaponInventory.find(x=>x.id==="lavender"); if(lw)lw.owned=true; }
    if(typeof d.dungeonStamina === "number") dungeonStamina = clamp(d.dungeonStamina,0,9999);
    if(typeof d.dungeonWeeklyCrystalLeft === "number") dungeonWeeklyCrystalLeft = clamp(d.dungeonWeeklyCrystalLeft,0,3);
    if(typeof d.dungeonCrystalWeekKey === "string") dungeonCrystalWeekKey = d.dungeonCrystalWeekKey;
    if(typeof d.dungeonLastStaminaDate === "string") dungeonLastStaminaDate = d.dungeonLastStaminaDate;
    if(typeof d.dungeonCandy === "number") dungeonCandy = clamp(Math.floor(d.dungeonCandy),0,2400);
    if(typeof d.dungeonStimulant === "number") dungeonStimulant = clamp(Math.floor(d.dungeonStimulant),0,4);
    if(typeof d.dungeonCandyMonthKey === "string") dungeonCandyMonthKey = d.dungeonCandyMonthKey;
    if(typeof d.dungeonCandyDailyUsed === "number") dungeonCandyDailyUsed = clamp(Math.floor(d.dungeonCandyDailyUsed),0,6);
    if(typeof d.dungeonCandyDailyKey === "string") dungeonCandyDailyKey = d.dungeonCandyDailyKey;
    if(typeof d.dungeonRewardMultiplier === "number") dungeonRewardMultiplier = clamp(Math.floor(d.dungeonRewardMultiplier),1,4);
    if(typeof d.materialDungeonDifficulty === "number") materialDungeonDifficulty = clamp(Math.floor(d.materialDungeonDifficulty),1,6);
    if(d.materialDungeonDifficulties && typeof d.materialDungeonDifficulties === "object") materialDungeonDifficulties={
      gold:clamp(Math.floor(d.materialDungeonDifficulties.gold||1),1,6),
      exp:clamp(Math.floor(d.materialDungeonDifficulties.exp||1),1,6),
      weapon:clamp(Math.floor(d.materialDungeonDifficulties.weapon||1),1,6),
      module:clamp(Math.floor(d.materialDungeonDifficulties.module||2),2,6),
      skill:clamp(Math.floor(d.materialDungeonDifficulties.skill||1),1,6)
    };
    if(typeof d.materialDungeonSelected === "number") materialDungeonSelected = clamp(Math.floor(d.materialDungeonSelected),0,4);
    if(typeof d.bossMultiplier === "number") bossMultiplier = clamp(Math.floor(d.bossMultiplier),1,4);
    if(typeof d.bossKrosWeeklyKey === "string") bossKrosWeeklyKey = d.bossKrosWeeklyKey;
    if(typeof d.dragonClaw === "number") dragonClaw = Math.max(0, Math.floor(d.dragonClaw));
    normalizeDungeonRuntime();
    if(typeof d.audioMuted === "boolean") audioMuted = d.audioMuted;
    if(typeof d.bgmVolume === "number") bgmVolume = clamp(d.bgmVolume, 0, 1);
    if(typeof d.sfxVolume === "number") sfxVolume = clamp(d.sfxVolume, 0, 1);
    if(typeof d.particlesEnabled === "boolean") particlesEnabled = d.particlesEnabled;
    if(typeof d.damageTextEnabled === "boolean") damageTextEnabled = d.damageTextEnabled;
    if(typeof d.tutorialCompleted === "boolean") tutorialCompleted = d.tutorialCompleted;
    if(typeof d.tutorialInProgress === "boolean") tutorialInProgress = d.tutorialInProgress;
    if(typeof d.tutorialResumeMode === "string") tutorialResumeMode = d.tutorialResumeMode;
    if(typeof d.language === "string"){
      language = d.language;
      rememberUiLanguage(language);
    }
    if(typeof d.prologueDone === "boolean") prologueDone = d.prologueDone;
    if(typeof d.lobbyGuideDone === "boolean") lobbyGuideDone = d.lobbyGuideDone;
    if(typeof d.lobbyGuideStep === "number") lobbyGuideStep = clamp(Math.floor(d.lobbyGuideStep),0,3);
    if(d.uiGuideSeen && typeof d.uiGuideSeen === "object") uiGuideSeen = Object.assign({}, d.uiGuideSeen);
    if(d.uiNewSeen && typeof d.uiNewSeen === "object") uiNewSeen = Object.assign({}, d.uiNewSeen);
    if(typeof d.actionRecordLevel === "number") actionRecordLevel = clamp(Math.floor(d.actionRecordLevel),1,50);
    if(typeof d.actionRecordExp === "number") actionRecordExp = Math.max(0, Math.floor(d.actionRecordExp));
    if(typeof d.actionRecordExpNeed === "number") actionRecordExpNeed = Math.max(100, Math.floor(d.actionRecordExpNeed));
    if(typeof d.actionRecordPage === "number") actionRecordPage = clamp(Math.floor(d.actionRecordPage),0,arMaxPage());
    if(typeof d.actionRecordAdvanced === "boolean") actionRecordAdvanced = d.actionRecordAdvanced;
    if(typeof d.actionRecordUltimate === "boolean") actionRecordUltimate = d.actionRecordUltimate;
    if(d.actionRecordClaimed && typeof d.actionRecordClaimed === "object") actionRecordClaimed = Object.assign({free:{},advanced:{},ultimate:{}}, d.actionRecordClaimed);
    if(d.actionRecordWeaponChoice && typeof d.actionRecordWeaponChoice === "object") actionRecordWeaponChoice = d.actionRecordWeaponChoice;
    if(typeof d.actionRecordTab === "string") actionRecordTab = d.actionRecordTab === "tasks" ? "tasks" : "rewards";
    if(typeof d.actionRecordTaskTab === "string" && ["daily","weekly","monthly"].includes(d.actionRecordTaskTab)) actionRecordTaskTab = d.actionRecordTaskTab;
    if(d.actionRecordTaskClaimed && typeof d.actionRecordTaskClaimed === "object") actionRecordTaskClaimed = Object.assign({dailyKey:"",weeklyKey:"",monthlyKey:"",daily:{},weekly:{},monthly:{}}, d.actionRecordTaskClaimed);
    if(d.battleManualDailyClaimed && typeof d.battleManualDailyClaimed === "object") battleManualDailyClaimed = Object.assign({key:"", tasks:{}, page:false}, d.battleManualDailyClaimed);
    battleResumeSnapshot=validBattleResumeSnapshot(d.battleResume)?cloneBattleResumeValue(d.battleResume,null):null;
    if(d.achievements && typeof d.achievements === "object") achievements = d.achievements;
    if(typeof d.totalKills === "number") totalKills = d.totalKills;
    if(typeof d.totalParries === "number") totalParries = d.totalParries;
    if(typeof d.totalChains === "number") totalChains = d.totalChains;
    if(typeof d.totalBossKills === "number") totalBossKills = d.totalBossKills;
    if(typeof d.totalGoldEarned === "number") totalGoldEarned = d.totalGoldEarned;
    if(typeof d.totalCrystalsEarned === "number") totalCrystalsEarned = d.totalCrystalsEarned;
    if(typeof d.growthGuidePage === "number") growthGuidePage = clamp(d.growthGuidePage,0,9);
    if(Array.isArray(d.growthGuidePageClaimed)) growthGuidePageClaimed = d.growthGuidePageClaimed.concat(Array(10).fill(false)).slice(0,10);
    if(Array.isArray(d.growthGuideTaskClaimed)) growthGuideTaskClaimed = d.growthGuideTaskClaimed.map(row => {
      const src = Array.isArray(row) ? row : (row && Array.isArray(row.items) ? row.items : null);
      return src ? src.concat(Array(5).fill(false)).slice(0,5).map(Boolean) : Array(5).fill(false);
    }).concat(Array.from({length:10},()=>Array(5).fill(false))).slice(0,10);
    if(saveRecoveryNoticePending){
      saveRecoveryNoticePending=false;
      showCenter(language==="en"?"Save recovered from a local backup.":"存档异常，已从本地备份恢复。",150);
    }
    return true;
  }catch(e){
    console.error("[SaveLoad]", e);
    // Preserve the unreadable primary. Backups remain available for the next
    // recovery attempt; never silently delete a player's only remaining copy.
    if(raw){
      try{ localStorage.setItem(key + "_corrupt_backup", raw); }catch(ignore){}
    }
    return false;
  }
}



const UI_TEXT = I18N_RES.UI_TEXT || {
  zh: {
    click:"CLICK", claimed:"已领取", claim:"领取", locked:"未解锁", notReached:"未达成",
    backLobby:"返回大厅", backLogin:"返回登录页面", esc:"ESC",
    operation:"作战", operators:"执行官", shop:"商店", mail:"邮件", event:"活动", warehouse:"仓库", settings:"设置",
    profile:"个人资料", graphics:"画面", audio:"音效", account:"账号",
    chapter0:"第0章", main:"主线", combat:"战斗", startAction:"开始行动", return:"返回",
    team:"编队确认", currentTeam:"当前队伍", selectOperator:"选择执行官", start:"开始行动",
    storySkip:"跳过剧情", next:"继续",
    settlement:"委托完成", reward:"奖励", rank:"评价", exp:"经验", level:"等级", progress:"进度",
    mailTitle:"邮件", eventTitle:"活动", warehouseTitle:"仓库", shopTitle:"商店", operatorTitle:"执行官",
    featured:"推荐", crystal:"水晶", monthly:"月卡", packs:"礼包",
    levelUp:"升级", skill:"技能", weapon:"武器", normalAtk:"普攻", ultimate:"大招",
    language:"语言", particles:"粒子特效", damageText:"伤害数字", gameAudio:"游戏音效",
    on:"开", off:"关", logout:"注销账号", cancelLogout:"取消注销", confirmDelete:"确认删除", permanent:"不可恢复",
    localSave:"本地存档", accountInfo:"账号信息", graphicsSettings:"画面设置", audioSettings:"音效设置",
    notice:"公告：", crystalLabel:"◆ 水晶", goldLabel:"● 金币",
    day:"第", daySuffix:"天", tomorrow:"明日再来", completed:"全部完成",
    loginEvent:"启程签到", levelEvent:"新手等级", supplyEvent:"初入奖励",
    dailyReward:"每日奖励", growthGoal:"成长目标", oneTimeSupply:"一次性补给",
    eventSubtitle:"活动 / 启程计划 / 初入奖励",
    settingsSubtitle:"设置 / 画面 / 音效 / 账号",
    profileSubtitle:"资料 / 点击任意位置或 Esc 返回",
    inventorySubtitle:"材料与资源",
    noData:"暂无数据", achievement:"成就", achievementSubtitle:"旅途记录 / 战斗 / 收集", claimReward:"领取奖励", completedAchievement:"已完成", achievementLocked:"未完成", shopRecruit:"招募", weaponDepot:"武器库", skin:"皮肤", developerSupport:"开发者资助", permanentRecruit:"常驻", limitedRecruit:"限定", permanentWeapon:"常驻武器库", limitedWeapon:"限定武器库", comingSoon:"开发中"
  },
  en: {
    click:"CLICK", claimed:"Claimed", claim:"Claim", locked:"Locked", notReached:"Incomplete",
    backLobby:"Back to Lobby", backLogin:"Back to Login", esc:"ESC",
    operation:"Operations", operators:"Executors", shop:"Shop", mail:"Mail", event:"Events", warehouse:"Inventory", settings:"Settings",
    profile:"Profile", graphics:"Graphics", audio:"Audio", account:"Account",
    chapter0:"Chapter 0", main:"Main Story", combat:"Commissions", startAction:"Deploy", return:"Back",
    team:"Team Setup", currentTeam:"Current Team", selectOperator:"Select Operator", start:"Start",
    storySkip:"Skip", next:"Next",
    settlement:"Mission Complete", reward:"Reward", rank:"Rank", exp:"EXP", level:"Level", progress:"Progress",
    mailTitle:"Mail", eventTitle:"Event", warehouseTitle:"Inventory", shopTitle:"Shop", operatorTitle:"Executors",
    featured:"Featured", crystal:"Crystal", monthly:"Monthly", packs:"Packs",
    levelUp:"Level Up", skill:"Skill", weapon:"Weapon", normalAtk:"Normal", ultimate:"Ultimate",
    language:"Language", particles:"Particles", damageText:"Damage Text", gameAudio:"Game Audio",
    on:"On", off:"Off", logout:"Logout", cancelLogout:"Cancel Logout", confirmDelete:"Confirm Delete", permanent:"Permanent",
    localSave:"Local Save", accountInfo:"Account Info", graphicsSettings:"Graphics Settings", audioSettings:"Audio Settings",
    notice:"Notice: ", crystalLabel:"◆ Crystal", goldLabel:"● Gold",
    day:"Day ", daySuffix:"", tomorrow:"Tomorrow", completed:"Completed",
    loginEvent:"Journey Check-in", levelEvent:"Rookie Goals", supplyEvent:"Arrival Rewards",
    dailyReward:"Daily Reward", growthGoal:"Growth Goal", oneTimeSupply:"One-time Supply",
    eventSubtitle:"Events / Journey Plan / Arrival Rewards",
    settingsSubtitle:"Settings / Graphics / Audio / Account",
    profileSubtitle:"Profile / Press Esc or click anywhere to return",
    inventorySubtitle:"Materials and Resources",
    noData:"No records yet", achievement:"Achievements", achievementSubtitle:"Journey / Combat / Collection", claimReward:"Claim Reward", completedAchievement:"Completed", achievementLocked:"Incomplete", shopRecruit:"Recruitment", weaponDepot:"Weapon Depot", skin:"Outfits", developerSupport:"Developer Support", permanentRecruit:"Standard", limitedRecruit:"Limited", permanentWeapon:"Standard Weapons", limitedWeapon:"Limited Weapons", comingSoon:"Coming Soon"
  }
};

const MISC_TEXT = I18N_RES.MISC_TEXT || {
  "zh": {
    "achievementCompletePrefix": "\u6210\u5c31\u5b8c\u6210\uff1a",
    "claimedPrefix": "\u9886\u53d6\u6210\u529f\uff1a",
    "storyFallbackSpeaker": "\u65c1\u767d",
    "storyFallbackText": "\u4efb\u52a1\u5f00\u59cb\u3002",
    "notEnoughEnergy": "\u80fd\u91cf\u4e0d\u8db3",
    "ultimateNotReady": "\u5927\u62db\u672a\u6ee1",
    "initializingSystem": "\u521d\u59cb\u5316\u7cfb\u7edf...",
    "checkingSave": "\u68c0\u67e5\u5b58\u6863...",
    "checkingProfile": "\u68c0\u67e5\u73a9\u5bb6\u8d44\u6599...",
    "cleaningBattle": "\u6e05\u7406\u6218\u6597\u72b6\u6001...",
    "loadingLobby": "\u8f7d\u5165\u5927\u5385...",
    "welcomeBack": "\u6b22\u8fce\u56de\u6765\uff0c",
    "alreadyOwnedSuffix": " \u5df2\u62e5\u6709",
    "recruitedSuffix": " \u62db\u52df\u6210\u529f",
    "notEnoughCrystal": "\u6c34\u6676\u4e0d\u8db3",
    "journeyCategory": "\u65c5\u9014\u8bb0\u5f55",
    "combatCategory": "\u6218\u6597\u8bb0\u5f55",
    "collectionCategory": "\u6536\u96c6\u8bb0\u5f55",
    "performanceHint": "\u5173\u95ed\u7c92\u5b50/\u4f24\u5bb3\u6570\u5b57\u53ef\u63d0\u5347\u4f4e\u914d\u8bbe\u5907\u6d41\u7545\u5ea6\u3002",
    "deleteWarning": "\u6ce8\u610f\uff1a\u8fd9\u4f1a\u5220\u9664\u672c\u5730\u5b58\u6863\u5e76\u91cd\u65b0\u8f7d\u5165\u6e38\u620f\u3002",
    "eventLoginSub": "\u8fde\u7eed\u767b\u5f55\uff0c\u9886\u53d6\u4f5c\u6218\u8d44\u6e90",
    "eventLevelSub": "\u63d0\u5347\u7b49\u7ea7\uff0c\u89e3\u9501\u5956\u52b1",
    "eventSupplySub": "\u4e00\u6b21\u6027\u9886\u53d6\u5f00\u8352\u8865\u7ed9",
    "eventDefaultHint": "\u70b9\u51fb\u5956\u52b1\u5361\u7247\u9886\u53d6",
    "rewardWord": "\u5956\u52b1",
    "tomorrowAgain": "\u660e\u65e5\u518d\u6765",
    "teamLeader": "\u961f\u957f / \u521d\u59cb\u51fa\u6218",
    "teamSwitchable": "\u53ef\u5207\u6362\u5165\u573a",
    "notOwned": "\u672a\u62e5\u6709",
    "clickToJoin": "\u70b9\u51fb\u52a0\u5165",
    "levelUp": "\u5347\u7ea7",
    "upgradeWeapon": "\u5f3a\u5316\u6b66\u5668",
    "notCleared": "\u5c1a\u672a\u901a\u5173",
    "chapterProgressPrefix": "\u7b2c0\u7ae0 ",
    "entrySuffix": " \u5165\u573a",
    "crystalColon": "\u6c34\u6676\uff1a",
    "stageFallback": "\u5e9f\u57ce",
    "eventPanelLoginTitle": "\u6e38\u5386\u5929\u5916",
    "eventPanelLevelTitle": "\u65b0\u624b\u76ee\u6807",
    "eventPanelSupplyTitle": "\u8865\u7ed9\u884c\u52a8",
    "dailyCheckAvailable": "\u4eca\u65e5\u7b7e\u5230\u53ef\u9886\u53d6",
    "claimedTodayComeTomorrow": "\u4eca\u65e5\u5df2\u9886\u53d6\uff0c\u660e\u65e5\u518d\u6765",
    "floraShopRank": "S\u7ea7 / \u51b0 / \u6cd5\u672f",
    "floraShopFeature": "\u7fa4\u4f24 / \u51bb\u7ed3\u602a\u72691.5\u79d2",
    "everwinterName": "\u6c38\u51ac\u4e4b\u6b4c",
    "floraSignatureWeapon": "\u8299\u6d1b\u62c9\u4e13\u5c5e\u6b66\u5668",
    "everwinterDesc": "\u51bb\u7ed3\u654c\u4eba\u53d7\u5230\u4f24\u5bb3\u63d0\u9ad8\uff0c\u51b0\u57df\u66f4\u7a33\u5b9a\u3002",
    "permanentWeaponDepot": "\u5e38\u9a7b\u6b66\u5668\u5e93",
    "permanentWeaponDesc": "\u5b88\u671b\u8005 / \u98ce\u8bed / \u88c2\u75d5\u4e4b\u7259 \u7b49\u6b66\u5668\u5c06\u5728\u540e\u7eed\u7248\u672c\u5f00\u653e\u3002",
    "skinDesc": "\u672a\u6765\u76ae\u80a4\u53ea\u6539\u53d8\u5916\u89c2\uff0c\u4e0d\u63d0\u4f9b\u6570\u503c\u4f18\u52bf\u3002",
    "adventurePass": "\u5192\u9669\u6708\u5361",
    "adventurePassDesc": "\u6bcf\u65e5\u9886\u53d6150\u6c34\u6676\uff0c\u6301\u7eed30\u5929\u3002",
    "dailyClaim": "\u6bcf\u65e5\u9886\u53d6",
    "packsTitle": "\u793c\u5305",
    "packsDesc": "\u793c\u5305\u4e3a\u771f\u94b1\u8d2d\u4e70\u5185\u5bb9\uff0c\u6b63\u5f0f\u7248\u5c06\u5305\u542b\u65b0\u624b\u793c\u5305\u3001\u6210\u957f\u793c\u5305\u548c\u4e3b\u7ebf\u793c\u5305\u3002",
    "supportDesc": "\u611f\u8c22\u652f\u6301\u96f7\u6587\u54c8\u591a\u5f00\u53d1\u3002\u8d44\u52a9\u9879\u4e0d\u4f1a\u63d0\u4f9b\u6218\u6597\u6570\u503c\u4f18\u52bf\u3002",
    "bought": "\u5df2\u8d2d\u4e70"
  },
  "en": {
    "achievementCompletePrefix": "Achievement Complete: ",
    "claimedPrefix": "Claimed: ",
    "storyFallbackSpeaker": "Narrator",
    "storyFallbackText": "The mission begins.",
    "notEnoughEnergy": "Not enough energy",
    "ultimateNotReady": "Ultimate not ready",
    "initializingSystem": "Initializing System...",
    "checkingSave": "Checking Save Data...",
    "checkingProfile": "Checking Profile...",
    "cleaningBattle": "Cleaning Battle State...",
    "loadingLobby": "Loading Lobby...",
    "tutorialLoadingLobby": "Preparing Lobby...",
    "tutorialLoadingReady": "Ready",
    "welcomeBack": "Welcome back, ",
    "alreadyOwnedSuffix": " already owned",
    "recruitedSuffix": " recruited",
    "notEnoughCrystal": "Not enough Crystals",
    "journeyCategory": "Journey",
    "combatCategory": "Combat",
    "collectionCategory": "Collection",
    "performanceHint": "Turning off particles/damage text can improve performance.",
    "deleteWarning": "Warning: this deletes local save and reloads the game.",
    "eventLoginSub": "Log in each day to claim combat supplies",
    "eventLevelSub": "Reach levels to unlock rewards",
    "eventSupplySub": "Claim a one-time starter supply",
    "eventDefaultHint": "Click a reward card to claim",
    "rewardWord": "Reward",
    "tomorrowAgain": "Come back tomorrow",
    "teamLeader": "Leader / Starting Executor",
    "teamSwitchable": "Reserve Executor",
    "notOwned": "Not owned",
    "clickToJoin": "Add to Team",
    "levelUp": "Level Up",
    "upgradeWeapon": "Upgrade Weapon",
    "notCleared": "Not cleared",
    "chapterProgressPrefix": "Chapter 0 ",
    "entrySuffix": " Entry",
    "crystalColon": "Crystal: ",
    "stageFallback": "Wasteland",
    "eventPanelLoginTitle": "Journey Beyond",
    "eventPanelLevelTitle": "Rookie Goals",
    "eventPanelSupplyTitle": "Arrival Rewards",
    "dailyCheckAvailable": "Daily check-in available",
    "claimedTodayComeTomorrow": "Claimed today. Come back tomorrow.",
    "floraShopRank": "S Rank / Ice / Caster",
    "floraShopFeature": "AoE damage / Freeze for 1.5s",
    "everwinterName": "Song of Everwinter",
    "floraSignatureWeapon": "Flora Signature Weapon",
    "everwinterDesc": "Frozen enemies take more damage. Ice field becomes steadier.",
    "permanentWeaponDepot": "Permanent Weapon Depot",
    "permanentWeaponDesc": "Watcher / Wind Whisper / Rift Fang and more will open in future versions.",
    "skinDesc": "Future skins change appearance only, with no stat advantage.",
    "adventurePass": "Adventure Pass",
    "adventurePassDesc": "Claim 150 Crystal daily for 30 days.",
    "dailyClaim": "Claim Daily",
    "packsTitle": "Packs",
    "packsDesc": "Packs are real-money items. Full version will include starter, growth, and story packs.",
    "supportDesc": "Thanks for supporting Ravenhado. Support items will not provide combat advantages.",
    "bought": "Purchased"
  }
};

function mt(key){
  return L(MISC_TEXT, key, key);
}

Object.assign(MISC_TEXT.zh, {
  "achievementCompletePrefix": "\u6210\u5c31\u5b8c\u6210\uff1a",
  "claimedPrefix": "\u9886\u53d6\u6210\u529f\uff1a",
  "storyFallbackSpeaker": "\u65c1\u767d",
  "storyFallbackText": "\u4efb\u52a1\u5f00\u59cb\u3002",
  "notEnoughEnergy": "\u80fd\u91cf\u4e0d\u8db3",
  "ultimateNotReady": "\u5927\u62db\u672a\u6ee1",
  "initializingSystem": "\u521d\u59cb\u5316\u7cfb\u7edf...",
  "checkingSave": "\u68c0\u67e5\u5b58\u6863...",
  "checkingProfile": "\u68c0\u67e5\u73a9\u5bb6\u8d44\u6599...",
  "cleaningBattle": "\u6e05\u7406\u6218\u6597\u72b6\u6001...",
  "loadingLobby": "\u8f7d\u5165\u5927\u5385...",
  "welcomeBack": "\u6b22\u8fce\u56de\u6765\uff0c",
  "alreadyOwnedSuffix": " \u5df2\u62e5\u6709",
  "recruitedSuffix": " \u62db\u52df\u6210\u529f",
  "notEnoughCrystal": "\u6c34\u6676\u4e0d\u8db3",
  "journeyCategory": "\u65c5\u9014\u8bb0\u5f55",
  "combatCategory": "\u6218\u6597\u8bb0\u5f55",
  "collectionCategory": "\u6536\u96c6\u8bb0\u5f55",
  "performanceHint": "\u5173\u95ed\u7c92\u5b50/\u4f24\u5bb3\u6570\u5b57\u53ef\u63d0\u5347\u4f4e\u914d\u8bbe\u5907\u6d41\u7545\u5ea6\u3002",
  "deleteWarning": "\u6ce8\u610f\uff1a\u8fd9\u4f1a\u5220\u9664\u672c\u5730\u5b58\u6863\u5e76\u91cd\u65b0\u8f7d\u5165\u6e38\u620f\u3002",
  "eventLoginSub": "\u8fde\u7eed\u767b\u5f55\uff0c\u9886\u53d6\u4f5c\u6218\u8d44\u6e90",
  "eventLevelSub": "\u63d0\u5347\u7b49\u7ea7\uff0c\u89e3\u9501\u5956\u52b1",
  "eventSupplySub": "\u4e00\u6b21\u6027\u9886\u53d6\u5f00\u8352\u8865\u7ed9",
  "eventDefaultHint": "\u70b9\u51fb\u5956\u52b1\u5361\u7247\u9886\u53d6",
  "rewardWord": "\u5956\u52b1",
  "tomorrowAgain": "\u660e\u65e5\u518d\u6765",
  "teamLeader": "\u961f\u957f / \u521d\u59cb\u51fa\u6218",
  "teamSwitchable": "\u53ef\u5207\u6362\u5165\u573a",
  "notOwned": "\u672a\u62e5\u6709",
  "clickToJoin": "\u70b9\u51fb\u52a0\u5165",
  "levelUp": "\u5347\u7ea7",
  "upgradeWeapon": "\u5f3a\u5316\u6b66\u5668",
  "notCleared": "\u5c1a\u672a\u901a\u5173",
  "chapterProgressPrefix": "\u7b2c0\u7ae0 ",
  "entrySuffix": " \u5165\u573a",
  "crystalColon": "\u6c34\u6676\uff1a",
  "stageFallback": "\u5e9f\u57ce",
  "eventPanelLoginTitle": "\u6e38\u5386\u5929\u5916",
  "eventPanelLevelTitle": "\u65b0\u624b\u76ee\u6807",
  "eventPanelSupplyTitle": "\u8865\u7ed9\u884c\u52a8",
  "dailyCheckAvailable": "\u4eca\u65e5\u7b7e\u5230\u53ef\u9886\u53d6",
  "claimedTodayComeTomorrow": "\u4eca\u65e5\u5df2\u9886\u53d6\uff0c\u660e\u65e5\u518d\u6765",
  "floraShopRank": "S\u7ea7 / \u51b0 / \u6cd5\u672f",
  "floraShopFeature": "\u7fa4\u4f24 / \u51bb\u7ed3\u602a\u72691.5\u79d2",
  "everwinterName": "\u6c38\u51ac\u4e4b\u6b4c",
  "floraSignatureWeapon": "\u8299\u6d1b\u62c9\u4e13\u5c5e\u6b66\u5668",
  "everwinterDesc": "\u51bb\u7ed3\u654c\u4eba\u53d7\u5230\u4f24\u5bb3\u63d0\u9ad8\uff0c\u51b0\u57df\u66f4\u7a33\u5b9a\u3002",
  "permanentWeaponDepot": "\u5e38\u9a7b\u6b66\u5668\u5e93",
  "permanentWeaponDesc": "\u5b88\u671b\u8005 / \u98ce\u8bed / \u88c2\u75d5\u4e4b\u7259 \u7b49\u6b66\u5668\u5c06\u5728\u540e\u7eed\u7248\u672c\u5f00\u653e\u3002",
  "skinDesc": "\u672a\u6765\u76ae\u80a4\u53ea\u6539\u53d8\u5916\u89c2\uff0c\u4e0d\u63d0\u4f9b\u6570\u503c\u4f18\u52bf\u3002",
  "adventurePass": "\u5192\u9669\u6708\u5361",
  "adventurePassDesc": "\u6bcf\u65e5\u9886\u53d6150\u6c34\u6676\uff0c\u6301\u7eed30\u5929\u3002",
  "dailyClaim": "\u6bcf\u65e5\u9886\u53d6",
  "packsTitle": "\u793c\u5305",
  "packsDesc": "\u793c\u5305\u4e3a\u771f\u94b1\u8d2d\u4e70\u5185\u5bb9\uff0c\u6b63\u5f0f\u7248\u5c06\u5305\u542b\u65b0\u624b\u793c\u5305\u3001\u6210\u957f\u793c\u5305\u548c\u4e3b\u7ebf\u793c\u5305\u3002",
  "supportDesc": "\u611f\u8c22\u652f\u6301\u96f7\u6587\u54c8\u591a\u5f00\u53d1\u3002\u8d44\u52a9\u9879\u4e0d\u4f1a\u63d0\u4f9b\u6218\u6597\u6570\u503c\u4f18\u52bf\u3002",
  "bought": "\u5df2\u8d2d\u4e70",
  "operatorListHint": "选择执行官，进入养成页面",
  "monthlyRecommendedTab": "每月推荐",
  "monthlyRecommended": "本月推荐",
  "floraLimitedLine": "限定招募角色 · S级 / 冰 / 法术",
  "daily150Crystal": "每日领取150水晶",
  "starterGrowthPacks": "新手与成长礼包",
  "placeholderBannerHint": "测试版占位展示：正式CG后续统一替换。"
});
Object.assign(MISC_TEXT.en, {
  "achievementCompletePrefix": "Achievement Complete: ",
  "claimedPrefix": "Claimed: ",
  "storyFallbackSpeaker": "Narrator",
  "storyFallbackText": "The mission begins.",
  "notEnoughEnergy": "Not enough energy",
  "ultimateNotReady": "Ultimate not ready",
  "initializingSystem": "Initializing System...",
  "checkingSave": "Checking Save Data...",
  "checkingProfile": "Checking Profile...",
  "cleaningBattle": "Cleaning Battle State...",
  "loadingLobby": "Loading Lobby...",
  "welcomeBack": "Welcome back, ",
  "alreadyOwnedSuffix": " already owned",
  "recruitedSuffix": " recruited",
  "notEnoughCrystal": "Not enough Crystals",
  "journeyCategory": "Journey",
  "combatCategory": "Combat",
  "collectionCategory": "Collection",
  "performanceHint": "Turning off particles/damage text can improve performance.",
  "deleteWarning": "Warning: this deletes local save and reloads the game.",
  "eventLoginSub": "Log in each day to claim combat supplies",
  "eventLevelSub": "Reach levels to unlock rewards",
  "eventSupplySub": "Claim a one-time starter supply",
  "eventDefaultHint": "Click a reward card to claim",
  "rewardWord": "Reward",
  "tomorrowAgain": "Come back tomorrow",
  "teamLeader": "Leader / Starting Executor",
  "teamSwitchable": "Reserve Executor",
  "notOwned": "Not owned",
  "clickToJoin": "Add to Team",
  "levelUp": "Level Up",
  "upgradeWeapon": "Upgrade Weapon",
  "notCleared": "Not cleared",
  "chapterProgressPrefix": "Chapter 0 ",
  "entrySuffix": " Entry",
  "crystalColon": "Crystal: ",
  "stageFallback": "Wasteland",
  "eventPanelLoginTitle": "Journey Beyond",
  "eventPanelLevelTitle": "Rookie Goals",
  "eventPanelSupplyTitle": "Arrival Rewards",
  "dailyCheckAvailable": "Daily check-in available",
  "claimedTodayComeTomorrow": "Claimed today. Come back tomorrow.",
  "floraShopRank": "S Rank / Ice / Caster",
  "floraShopFeature": "AoE damage / Freeze for 1.5s",
  "everwinterName": "Song of Everwinter",
  "floraSignatureWeapon": "Flora Signature Weapon",
  "everwinterDesc": "Frozen enemies take more damage. Ice field becomes steadier.",
  "permanentWeaponDepot": "Permanent Weapon Depot",
  "permanentWeaponDesc": "Watcher / Wind Whisper / Rift Fang and more will open in future versions.",
  "skinDesc": "Future skins change appearance only, with no stat advantage.",
  "adventurePass": "Adventure Pass",
  "adventurePassDesc": "Claim 150 Crystal daily for 30 days.",
  "dailyClaim": "Claim Daily",
  "packsTitle": "Packs",
  "packsDesc": "Packs are real-money items. Full version will include starter, growth, and story packs.",
  "supportDesc": "Thanks for supporting Ravenhado. Support items will not provide combat advantages.",
  "bought": "Purchased",
  "operatorListHint": "Select an executor to open their growth page",
  "monthlyRecommendedTab": "Monthly",
  "monthlyRecommended": "Monthly Recommended",
  "floraLimitedLine": "Limited recruit · S Rank / Ice / Caster",
  "daily150Crystal": "Daily 150 Crystals",
  "starterGrowthPacks": "Starter and growth packs",
  "placeholderBannerHint": "Alpha placeholder display. Final CG can replace it later."
});


function ui(key){
  return L(UI_TEXT, key, key);
}

function localizeText(text){
  // Legacy-only fallback. New UI/story text must use separated resource packs.
  if(language !== "en") return text;
  if(typeof text !== "string") return text;
  if(/^[\x00-\x7F]*$/.test(text)) return text;

  const exact = {
    "凯恩":"Kane", "艾洛":"Ailo", "诺克斯":"Nox", "芙洛拉":"Flora",
    "主角":"Protagonist", "旁白":"Narrator", "系统":"System", "商贩":"Vendor",
    "成就完成：":"Achievement Complete: ",
    "任务失败":"Mission Failed",
    "委托完成":"Mission Complete",
    "前往右侧区域":"Move to the right area",
    "GUARD! 按R弹刀":"GUARD! Press R to Parry",
    "CHAIN SELECT  左键/右键选择连携":"CHAIN SELECT  Left/Right Click to choose chain",
    "BOSS PHASE 2  护盾展开":"BOSS PHASE 2  Shield Deployed",
    "BOSS PHASE 3  连续红光":"BOSS PHASE 3  Continuous Red Warning",
    "技能点":"Skill Point"
  };

    exact["金币"] = "Gold";
    exact["经验书"] = "EXP Books";
    exact["精炼合金"] = "Weapon Ore";
    exact["角色购买 / 商店"] = "Recruit operators in the Shop";
    exact["升级角色 / 强化武器"] = "Level executors / Upgrade weapons";
    exact["角色升级材料"] = "Executor EXP materials";
    exact["武器强化材料"] = "Weapon upgrade materials";
    exact["欢迎奖励"] = "Welcome Reward";
    exact["水晶300 / 金币1000 / 经验书5"] = "Crystal 300 / Gold 1000 / EXP Books 5";
    exact["成长计划"] = "Rookie Growth";
    exact["提升等级，领取奖励"] = "Reach levels and claim rewards";
  if(exact[text]) return exact[text];

  if(text.startsWith("成就完成：")) return "Achievement Complete: " + localizeText(text.slice(5));
  if(text.includes(" 连携入场")){
    return text.replace(" 连携入场"," Chain Entry")
      .replace("凯恩","Kane").replace("艾洛","Ailo").replace("诺克斯","Nox").replace("芙洛拉","Flora");
  }
  if(text.includes(" 入场")){
    return text.replace(" 入场"," Entry")
      .replace("凯恩","Kane").replace("艾洛","Ailo").replace("诺克斯","Nox").replace("芙洛拉","Flora");
  }
  return text;
}









function isProtagonist(i){
  return i === PROTAGONIST_ROLE;
}
function protagonistName(){
  return validPlayerName(playerName) ? playerName : (language==="en" ? "Traveler" : "旅者");
}

const PROTAGONIST_STORY_LEVEL_CAPS = [10,10,20,30,40,50,60];

function currentStoryChapterForGrowth(){
  if(typeof currentChapter === "number") return clamp(currentChapter,0,6);
  if(typeof progressChapter === "number") return clamp(progressChapter,0,6);
  return 1;
}
function protagonistStoryLevelCap(){
  const ch = currentStoryChapterForGrowth();
  return PROTAGONIST_STORY_LEVEL_CAPS[Math.min(ch,6)] || 10;
}
function protagonistNextSyncUnlockText(){
  const ch = currentStoryChapterForGrowth();
  if(ch >= 6) return language==="en" ? "Main sync completed" : "主线同步已完成";
  const nextCap = PROTAGONIST_STORY_LEVEL_CAPS[Math.min(ch+1,6)];
  return language==="en" ? ("Next sync: Chapter "+(ch+1)+" / Lv."+nextCap) : ("下一同步：第"+(ch+1)+"章 / Lv."+nextCap);
}
function protagonistSyncStatusText(){
  const cap = protagonistStoryLevelCap();
  if(cap >= 60 && protagonistStoryLevel >= cap) return language==="en" ? "Main sync completed" : "主线同步已完成";
  if(protagonistStoryLevel >= cap) return language==="en" ? "Reached current chapter cap" : "已达到当前章节等级上限";
  return language==="en" ? "Syncing with Main Story" : "随主线剧情同步中";
}
function protagonistSkillLevelFromLevel(lv){
  if(lv >= 50) return 10;
  if(lv >= 40) return 8;
  if(lv >= 30) return 6;
  if(lv >= 20) return 4;
  if(lv >= 10) return 2;
  return 1;
}

function syncProtagonistStoryLevelFromProgress(){
  let lv = 1;
  try{
    if(cleared && cleared[11]) lv = 10;
    else{
      for(let i=1;i<=10;i++){
        if(cleared && cleared[i]) lv = Math.max(lv, Math.min(9, i));
      }
    }
  }catch(e){}
  protagonistStoryLevel = Math.max(1, Math.min(60, Math.max(protagonistStoryLevel || 1, lv)));
  return protagonistStoryLevel;
}
function setProtagonistStoryLevel(lv){
  protagonistStoryLevel = Math.max(1, Math.min(60, Math.floor(lv || 1)));
  return protagonistStoryLevel;
}
function protagonistLevel(){
  syncProtagonistStoryLevelFromProgress();
  return Math.max(1, Math.min(60, Math.min(protagonistStoryLevel, protagonistStoryLevelCap())));
}
function protagonistSkillLevel(){
  return protagonistSkillLevelFromLevel(protagonistLevel());
}
function protagonistWeaponLevel(){
  return protagonistLevel();
}
function roleDisplayLevel(i){
  if(battleModeSource==="showcase") return 60;
  return isProtagonist(i) ? protagonistLevel() : (charData[i] ? charData[i].level : 1);
}
function roleSkillAutoValue(i, key){
  if(battleModeSource==="showcase") return 10;
  return isProtagonist(i) ? protagonistSkillLevel() : (charData[i] ? charData[i][key] : 1);
}
function roleWeaponLevelDisplay(i){
  if(battleModeSource==="showcase") return 60;
  return isProtagonist(i) ? protagonistWeaponLevel() : roleEquippedWeaponLevel(i);
}
function protagonistInfoLine(){
  return language==="en" ? "S Rank · Auto Growth · Single Target" : "S级 · 自动成长 · 单体输出";
}

function roleName(i){
  if(isProtagonist(i)) return protagonistName();
  const names = {
    zh:["凯恩","艾洛","诺克斯","芙洛拉","主角","丽莎"],
    en:["Kane","Ailo","Nox","Flora","Protagonist","Lisa"]
  };
  return (names[currentLang()] || names.zh)[i] || "";
}
function roleStyle(i){
  if(isProtagonist(i)) return language==="en" ? "S · High HP / Single Target" : "S级 · 高生命 / 单体";
  const styles = {
    zh:["物理剑卫","风系辅助","暗系击破","冰系法术","单体输出","风系辅助"],
    en:["Physical Sword Guard","Wind Support","Dark Breaker","Ice Caster","Single Target","Wind Support"]
  };
  return (styles[currentLang()] || styles.zh)[i] || "";
}

function roleLine(i){
  const lines = {
    zh:["烈阳，斩开黑夜。","风会记住这一击。","无名之刃，撕裂终局。","霜影落下，万物静止。","","听见了吗？风正在回应。"],
    en:["Solar flame, cut through the night.","The wind will remember this strike.","Nameless blades tear through the end.","Frost descends. All becomes still.","","Can you hear it? The wind is answering."]
  };
  return (lines[currentLang()] || lines.zh)[i] || "";
}

function weaponName(i){
  if(isProtagonist(i)) return language==="en" ? "Gray Core Blade" : "灰白核心刃";
  return weaponNameById(roleEquippedWeaponId(i));
}

function speakerName(name){
  const speakerPack = i18nPack("ROLE_TEXT");
  const speaker = speakerPack && speakerPack.speakers ? { [currentLang()]: speakerPack.speakers, zh: speakerPack.speakers } : {
    zh: {
      narrator:"旁白", system:"系统", protagonist:"主角", vendor:"商贩",
      kane:"凯恩", instructor:"训练官", traveler:"旅人", guard:"守卫",
      nox:"诺克斯", flora:"芙洛拉"
    },
    en: {
      narrator:"Narrator", system:"System", protagonist:"Protagonist", vendor:"Vendor",
      kane:"Kane", instructor:"Instructor", traveler:"Traveler", guard:"Guard",
      nox:"Nox", flora:"Flora"
    }
  };
  const zhToKey = {
    "旁白":"narrator","系统":"system","主角":"protagonist","商贩":"vendor",
    "凯恩":"kane","训练官":"instructor","旅人":"traveler","守卫":"guard",
    "诺克斯":"nox","芙洛拉":"flora",
    "Narrator":"narrator","System":"system","Protagonist":"protagonist","Vendor":"vendor",
    "Kane":"kane","Instructor":"instructor","Traveler":"traveler","Guard":"guard",
    "Nox":"nox","Flora":"flora"
  };
  const key = zhToKey[name] || name;
  const pack = speaker[currentLang()] || speaker.zh;
  return pack[key] || name;
}

function buildStageText(id){
  const source = selectedMainChapter===2
    ? (language==="en" ? window.PZ_CHAPTER2_STAGES_EN : window.PZ_CHAPTER2_STAGES_ZH)
    : selectedMainChapter===1
      ? (language==="en" ? window.PZ_CHAPTER1_STAGES_EN : window.PZ_CHAPTER1_STAGES_ZH)
      : (language==="en" ? window.PZ_CHAPTER0_STAGES_EN : window.PZ_CHAPTER0_STAGES_ZH);
  const item = source && source[id-1];
  if(item){
    return {
      name: language==="en" ? (item.name || item.zh || "") : (item.zh || item.name || ""),
      desc: language==="en" ? (item.desc || item.zhDesc || "") : (item.zhDesc || item.desc || "")
    };
  }
  const st = stages[id-1] || {};
  return {
    name: language==="en" ? (st.name || st.zh || "") : (st.zh || st.name || ""),
    desc: language==="en" ? (st.desc || st.zhDesc || "") : (st.zhDesc || st.desc || "")
  };
}

function rebuildStagesForLanguage(){
  for(let i=0;i<stages.length;i++){
    const data = buildStageText(i+1);
    stages[i].displayName = data.name;
    stages[i].displayDesc = data.desc;
  }
}

const PROTAGONIST_ROLE = 4;
const roles = [
  {name:"凯恩", element:"physical", color:"#ff5757", sub:"#ffbe5c", atk:[14,18,36], skill:65, speed:3.1, style:"物理剑卫", line:"烈阳，斩开黑夜。"},
  {name:"艾洛", element:"wind", color:"#74ffb7", sub:"#7cc7ff", atk:[8,11,22], skill:52, speed:3.4, style:"风系辅助", line:"风会记住这一击。"},
  {name:"诺克斯", element:"dark", color:"#b47cff", sub:"#ffffff", atk:[28,38,68], skill:92, speed:2.45, style:"暗系重炮", line:"无名之刃，撕裂终局。"},
  {name:"芙洛拉", element:"ice", color:"#88d8ff", sub:"#ffffff", atk:[16,20,42], skill:78, speed:3.0, style:"冰系法术", line:"霜影落下，万物静止。"},
  {name:"主角", element:"monochrome", color:"#dfe6ef", sub:"#313846", atk:[15,20,38], skill:72, speed:3.05, style:"单体输出", line:"灰白之间，斩开前路。"},
  {name:"丽莎", element:"wind", color:"#bda7ff", sub:"#78f0c3", atk:[9,12,20], skill:58, speed:3.15, style:"风系辅助", line:"听见了吗？风正在回应。"}
];
let owned = [true,true,true,false,true,false];
let charData = roles.map((r,i)=>({
  level:1,
  skillPoints:0,
  normal:1,
  skill:1,
  ultimate:1,
  weaponLevel:1,
  weapon:["烈阳之刃","风语法典","终夜双刃","霜月长枪","灰核之刃","拉文德"][i] || "训练武器"
}));
let shopMsg = msg("shopDefault");
let shopTab = "recommend";
let shopRecommendIndex = 0;
let shopPackCategory = 0;
let crystalExchangePurchases = {};
let monthlyOwned = false;
let monthlyClaimed = false;
let monthlyClaimDate = "";
let gold = 1200;
let expBooks = 8;
let weaponOre = 5;
let skillBooks = 6;
let skillMaterials = {normal:6,skill:4,ultimate:2};
let selectedOperator = 0;
let lobbyExecutor = 2; // 0 Kane / 1 Ailo / 2 Nox / 3 Flora
let operatorTab = "level";
let operatorListScrollX = 0;
let operatorListWheelDelta = 0;
let selectedSkillKey = "normal";
let weaponInventory = null;
let crystalModuleInventory = [];
let moduleWarehouseSlot = null;
let moduleWarehouseScroll = 0;
let moduleWarehouseWheelDelta = 0;
let moduleWarehouseSetFilter = "all";
let moduleWarehouseSortMode = "grade";
let selectedWeaponId = "";
let shopWeaponSelectedId = "sun_blade";
let tutorialCompleted = false;
const BREAK_LEVEL_CAPS=[20,30,40,50,60];
const BREAK_COSTS=[{mat:8,gold:2000},{mat:12,gold:4000},{mat:16,gold:7000},{mat:24,gold:12000}];
function roleBreakStage(i){ return Math.max(0,Math.min(4,Math.floor(Number(charData[i]&&charData[i].breakStage)||0))); }
function roleLevelCap(i){ return isProtagonist(i)?protagonistLevel():BREAK_LEVEL_CAPS[roleBreakStage(i)]; }
function canBreakthrough(i){ return !isProtagonist(i)&&roleDisplayLevel(i)>=roleLevelCap(i)&&roleBreakStage(i)<4; }

let playerName = "PLAYER";
let playerUID = "";
let nameInput = "";
let nameError = "";
let pzHiddenTextInput = null;
let teamRenamePreset = -1;
let teamRenameDraft = "";
let teamRenameReplaceOnType = false;

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toLowerCase() : "";
  return tag === "input" || tag === "textarea" || el.isContentEditable || !!el.closest?.("input, textarea, [contenteditable='true']");
}

function ensurePZHiddenTextInput() {
  if (pzHiddenTextInput) return pzHiddenTextInput;
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.maxLength = 16;
  input.setAttribute("aria-label", "Project Zero text input");
  input.style.position = "fixed";
  input.style.left = "-1000px";
  input.style.top = "0";
  input.style.width = "1px";
  input.style.height = "1px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.addEventListener("input", () => {
    if (gameMode === "nameInput") {
      const candidate=cleanPlayerName(input.value);
      if(!checkWritableText(candidate).ok){input.value=nameInput;nameError=textSafetyWarning();return;}
      nameInput = candidate;
      if (input.value !== nameInput) input.value = nameInput;
      nameError = "";
    } else if (gameMode === "team" && teamRenamePreset >= 0) {
      const candidate=String(input.value || "").replace(/[\r\n\t]/g, "").slice(0, 16);
      if(!checkWritableText(candidate).ok){input.value=teamRenameDraft;textSafetyWarning();return;}
      teamRenameDraft = candidate;
      if (input.value !== teamRenameDraft) input.value = teamRenameDraft;
    }
  });
  input.addEventListener("keydown", (e) => {
    if (gameMode === "nameInput") {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmNameInput();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        input.blur();
      }
    } else if (gameMode === "team" && teamRenamePreset >= 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitTeamPresetRename();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelTeamPresetRename();
      }
    }
  });
  document.body.appendChild(input);
  pzHiddenTextInput = input;
  return input;
}

function syncNameInputFocus() {
  const input = ensurePZHiddenTextInput();
  const editingTeamName = gameMode === "team" && teamRenamePreset >= 0;
  if (gameMode === "nameInput" || editingTeamName) {
    const expected = editingTeamName ? teamRenameDraft : nameInput;
    input.maxLength = editingTeamName ? 16 : 12;
    if (input.value !== expected) input.value = expected;
    if(editingTeamName){
      const rect=canvas.getBoundingClientRect();
      input.style.left=(rect.left+(W/2-240)/W*rect.width)+"px";
      input.style.top=(rect.top+(H/2-30)/H*rect.height)+"px";
      input.style.width=(480/W*rect.width)+"px";
      input.style.height=(52/H*rect.height)+"px";
      input.style.opacity="1";
      input.style.pointerEvents="auto";
      input.style.zIndex="120";
      input.style.boxSizing="border-box";
      input.style.padding="0 18px";
      input.style.border="1px solid rgba(255,224,102,.75)";
      input.style.outline="none";
      input.style.background="rgba(19,25,45,.98)";
      input.style.color="#fff";
      input.style.font="bold "+Math.max(14,20*rect.height/H)+"px Arial, sans-serif";
    }
    if (document.activeElement !== input) {
      try { input.focus({ preventScroll: true }); } catch { input.focus(); }
    }
  } else if (document.activeElement === input) {
    input.blur();
  }
  if(!editingTeamName){
    input.style.left="-1000px";input.style.top="0";input.style.width="1px";input.style.height="1px";
    input.style.opacity="0";input.style.pointerEvents="none";input.style.zIndex="-1";
  }
}

function requestReturnToLauncherFromGame() {
  try {
    if (window.ProjectZeroLauncher && typeof window.ProjectZeroLauncher.requestGameExit === "function") {
      window.ProjectZeroLauncher.requestGameExit();
      return true;
    }
  } catch (err) {
    console.warn("[ProjectZero] request launcher return failed", err);
  }
  return false;
}

let hasCreatedProfile = false;
let playerLevel = 1;
let playerExp = 0;
let playerExpNeed = 1600;
let protagonistStoryLevel = 1; // protagonist growth is driven only by main story progress, not player level
let growthGuidePage = 0;
let growthGuidePageClaimed = Array(10).fill(false);
let growthGuideTaskClaimed = Array.from({length:10},()=>Array(5).fill(false));
let growthGuideTab = "growth"; // growth / daily
let battleManualDailyClaimed = {key:"", tasks:{}, page:false};

// V49.15 Action Record - independent pass level, not player level.
let actionRecordLevel = 1;
let actionRecordExp = 0;
let actionRecordExpNeed = 500;
let actionRecordPage = 0;
let actionRecordAdvanced = false;
let actionRecordUltimate = false;
let actionRecordClaimed = {free:{}, advanced:{}, ultimate:{}};
let actionRecordWeaponChoice = null;
let actionRecordWeaponSelecting = null; // "standard" / "full"
let actionRecordSelectedWeapon = 0;
let actionRecordMsg = "";
let actionRecordMsgTimer = 0;
// V49.17.5: Tasks live inside Action Record / Pass, not Battle Manual.
let actionRecordTab = "rewards"; // rewards / tasks
let actionRecordTaskTab = "daily"; // daily / weekly / monthly
let actionRecordTaskScroll = 0;
let actionRecordWheelDelta = 0;
let actionRecordTaskClaimed = {dailyKey:"", weeklyKey:"", monthlyKey:"", daily:{}, weekly:{}, monthly:{}};
let mailClaimed = false;
let mailDeleted = false;
let eventClaimed = false;
let mailMsg = msg("mailDefault");
let eventMsg = msg("eventDefault");
let eventTab = "login";
let lastLoginClaimDate = "";
let loginClaimIndex = 0;
let monthlyLoginCheckin = {month:"", dates:[], totalDates:[], milestones:{}};
let versionLoginCheckin = {build:"2026072205", claimedDays:[], lastClaimDate:""};
let monthlyCheckinMsg = "";
let warehouseMsg = msg("warehouseDefault");
let warehouseTab = "all";
let warehouseSortMode = "category";
let warehouseSelectedKey = "material:crystal";
let warehouseScroll = 0;
let warehouseWheelDelta = 0;
let loginDay = 1;
let loginRewards = [
  {name:"Day 1", crystals:300, gold:1000, expBooks:3, ore:0, claimed:false},
  {name:"Day 2", crystals:0, gold:2000, expBooks:5, ore:0, claimed:false},
  {name:"Day 3", crystals:300, gold:0, expBooks:5, ore:3, roleId:5, claimed:false},
  {name:"Day 4", crystals:0, gold:3000, expBooks:8, ore:3, claimed:false},
  {name:"Day 5", crystals:500, gold:0, expBooks:8, ore:5, claimed:false},
  {name:"Day 6", crystals:0, gold:5000, expBooks:12, ore:5, weaponId:"lavender", claimed:false},
  {name:"Day 7", crystals:1000, gold:8000, expBooks:20, ore:10, claimed:false}
];
let levelRewards = [
  {lv:2, crystals:300, gold:1000, expBooks:3, ore:0, claimed:false},
  {lv:5, crystals:500, gold:2000, expBooks:8, ore:2, claimed:false},
  {lv:10, crystals:1000, gold:5000, expBooks:12, ore:5, claimed:false},
  {lv:15, crystals:1200, gold:8000, expBooks:16, ore:8, claimed:false},
  {lv:20, crystals:1500, gold:10000, expBooks:20, ore:12, claimed:false}
];
let team = [PROTAGONIST_ROLE,1,2];
let teamPresets = [[PROTAGONIST_ROLE,1,2],[PROTAGONIST_ROLE],[0,2],[1,2]];
let teamPresetNames = ["","","",""];
let teamSelectSlot = 0;
let packMsg = msg("packDefault");
let ownedWeapons = {flora:false};
let shopSubTab = "limited";
let boughtPacks = {starter:false, growth:false, weapon:false};
const STAGE_BACKGROUNDS = I18N_RES.STAGE_BACKGROUNDS || {
  zh:["事务处前街","石桥商业街","旧钟楼侧巷","蓝轨广场","下城区入口","旧城区边缘","废弃仓库","异常信号点","夜色长街","事务处外墙","雷文哈多守卫点"],
  en:["Affairs Office Street","Stonebridge Market","Clocktower Side Alley","Blue Rail Plaza","Lower District Gate","Old Town Edge","Abandoned Warehouse","Abnormal Signal Point","Night Avenue","Affairs Office Wall","Ravenhado Guard Point"]
};
const stageBackgrounds = STAGE_BACKGROUNDS.zh;

const chapter0Stages = [
  ["西区异常","West District Anomaly",75,false,"凯恩与隐者来到西边并解决晶体怪，但数量正在不断增加。","Kane and Hermit reach the west side and clear crystal beasts, but their numbers keep rising."],
  ["撤离命令","Evacuation Order",75,false,"晶体怪越来越多，通讯中传来撤离指令。","More crystal beasts appear, and an evacuation order comes through the communicator."],
  ["意识坠落","Consciousness Collapse",75,false,"撤离即将完成时，声音与时间突然停止，两人的意识被拖入未知空间。","As the evacuation nears completion, sound and time stop and both minds are pulled somewhere unknown.",true],
  ["末日景象","Endscape",75,false,"隐者在陌生废墟中醒来，通过调查环境痕迹寻找失踪的凯恩。","Hermit wakes in unfamiliar ruins and searches environmental traces for the missing Kane."],
  ["晶体人","Crystal Man",75,false,"隐者面前出现晶体人，必须应战。","A crystalized human figure appears before Hermit, forcing a fight."],
  ["不同的世界","Different Worlds",100,false,"隐者与凯恩再次相遇，却发现彼此正站在两种截然不同的现实中。","Hermit finds Kane again, only to realize they are standing in two different realities.",true],
  ["白日梦","The Daydream",100,false,"凯恩只解释了一句话：这里是白日梦。随后怪物出现。","Kane explains only one thing: this place is the Daydream. Then the monsters arrive."],
  ["侵蚀","Erosion",100,false,"连续深入后隐者开始疲惫，凯恩甚至出现幻觉，晶体兽越来越多。","As they go deeper, Hermit grows exhausted, Kane begins to hallucinate, and more crystal beasts appear."],
  ["白日梦中层","Middle Layer",100,false,"两人进入白日梦中层，必须调查巨型结晶的脉冲规律并阻止怪物继续出现。","They reach the middle layer and must study the giant crystals' pulse pattern to stop more monsters appearing."],
  ["结晶巨人","Crystal Colossus",120,true,"巨大的发光晶体人出现，隐者与凯恩直接应战。","A giant glowing crystal humanoid appears, and Hermit and Kane engage it immediately."],
  ["新的调令","New Assignment",300,false,"击败晶体人后，两人回到现实。隐者被分配进凯恩所在的小队。","After defeating the crystal humanoid, they return to reality. Hermit is assigned to Kane's squad."]
].map((s,i)=>({id:i+1,zh:s[0],name:s[1],reward:s[2],boss:s[3],zhDesc:s[4],desc:s[5],storyOnly:!!s[6]}));
const chapter1Stages = [
  ["临时编队","Temporary Squad",75,false,"隐者被临时编入诺克斯带领的小队，并接到调查 Project 4 的任务。","Hermit joins Nox's squad temporarily and receives the Project 4 investigation assignment.",true,"雷文哈多事务处"],
  ["北区封锁线","Northern Blockade",75,false,"小队抵达北区边缘，清理通往 Project 4 的道路。","The squad reaches the northern perimeter and clears the road toward Project 4.",false,"北区封锁线"],
  ["废弃六年","Abandoned for Six Years",75,false,"进入 Project 4 外环，清理威胁并调查三处异常晶体读数。","Enter Project 4, clear immediate threats, and inspect three abnormal crystal readings.",false,"Project 4 外环"],
  ["废墟中的求救","A Cry in the Ruins",75,false,"追踪商业区的求救声，突破包围并确认女孩小赖的状况。","Trace a distress call through the market, break the encirclement, and reach Xiaolai.",false,"Project 4 商业区"],
  ["巨影掠空","Shadow Overhead",75,false,"巨龙掠过天空，更多晶体怪出现，小队被迫改变调查计划。","A dragon crosses the sky as more crystal beasts appear, forcing the squad to change plans.",true,"Project 4 中央街"],
  ["高楼撤离","Rooftop Withdrawal",100,false,"护送小赖穿过三段撤离路线；清除威胁后确认安全标记才能继续。","Escort Xiaolai across three withdrawal routes, securing each route before moving on.",false,"Project 4 高楼区"],
  ["裂隙之下","Beneath the Rift",100,false,"小赖坠入神秘裂隙，小队进入其中寻找她的下落。","Lai falls into a mysterious rift, and the squad enters it to find her.",true,"神秘裂隙"],
  ["六年的幸存者","Six Years of Survivors",100,false,"在不发生战斗的情况下走访聚居地，调查居民、物资与裂隙出口。","Survey the settlement without combat: speak with residents, inspect supplies, and examine the rift exit.",false,"裂隙聚居地"],
  ["晶体人来袭","Crystalized Raiders",100,false,"晶体人部队袭击聚居地，小队必须守住幸存者仅剩的物资。","A crystalized raiding force attacks the settlement, and the squad must defend its remaining supplies.",false,"裂隙防线"],
  ["救援的起点","The Rescue Begins",100,false,"危机暂时解除，小队决定返回雷文哈多寻求政府支援。","With the immediate danger contained, the squad returns to Ravenhado to request government support.",true,"裂隙聚居地"]
].map((s,i)=>({id:i+1,zh:s[0],name:s[1],reward:s[2],boss:s[3],zhDesc:s[4],desc:s[5],storyOnly:s[6],bg:s[7]}));
const chapter2Stages = [
  ["被拒绝的救援","A Rescue Denied",75,false,"小队的救援申请遭到拒绝。","The squad's rescue request is denied.",true,"雷文哈多政府事务厅"],
  ["沉默与抉择","Silence and Choice",75,false,"五人在命令与生命之间作出选择。","The five make their choice between orders and lives.",true,"雷文哈多事务处外廊"],
  ["越过警戒线","Across the Security Line",75,false,"无战斗潜入 Project 4。","Infiltrate Project 4 without combat.",false,"北区夜间警戒线"],
  ["正在愈合的裂隙","The Closing Rift",75,false,"稳定持续收缩的裂隙锚点。","Stabilize the shrinking rift anchors.",false,"Project 4 裂隙入口"],
  ["留下或离开","Stay or Leave",75,false,"记录幸存者自己的撤离选择。","Record the survivors' own evacuation choices.",false,"裂隙聚居地"],
  ["最后的撤离窗口","The Final Window",100,false,"护送幸存者进入裂隙外层。","Escort survivors into the outer rift.",false,"裂隙撤离通道"],
  ["少了一个人","One Person Missing",100,false,"调查小赖失踪前留下的痕迹。","Investigate the traces left before Lai disappeared.",false,"裂隙外层"],
  ["狐灵的指引","The Fox Spirit's Guidance",100,false,"守住狐灵寻找出口所需的共鸣点。","Defend the resonance points needed to find the exit.",false,"重叠空间"],
  ["流泪的巨龙","The Weeping Dragon",100,false,"主角再次进入白日梦。","Hermit enters the Daydream once more.",true,"未知白日梦"],
  ["冲向出口","Run for the Exit",100,false,"抵挡追击并完成最终撤离。","Repel the pursuit and complete the final evacuation.",false,"裂隙最终出口"],
  ["出口之外","Beyond the Exit",100,false,"幸存者离开裂隙后被政府人员接管。","The survivors leave the rift and meet a containment team.",true,"Project 4 封锁区"]
].map((s,i)=>({id:i+1,zh:s[0],name:s[1],reward:s[2],boss:s[3],zhDesc:s[4],desc:s[5],storyOnly:s[6],bg:s[7]}));
let stages = chapter0Stages;
const chapter0MissionTypes = ["annihilation","evacuation","story","search","duel","story","stabilize","endurance","crystalInvestigation","chapterBoss","story"];
const chapter1MissionTypes = ["story","breakthrough","investigation","rescue","story","escort","story","survey","defense","story"];
const chapter2MissionTypes = ["story","story","search","investigation","survey","escort","search","defense","story","evacuation","story"];
let missionTypes = chapter0MissionTypes;


function resourceName(key){
  const map = {
    crystal:["水晶","Crystal"],
    gold:["金币","Gold"],
    expBooks:["经验书","EXP Books"],
    weaponOre:["精炼合金","Weapon Ore"]
  };
  const v = map[key] || [key,key];
  return currentLang()==="en" ? v[1] : v[0];
}
function rewardCrystalText(v){ return tx("rewardCrystalPrefix") + v; }
function statusText(done){ return done ? tx("ownedStatus") : tx("notCompletedStatus"); }
function claimStatusText(claimed, reached=true){
  if(claimed) return tx("claimedStatus");
  return reached ? tx("availableStatus") : tx("notReachedStatus");
}
function mainStagePrefix(){ return selectedMainChapter===2 ? "02-" : selectedMainChapter===1 ? "01-" : tx("stageCodePrefix"); }
function stageCode(id){ return mainStagePrefix() + String(id).padStart(2,"0"); }
function mainStageClearKey(id){ return selectedMainChapter===2 ? "ch2_"+id : selectedMainChapter===1 ? "ch1_"+id : id; }
function isMainStageCleared(id){ return !!cleared[mainStageClearKey(id)]; }
function mainChapterTitle(){
  if(selectedMainChapter===2) return language==="en" ? "Chapter 2: Choice" : "第二章：抉择";
  if(selectedMainChapter===1) return language==="en" ? "Chapter 1: Forgotten Project 4" : "第一章：遗忘的 Project 4";
  return tx("chapterTitle");
}
function loadMainChapter(chapterId){
  selectedMainChapter=chapterId===2?2:chapterId===1?1:0;
  stages=selectedMainChapter===2?chapter2Stages:selectedMainChapter===1?chapter1Stages:chapter0Stages;
  missionTypes=selectedMainChapter===2?chapter2MissionTypes:selectedMainChapter===1?chapter1MissionTypes:chapter0MissionTypes;
  selectedStage=1;
  operationDetailVisible=false;
  rebuildStoryScripts();
}
function resourceRewardText(type, value){
  if(type==="crystal") return resourceName("crystal") + "+" + value;
  if(type==="gold") return resourceName("gold") + "+" + value;
  if(type==="expBooks") return resourceName("expBooks") + "+" + value;
  if(type==="weaponOre") return resourceName("weaponOre") + "+" + value;
  return String(value);
}
function stageBackgroundName(i){
  const stage=stages[(i||selectedStage)-1];
  if(selectedMainChapter>0 && stage && stage.bg) return stage.bg;
  const arr = STAGE_BACKGROUNDS[currentLang()] || STAGE_BACKGROUNDS.zh;
  return arr[(i||selectedStage)-1] || arr[0] || "";
}

function missionLabel(){
  const t = missionTypes[selectedStage-1] || "annihilation";
  const map = {
    survival:["生存","Survival"],
    shield:["破盾","Shield Break"],
    ranged:["远程压制","Ranged Suppression"],
    mixed:["混合战","Mixed Battle"],
    chapterBoss:["Boss战","Boss Battle"],
    bossPrep:["Boss前哨","Boss Prep"],
    elite:["精英战","Elite Battle"],
    story:["纯剧情","Story"],
    breakthrough:["路线突破","Breakthrough"],
    investigation:["异常调查","Investigation"],
    rescue:["定点救援","Rescue"],
    escort:["护送撤离","Escort"],
    survey:["聚居地调查","Settlement Survey"],
    defense:["物资防卫","Supply Defense"],
    evacuation:["紧急撤离","Emergency Evacuation"],
    search:["痕迹调查","Trace Search"],
    duel:["单体迎击","Duel"],
    stabilize:["空间稳定","Rift Stabilization"],
    endurance:["侵蚀坚持","Erosion Endurance"],
    crystalInvestigation:["结晶调查","Crystal Investigation"],
    annihilation:["歼灭","Annihilation"]
  };
  const v = map[t] || map.annihilation;
  return language==="en" ? v[1] : v[0];
}

let cleared = {};

const storyScripts = {};


const PROLOGUE_LINES = I18N_RES.PROLOGUE_LINES || {
  zh: [
    ["旁白","雷文哈多。古典石墙与蓝色轨道交错的城市，钟楼投下的影子横跨整条街道。"],
    ["{playerName}","这就是雷文哈多……比想象中的大。"],
    ["{playerName}","不知道这里有没有真正的强者。"],
    ["商贩","喂，小哥！你已经站在这里快十分钟了。"],
    ["{playerName}","有吗？"],
    ["商贩","有。第一次来雷文哈多？"],
    ["{playerName}","嗯。"],
    ["商贩","正常人可不会站在城门口研究钟楼。你来这里做什么？"],
    ["{playerName}","变强。"],
    ["商贩","……哈哈哈哈！你这家伙真有意思。"],
    ["商贩","既然想变强，至少先别像木头一样站着。试着动一动吧。"]
  ],
  en: [
    ["Narrator","Ravenhado. A city where classical stone walls cross paths with blue rail lines, and the clock tower casts its shadow across the street."],
    ["{playerName}","So this is Ravenhado... Bigger than I expected."],
    ["{playerName}","I wonder if there are any truly strong people here."],
    ["Vendor","Hey, kid! You've been standing there for almost ten minutes."],
    ["{playerName}","Have I?"],
    ["Vendor","You have. First time in Ravenhado?"],
    ["{playerName}","Yeah."],
    ["Vendor","Normal people don't study the clock tower at the city gate. What are you here for?"],
    ["{playerName}","To become stronger."],
    ["Vendor","...Hahahaha! You're interesting."],
    ["Vendor","If you want to get stronger, start by not standing like a statue. Try moving around."]
  ]
};

const PROLOGUE_AFTER_BATTLE = I18N_RES.PROLOGUE_AFTER_BATTLE || {
  zh: [
    ["商贩","赢了？！你居然真的赢了？！"],
    ["{playerName}","比想象中弱。"],
    ["旁白","街道另一端传来急促的脚步声。一个穿着黑色制服的青年停在怪物旁边。"],
    ["凯恩","怪物呢？"],
    ["商贩","已经被解决了。凯恩，你来得也太慢了！"],
    ["凯恩","政府战斗部门接到报告后已经立刻出动了。"],
    ["凯恩","你做的？"],
    ["{playerName}","应该没有第二个人。"],
    ["凯恩","有意思。"],
    ["旁白","凯恩蹲下检查怪物残骸，神色很快变得严肃。"],
    ["凯恩","这种怪物不应该出现在这里。最近已经是第三次了。"],
    ["{playerName}","所以雷文哈多并不像看起来那么安全。"],
    ["凯恩","你很冷静。"],
    ["{playerName}","慌张也不会让它变弱。"],
    ["凯恩","有没有兴趣接个委托？"],
    ["{playerName}","能变强吗？"],
    ["凯恩","能。"],
    ["{playerName}","好。"],
    ["凯恩","……答应得真快。"],
    ["系统","凯恩加入队伍。"],
    ["{playerName}","先准备一下再去事务处吧。"]
  ],
  en: [
    ["Vendor","You won?! You actually won?!"],
    ["{playerName}","Weaker than I expected."],
    ["Narrator","Quick footsteps approach from the other end of the street. A young man in a black uniform stops beside the monster."],
    ["Kane","Where's the monster?"],
    ["Vendor","Already handled. Kane, you're late!"],
    ["Kane","The Government Combat Department moved as soon as the report arrived."],
    ["Kane","You did this?"],
    ["{playerName}","I don't see a second person here."],
    ["Kane","Interesting."],
    ["Narrator","Kane crouches beside the remains. His expression quickly turns serious."],
    ["Kane","This kind of monster shouldn't appear here. This is the third time recently."],
    ["{playerName}","So Ravenhado isn't as safe as it looks."],
    ["Kane","You're calm."],
    ["{playerName}","Panicking wouldn't make it weaker."],
    ["Kane","Interested in a commission?"],
    ["{playerName}","Will it make me stronger?"],
    ["Kane","It will."],
    ["{playerName}","Then yes."],
    ["Kane","...You answered fast."],
    ["System","Kane joined the team."],
    ["{playerName}","Prepare first, then head to the Affairs Office."]
  ]
};

function getPrologueLines(){
  return language==="en" ? PROLOGUE_LINES.en : PROLOGUE_LINES.zh;
}
function getPrologueAfterLines(){
  return language==="en" ? PROLOGUE_AFTER_BATTLE.en : PROLOGUE_AFTER_BATTLE.zh;
}

function startPrologue(){
  clearTransientBattleState();
  prologueLine = 0;
  prologueAfterBattle = false;
  gameMode = "prologue";
}

function finishPrologue(){
  prologueDone = true;
  tutorialCompleted = true;
  tutorialInProgress = false;
  tutorialResumeMode = "";
  lobbyGuideDone = false;
  ensureStarterRoster();
  team = normalizeBattleTeam(team,[PROTAGONIST_ROLE,1,2]);
  player.role = PROTAGONIST_ROLE;
  notice = msg("lobbyGuide");
  showCenter(msg("prologueComplete"),80);
  saveGame();
  startTutorialLobbyLoading();
}

function rebuildStoryScripts(){
  rebuildStagesForLanguage();
  for(const k of Object.keys(storyScripts)) delete storyScripts[k];

  const source = selectedMainChapter===2
    ? (language==="en" ? window.PZ_CHAPTER2_STORY_EN : window.PZ_CHAPTER2_STORY_ZH)
    : selectedMainChapter===1
      ? (language==="en" ? window.PZ_CHAPTER1_STORY_EN : window.PZ_CHAPTER1_STORY_ZH)
      : (language==="en" ? window.PZ_CHAPTER0_STORY_EN : window.PZ_CHAPTER0_STORY_ZH);
  if(source){
    for(const key of Object.keys(source)){
      storyScripts[key] = source[key].map(line => Array.isArray(line) ? [line[0], line[1]] : line);
    }
    return;
  }

  for(const s of stages){
    const data = buildStageText(s.id);
    storyScripts[s.id] = [
      [language==="en"?"Narrator":"旁白", language==="en" ? ("Objective: proceed through " + data.name + ".") : ("目标：穿过「"+data.name+"」。")],
      [language==="en"?"System":"系统", language==="en" ? "Mission Objective: complete the area." : "任务目标：完成区域。"]
    ];
  }
}

rebuildStoryScripts();
refreshLanguageRuntimeText();

let storyIndex = 0, currentStory = [];
let settlement = {stage:1, reward:0, stars:3};

const player = {x:W/2,y:H/2+115,vx:0,vy:0,r:20,hp:100,energy:80,ult:1600,role:0,facing:1,attackCd:0,skillCd:0,ultCd:0,dashCd:0,inv:0,chain:0,chainTimer:0,guardTimer:0,parryReady:0,parryTarget:null,perfectBuff:0,switchCd:0};
let enemies = [], particles = [], slashes = [], texts = [], projectiles = [], frostFields = [];
let ult = {active:false,timer:0,role:0,hitDone:false};
let protagonistBindings = [];
let protagonistSweeps = [];
let protagonistDomain = {active:false,life:0,max:180,tick:0,sweepIndex:0};
let teamDamageAmpTimer = 0;
let lisaTeamDamageAmpTimer = 0;
let lisaSelfDamageAmpTimer = 0;
let kaneSigils = [];
let noxDamageAmpTimer = 0;
let windFields = [];
let ailoUltimateBurst = {active:false,life:0,max:0};


function trimRuntimeCollections(){
  if(particles.length > MAX_PARTICLES_FINAL) particles.splice(0, particles.length - MAX_PARTICLES_FINAL);
  if(slashes.length > MAX_SLASHES_FINAL) slashes.splice(0, slashes.length - MAX_SLASHES_FINAL);
  if(texts.length > MAX_TEXTS_FINAL) texts.splice(0, texts.length - MAX_TEXTS_FINAL);
  if(projectiles.length > MAX_PROJECTILES_FINAL) projectiles.splice(0, projectiles.length - MAX_PROJECTILES_FINAL);
  if(frostFields.length > 8) frostFields.splice(0, frostFields.length - 8);
  if(windFields.length > 6) windFields.splice(0, windFields.length - 6);
  if(enemies.length > MAX_ENEMIES_FINAL) enemies.splice(0, enemies.length - MAX_ENEMIES_FINAL);
}

function safeNumber(v, fallback=0){
  return Number.isFinite(v) ? v : fallback;
}

function stabilizePlayerStats(){
  crystals = Math.max(0, Math.floor(safeNumber(crystals,0)));
  gold = Math.max(0, Math.floor(safeNumber(gold,0)));
  expBooks = Math.max(0, Math.floor(safeNumber(expBooks,0)));
  weaponOre = Math.max(0, Math.floor(safeNumber(weaponOre,0)));
  skillBooks = Math.max(0, Math.floor(safeNumber(skillBooks,0)));
  if(!skillMaterials || typeof skillMaterials!=="object") skillMaterials={normal:0,skill:0,ultimate:0};
  skillMaterials.normal=Math.max(0,Math.floor(safeNumber(skillMaterials.normal,0)));
  skillMaterials.skill=Math.max(0,Math.floor(safeNumber(skillMaterials.skill,0)));
  skillMaterials.ultimate=Math.max(0,Math.floor(safeNumber(skillMaterials.ultimate,0)));
  playerLevel = Math.max(1, Math.floor(safeNumber(playerLevel,1)));
  playerExp = Math.max(0, Math.floor(safeNumber(playerExp,0)));
  playerExpNeed = Math.max(100, Math.floor(safeNumber(playerExpNeed,1600)));
  const currentMaxHp = (typeof playerMaxHp === "function") ? playerMaxHp() : 100;
  player.hp = clamp(safeNumber(player.hp,currentMaxHp), 0, currentMaxHp);
  player.energy = clamp(safeNumber(player.energy,80), 0, 100);
  player.ult = clamp(safeNumber(player.ult,0), 0, ULT_MAX);
  if(typeof gameMode !== "undefined" && gameMode === "battle") saveCurrentRoleResources();
}


function gainUlt(amount, reason=""){
  if(ult && ult.active) return;
  const before = player.ult || 0;
  player.ult = clamp(before + amount, 0, ULT_MAX);
  if(typeof gameMode !== "undefined" && gameMode === "battle") saveCurrentRoleResources();
  return player.ult - before;
}

function resetUltForBattle(){
  player.ult = ULT_START_AMOUNT;
}

function showCenter(t,n=50){ centerText=localizeText ? localizeText(t) : t; centerTimer=n; }
function doShake(v){ shake=Math.max(shake,v); }
function doHitStop(v){ hitStop=Math.max(hitStop,v); }

function addParticles(x,y,color,count=10,power=4){
  if(!particlesEnabled) return;
  count = Math.min(count,8);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2, s=Math.random()*power+.4;
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:22+Math.random()*12,max:34,size:2+Math.random()*4,color});
  }
  trimRuntimeCollections();
}

// V40.8 Parry Spark Patch
// Sharp line sparks, not soft magic dots. Used only for weapon parry feedback.
function spawnParrySpark(x,y,count=24,boss=false){
  if(!particlesEnabled) return;
  const palette = ["#ffffff", "#fff4b8", "#ffe082", "#ffb300", "#ff6f00"];
  const n = Math.min(boss ? count * 2 : count, boss ? 42 : 28);
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const spd = (boss ? 6.5 : 4.8) + Math.random()*(boss ? 10.5 : 8.0);
    const len = (boss ? 12 : 8) + Math.random()*(boss ? 22 : 16);
    particles.push({
      x:x+(Math.random()-0.5)*18,
      y:y+(Math.random()-0.5)*18,
      vx:Math.cos(a)*spd,
      vy:Math.sin(a)*spd - Math.random()*1.2,
      life:(boss?20:16)+Math.random()*10,
      max:boss?30:24,
      size:1.5+Math.random()*2.2,
      color:palette[Math.floor(Math.random()*palette.length)],
      spark:true,
      angle:a,
      len:len
    });
  }
  trimRuntimeCollections();
}

// V40.9 Combat Polish: blade trails + metal impact sparks.
function addBladeTrail(x1,y1,x2,y2,color="#ffffff",life=16,width=12,type="bladeTrail"){
  slashes.push({x:(x1+x2)/2,y:(y1+y2)/2,x1,y1,x2,y2,color,life,max:life,width,type,rot:0});
  trimRuntimeCollections();
}

function spawnMetalImpact(x,y,count=12,power=6,boss=false){
  if(!particlesEnabled) return;
  const palette=["#ffffff","#fff4b8","#ffe082","#ffc247","#ff8a00"];
  const n=Math.min(boss?count*2:count,boss?34:20);
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2;
    const spd=(power*.55)+Math.random()*power;
    particles.push({
      x:x+(Math.random()-0.5)*10,
      y:y+(Math.random()-0.5)*10,
      vx:Math.cos(a)*spd,
      vy:Math.sin(a)*spd-Math.random()*0.8,
      life:(boss?18:13)+Math.random()*8,
      max:boss?26:20,
      size:1.1+Math.random()*1.8,
      color:palette[Math.floor(Math.random()*palette.length)],
      spark:true,
      angle:a,
      len:(boss?12:8)+Math.random()*(boss?18:12)
    });
  }
  trimRuntimeCollections();
}

function combatPolishSlash(cx,cy,facing,step,color){
  const heavy=step===3;
  const len=heavy?142:(step===2?104:86);
  const rise=heavy?46:(step===2?34:26);
  addBladeTrail(cx-facing*len*.42,cy-rise,cx+facing*len*.58,cy+rise*.35,color,heavy?20:15,heavy?18:11,heavy?"heavyTrail":"bladeTrail");
  addSlash(cx,cy,heavy?126:(step===2?78:62),color,heavy?22:13,heavy?"heavy":"normal");
  if(step>=2) addBladeTrail(cx-facing*len*.28,cy+rise*.30,cx+facing*len*.48,cy-rise*.25,"rgba(255,255,255,.82)",heavy?16:12,heavy?9:6,"bladeTrail");
  if(heavy){
    spawnMetalImpact(cx+facing*30,cy,10,6,false);
    doShake(7);
    flash=Math.max(flash,5);
  }
}

function addSlash(x,y,r,color,life=14,type="normal"){ slashes.push({x,y,r,color,life,max:life,type,rot:Math.random()*Math.PI}); trimRuntimeCollections(); }
function addText(x,y,text,color="#fff",big=false){ if(!damageTextEnabled && !big) return; text = localizeText ? localizeText(text) : text; texts.push({x,y,text,color,big,life:big?60:42,max:big?60:42,vy:big?-.9:-1.2}); trimRuntimeCollections(); }


function wrapTextBlock(text, x, y, maxWidth, lineHeight, maxLines=4){
  text = String(text);
  const words = language==="en" ? text.split(/\s+/) : Array.from(text);
  let line = "", lines = [];
  for(const w of words){
    const test = language==="en" ? (line ? line + " " + w : w) : line + w;
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = w;
      if(lines.length >= maxLines-1) break;
    }else{
      line = test;
    }
  }
  if(line && lines.length < maxLines) lines.push(line);
  for(let i=0;i<lines.length;i++) ctx.fillText(lines[i], x, y + i*lineHeight);
  return lines.length;
}

function drawBtn(text, sub, x, y, w, h, active=false, color="#fff"){
  const hover = inRect(x,y,w,h);
  ctx.save();
  const lift=hover?-2:0;
  ctx.translate(0,lift);
  const radius = 12;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,radius);
  const fill = active ? "rgba(255,224,102,.20)" : hover ? "rgba(255,255,255,.13)" : "rgba(255,255,255,.060)";
  ctx.fillStyle = fill;
  ctx.fill();

  if(hover || active){
    ctx.shadowBlur = hover ? 14 : 8;
    ctx.shadowColor = color;
  }
  ctx.strokeStyle = active ? color : hover ? "rgba(255,255,255,.45)" : "rgba(255,255,255,.145)";
  ctx.lineWidth = active ? 2 : hover ? 2 : 1;
  ctx.stroke();

  if(hover || active){
    ctx.save();
    ctx.clip();
    const sweep=((menuPulse*3.2)%(w+110))-70;
    const shine=ctx.createLinearGradient(x+sweep,y,x+sweep+54,y);
    shine.addColorStop(0,"rgba(255,255,255,0)");
    shine.addColorStop(.5,hover?"rgba(255,255,255,.15)":"rgba(255,255,255,.07)");
    shine.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=shine;ctx.fillRect(x,y,w,h);
    ctx.restore();
    ctx.globalAlpha=.58+Math.sin(menuPulse*.08)*.18;
    ctx.fillStyle=color;ctx.fillRect(x+2,y+10,3,Math.max(8,h-20));
    ctx.globalAlpha=1;
  }

  ctx.shadowBlur = 0;
  const subW = sub ? Math.min(82, Math.max(42, String(sub).length * 8 + 16)) : 0;
  const mainW = Math.max(40, w - subW - 38);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = active || hover ? color : "rgba(255,255,255,.88)";
  fitText(text, mainW, h >= 50 ? 20 : 16, "bold", 11);
  ctx.fillText(text, x+18, y+h/2+1);

  if(sub){
    ctx.textAlign="right";
    ctx.fillStyle="rgba(255,255,255,.54)";
    fitText(sub, subW, h >= 50 ? 12 : 11, "", 9);
    ctx.fillText(sub, x+w-14, y+h/2+1);
  }
  ctx.restore();
}


function volumePercent(v){ return Math.round(clamp(v,0,1)*100) + "%"; }
function setVolumeFromMouse(x, w){ return clamp((mouseX - x) / Math.max(1,w), 0, 1); }
function drawVolumeSlider(label, value, x, y, w, color="#7cc7ff"){
  value = clamp(value,0,1);
  ctx.save();
  ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.font="bold 15px " + FONT_UI;
  ctx.fillText(label, x, y);
  ctx.textAlign="right";
  ctx.fillStyle=color;
  ctx.font="bold 14px " + FONT_UI;
  ctx.fillText(volumePercent(value), x+w, y);

  const ty = y + 24, th = 10;
  ctx.fillStyle="rgba(255,255,255,.14)";
  ctx.beginPath();
  ctx.roundRect(x, ty, w, th, 999);
  ctx.fill();

  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.roundRect(x, ty, Math.max(8,w*value), th, 999);
  ctx.fill();

  const kx = x + w*value;
  ctx.shadowBlur = inRect(x-8, ty-14, w+16, 38) ? 14 : 7;
  ctx.shadowColor = color;
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.arc(kx, ty+th/2, 8, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function uiPanel(x,y,w,h,color="rgba(124,199,255,.26)",fill="rgba(5,8,18,.82)"){
  ctx.save();
  ctx.fillStyle=fill;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,14);
  ctx.fill();
  ctx.strokeStyle=color;
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.restore();
}

function uiCard(x,y,w,h,color="#7cc7ff",active=false){
  const hover=inRect(x,y,w,h);
  ctx.save();
  ctx.fillStyle=active?"rgba(255,224,102,.16)":hover?"rgba(255,255,255,.115)":"rgba(255,255,255,.055)";
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,14);
  ctx.fill();
  ctx.strokeStyle=active?"#ffe066":hover?color:"rgba(255,255,255,.14)";
  ctx.lineWidth=active||hover?2:1;
  ctx.stroke();
  ctx.restore();
  return hover;
}

function uiSectionTitle(title,subtitle,x=95,y=190){
  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(title,x,y);
  if(subtitle){
    ctx.fillStyle="rgba(255,255,255,.55)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(subtitle,x+2,y+24);
  }
}

function drawNewDiamond(x,y,visible=true){
  if(!visible) return;
  ctx.save();
  ctx.translate(x,y); ctx.rotate(Math.PI/4);
  ctx.shadowColor="#ff4058"; ctx.shadowBlur=12;
  ctx.fillStyle="#ff4058"; ctx.fillRect(-7,-7,14,14);
  ctx.strokeStyle="#ffd9df"; ctx.lineWidth=2; ctx.strokeRect(-7,-7,14,14);
  ctx.restore();
}

function hasUiNewDot(key,condition=true){
  return !!condition && !(uiNewSeen && uiNewSeen[key]);
}
function markUiNewSeen(key){
  if(!key || (uiNewSeen && uiNewSeen[key])) return;
  if(!uiNewSeen || typeof uiNewSeen!=="object") uiNewSeen={};
  uiNewSeen[key]=true;
  saveGame();
  autoCloudSaveNow(true);
}

function eventHasNewContent(){
  const levelReady=Array.isArray(levelRewards) && levelRewards.some(r=>playerLevel>=r.lv&&!r.claimed);
  return canClaimDailyLogin() || levelReady || !eventClaimed || isMatch3New();
}
const CONTENT_DOT_VERSION={
  achievements:"content.achievements.v2",manual:"content.manual.v2",pass:"content.pass.v2",profile:"content.profile.v3",
  notice:"content.notice.v2",checkin:"content.checkin.v2",operation:"content.operation.v4",event:"content.event.v3",
  operators:"content.operators.v3",shop:"content.shop.v2",mail:"content.mail.v2",daydream:"content.daydream.v4"
};
function contentDot(name,condition=true){return hasUiNewDot(CONTENT_DOT_VERSION[name]||name,condition);}
function seeContent(name){markUiNewSeen(CONTENT_DOT_VERSION[name]||name);}
function match3SeenKey(){ return activeSaveKey()+"_match3_seen_v1"; }
function isMatch3New(){ try{return localStorage.getItem(match3SeenKey())!=="1";}catch(e){return true;} }
function markMatch3Seen(){ try{localStorage.setItem(match3SeenKey(),"1");}catch(e){} }


function drawPageHeader(title, subtitle=""){
  ctx.fillStyle="rgba(255,255,255,.055)";
  ctx.fillRect(30,30,1060,76);
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.strokeRect(30,30,1060,76);
  ctx.fillStyle="#fff";
  ctx.font="bold 30px " + FONT_UI;
  ctx.textAlign="left";
  ctx.textBaseline="alphabetic";
  ctx.fillText(title,58,72);
  if(subtitle){
    ctx.font="13px " + FONT_UI;
    ctx.fillStyle="rgba(255,255,255,.58)";
    ctx.fillText(subtitle,60,94);
  }
}

function createEnemy(x,y,boss=false,type="normal"){
  type = type || "normal";
  const commissionStage = battleModeSource==="commission" ? currentCommissionStage() : null;
  const stageScale = commissionStage ? commissionStage.lv : (selectedStage || 1);
  const hp = boss ? 1650 + stageScale*95 : type==="shield" ? 760 + stageScale*45 : type==="berserker" ? 620 + stageScale*38 : type==="ranged" ? 470 + stageScale*30 : type==="elite" ? 820 + stageScale*48 : 560 + stageScale*34;
  const shield = boss ? 880 + stageScale*65 : type==="shield" ? 520 + stageScale*42 : type==="elite" ? 360 + stageScale*30 : type==="ranged" ? 180 + stageScale*18 : 0;
  const lv = boss ? stageScale + 7 : type==="elite" ? stageScale + 4 : type==="shield" ? stageScale + 2 : type==="berserker" ? stageScale + 3 : type==="ranged" ? stageScale + 2 : stageScale;
  return {
    x,y,vx:0,vy:0,r:boss?46:type==="shield"?32:type==="ranged"?24:26,
    hp,maxHp:hp,shield,maxShield:shield,
    stun:boss?520:type==="shield"?320:type==="elite"?360:220,
    maxStun:boss?520:type==="shield"?320:type==="elite"?360:220,
    alive:true,boss,type,lv,
    phase:1,
    windup:0,attackCd:70+Math.random()*70,hit:0,parried:0,
    shotCd:type==="ranged"?60:0,
    aiTick: Math.floor(Math.random()*8),
    cachedDx:0,
    cachedDy:0,
    cachedDist:999,
    rage:false,
    freeze:0,
    chill:0
  };
}


const AREA_DIALOGUES = I18N_RES.AREA_DIALOGUES || {
  zh:{
    1:{1:[["凯恩","别急着冲。先观察敌人的动作。"],["{playerName}","我知道了。先活下来，再谈变强。"]],2:[["艾洛","风向变了，出口就在前面。"],["凯恩","别放松。第一关通常最容易让人轻敌。"]]},
    2:{1:[["凯恩","攻击节奏太乱，会把自己送进敌人的刀口。"],["艾洛","简单说，别乱点，找机会打。"]],2:[["{playerName}","原来切换角色也需要时机。"],["凯恩","没错。队友不是按钮，是一起战斗的人。"]]},
    3:{1:[["艾洛","左边断桥有动静。"],["凯恩","保持队形，别被分开。"]],2:[["{playerName}","他们像是在守着这条路。"],["凯恩","灾变后，很多怪物会占据固定路线。"]]},
    4:{1:[["艾洛","广播声断断续续的，听着真不舒服。"],["凯恩","越像日常的地方，失控后越危险。"]],2:[["{playerName}","地图就在地下？"],["凯恩","对。拿到它，我们才能进入都市下层。"]]},
    5:{1:[["旅人","拜托了，别让它们进来！"],["{playerName}","站到我身后。"]],2:[["芙洛拉","受伤的人在里面，我能处理。"],["凯恩","那我们负责把路清出来。"]]},
    6:{1:[["守卫","外墙防卫系统已失控，请立刻后退。"],["诺克斯","听见没？它让我们后退。"],["凯恩","所以我们更要前进。"]],2:[["{playerName}","都市的门，原来也会拒绝求生的人。"],["凯恩","门不会思考。下命令的人才会。"]]},
    7:{1:[["诺克斯","下层的规则很简单：别挡路，别多问，别露怯。"],["艾洛","听起来一点都不安全。"]],2:[["{playerName}","你为什么帮我们？"],["诺克斯","谁说我是在帮你们？我只是顺路。"]]},
    8:{1:[["芙洛拉","信号越来越近了。里面夹着求救频段。"],["诺克斯","也可能是陷阱。"],["{playerName}","那也要确认。"]],2:[["凯恩","别被市场声音影响。敌人会从摊位后面冲出来。"],["艾洛","明白，盯住侧面。"]]},
    9:{1:[["{playerName}","如果力量有很多种，那我到底要追哪一种？"],["芙洛拉","也许不是追，而是选择。"]],2:[["凯恩","答案不是别人给你的。你只能在战斗里慢慢确认。"]]},
    10:{1:[["诺克斯","升降塔的防御开始启动了。"],["艾洛","所以现在后悔还来得及吗？"],["凯恩","来不及了。"]],2:[["{playerName}","这次由我开路。"],["凯恩","那就别回头。"]]},
    11:{1:[["废城守卫者","权限……否定。"],["芙洛拉","它的核心在过载！"],["凯恩","准备战斗。"]],2:[["{playerName}","我不是为了证明自己强才站在这里。"],["凯恩","那就把你的答案打出来。"]]}
  },
  en:{
    1:{1:[["Kane","Don't rush. Watch the enemy's movement first."],["{playerName}","Got it. Survive first, then talk about strength."]],2:[["Ailo","The wind changed. The exit is ahead."],["Kane","Don't relax. The first mission is where people underestimate danger."]]},
    2:{1:[["Kane","A messy rhythm will throw you straight into the enemy's blade."],["Ailo","In short, don't mash. Find the opening."]],2:[["{playerName}","So switching characters also needs timing."],["Kane","Exactly. Teammates aren't buttons. They're people fighting beside you."]]},
    3:{1:[["Ailo","Movement on the broken bridge to the left."],["Kane","Hold formation. Don't get separated."]],2:[["{playerName}","It feels like they're guarding this road."],["Kane","After the disaster, many monsters occupy fixed routes."]]},
    4:{1:[["Ailo","That broken announcement sounds awful."],["Kane","Places that feel ordinary become the most dangerous after they fall apart."]],2:[["{playerName}","The map is underground?"],["Kane","Yes. With it, we can enter the city's lower level."]]},
    5:{1:[["Traveler","Please, don't let them get inside!"],["{playerName}","Stand behind me."]],2:[["Flora","The injured are inside. I can handle them."],["Kane","Then we'll clear the path."]]},
    6:{1:[["Guard","Outer wall defense system out of control. Retreat immediately."],["Nox","Hear that? It wants us to back off."],["Kane","Then we move forward."]],2:[["{playerName}","So even a city gate can reject people trying to survive."],["Kane","Gates don't think. The people giving orders do."]]},
    7:{1:[["Nox","Rules of the lower level are simple: don't block the road, don't ask too much, don't look weak."],["Ailo","That doesn't sound safe at all."]],2:[["{playerName}","Why are you helping us?"],["Nox","Who said I'm helping? I'm just going the same way."]]},
    8:{1:[["Flora","The signal is getting closer. There's a distress band inside it."],["Nox","Could also be a trap."],["{playerName}","Then we confirm it."]],2:[["Kane","Don't get distracted by the market noise. Enemies can rush from behind the stalls."],["Ailo","Got it. Watching the sides."]]},
    9:{1:[["{playerName}","If there are many kinds of strength, which one am I supposed to chase?"],["Flora","Maybe you don't chase it. Maybe you choose it."]],2:[["Kane","No one can hand you the answer. You confirm it through battle."]]},
    10:{1:[["Nox","The lift defense system is waking up."],["Ailo","So is it too late to regret this?"],["Kane","Too late."]],2:[["{playerName}","This time, I'll open the path."],["Kane","Then don't look back."]]},
    11:{1:[["Ruined City Guardian","Authorization... denied."],["Flora","Its core is overloading!"],["Kane","Prepare for battle."]],2:[["{playerName}","I'm not standing here just to prove I'm strong."],["Kane","Then carve out your answer."]]}
  }
};

function triggerAreaDialogue(){
  if(selectedMainChapter===2){
    const zh={
      3:["关闭旧监视器，确认第一处警戒盲区。","巡逻间隔正在缩短，记录重叠时间。","维护通道就在前方，不要触发警戒。"],
      4:["裂隙外围正在收缩，先清除锚点附近威胁。","碎片被锚点向内拉扯，保持距离。","校准最后一个锚点，立即进入裂隙。"],
      5:["先听取愿意离开的居民，不要替他们决定。","有人选择留下，记录他们需要的物资。","还有人在犹豫，告诉他们裂隙剩余的时间。"],
      6:["第一批幸存者进入通道，守住前方。","行动不便的人还在后方，清除两侧威胁。","确认所有人通过外层检查点。"],
      7:["小赖最后出现在后方队伍，先找她遗留的物品。","脚印偏离了撤离路线，继续追踪。","空间已经断开，但回声仍能指明方向。"],
      8:["狐灵正在确认第一段方向，守住共鸣点。","追击者正在压缩防线，不要让它们靠近芙洛拉。","最后的出口共鸣即将完成。"],
      10:["出口仍在缩小，清出第一段通道。","保护后方居民，不要让队伍被截断。","最终出口就在前方，确认所有人通过。"]
    };
    const en={
      3:["Disable the old camera and confirm the first blind spot.","The patrol interval is shrinking. Record the overlap.","The maintenance route is ahead. Do not trigger the alert."],
      4:["The outer rift is shrinking. Clear the first anchor.","Debris is being pulled inward. Keep your distance.","Calibrate the final anchor and enter immediately."],
      5:["Hear those willing to leave. Do not choose for them.","Some will stay. Record the supplies they need.","Others still hesitate. Tell them how little time remains."],
      6:["The first group is moving. Hold the front.","The injured group is behind. Clear both sides.","Confirm everyone has crossed the outer checkpoint."],
      7:["Lai was last seen with the rear group. Find what she left.","The footprints leave the evacuation route. Keep tracking.","The path is gone, but its echo still carries a direction."],
      8:["The fox spirit is fixing the first direction. Hold the point.","The pursuit is compressing the line. Keep them away from Flora.","The final exit resonance is almost complete."],
      10:["The exit is shrinking. Open the first passage.","Protect the rear group. Do not let the line split.","The final exit is ahead. Confirm everyone crosses."]
    };
    const lines=(language==="en"?en:zh)[selectedStage];
    if(!lines) return;
    const key="ch2-"+selectedStage+"-"+area;
    if(areaDialogueShown[key]) return;
    areaDialogueShown[key]=true;
    showActionPrompt(lines[area-1]||lines[0],150);
    return;
  }
  if(selectedMainChapter===1){
    const zh={
      2:["先清除封锁线前哨，再穿过坍塌路口。","敌人的远程单位占据了出口，优先处理。","Project 4 外环就在前方，确认撤退路线后继续。"],
      3:["异常读数就在附近，清理威胁后按 F 调查。","第二处读数来自废弃终端，不像自然结晶。","记录最后一处坐标，确认异常源的分布。"],
      4:["求救声从商业区深处传来。","包围正在收紧，先打开通往内街的路。","小赖就在前方，清除威胁后靠近确认状况。"],
      6:["小赖行动不便，先确认这条路是否安全。","敌人从侧面靠近，守住楼梯入口。","屋顶通道已找到，确认最后的撤离标记。"],
      8:["这里不是空城。先和入口处的居民交谈。","检查剩余物资，记录居民目前的需求。","调查裂隙出口，确认他们为什么无法离开。"],
      9:["守住入口，不能让物资区暴露。","远程单位正在压制防线，先打断他们。","最后一批袭击者出现，以击退为目标，不要追击。"]
    };
    const en={
      2:["Clear the blockade outpost, then cross the collapsed junction.","Ranged units control the exit. Deal with them first.","Project 4 is ahead. Secure the withdrawal route before moving on."],
      3:["The reading is nearby. Clear the threat, then press F to investigate.","The second signal comes from an abandoned terminal, not natural crystal growth.","Record the final coordinates and confirm the anomaly pattern."],
      4:["The distress call is coming from deeper in the market.","The encirclement is tightening. Open the inner street route.","Xiaolai is ahead. Clear the threat, then approach her."],
      6:["Xiaolai cannot move quickly. Confirm this route is safe.","Enemies are approaching from the side. Hold the stair entrance.","The rooftop path is open. Confirm the final withdrawal marker."],
      8:["This is not an empty ruin. Speak with the resident at the entrance.","Inspect the remaining supplies and record what the settlement needs.","Examine the rift exit and learn why they cannot leave."],
      9:["Hold the entrance. Do not expose the supply area.","Ranged units are suppressing the line. Interrupt them first.","The final group is here. Drive them back; do not pursue."]
    };
    const lines=(language==="en"?en:zh)[selectedStage];
    if(!lines) return;
    const key="ch1-"+selectedStage+"-"+area;
    if(areaDialogueShown[key]) return;
    areaDialogueShown[key]=true;
    showActionPrompt(lines[area-1]||lines[0],150);
    return;
  }
  if(selectedMainChapter===0){
    const zh={
      1:["清理西区外围，确认晶体兽为何持续增加。","第二批目标出现，保持距离，不要被两侧包围。","异常规模已经超出报告，清出一条撤离通道。"],
      2:["撤离命令已下达，先确认应急信标。","敌人截断了近路，清除威胁后重新确认路线。","西区出口就在前方，完成最后一次信号确认。"],
      4:["这里不是原来的西区。寻找任何能证明凯恩来过的痕迹。","空间结构正在重复，继续检查残留讯号。","回声来自两个方向，找到能够连接彼此的边界。"],
      5:["晶体人仍保留着人的轮廓，先观察它的攻击节奏。","它在用晶体保护核心，寻找破绽。","核心反应增强，结束这场迎击。"],
      7:["两个世界正在互相挤压，清理威胁并稳定锚点。","凯恩看到的道路与这里不同，跟随共同出现的讯号。","白日梦边界暂时成形，确认后继续深入。"],
      8:["疲惫感正在加深，不要让战斗节奏失控。","凯恩的感知开始混乱，优先处理远处目标。","侵蚀仍在增强，撑过最后一段区域。"],
      9:["调查结晶脉冲，确认怪物出现的规律。","内部轮廓正在成形，先切断周围的守卫。","所有脉冲都指向同一个深层核心。"],
      10:["结晶巨人尚未完全成形，先突破外围守卫。","空间震动增强，保留终结技能量。","巨型核心已经暴露，结束白日梦的异常。"]
    };
    const en={
      1:["Clear the west perimeter and learn why the crystal beasts keep increasing.","The second group is here. Keep distance and avoid being surrounded.","The outbreak exceeds the report. Open an evacuation route."],
      2:["The evacuation order is active. Confirm the emergency beacon.","Enemies cut off the short route. Clear them, then verify the new path.","The west gate is ahead. Complete the final signal check."],
      4:["This is not the west district. Search for any trace that Kane was here.","The space is repeating itself. Keep checking the residual signal.","The echo comes from two directions. Find the boundary connecting both worlds."],
      5:["The crystal figure still has a human outline. Observe its attack rhythm.","Crystal is protecting its core. Find an opening.","The core reaction is rising. End the encounter."],
      7:["The two worlds are pressing together. Clear threats and stabilize the anchor.","Kane sees a different road. Follow the signal visible in both worlds.","The Daydream boundary has formed. Confirm it before moving deeper."],
      8:["Exhaustion is building. Do not let the battle rhythm collapse.","Kane's senses are distorting. Deal with distant targets first.","The erosion is still rising. Hold through the final section."],
      9:["Study the crystal pulse and identify how the creatures appear.","A shape is forming inside. Cut off the surrounding guards first.","Every pulse points toward the same deeper core."],
      10:["The colossus is still forming. Break through its outer guards.","The space is shaking harder. Preserve ultimate energy.","The giant core is exposed. End the Daydream anomaly."]
    };
    const lines=(language==="en"?en:zh)[selectedStage];
    if(lines){const key="ch0-"+selectedStage+"-"+area;if(!areaDialogueShown[key]){areaDialogueShown[key]=true;showActionPrompt(lines[area-1]||lines[0],150);}return;}
  }
  const pack = language==="en" ? AREA_DIALOGUES.en : AREA_DIALOGUES.zh;
  const lines = pack[selectedStage] && pack[selectedStage][area];
  if(!lines) return;
  const key = selectedStage + "-" + area;
  if(areaDialogueShown[key]) return;
  areaDialogueShown[key] = true;
  const line = lines[Math.floor(Math.random()*lines.length)];
  showActionPrompt(line[0] + ": " + line[1], 150);
}

function spawnAreaLegacyChapterPrototype(){
  if(battleModeSource==="projectArea"){ spawnProjectAreaArea(); return; }
  if(battleModeSource==="materialDungeon"){ spawnMaterialDungeonArea(); return; }
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=false; commissionComplete=false;
  const commissionStage = battleModeSource==="commission" ? currentCommissionStage() : null;
  const t = commissionStage ? commissionStage.type : (missionTypes[selectedStage-1] || "annihilation");

  if(t==="chapterBoss"){
    if(area===1){ enemies.push(createEnemy(620,H/2+90,false,"shield")); enemies.push(createEnemy(760,H/2+135,false,"ranged")); }
    else if(area===2){ enemies.push(createEnemy(480,H/2+80,false,"berserker")); enemies.push(createEnemy(670,H/2+110,false,"shield")); enemies.push(createEnemy(850,H/2+70,false,"ranged")); }
    else if(area>=battleAreaLimit()){ enemies.push(createEnemy(700,H/2+90,true,"boss")); enemies.push(createEnemy(500,H/2+150,false,"shield")); }
    else { enemies.push(createEnemy(480,H/2+80,false,"elite")); enemies.push(createEnemy(690,H/2+120,false,"ranged")); enemies.push(createEnemy(850,H/2+70,false,"berserker")); }
  } else if(t==="survival"){
    enemies.push(createEnemy(520,H/2+70,false,"normal"));
    enemies.push(createEnemy(740,H/2+120,false,area>=2?"berserker":"normal"));
    if(area>=2) enemies.push(createEnemy(860,H/2+50,false,"ranged"));
  } else if(t==="shield"){
    enemies.push(createEnemy(540,H/2+90,false,"shield"));
    enemies.push(createEnemy(740,H/2+130,false,area>=2?"shield":"normal"));
    if(area>=battleAreaLimit()) enemies.push(createEnemy(860,H/2+60,false,"elite"));
  } else if(t==="ranged"){
    enemies.push(createEnemy(520,H/2+80,false,"ranged"));
    enemies.push(createEnemy(760,H/2+140,false,"ranged"));
    if(area>=2) enemies.push(createEnemy(650,H/2+40,false,"shield"));
  } else if(t==="mixed" || t==="elite" || t==="bossPrep"){
    enemies.push(createEnemy(430,H/2+40,false,area===1?"normal":"shield"));
    enemies.push(createEnemy(650,H/2+110,false,area>=2?"berserker":"elite"));
    enemies.push(createEnemy(810,H/2+30,false,area>=battleAreaLimit()?"ranged":"normal"));
    if(t==="bossPrep" && area>=battleAreaLimit()) enemies.push(createEnemy(720,H/2+160,false,"shield"));
  } else {
    if(area===1){ enemies.push(createEnemy(520,H/2+70,false,"normal")); enemies.push(createEnemy(700,H/2+145,false,"normal")); }
    else if(area===2){ enemies.push(createEnemy(430,H/2+40,false,"normal")); enemies.push(createEnemy(650,H/2+110,false,"berserker")); enemies.push(createEnemy(810,H/2+30,false,"normal")); }
    else { enemies.push(createEnemy(700,H/2+90,false,"elite")); enemies.push(createEnemy(500,H/2+145,false,"normal")); }
  }

  showCenter((area===3?"FINAL AREA":"AREA 0"+area)+" / "+missionLabel(),65);
  triggerAreaDialogue();
}


function addPlayerExp(amount){
  // Legacy compatibility: old stage EXP now feeds Action Record EXP.
  if(typeof arAddExp === "function") arAddExp(amount || 0, false);
  // Slow only the very early account curve so new players have time to learn
  // each newly introduced system. Character and weapon growth are unchanged.
  const earlyRate=playerLevel<5?.68:playerLevel<10?.82:1;
  amount=Math.max(1,Math.floor((amount||0)*earlyRate));
  playerExp += amount;
  while(playerExp >= playerExpNeed){
    playerExp -= playerExpNeed;
    playerLevel++;
    playerExpNeed = Math.floor(playerExpNeed * 1.24 + 420);
  }
}


const ACHIEVEMENT_LIST = I18N_RES.ACHIEVEMENT_LIST || [
  {id:"first_step", cat:"journey", crystals:120,
    zhName:"最初的一步", enName:"First Step",
    zhDesc:"完成 00-01，真正踏上旅途。", enDesc:"Clear 00-01 and begin the journey.",
    check:()=>!!cleared[1]},
  {id:"chapter0_half", cat:"journey", crystals:200,
    zhName:"穿过旧路", enName:"Through the Old Road",
    zhDesc:"完成第0章前5关。", enDesc:"Clear the first five missions of Chapter 0.",
    check:()=>[1,2,3,4,5].every(i=>cleared[i])},
  {id:"chapter0_clear", cat:"journey", crystals:500,
    zhName:"第一都市的门", enName:"Gate of the First City",
    zhDesc:"完成第0章全部关卡。", enDesc:"Clear all missions in Chapter 0.",
    check:()=>[1,2,3,4,5,6,7,8,9,10,11].every(i=>cleared[i])},
  {id:"ten_kills", cat:"combat", crystals:150,
    zhName:"战斗适应", enName:"Combat Adaptation",
    zhDesc:"累计击败10个敌人。", enDesc:"Defeat 10 enemies in total.",
    check:()=>totalKills>=10},
  {id:"parry_5", cat:"combat", crystals:180,
    zhName:"听见金属声", enName:"The Sound of Steel",
    zhDesc:"累计成功弹刀5次。", enDesc:"Perform 5 successful parries.",
    check:()=>totalParries>=5},
  {id:"chain_5", cat:"combat", crystals:180,
    zhName:"第一次默契", enName:"First Coordination",
    zhDesc:"累计触发5次连携。", enDesc:"Trigger 5 chain attacks.",
    check:()=>totalChains>=5},
  {id:"boss_1", cat:"combat", crystals:280,
    zhName:"守卫者倒下", enName:"Guardian Down",
    zhDesc:"击败第一个Boss。", enDesc:"Defeat the first boss.",
    check:()=>totalBossKills>=1},
  {id:"rich_gold", cat:"collection", crystals:160,
    zhName:"补给管理", enName:"Supply Manager",
    zhDesc:"累计获得10000金币。", enDesc:"Earn 10,000 Gold in total.",
    check:()=>totalGoldEarned>=10000},
  {id:"crystal_collector", cat:"collection", crystals:220,
    zhName:"水晶收集者", enName:"Crystal Collector",
    zhDesc:"累计获得3000水晶。", enDesc:"Earn 3,000 Crystal in total.",
    check:()=>totalCrystalsEarned>=3000}
];

function achievementName(a){ return language==="en" ? a.enName : a.zhName; }
function achievementDesc(a){ return language==="en" ? a.enDesc : a.zhDesc; }

function unlockAchievement(id){
  if(achievements[id]) return;
  const a = ACHIEVEMENT_LIST.find(x=>x.id===id);
  if(!a) return;
  achievements[id] = {unlocked:true, claimed:false};
  achievementNotice = mt("achievementCompletePrefix") + achievementName(a);
  achievementNoticeTimer = 180;
  achievementMsg = achievementNotice;
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}

function checkAchievements(){
  for(const a of ACHIEVEMENT_LIST){
    if(!achievements[a.id] && a.check()) unlockAchievement(a.id);
  }
}

function checkAchievementsThrottled(){
  achievementCheckCooldown -= frameScale;
  if(achievementCheckCooldown > 0) return;
  achievementCheckCooldown = 30;
  checkAchievements();
}

const FREE_CRYSTAL_REWARD_MULTIPLIER = 1.12;
function boostedCrystalReward(amount){
  return Math.max(0, Math.floor((Number(amount)||0) * FREE_CRYSTAL_REWARD_MULTIPLIER));
}
function grantFreeCrystals(amount){
  const granted=boostedCrystalReward(amount);
  crystals += granted;
  totalCrystalsEarned += granted;
  return granted;
}
window.grantPZCrystalReward=grantFreeCrystals;


function claimAchievement(id){
  const a = ACHIEVEMENT_LIST.find(x=>x.id===id);
  const st = achievements[id];
  if(!a || !st || st.claimed) return;
  st.claimed = true;
  const granted=grantFreeCrystals(a.crystals);
  achievementMsg = mt("claimedPrefix") + achievementName(a) + " +" + granted;
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}

function achievementProgressText(a){
  if(a.id==="ten_kills") return totalKills + "/10";
  if(a.id==="parry_5") return totalParries + "/5";
  if(a.id==="chain_5") return totalChains + "/5";
  if(a.id==="boss_1") return totalBossKills + "/1";
  if(a.id==="rich_gold") return totalGoldEarned + "/10000";
  if(a.id==="crystal_collector") return totalCrystalsEarned + "/3000";
  if(a.id==="first_step") return (cleared[1]?1:0)+"/1";
  if(a.id==="chapter0_half") return [1,2,3,4,5].filter(i=>cleared[i]).length+"/5";
  if(a.id==="chapter0_clear") return [1,2,3,4,5,6,7,8,9,10,11].filter(i=>cleared[i]).length+"/11";
  return "";
}

function grantReward(pack){
  if(pack.crystals) grantFreeCrystals(pack.crystals);
  if(pack.gold){ gold += pack.gold; totalGoldEarned += pack.gold; }
  if(pack.expBooks) expBooks += pack.expBooks;
  if(pack.ore) weaponOre += pack.ore;
  if(Number.isInteger(pack.roleId) && roles[pack.roleId]){
    while(owned.length<roles.length) owned.push(false);
    owned[pack.roleId]=true;
    showActionPrompt((language==="en"?"Executor acquired: ":"获得执行官：")+roleName(pack.roleId),120);
  }
  if(pack.weaponId){
    ensureWeaponBag();
    const item=weaponInventory.find(x=>x.id===pack.weaponId);
    if(item) item.owned=true;
    else weaponInventory.push({id:pack.weaponId,level:1,owned:true});
    showActionPrompt((language==="en"?"Weapon acquired: ":"获得武器：")+weaponNameById(pack.weaponId),120);
  }
  checkAchievements();
}
function grantExactEventCrystals(amount){
  const value=Math.max(0,Math.floor(Number(amount)||0));
  crystals+=value;totalCrystalsEarned+=value;checkAchievements();
  return value;
}
window.grantExactEventCrystals=grantExactEventCrystals;

function grantPZDaydreamReward(pack){
  pack=pack||{};
  if(pack.crystals) grantFreeCrystals(pack.crystals);
  if(pack.gold){gold+=Math.max(0,Math.floor(pack.gold));totalGoldEarned+=Math.max(0,Math.floor(pack.gold));}
  if(pack.expBooks)expBooks+=Math.max(0,Math.floor(pack.expBooks));
  if(pack.weaponOre)weaponOre+=Math.max(0,Math.floor(pack.weaponOre));
  saveGame();autoCloudSaveNow(true);checkAchievements();
}
window.grantPZDaydreamReward=grantPZDaydreamReward;

function rewardText(pack){
  const arr = [];
  if(pack.crystals) arr.push((language==="en"?"Crystal+":"水晶+")+boostedCrystalReward(pack.crystals));
  if(pack.gold) arr.push((language==="en"?"Gold+":"金币+")+pack.gold);
  if(pack.expBooks) arr.push((language==="en"?"EXP Books+":"经验书+")+pack.expBooks);
  if(pack.ore) arr.push((language==="en"?"Weapon Ore+":"精炼合金+")+pack.ore);
  if(Number.isInteger(pack.roleId)) arr.push(language==="en"?"Lisa":"丽莎");
  if(pack.weaponId) arr.push(weaponNameById(pack.weaponId));
  return arr.join(" / ") || ui("claimed");
}

function failMission(){
  battlePaused = false;
  player.hp = 0;
  mouseDown = false;
  clicked = false;
  mouseAttackConsumed = false;
  projectiles = [];
  particles = [];
  slashes = [];
  texts = [];
  hitStop = 0;
  slowMo = 0;
  flash = 0;
  ult.active = false;
  protagonistBindings=[];
  protagonistSweeps=[];
  protagonistDomain={active:false,life:0,max:180,tick:0,sweepIndex:0};
  showCenter(tr("任务失败","Mission Failed"), 90);
  gameMode = "defeat";
}


function clearTransientBattleState(){
  battlePaused=false;
  enemies=[];
  projectAreaObjects=[];
  battleExploreObjects=[];
  battleRewardNotices=[];
  projectiles=[]; frostFields=[]; bossHazards=[]; krosPhaseTransitionTimer=0; krosPhaseTransitionPhase=1; krosPhaseTransitionText=""; playerPoisonTimer=0; playerBleedTimer=0;
  particles=[];
  slashes=[];
  texts=[];
  lockTarget=null;
  actionPrompt="";
  actionPromptTimer=0;
  chainReady=false;
  chainTarget=null;
  chainSelect=false;
  chainSelectTimer=0;
  mouseDown=false;
  clicked=false;
  mouseAttackConsumed=false;
  keys["mouse2"]=false;
  attackBuffer=0;
  skillBuffer=0;
  ultBuffer=0;
  dashBuffer=0;
  hitStop=0;
  slowMo=0;
  flash=0;
  shake=0;
  if(ult) ult.active=false;
  protagonistBindings=[];
  protagonistSweeps=[];
  protagonistDomain={active:false,life:0,max:180,tick:0,sweepIndex:0};
  teamDamageAmpTimer=0;
  lisaTeamDamageAmpTimer=0;
  lisaSelfDamageAmpTimer=0;
  kaneSigils=[];
  noxDamageAmpTimer=0;
  windFields=[];
  ailoUltimateBurst={active:false,life:0,max:0};

  trimRuntimeCollections();
}

function clearBossKrosRuntime(){
  bossKrosRun=null;
  bossHazards=[];
  krosPhaseTransitionTimer=0;
  krosPhaseTransitionPhase=1;
  krosPhaseTransitionText="";
  playerPoisonTimer=0;
  playerPoisonTick=0;
  playerBleedTimer=0;
  playerBleedTick=0;
}

function resetBattleSourceToMain(){
  if(battleModeSource==="bossKros") clearBossKrosRuntime();
  battleModeSource="main";
}


function startCommissionBattle(id){
  selectedStage = id;
  battleModeSource = "commission";
  const st=currentCommissionStage();
  commissionTimeMax=st.time||180;
  commissionTimeLeft=commissionTimeMax;
  clearTransientBattleState();
  gameMode="team";
}

function startPZDaydreamBattle(config){
  daydreamBattleConfig=Object.assign({id:"dream",name:language==="en"?"Daydream Battle":"白日梦战斗",difficulty:40,areas:2,boss:false,pollution:0,combatBuff:0,difficultyTier:1,enemyScale:0,bossScale:0},config||{});
  selectedStage=clamp(Math.round((daydreamBattleConfig.difficulty||40)/6),1,11);
  battleModeSource="daydream";
  clearTransientBattleState();
  if(Array.isArray(daydreamBattleConfig.squad)&&daydreamBattleConfig.squad.length>=1){
    team=normalizeBattleTeam(daydreamBattleConfig.squad);
    player.role=team[0];selectedOperator=team[0];
  }
  startBattle();
}
window.startPZDaydreamBattle=startPZDaydreamBattle;

const SHOWCASE_RECOMMENDATIONS = [
  {zh:"烈阳之刃 · 先锋四件套",en:"Sunblade · Vanguard 4-piece"},
  {zh:"风语法典 · 共鸣四件套",en:"Wind Codex · Resonance 4-piece"},
  {zh:"终夜双刃 · 夜幕四件套",en:"Nightblades · Nightfall 4-piece"},
  {zh:"霜月长枪 · 冰痕四件套",en:"Frostmoon Lance · Frostmark 4-piece"},
  {zh:"黑白核心 · 零界四件套",en:"Monochrome Core · Zero Boundary 4-piece"}
];

function showcaseRecommendation(roleId){
  const data=SHOWCASE_RECOMMENDATIONS[roleId]||SHOWCASE_RECOMMENDATIONS[0];
  return language==="en"?data.en:data.zh;
}

function startExecutorShowcase(roleId=selectedOperator){
  showcaseRole=clamp(Math.floor(roleId||0),0,roles.length-1);
  showcasePreviousState={team:Array.isArray(team)?team.slice():[player.role],selectedStage,playerRole:player.role};
  battleModeSource="showcase";
  team=[showcaseRole];
  player.role=showcaseRole;
  selectedOperator=showcaseRole;
  selectedStage=1;
  clearTransientBattleState();
  startBattle();
  showCenter(language==="en"?"EXECUTOR SHOWCASE":"执行官展示",75);
}

function roleMaxHpForBattle(roleId){
  // Battle max HP must exactly match the operator growth panel HP.
  return Math.max(1, Math.floor(operatorStatHp(roleId)));
}

function playerMaxHp(){
  return roleMaxHpForBattle(player.role);
}

function ensureBattleRoleHp(){
  if(!Array.isArray(battleRoleHp)) battleRoleHp = [];
  for(let i=0;i<roles.length;i++){
    const maxHp = roleMaxHpForBattle(i);
    if(!Number.isFinite(battleRoleHp[i])){
      battleRoleHp[i] = maxHp;
    }else{
      battleRoleHp[i] = clamp(Math.floor(battleRoleHp[i]), 0, maxHp);
    }
  }
}

function ensureBattleRoleResources(){
  ensureBattleRoleHp();
  if(!Array.isArray(battleRoleEnergy)) battleRoleEnergy=[];
  if(!Array.isArray(battleRoleUlt)) battleRoleUlt=[];
  for(let i=0;i<roles.length;i++){
    if(!Number.isFinite(battleRoleEnergy[i])) battleRoleEnergy[i]=80;
    else battleRoleEnergy[i]=clamp(battleRoleEnergy[i],0,100);
    if(!Number.isFinite(battleRoleUlt[i])) battleRoleUlt[i]=0;
    else battleRoleUlt[i]=clamp(battleRoleUlt[i],0,ULT_MAX);
  }
}

function syncPlayerHpFromRole(){
  ensureBattleRoleHp();
  player.hp = clamp(Math.floor(battleRoleHp[player.role] || 0), 0, playerMaxHp());
}

function syncPlayerResourcesFromRole(){
  ensureBattleRoleResources();
  player.hp=clamp(Math.floor(battleRoleHp[player.role]||0),0,playerMaxHp());
  player.energy=clamp(battleRoleEnergy[player.role]||0,0,100);
  player.ult=clamp(battleRoleUlt[player.role]||0,0,ULT_MAX);
}

function saveCurrentRoleHp(){
  ensureBattleRoleHp();
  battleRoleHp[player.role] = clamp(Math.floor(player.hp || 0), 0, playerMaxHp());
}

function saveCurrentRoleResources(){
  ensureBattleRoleResources();
  battleRoleHp[player.role]=clamp(Math.floor(player.hp||0),0,playerMaxHp());
  battleRoleEnergy[player.role]=clamp(Number(player.energy)||0,0,100);
  battleRoleUlt[player.role]=clamp(Number(player.ult)||0,0,ULT_MAX);
}

function isBattleRoleAlive(roleId){
  ensureBattleRoleHp();
  return Array.isArray(team) && team.includes(roleId) && Number(battleRoleHp[roleId] || 0) > 0;
}

function nextLivingTeamRole(fromRole=player.role){
  if(!Array.isArray(team) || !team.length) return -1;
  const start=Math.max(0,team.indexOf(fromRole));
  for(let offset=1;offset<=team.length;offset++){
    const candidate=team[(start+offset)%team.length];
    if(candidate!==fromRole && isBattleRoleAlive(candidate)) return candidate;
  }
  return -1;
}

function damageCurrentRoleHp(amount, label="HIT", color="#ff5555"){
  syncPlayerHpFromRole();
  const daydreamDamageScale=battleModeSource==="daydream"&&daydreamBattleConfig?1+Math.max(0,Number(daydreamBattleConfig.enemyScale)||0)*.55:1;
  const moduleReduction=clamp(roleModuleTotals(player.role).damageReductionPct||0,0,.5);
  const defenseIdentityScale=player.role===2?1.14:player.role===1?1.06:1;
  // Enemy damage used to target a 100 HP prototype. Scale it against the real
  // operator panel HP so upgraded health values do not trivialize combat.
  const panelHpScale=clamp(playerMaxHp()/100,1,18);
  const dmg = Math.max(0, Math.floor((amount || 0)*panelHpScale*daydreamDamageScale*(1-moduleReduction)*defenseIdentityScale));
  player.hp = clamp(player.hp - dmg, 0, playerMaxHp());
  saveCurrentRoleHp();
  if(label) addText(player.x, player.y-35, label+" -"+dmg, color);
  if(player.hp<=0){
    const defeatedRole=player.role;
    const reserve=nextLivingTeamRole(defeatedRole);
    if(reserve<0){ failMission(); return true; }
    setBattleRole(reserve);
    player.inv=Math.max(player.inv||0,90);
    player.switchCd=Math.max(player.switchCd||0,30);
    player.chain=0; player.chainTimer=0;
    showCenter((language==="en"?"EXECUTOR DOWN · ":"执行官失去战斗能力 · ")+roleName(defeatedRole),75);
    addText(player.x,player.y-52,language==="en"?"RESERVE DEPLOYED":"后备执行官上场",roles[reserve].color,true);
    addSlash(player.x+player.facing*48,player.y,120,roles[reserve].color,18,"entry");
    return true;
  }
  return false;
}

function setBattleRole(newRole){
  // HP, skill energy and ultimate energy are all owned by each executor.
  saveCurrentRoleResources();
  player.role = clamp(newRole, 0, roles.length-1);
  syncPlayerResourcesFromRole();
}
function startBattle(){
  // Defensive gate: stale bossKros state must never replace a normal stage.
  if(battleModeSource==="bossKros" && (!bossKrosRun || selectedTab!=="dungeon")) resetBattleSourceToMain();
  battlePaused=false;
  battleResumeSnapshot=null;
  clearTransientBattleState();
  gameMode="battle"; mouseDown=false; clicked=false; mouseAttackConsumed=false; attackInputLock=0; attackBuffer=0; skillBuffer=0; ultBuffer=0; dashBuffer=0; projectiles=[]; lockTarget=null; krosPhaseTransitionTimer=0; krosPhaseTransitionPhase=1; krosPhaseTransitionText=""; hitStop=0; slowMo=0; flash=0; shake=0; ult={active:false,timer:0,role:0,hitDone:false};
  battleRoleHp = Array.from({length:roles.length}, (_,i)=>roleMaxHpForBattle(i));
  battleRoleEnergy = Array.from({length:roles.length}, ()=>80);
  battleRoleUlt = Array.from({length:roles.length}, ()=>0);
  syncPlayerResourcesFromRole();
  player.x=150; player.y=H/2+115; player.vx=0; player.vy=0;
  player.attackCd=0; player.skillCd=0; player.ultCd=0; player.dashCd=0; player.switchCd=0; chainSelect=false; chainSelectTimer=0; player.inv=0; player.chain=0; player.chainTimer=0; player.guardTimer=0; player.parryReady=0; player.parryTarget=null; player.perfectBuff=0; player.perfectDodgeTimer=0; combo=0; comboTimer=0; stylishScore=0; combatRank="D"; actionPromptTimer=0; chainReady=false; chainTarget=null; area=1; areaCleared=false; commissionComplete=false; areaDialogueShown={}; battleExploreObjects=[]; battleExploreOpened={}; battleRewardNotices=[]; battleRoute="center"; battleExitDelay=0; battleSideArea=""; particles=[]; slashes=[]; texts=[];
  if(battleModeSource==="commission"){
    const st=currentCommissionStage(); commissionTimeMax=st.time||180; commissionTimeLeft=commissionTimeMax;
  }
  chapter2EvacTimeLeft=battleModeSource==="main"&&selectedMainChapter===2&&selectedStage===10?180:0;
  spawnArea(); showCenter(battleModeSource==="showcase"?(language==="en"?"MAX BUILD · TRAINING":"满配模板 · 训练"):(battleModeSource==="daydream" ? ((language==="en"?"DAYDREAM · ":"白日梦 · ")+(daydreamBattleConfig?daydreamBattleConfig.name:"")) : (battleModeSource==="projectArea" ? "Project Area" : (battleModeSource==="materialDungeon" ? ((language==="en"?"Material Dungeon":"材料副本")+" "+roman(materialDungeonDifficulty)) : (battleModeSource==="commission" ? ("C"+currentCommissionStage().chapter+"-"+currentCommissionStage().localId) : stageCode(selectedStage))))),70);
}
function enterLobby(){
  releaseMobileButtons();
  clearMobileMoveKeys(); clearTransientBattleState(); resetBattleSourceToMain(); gameMode="lobby"; lobbyDialogueText=""; scheduleNextLobbyDialogue(); notice=prologueDone && !lobbyGuideDone ? msg("lobbyGuide") : msg("defaultNotice"); }
function enterOperation(){ clearTransientBattleState(); resetBattleSourceToMain(); gameMode="operation"; selectedTab="main"; mainChapterView="chapters"; operationDetailVisible=false; }
function enterStory(id){ if(selectedTab==="main") resetBattleSourceToMain(); rebuildStoryScripts(); selectedStage=id; currentStory=storyScripts[id] || [[mt("storyFallbackSpeaker"),mt("storyFallbackText")]]; storyIndex=0; gameMode="story"; }

function nearestEnemy(){
  let b=null, bd=Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const d=dist(player.x,player.y,e.x,e.y);
    if(d<bd){ bd=d; b=e; }
  }
  return b;
}

function updateProjectiles(){
  if(!projectiles) return;
  for(const p of projectiles){
    p.x += (p.vx * frameScale) * fpsScale();
    p.y += (p.vy * frameScale) * fpsScale();
    p.life -= frameScale;
    if(withinDist(player.x,player.y,p.x,p.y,22) && player.inv<=0 && gameMode==="battle"){
      if(p.krosBullet && battleModeSource==="bossKros") playerPoisonTimer=Math.max(playerPoisonTimer,110);
      p.life=0;
      if(damageCurrentRoleHp(10, p.krosBullet?"DRAGON":"SHOT", "#ff5555")) return;
      doShake(5);
      flash=Math.max(flash,3);
    }
  }
  projectiles = projectiles.filter(p=>p.life>0 && p.x>-30 && p.x<W+30 && p.y>80 && p.y<H+30);
  if(projectiles.length>22) projectiles.splice(0, projectiles.length-22);
}

function enemyAttackHitRange(e){
  return e.boss ? 105 : 78;
}

function findParryEnemy(){
  let b=null,bd=Infinity;
  for(const e of enemies){
    if(!e.alive) continue;
    const activeWindow = e.windup>0 && e.windup < (e.boss?38:28);
    if(activeWindow){
      const d=dist(player.x,player.y,e.x,e.y);
      if(d<enemyAttackHitRange(e)&&d<bd){b=e;bd=d;}
    }
  }
  return b;
}


function showActionPrompt(text, frames=58){
  text = localizeText ? localizeText(text) : text;
  actionPrompt = text;
  actionPromptTimer = frames;
  centerText = text;
  centerTimer = Math.max(centerTimer || 0, Math.min(frames, 80));
}

function addStyle(points){
  stylishScore += points;
  if(stylishScore > 900) combatRank = "SSS";
  else if(stylishScore > 600) combatRank = "SS";
  else if(stylishScore > 360) combatRank = "S";
  else if(stylishScore > 200) combatRank = "A";
  else if(stylishScore > 90) combatRank = "B";
  else combatRank = "D";
}

function triggerBreak(e){
  chainReady = true;
  chainTarget = e;
  chainSelect = true;
  chainSelectTimer = 75;
  slowMo = Math.max(slowMo, 14);
  showActionPrompt(msg("chainSelect"), 80);
  sfx("break");
}

function isFloraRole(i=player.role){
  return i === 3;
}

function getAimPoint(maxRange=360){
  let tx = mouseX || player.x + player.facing * 140;
  let ty = mouseY || player.y;
  if(lockTarget && lockTarget.alive){
    tx = lockTarget.x;
    ty = lockTarget.y;
  }
  const dx = tx - player.x, dy = ty - player.y;
  const d = Math.hypot(dx,dy);
  if(d > maxRange){
    tx = player.x + dx / d * maxRange;
    ty = player.y + dy / d * maxRange;
  }
  return {x:clamp(tx,45,W-45), y:clamp(ty,110,H-45)};
}

function enemiesInCircle(x,y,r){
  return enemies.filter(e => e.alive && dist(e.x,e.y,x,y) <= r + e.r);
}

function addIceCircle(x,y,r,life=34,type="ice"){
  slashes.push({x,y,r,color:"#88d8ff",life,max:life,type,rot:0});
  slashes.push({x,y,r:r*.62,color:"rgba(255,255,255,.92)",life:Math.max(18,life-8),max:Math.max(18,life-8),type,rot:0});
  trimRuntimeCollections();
}

function addIceParticles(x,y,count=18,r=90){
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const d=Math.random()*r;
    particles.push({
      x:x+Math.cos(a)*d*.35,
      y:y+Math.sin(a)*d*.25,
      vx:Math.cos(a)*(1.2+Math.random()*2.8),
      vy:Math.sin(a)*(1.2+Math.random()*2.8)-.35,
      size:2+Math.random()*3,
      color:Math.random()>.45?"#88d8ff":"#ffffff",
      life:24+Math.random()*26,
      max:50
    });
  }
  trimRuntimeCollections();
}

function freezeEnemy(e, frames=90){
  if(!e || !e.alive) return;
  e.freeze = Math.max(e.freeze || 0, frames);
  e.vx *= .25;
  e.vy *= .25;
}


function floraTargetDamageScale(targetCount, enemy){
  let scale = 1;
  if(targetCount <= 1) scale *= 0.72;
  if(enemy && enemy.boss) scale *= 0.68;
  return scale;
}

function floraAttack(){
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  const role=roles[player.role], cd=charData[player.role];
  const p=getAimPoint(360);
  const radius=96;
  player.attackCd=48;
  attackInputLock=24;
  player.facing = p.x >= player.x ? 1 : -1;
  sfx("skill");
  addIceCircle(p.x,p.y,radius,30,"ice");
  addIceParticles(p.x,p.y,16,radius);
  addText(p.x,p.y-radius-10,language==="en"?"ICE BLOOM":"冰晶绽放","#88d8ff",false);
  const targets=enemiesInCircle(p.x,p.y,radius);
  for(const e of targets){
    e.chill = Math.max(e.chill||0,60);
    hitEnemy(e, panelDamage(player.role,0.78,"normal",Math.random()*18)*floraTargetDamageScale(targets.length,e), 4, panelShieldDamage(player.role,18,"normal"), "#88d8ff", "ICE");
  }
  if(targets.length>1) addText(p.x,p.y+radius*.55,"AOE x"+targets.length,"#ffffff",true);
  doShake(7);
}

function floraSkill(){
  if(player.skillCd>0 || player.energy<SKILL_ENERGY_COST || ult.active){
    if(player.energy<SKILL_ENERGY_COST) showCenter(mt("notEnoughEnergy"),24);
    return;
  }
  const cd=charData[player.role];
  const p=getAimPoint(390);
  player.energy-=SKILL_ENERGY_COST;
  player.skillCd=120;
  frostFields.push({
    x:p.x,y:p.y,r:145,
    life:210,max:210,tick:0,
    damage:panelDamage(player.role,0.45,"skill",Math.random()*12)
  });
  addIceCircle(p.x,p.y,145,48,"frostField");
  addIceParticles(p.x,p.y,20,145);
  showCenter(language==="en"?"FROST DOMAIN":"极寒领域",32);
  sfx("skill");
  doShake(10);
  flash=Math.max(flash,5);
}

function updateFrostFields(){
  if(!frostFields || frostFields.length===0) return;
  for(const f of frostFields){
    f.life -= frameScale;
    f.tick -= frameScale;
    if(f.tick <= 0){
      f.tick = 18;
      for(const e of enemiesInCircle(f.x,f.y,f.r)){
        e.chill = Math.max(e.chill||0,70);
        e.vx *= .72;
        e.vy *= .72;
        hitEnemy(e, f.damage*floraTargetDamageScale(enemiesInCircle(f.x,f.y,f.r).length,e), 2, 14, "#88d8ff", "FROST");
      }
      addIceParticles(f.x,f.y,5,f.r);
    }
  }
  frostFields = frostFields.filter(f => f.life > 0);
}

function drawFrostFields(){
  if(!frostFields) return;
  for(const f of frostFields){
    const a = Math.max(0, Math.min(1, f.life/f.max));
    ctx.save();
    ctx.globalAlpha = .14 + .12*Math.sin((f.max-f.life)/12);
    ctx.fillStyle = "#88d8ff";
    ctx.beginPath();
    ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = .55*a;
    ctx.strokeStyle = "#88d8ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(f.x,f.y,f.r,0,Math.PI*2);
    ctx.stroke();
    ctx.globalAlpha = .22*a;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.x,f.y,f.r*.62,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}

function floraUltimateResolve(){
  const cd=charData[3];
  const radius=330;
  addIceCircle(player.x,player.y,radius,76,"ultimate");
  addIceCircle(player.x,player.y,210,62,"ultimate");
  addIceParticles(player.x,player.y,46,radius);
  doShake(24);
  doHitStop(5);
  flash=18;
  const targets=enemiesInCircle(player.x,player.y,radius);
  for(const e of targets){
    freezeEnemy(e,55);
    hitEnemy(e,panelDamage(3,5.20,"ultimate",Math.random()*90)*floraTargetDamageScale(targets.length,e),14,panelShieldDamage(3,125,"ultimate"),"#88d8ff","EVERWINTER");
  }
  addText(player.x,player.y-radius*.55,language==="en"?"EVERWINTER DESCENT":"永冬降临","#88d8ff",true);
  sfx("ultBoom");
}

function isWindRole(roleId=player.role){
  return !!roles[roleId] && roles[roleId].element==="wind";
}

function windDamageScale(e,roleId=player.role){
  return e && (e.weathering||0)>0 && isWindRole(roleId) ? 1.10 : 1;
}

function addWindField(x,y,r,life,type="normal",damage=0){
  windFields.push({x,y,r,life,max:life,type,damage,tick:type==="skill"?1:9999});
  if(windFields.length>6) windFields.splice(0,windFields.length-6);
  addSlash(x,y,r,"#74ffb7",34,type==="skill"?"windSkill":"windField");
  addParticles(x,y,"#74ffb7",type==="skill"?20:12,6);
}

function ailoAttack(){
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  const p=getAimPoint(360),radius=98;
  player.attackCd=50;attackInputLock=24;player.facing=p.x>=player.x?1:-1;
  addWindField(p.x,p.y,radius,180,"normal",0);
  const targets=enemiesInCircle(p.x,p.y,radius);
  for(const e of targets){
    hitEnemy(e,panelDamage(1,.56,"normal",Math.random()*10)*windDamageScale(e,1),3,panelShieldDamage(1,13,"normal"),"#74ffb7","WIND");
  }
  addText(p.x,p.y-radius-12,language==="en"?"LINGERING CURRENT · 3s":"滞留风场 · 3秒","#74ffb7",true);
  sfx("skill");doShake(5);
}

function ailoSkill(){
  const cost=52;
  if(player.skillCd>0 || player.energy<cost || ult.active){
    if(player.energy<cost) showCenter(mt("notEnoughEnergy"),24);
    return;
  }
  player.energy-=cost;player.skillCd=150;
  addWindField(player.x,player.y,195,180,"skill",panelDamage(1,.22,"skill",Math.random()*5));
  for(const e of enemiesInCircle(player.x,player.y,205)){
    e.weathering=Math.max(e.weathering||0,360);
    hitEnemy(e,panelDamage(1,.72,"skill",Math.random()*12)*windDamageScale(e,1),4,panelShieldDamage(1,28,"skill"),"#74ffb7","WEATHERING");
  }
  addText(player.x,player.y-135,language==="en"?"WEATHERING VORTEX":"风化涡流","#74ffb7",true);
  sfx("skill");doShake(9);flash=Math.max(flash,5);
}

function updateAiloCombatEffects(){
  for(const f of windFields){
    f.life-=frameScale;f.tick-=frameScale;
    for(const e of enemies){
      if(!e.alive) continue;
      const d=dist(f.x,f.y,e.x,e.y);
      if(d>f.r+e.r || d<5) continue;
      const pull=(f.type==="skill"?2.7:1.35)*frameScale;
      e.vx+=(f.x-e.x)/d*pull;e.vy+=(f.y-e.y)/d*pull;
      if(f.type==="skill") e.weathering=Math.max(e.weathering||0,90);
    }
    if(f.type==="skill" && f.tick<=0){
      f.tick+=30;
      for(const e of enemiesInCircle(f.x,f.y,f.r)) hitEnemy(e,f.damage*windDamageScale(e,1),1,6,"#74ffb7","GALE");
    }
  }
  windFields=windFields.filter(f=>f.life>0);

  if(ailoUltimateBurst.active){
    ailoUltimateBurst.life-=frameScale;
    for(const e of enemies){
      if(!e.alive) continue;
      const d=Math.max(1,dist(player.x,player.y,e.x,e.y));
      e.vx+=(player.x-e.x)/d*4.2*frameScale;e.vy+=(player.y-e.y)/d*4.2*frameScale;
      e.weathering=Math.max(e.weathering||0,360);
    }
    if(ailoUltimateBurst.life<=0){
      ailoUltimateBurst.active=false;
      addSlash(player.x,player.y,470,"#74ffb7",38,"windUltimate");
      addSlash(player.x,player.y,310,"#ffffff",28,"windUltimate");
      addParticles(player.x,player.y,"#74ffb7",34,9);
      for(const e of enemies) if(e.alive) hitEnemy(e,panelDamage(1,3.85,"ultimate",Math.random()*55)*windDamageScale(e,1),12,panelShieldDamage(1,82,"ultimate"),"#74ffb7","TEMPEST");
      addText(player.x,player.y-180,language==="en"?"TEMPEST COLLAPSE":"风暴坍缩","#74ffb7",true);
      doShake(24);doHitStop(5);flash=16;sfx("ultBoom");
    }
  }
}

function lisaAttack(){
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  const aim=getAimPoint(480),dir=aim.y>=player.y?1:-1,len=clamp(Math.abs(aim.y-player.y),150,430),halfW=48;
  player.attackCd=44;attackInputLock=20;player.facing=aim.x>=player.x?1:-1;
  const cy=player.y+dir*len*.5;
  addBladeTrail(player.x-halfW,player.y,player.x+halfW,player.y+dir*len,"#bda7ff",22,18,"windSkill");
  addSlash(player.x,cy,Math.max(90,len*.55),"#78f0c3",20,"windField");
  for(const e of enemies){
    if(!e.alive)continue;
    const insideX=Math.abs(e.x-player.x)<=halfW+e.r;
    const rel=(e.y-player.y)*dir;
    if(insideX&&rel>=-e.r&&rel<=len+e.r){e.weathering=Math.max(e.weathering||0,300);hitEnemy(e,panelDamage(5,.68,"normal",Math.random()*9)*windDamageScale(e,5),4,panelShieldDamage(5,15,"normal"),"#bda7ff","WEATHERING");}
  }
  addText(player.x,player.y+dir*len,language==="en"?"LENGTH "+Math.round(len):"攻击长度 "+Math.round(len),"#bda7ff",false);sfx("skill");doShake(5);
}

function lisaSkill(){
  const cost=58;
  if(player.skillCd>0||player.energy<cost||ult.active){if(player.energy<cost)showCenter(mt("notEnoughEnergy"),24);return;}
  player.energy-=cost;player.skillCd=210;lisaTeamDamageAmpTimer=420;
  ensureBattleRoleResources();
  battleRoleEnergy[player.role]=player.energy;
  for(const roleId of team){const max=roleMaxHpForBattle(roleId);battleRoleHp[roleId]=Math.max(1,Math.floor((battleRoleHp[roleId]||max)-max*.10));}
  syncPlayerResourcesFromRole();
  addSlash(player.x,player.y,230,"#bda7ff",30,"windSkill");addParticles(player.x,player.y,"#78f0c3",22,7);
  showCenter(language==="en"?"LAVENDER PACT · DMG +10%":"薰风契约 · 全队增伤10%",65);sfx("skill");
}

function lisaUltimateResolve(){
  ensureBattleRoleResources();
  for(const roleId of team)battleRoleHp[roleId]=Math.min(roleMaxHpForBattle(roleId),(battleRoleHp[roleId]||0)+30);
  lisaSelfDamageAmpTimer=480;syncPlayerResourcesFromRole();
  addSlash(player.x,player.y,360,"#78f0c3",40,"windUltimate");addParticles(player.x,player.y,"#bda7ff",36,8);
  addText(player.x,player.y-140,language==="en"?"LAVENDER RESTORATION · TEAM HP +30":"拉文德复苏 · 全队生命+30","#78f0c3",true);sfx("ultBoom");
}

function noxAttack(){
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  applyNoxRuinAttackCost();
  const target=lockTarget&&lockTarget.alive?lockTarget:nearestEnemy();
  player.attackCd=120;attackInputLock=38;
  if(target) player.facing=target.x>=player.x?1:-1;
  const sx=player.x+player.facing*64;
  addSlash(sx,player.y,145,"#b47cff",30,"hit");
  addBladeTrail(player.x-player.facing*28,player.y-70,sx+player.facing*86,player.y+55,"#b47cff",28,20,"heavyTrail");
  for(const e of enemies){
    if(e.alive&&withinDist(sx,player.y,e.x,e.y,132)) hitEnemy(e,panelDamage(2,2.20,"normal",Math.random()*30),28,panelShieldDamage(2,68,"normal"),"#b47cff","HEAVY HIT");
  }
  sfx("slash3");doShake(15);doHitStop(4);
}

function noxSkill(){
  const cost=85;
  if(player.skillCd>0 || player.energy<cost || ult.active){
    if(player.energy<cost) showCenter(language==="en"?"NOX REQUIRES 85 ENERGY":"诺克斯需要85点能量",28);
    return;
  }
  applyNoxRuinAttackCost();
  player.energy-=cost;player.skillCd=260;
  addSlash(W/2,H/2+60,560,"#b47cff",42,"noxBlast");
  addSlash(W/2,H/2+60,390,"#ffffff",28,"noxBlast");
  addParticles(W/2,H/2+60,"#b47cff",38,10);
  for(const e of enemies) if(e.alive) hitEnemy(e,panelDamage(2,4.00,"skill",Math.random()*62),18,panelShieldDamage(2,112,"skill"),"#b47cff","VOID BLAST");
  addText(W/2,H*.27,language==="en"?"MAP-WIDE DETONATION":"全域爆破","#d9baff",true);
  sfx("ultBoom");doShake(25);doHitStop(6);flash=17;
}

function noxUltimateResolve(){
  noxDamageAmpTimer=480;
  const recoil=Math.floor(playerMaxHp()*.20);
  player.hp=Math.max(1,player.hp-recoil);saveCurrentRoleHp();
  addText(player.x,player.y-45,(language==="en"?"OVERLOAD -":"超载损耗 -")+recoil,"#c9a2ff",true);
  addSlash(W/2,H/2+60,620,"#b47cff",52,"noxUltimate");
  addSlash(W/2,H/2+60,430,"#15111f",38,"noxUltimate");
  addSlash(W/2,H/2+60,270,"#ffffff",30,"noxUltimate");
  for(const e of enemies) if(e.alive) hitEnemy(e,panelDamage(2,5.70,"ultimate",Math.random()*85),26,panelShieldDamage(2,142,"ultimate"),"#b47cff","ANNIHILATION");
  addText(W/2,H*.24,language==="en"?"RUIN · DMG +20% · ATTACK HP COST":"毁灭状态 · 增伤20% · 攻击消耗生命","#d9baff",true);
  sfx("ultBoom");doShake(30);doHitStop(7);flash=22;
}

function applyNoxRuinAttackCost(){
  if(player.role!==2 || noxDamageAmpTimer<=0) return;
  const cost=Math.max(1,Math.floor(playerMaxHp()*.05));
  player.hp=Math.max(1,player.hp-cost);
  saveCurrentRoleResources();
  addText(player.x,player.y-44,(language==="en"?"RUIN OVERLOAD -":"毁灭过载 -")+cost,"#c9a2ff",true);
}

function hitEnemy(e,dmg,knock=8,stunDmg=16,color="#fff",label=null){
  const periodicImpact=label==="GALE"||label==="FROST"||label==="DOMAIN"||label==="BIND";
  if(!periodicImpact) sfx("hit");
  sfxElementImpact(player.role,label||"");
  let final=dmg, crit=false;

  let shieldDmg = stunDmg;
  if(label==="PARRY!" || label==="CHAIN") shieldDmg *= 2.3;
  else if(label==="3rd HIT") shieldDmg *= 1.45;
  else if(label==="ULT") shieldDmg *= 1.8;
  else if(label==="ICE" || label==="FROST") shieldDmg *= 1.35;
  else if(label==="EVERWINTER") shieldDmg *= 2.5;
  else if(label==="CORE" || label==="GRAY DOMAIN") shieldDmg *= 2.1;
  else if(label==="FOCUS HIT") shieldDmg *= 1.6;

  if(e.shield && e.shield > 0){
    e.shield -= shieldDmg;
    final *= 0.35;
    addText(e.x,e.y-e.r-32,"SHIELD", "#7cc7ff");
    if(e.shield <= 0){
      e.shield = 0;
      addText(e.x,e.y,"SHIELD BREAK","#ffe066",true);
      addParticles(e.x,e.y,"#ffe066",12,6);
      spawnMetalImpact(e.x,e.y,e.boss?22:14,e.boss?8:6,!!e.boss);
      addSlash(e.x,e.y,170,"#ffe066",26,"break");
      addBladeTrail(e.x-90,e.y-48,e.x+90,e.y+48,"#ffe066",20,12,"breakTrail");
      triggerBreak(e);
      gainUlt(180, "shieldBreak");
      doShake(10);
      doHitStop(3);
    }
  }

  if(player.perfectBuff>0){ final*=1.20; player.perfectBuff=0; crit=true; addText(e.x,e.y-e.r-48,"DODGE BONUS","#7cc7ff",true); }
  if(e.stun<=0) final*=1.3;
  final = Math.max(1, Math.floor(final));
  e.hp-=final;
  if(e.trainingDummy) e.hp=e.maxHp;
  const effectiveStunDmg = Math.min(stunDmg, e.boss ? 42 : 34);
  e.stun -= effectiveStunDmg;
  e.hit = Math.min(10, Math.max(4, Math.floor(effectiveStunDmg/4)));
  const dx=e.x-player.x, dy=e.y-player.y, l=Math.hypot(dx,dy)||1;
  e.vx+=dx/l*knock; e.vy+=dy/l*knock;
  combo++; comboTimer=100; addStyle(label==="PARRY!"?65:label==="ULT"?80:label==="3rd HIT"?35:18); player.energy=clamp(player.energy+8,0,100);
  const repeatedHit=label==="GALE"||label==="FROST"||label==="DOMAIN"||label==="BIND";
  const heavyUltGain=label==="HEAVY HIT"||label==="3rd HIT"||label==="FOCUS HIT";
  gainUlt(repeatedHit?18:heavyUltGain?110:70,"hit");
  addParticles(e.x,e.y,color,e.boss?14:10,e.boss?5:4);
  if(label==="PARRY!" || label==="3rd HIT" || label==="FOCUS HIT") spawnMetalImpact(e.x,e.y,e.boss?20:12,e.boss?8:6,!!e.boss);
  addSlash(e.x,e.y,e.boss?105:74,color,14,"hit");
  addText(e.x,e.y-e.r-10,(crit?"CRIT ":"")+Math.floor(final),crit?"#ffe066":color,crit);
  if(label) addText(e.x,e.y+e.r+28,label,color,label.includes("PARRY"));
  const heavyHit = label==="PARRY!" || label==="3rd HIT" || label==="FOCUS HIT" || label==="ULT";
  doShake(e.boss?(heavyHit?18:14):(heavyHit?11:8));
  doHitStop(e.boss?(heavyHit?9:7):(heavyHit?7:5));
  flash=Math.max(flash,heavyHit?8:6);
  if(e.stun<=0 && e.stun>-999 && !(e.breakLock>0)){
    e.breakLock = e.boss ? 90 : 70;
    e.stun=-(e.boss ? 32 : 24);
    addText(e.x,e.y,"DAZE BREAK","#ffe066",true);
    addParticles(e.x,e.y,"#ffe066",14,5);
    addSlash(e.x,e.y,145,"#ffe066",22,"break");
    triggerBreak(e);
    doShake(9);
    doHitStop(3);
  }
  if(e.crystalColossus && e.hp<=0 && e.alive && e.colossusBarsLeft>1){
    e.colossusBarsLeft--;
    e.phase=2;
    e.hp=e.maxHp;
    e.stun=e.maxStun;
    e.breakLock=105;
    e.windup=0;
    e.attackCd=100;
    e.rage=true;
    addText(e.x,e.y-100,language==="en"?"CORE REFORMED":"核心重构","#9ad7ff",true);
    addParticles(e.x,e.y,"#9ad7ff",30,7);
    addSlash(e.x,e.y,240,"#d8c8ff",32,"break");
    showActionPrompt(language==="en"?"Phase II · Colossus damage +10%":"第二阶段 · 巨人伤害提高10%",110);
    doShake(24); doHitStop(10); flash=Math.max(flash,12);
    return;
  }
  if(e.bossKros && e.hp<=0 && e.alive && e.krosBarsLeft>1){
    e.krosBarsLeft--;
    e.phase = krosPhaseFromBars(e);
    e.hp = e.maxHp;
    e.stun = e.maxStun;
    e.breakLock = 120;
    e.windup = 0;
    e.attackCd = 150;
    e.krosPattern = 150;

    if(e.phase===2){
      e.maxShield = Math.floor(e.maxHp * .5);
      e.shield = e.maxShield;
    }

    if(e.phase===3){
      e.rage = true;
    }

    addText(e.x,e.y-100,"CRYSTAL BREAK","#ff6b9b",true);
    addParticles(e.x,e.y,"#ff6b9b",34,8);
    addSlash(e.x,e.y,260,"#ff6b9b",36,"break");
    addBladeTrail(e.x-150,e.y-82,e.x+150,e.y+82,"#ff6b9b",26,14,"breakTrail");

    startKrosPhaseTransition(e);

    if(e.phase===3){
      // The full-map blast happens after the phase title breathes for a moment.
      addBossHazard(W/2,H/2+80,520,110,"full");
    }
    return;
  }
  if(e.hp<=0 && e.alive){ gainUlt(e.boss ? 420 : 180, "kill"); e.alive=false; totalKills++; if(e.boss) totalBossKills++; checkAchievements(); addText(e.x,e.y,e.boss?"BOSS DOWN":"K.O.","#fff",true); addParticles(e.x,e.y,"#fff",9,5); }
}



// V43.4 Damage From Operator Panel
function battleRoleAtk(roleId){
  return Math.max(1, Math.floor(operatorStatAtk(roleId)));
}

function battleRoleBreak(roleId){
  return isProtagonist(roleId) ? 210 : (roleId===3 ? 175 : 150);
}

function battleRoleNormalLv(roleId){
  return Math.max(1, Math.floor(roleSkillAutoValue(roleId, "normal") || 1));
}

function battleRoleSkillLv(roleId){
  return Math.max(1, Math.floor(roleSkillAutoValue(roleId, "skill") || 1));
}

function battleRoleUltimateLv(roleId){
  return Math.max(1, Math.floor(roleSkillAutoValue(roleId, "ultimate") || 1));
}

function battleRoleWeaponLv(roleId){
  return Math.max(1, Math.floor(roleWeaponLevelDisplay(roleId) || 1));
}

function panelDamage(roleId, multiplier, kind="normal", randomBonus=0){
  const atk = battleRoleAtk(roleId);
  const lv = roleDisplayLevel(roleId);
  const wlv = battleRoleWeaponLv(roleId);
  let skillLv = battleRoleNormalLv(roleId);
  if(kind==="skill") skillLv = battleRoleSkillLv(roleId);
  if(kind==="ultimate") skillLv = battleRoleUltimateLv(roleId);
  const growth = 1 + skillLv*0.035 + wlv*0.006 + lv*0.002;
  const modules=roleModuleTotals(roleId);
  let setScale=1;
  if(teamDamageAmpTimer>0) setScale+=.18;
  if(lisaTeamDamageAmpTimer>0) setScale+=.10;
  if(roleId===5 && lisaSelfDamageAmpTimer>0) setScale+=.05;
  if(roleId===0 && kaneSigils.some(s=>s.life>0)) setScale+=.05;
  if(roleId===2 && noxDamageAmpTimer>0) setScale+=.20;
  if(kind==="skill") setScale+=modules.skillDamagePct||0;
  if(roleId===player.role && playerMaxHp()>0 && player.hp/playerMaxHp()>.70) setScale+=modules.highHpDamagePct||0;
  return Math.max(1, Math.floor((atk * multiplier * growth + randomBonus)*setScale));
}

function panelShieldDamage(roleId, base=20, kind="normal"){
  const br = battleRoleBreak(roleId);
  const lv = roleDisplayLevel(roleId);
  const skillLv = kind==="ultimate" ? battleRoleUltimateLv(roleId) : kind==="skill" ? battleRoleSkillLv(roleId) : battleRoleNormalLv(roleId);
  return Math.max(1, Math.floor(base + br*0.18 + skillLv*3 + lv*0.5));
}


function chainAttack(){
  if(!chainReady) return;
  const target = chainTarget && chainTarget.alive ? chainTarget : nearestEnemy();
  if(!target){ chainReady=false; return; }

  chainReady = false;
  chainTarget = null;

  // A defeated executor cannot be selected by a chain attack either.
  const assistRole=nextLivingTeamRole(player.role);
  if(assistRole<0){
    showCenter(language==="en"?"No available chain partner":"没有可连携的执行官",28);
    return;
  }
  setBattleRole(assistRole);
  const role = roles[player.role];
  applyNoxRuinAttackCost();

  player.x = target.x - 70;
  player.y = target.y;
  player.facing = 1;
  player.inv = 30;
  player.attackCd = 28;

  showCenter("CHAIN ATTACK", 52);
  showActionPrompt(roleName(player.role) + msg("chainEntry"), 54);
  totalChains++;
  checkAchievements();
  sfx("chain");

  addSlash(target.x, target.y, 190, role.color, 28, "chain");
  addSlash(target.x, target.y, 110, "#ffffff", 22, "chain");
  addParticles(target.x, target.y, role.color, 8, 6);
  if(player.role===3){
    addIceCircle(target.x,target.y,170,42,"ice");
    for(const e of enemiesInCircle(target.x,target.y,170)){
      freezeEnemy(e,32);
      hitEnemy(e, panelDamage(player.role, 1.75, "skill", Math.random()*35), 18, panelShieldDamage(player.role, 90, "skill"), "#88d8ff", "CHAIN");
    }
    addText(target.x,target.y-120,"CHAIN FROST","#88d8ff",true);
  }else{
    hitEnemy(target, panelDamage(player.role, 2.25, "skill", Math.random()*55), 32, panelShieldDamage(player.role, 110, "skill"), role.color, "CHAIN");
  }
  addStyle(120);
  doShake(24);
  doHitStop(4);
  flash = Math.max(flash, 15);
}

function protagonistAttack(){
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  const lv=protagonistLevel(), skl=protagonistSkillLevel();
  if(player.chainTimer<=0) player.chain=0;
  player.chain=(player.chain%3)+1;
  player.chainTimer=42;
  const step=player.chain;
  const sx=player.x+player.facing*(step===3?50:35);
  const range=step===3?92:76;
  const color=step===3?"#ffffff":"#cfd3d8";
  player.attackCd=step===3?32:28;
  attackInputLock=18;
  sfx(step===1?"slash1":step===2?"slash2":"slash3");
  combatPolishSlash(sx, player.y, player.facing, step, color);
  spawnProtagonistLineBurst(sx,player.y,player.facing,step===3?10:6,step===3?7:5);
  for(const e of enemies){
    if(e.alive && withinDist(sx,player.y,e.x,e.y,range)){
      const mults=[0.62,0.78,1.10];
      spawnMetalImpact(e.x,e.y,step===3?14:8,step===3?7:4,!!e.boss);
      hitEnemy(e,panelDamage(player.role,mults[step-1],"normal",Math.random()*18),step===3?18:8,step===3?panelShieldDamage(player.role,46,"normal"):panelShieldDamage(player.role,20,"normal"),color,step===3?"FOCUS HIT":null);
      break;
    }
  }
}

function protagonistSkill(){
  if(player.skillCd>0 || player.energy<SKILL_ENERGY_COST || ult.active){
    if(player.energy<SKILL_ENERGY_COST) showCenter(mt("notEnoughEnergy"),24);
    return;
  }
  const target = lockTarget && lockTarget.alive ? lockTarget : nearestEnemy();
  if(!target){
    showCenter(language==="en"?"NO TARGET":"没有目标",28);
    return;
  }
  player.energy-=SKILL_ENERGY_COST;
  player.skillCd=210;
  sfx("skill");
  showCenter(language==="en"?"MONOCHROME BIND":"黑白缚锁",34);
  doShake(10);
  doHitStop(3);
  player.facing=target.x>=player.x?1:-1;
  protagonistBindings = protagonistBindings.filter(b=>b.target!==target);
  protagonistBindings.push({target,life:150,max:150,tick:75,angle:0});
  target.freeze=Math.max(target.freeze||0,target.boss?2:4);
  spawnProtagonistLineBurst(target.x,target.y,player.facing,18,8);
  addText(target.x,target.y-target.r-58,language==="en"?"BOUND · 2.5s":"缚锁 · 2.5秒","#ffffff",true);
}

function protagonistUltimateResolve(){
  protagonistDomain={active:true,life:150,max:150,tick:1,sweepIndex:0};
  protagonistSweeps=[];
  spawnProtagonistLineBurst(player.x,player.y,player.facing,28,10);
  doShake(22);
  doHitStop(4);
  flash=12;
  addText(W/2,H*.30,language==="en"?"MONOCHROME DOMAIN · 2.5s":"黑白领域 · 2.5秒","#ffffff",true);
}

function spawnProtagonistLineBurst(x,y,facing=1,count=7,power=5){
  if(!particlesEnabled) return;
  const palette=["#ffffff","#a7a9ad","#15171c"];
  for(let i=0;i<count;i++){
    const a=(Math.random()-.5)*1.9+(facing<0?Math.PI:0);
    const speed=1.8+Math.random()*power;
    particles.push({
      x:x+(Math.random()-.5)*24,y:y+(Math.random()-.5)*24,
      vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,
      life:22+Math.random()*18,max:40,size:1.2+Math.random()*2,
      len:10+Math.random()*22,angle:a,color:palette[i%palette.length],spark:true
    });
  }
  trimRuntimeCollections();
}

function protagonistFixedDamage(e,amount,color="#ffffff",label="BIND"){
  if(!e||!e.alive) return;
  const dealt=Math.min(amount,Math.max(0,e.hp));
  if(e.hp<=amount){
    e.hp=1;
    hitEnemy(e,1,0,0,color,label);
  }else{
    e.hp-=amount;
    e.hit=Math.max(e.hit||0,3);
    addText(e.x,e.y-e.r-12,String(dealt),color,false);
    spawnProtagonistLineBurst(e.x,e.y,Math.random()>.5?1:-1,5,4);
  }
}

function addProtagonistSweep(index){
  const pad=26, top=105, bottom=H-28;
  const patterns=[
    {x1:pad,y1:top+70,x2:W-pad,y2:bottom-40},
    {x1:W-pad,y1:top+40,x2:pad,y2:bottom-70},
    {x1:pad,y1:H*.48,x2:W-pad,y2:H*.48},
    {x1:W*.50,y1:top,x2:W*.50,y2:bottom}
  ];
  const p=patterns[index%patterns.length];
  protagonistSweeps.push({...p,life:24,max:24,color:index%3===0?"#ffffff":index%3===1?"#8f9299":"#17191f"});
  if(protagonistSweeps.length>14) protagonistSweeps.splice(0,protagonistSweeps.length-14);
}

function updateProtagonistCombatEffects(){
  for(const bind of protagonistBindings){
    const e=bind.target;
    bind.life-=frameScale;
    bind.tick-=frameScale;
    bind.angle+=.055*frameScale;
    if(!e||!e.alive){bind.life=0;continue;}
    e.freeze=Math.max(e.freeze||0,e.boss?2:4);
    if(!e.boss)e.windup=0;
    e.vx*=e.boss ? .75 : .55;e.vy*=e.boss ? .75 : .55;
    if(bind.tick<=0){
      bind.tick+=75;
      protagonistFixedDamage(e,40,"#ffffff","BIND");
      sfx("hit");
    }
  }
  protagonistBindings=protagonistBindings.filter(b=>b.life>0&&b.target&&b.target.alive);

  if(protagonistDomain.active){
    protagonistDomain.life-=frameScale;
    protagonistDomain.tick-=frameScale;
    if(protagonistDomain.tick<=0){
      protagonistDomain.tick+=40;
      addProtagonistSweep(protagonistDomain.sweepIndex++);
      for(const e of enemies){
        if(!e.alive) continue;
        hitEnemy(e,panelDamage(PROTAGONIST_ROLE,.18,"ultimate",Math.random()*6),2,panelShieldDamage(PROTAGONIST_ROLE,8,"ultimate"),"#ffffff","DOMAIN");
      }
      sfx("slash2");
    }
    if(protagonistDomain.life<=0){
      protagonistDomain.active=false;
      protagonistDomain.life=0;
      addText(W/2,H*.30,language==="en"?"DOMAIN ENDED":"领域消散","#a7a9ad",true);
    }
  }
  protagonistSweeps=protagonistSweeps.filter(s=>(s.life-=frameScale)>0);
}

function isPhysicalRole(roleId){
  return !!roles[roleId] && roles[roleId].element==="physical";
}

function updateKaneCombatEffects(){
  for(const sigil of kaneSigils){
    sigil.life-=frameScale;
    for(const e of enemies){
      if(!e.alive || sigil.hit.has(e) || dist(sigil.x,sigil.y,e.x,e.y)>sigil.r) continue;
      sigil.hit.add(e);
      addSlash(e.x,e.y,120,"#ff5757",24,"ultimate");
      addSlash(e.x,e.y,74,"#ffe066",18,"ultimate");
      addParticles(e.x,e.y,"#ffbe5c",18,7);
      hitEnemy(e,panelDamage(0,2.35,"ultimate",Math.random()*45),20,panelShieldDamage(0,82,"ultimate"),"#ff735f","MARK BURST");
      doShake(16);doHitStop(3);flash=Math.max(flash,9);sfx("ultBoom");
    }
  }
  kaneSigils=kaneSigils.filter(s=>s.life>0);
}

function attack(){
  damageNearbyBattleCrates(player.x+player.facing*55,player.y,105);
  if(isProtagonist(player.role)){ protagonistAttack(); return; }
  if(isFloraRole()){ floraAttack(); return; }
  if(player.role===1){ ailoAttack(); return; }
  if(player.role===2){ noxAttack(); return; }
  if(player.role===5){ lisaAttack(); return; }
  if(player.attackCd>0 || attackInputLock>0 || ult.active) return;
  const role=roles[player.role];
  const cd = charData[player.role];
  if(player.chainTimer<=0) player.chain=0;
  player.chain=(player.chain%3)+1; player.chainTimer=38;
  const step=player.chain, sx=player.x+player.facing*(step===3?48:34), range=step===3?105:82, color=step===3?role.color:role.sub;
  player.attackCd=step===3?32:28;
  attackInputLock=18;
  sfx(step===1?"slash1":step===2?"slash2":"slash3");
  combatPolishSlash(sx, player.y, player.facing, step, color);
  for(const e of enemies){
    if(e.alive && withinDist(sx,player.y,e.x,e.y,range)){
      spawnMetalImpact(e.x,e.y,step===3?16:9,step===3?7:4,!!e.boss);
      let damageScale=1,shieldDamage=step===3?panelShieldDamage(player.role,46,"normal"):panelShieldDamage(player.role,18,"normal"),label=step===3?"3rd HIT":null;
      if(player.role===0 || (step===3&&isPhysicalRole(player.role))){
        const triggered=step===3 && isPhysicalRole(player.role) && (e.physicalPain||0)>0;
        if(triggered){
          if((e.shield||0)>0){shieldDamage=Math.max(shieldDamage,e.shield+1);label="PAIN BREAK";}
          else {damageScale=1.15;label="PAIN +15%";}
          e.physicalPain=0;
        }else if(player.role===0){
          e.physicalPain=360;
          label=step===3?"PHYSICAL PAIN":"PAIN";
        }
      }
      hitEnemy(e,panelDamage(player.role,[0.72,0.90,1.35][step-1],"normal",Math.random()*18)*damageScale,step===3?20:8,shieldDamage,color,label);
    }
  }
}
function skill(){
  if(isProtagonist(player.role)){ protagonistSkill(); return; }
  if(isFloraRole()){ floraSkill(); return; }
  if(player.role===1){ ailoSkill(); return; }
  if(player.role===2){ noxSkill(); return; }
  if(player.role===5){ lisaSkill(); return; }
  if(player.skillCd>0 || player.energy<SKILL_ENERGY_COST || ult.active){ if(player.energy<SKILL_ENERGY_COST) showCenter(mt("notEnoughEnergy"),24); return; }
  const role=roles[player.role]; const cd=charData[player.role]; player.energy-=SKILL_ENERGY_COST; player.skillCd=68;
  const sx=player.x+player.facing*65;
  addSlash(sx,player.y,118,role.color,18,"skill");
  addBladeTrail(player.x-player.facing*20,player.y-44,sx+player.facing*70,player.y+34,role.color,18,14,"skillTrail");
  addParticles(sx,player.y,role.color,12,5);
  spawnMetalImpact(sx,player.y,10,5,false);
  sfx("skill"); showCenter(player.role===0?(language==="en"?"BATTLE COMMAND · DMG +18%":"战术号令 · 全队增伤18%") : "E SKILL",24); doShake(11); doHitStop(4);
  if(player.role===0) teamDamageAmpTimer=480;
  for(const e of enemies) if(e.alive && withinDist(sx,player.y,e.x,e.y,135)){
    let damageScale=1,shieldDamage=panelShieldDamage(player.role,45,"skill"),label=null;
    if(isPhysicalRole(player.role)){
      if((e.physicalPain||0)>0){
        if((e.shield||0)>0){shieldDamage=Math.max(shieldDamage,e.shield+1);label="PAIN BREAK";}
        else {damageScale=1.15;label="PAIN +15%";}
        e.physicalPain=0;
      }else if(player.role===0){e.physicalPain=360;label="PHYSICAL PAIN";}
    }
    hitEnemy(e,panelDamage(player.role,2.05,"skill",Math.random()*35)*damageScale,16,shieldDamage,role.color,label);
  }
}
function ultimate(){
  if(player.ultCd>0 || player.ult<ULT_MAX || ult.active){ if(player.ult<ULT_MAX) showCenter(mt("ultimateNotReady"),28); return; }
  player.ult=0; saveCurrentRoleResources(); player.ultCd=210; player.inv=100; ult={active:true,timer:0,role:player.role,hitDone:false}; sfx("ultStart"); showCenter("ULTIMATE",35);
}
function resolveUltimate(){
  if(isProtagonist(ult.role)){ protagonistUltimateResolve(); return; }
  if(ult.role===3){ floraUltimateResolve(); return; }
  if(ult.role===1){
    ailoUltimateBurst={active:true,life:42,max:42};
    addSlash(player.x,player.y,500,"#74ffb7",52,"windUltimate");
    addText(player.x,player.y-165,language==="en"?"TEMPEST CONVERGENCE":"万风汇聚","#74ffb7",true);
    sfx("ultStart");return;
  }
  if(ult.role===2){ noxUltimateResolve(); return; }
  if(ult.role===5){ lisaUltimateResolve(); return; }
  const role=roles[ult.role]; const cd=charData[ult.role];
  if(ult.role===0){
    kaneSigils.push({x:player.x+player.facing*75,y:player.y,r:175,life:360,max:360,hit:new WeakSet()});
    addSlash(player.x+player.facing*75,player.y,175,"#ff5757",32,"ultimate");
    addParticles(player.x+player.facing*75,player.y,"#ffbe5c",20,7);doShake(18);flash=10;
    addText(player.x+player.facing*75,player.y-105,language==="en"?"MARK OF KANE":"凯之印","#ffe066",true);
    sfx("ultBoom");return;
  }
  addSlash(player.x,player.y,260,role.color,28,"ultimate"); addSlash(player.x,player.y,180,"#fff",22,"ultimate");
  addParticles(player.x,player.y,role.color,14,6); doShake(22); doHitStop(4); flash=12;
  for(const e of enemies) if(e.alive && dist(player.x,player.y,e.x,e.y)<330) hitEnemy(e,panelDamage(ult.role,5.20,"ultimate",Math.random()*90),24,panelShieldDamage(ult.role,105,"ultimate"),role.color,"ULT");
}

// V43.5 Perfect Dodge
function incomingPerfectDodgeThreat(){
  // Enemy melee red-warning window
  for(const e of enemies){
    if(!e.alive) continue;
    const d = dist(player.x,player.y,e.x,e.y);
    const window = e.windup > 0 && e.windup < (e.boss ? 34 : 26);
    if(window && d < enemyAttackHitRange(e)+28) return {type:"melee", source:e};
  }

  // Projectiles close to player
  if(projectiles){
    for(const p of projectiles){
      if(p.life > 0 && withinDist(player.x,player.y,p.x,p.y,52)) return {type:"projectile", source:p};
    }
  }

  // Boss hazard detonation window: armed soon / just armed
  if(bossHazards){
    for(const h of bossHazards){
      if(h.type === "poison") continue;
      const nearTiming = h.delay <= 14 && h.delay > -8;
      if(nearTiming && withinDist(player.x,player.y,h.x,h.y,h.r+22)) return {type:"hazard", source:h};
    }
  }

  return null;
}

function triggerPerfectDodge(threat=null){
  player.inv = Math.max(player.inv || 0, 34);
  player.perfectBuff = Math.max(player.perfectBuff || 0, 1);
  player.perfectDodgeTimer = 34;
  player.energy = clamp((player.energy || 0) + 15, 0, 100);
  gainUlt(160, "perfectDodge");
  slowMo = Math.max(slowMo || 0, 30);
  flash = Math.max(flash || 0, 8);
  doShake(10);
  doHitStop(4);
  addStyle(90);
  addText(player.x, player.y-62, language==="en"?"PERFECT DODGE":"极限闪避", "#7cc7ff", true);
  addSlash(player.x, player.y, 120, "#7cc7ff", 20, "parry");
  addParticles(player.x, player.y, "#7cc7ff", 12, 5);
  sfx("parry");
  if(threat && threat.source){
    if(threat.type==="projectile") threat.source.life = Math.min(threat.source.life, 8);
    if(threat.type==="melee"){
      threat.source.windup = 0;
      threat.source.attackCd = Math.max(threat.source.attackCd || 0, threat.source.boss ? 60 : 42);
    }
  }
  showActionPrompt(language==="en"?"PERFECT DODGE +15 EN":"极限闪避  能量+15",60);
}

function tryPerfectDodge(){
  if(player.dashCd>0 || ult.active) return false;
  const threat = incomingPerfectDodgeThreat();
  if(!threat) return false;
  triggerPerfectDodge(threat);
  return true;
}


function dash(){
  if(player.dashCd>0||ult.active) return;
  const perfect = tryPerfectDodge();
  let dx=0,dy=0; if(keys.w)dy-=1; if(keys.s)dy+=1; if(keys.a)dx-=1; if(keys.d)dx+=1; if(dx===0&&dy===0) dx=player.facing;
  const l=Math.hypot(dx,dy)||1; dx/=l; dy/=l;
  const recovery=clamp(roleModuleTotals(player.role).dashRecoveryPct||0,0,.5);
  player.dashCd=Math.max(18,Math.round((perfect?34:40)*(1-recovery)));
  player.inv=Math.max(player.inv || 0, perfect?34:18);
  player.vx+=dx*(perfect?14:11);
  player.vy+=dy*(perfect?14:11);
  addParticles(player.x,player.y,perfect?"#7cc7ff":"#9ad7ff",perfect?14:8,perfect?5:3);
}
function switchRole(){
  if(ult.active) return;

  if(player.switchCd>0){
    showCenter(msg("switchCooldown") + Math.ceil(player.switchCd/60*10)/10 + "s", 20);
    return;
  }

  if(!Array.isArray(team)||team.length<=1){
    showCenter(language==="en"?"No reserve executor":"没有可切换的执行官",28);
    return;
  }

  const nextRole=nextLivingTeamRole(player.role);
  if(nextRole<0){
    showCenter(language==="en"?"No available reserve executor":"没有可上场的后备执行官",28);
    return;
  }
  setBattleRole(nextRole);

  const role=roles[player.role];
  player.switchCd = SWITCH_CD_FRAMES;
  player.chain=0; player.chainTimer=0;
  player.attackCd = Math.max(player.attackCd, 12);
  showCenter(roleName(player.role)+mt("entrySuffix"),35);
  addSlash(player.x+player.facing*54,player.y,110,role.color,16,"entry");
}
function tryParry(){
  if(ult.active || player.guardTimer>0) return false;
  const target=findParryEnemy();
  if(!target){
    showActionPrompt(language==="en"?"No attack to parry":"当前没有可弹刀的攻击",24);
    return false;
  }
  player.guardTimer=18;
  player.parryTarget=target;
  player.parryReady=1;
  parryCounter();
  totalParries++;
  checkAchievements();
  return true;
}
function handleBattleRAction(){
  // R is contextual, but mutually exclusive: a valid parry window always wins.
  // Only when no attack can be parried may the same press switch executor.
  const parryTarget=findParryEnemy();
  if(parryTarget){
    player.parryTarget=parryTarget;
    return tryParry();
  }
  switchRole();
  return true;
}
function parryCounter(){
  const t=player.parryTarget && player.parryTarget.alive ? player.parryTarget : nearestEnemy(); if(!t)return;
  const role=roles[player.role];
  player.parryReady=0;
  player.parryTarget=null;
  player.guardTimer=0;
  player.inv=22;
  player.attackCd=34;
  player.switchCd=Math.max(player.switchCd, 55);
  t.windup=0;
  t.attackCd=Math.max(t.attackCd, t.boss?120:95);
  t.parried=32;
  player.facing=t.x>=player.x?1:-1;
  applyNoxRuinAttackCost();
  sfx(t.boss ? "parryBoss" : "parry");
  const parryLabel = t.boss ? "PERFECT PARRY" : "TING! PARRY COUNTER";
  showCenter(parryLabel,56);
  spawnParrySpark((player.x+t.x)/2, (player.y+t.y)/2-6, t.boss?32:24, !!t.boss);
  addSlash(t.x,t.y,t.boss?220:170,"#fff",26,"parry");
  addSlash(t.x,t.y,t.boss?155:112,"#ffe082",22,"parry");
  addSlash(t.x,t.y,105,role.color,18,"parry");
  doShake(t.boss?18:12); doHitStop(t.boss?12:9);
  hitEnemy(t,panelDamage(player.role,1.80,"skill",Math.random()*35),24,panelShieldDamage(player.role,52,"skill"),"#fff","PARRY!"); showActionPrompt(t.boss?"PERFECT PARRY!":"PARRY COUNTER!",78); addStyle(t.boss?180:130); player.energy=clamp(player.energy+25,0,100); gainUlt(420, "ultimateHit"); slowMo=t.boss?18:14;
}
function toggleLock(){ if(lockTarget&&lockTarget.alive){lockTarget=null; showCenter("LOCK OFF",22);} else {lockTarget=nearestEnemy(); if(lockTarget)showCenter("LOCK ON",22);} }


function updateDefeat(){
  menuPulse++;
  if((clicked&&inRect(W/2-250,H/2+62,220,56)) || justPressed("enter") || justPressed(" ")){
    clicked=false;
    startBattle();
    return;
  }
  if((clicked&&inRect(W/2+30,H/2+62,220,56)) || justPressed("escape")){
    clicked=false;
    if(battleModeSource==="daydream"){
      if(window.PZDaydream&&typeof window.PZDaydream.completeBattle==="function") window.PZDaydream.completeBattle(false);
      selectedTab="daydream";
      battleModeSource="main";
      daydreamBattleConfig=null;
    }
    if(battleModeSource==="bossKros"){
      selectedTab="dungeon";
      dungeonPanelMode="boss";
    }
    clearTransientBattleState();
    resetBattleSourceToMain();
    gameMode="operation";
    return;
  }
  clicked=false;
}

function drawDefeat(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#260808");
  bg.addColorStop(.65,"#090812");
  bg.addColorStop(1,"#030305");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(0,0,0,.48)";
  ctx.fillRect(W/2-340,H/2-145,680,300);
  ctx.strokeStyle="rgba(255,85,85,.75)";
  ctx.strokeRect(W/2-340,H/2-145,680,300);
  ctx.textAlign="center";
  ctx.fillStyle="#ff5555";
  ctx.font="bold 46px " + FONT_UI;
  ctx.fillText(tx("missionFailedTitle"),W/2,H/2-55);
  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="18px " + FONT_UI;
  ctx.fillText(tx("defeatHint"),W/2,H/2+10);
  drawBtn(tr("重新挑战","Retry"),"ENTER",W/2-250,H/2+62,220,56,true,"#ff7777");
  drawBtn(tx("backMap"),"ESC",W/2+30,H/2+62,220,56,false,"#ffffff");
}






function syncLoginClaimIndex(){
  let n = 0;
  for(let i=0;i<loginRewards.length;i++){
    if(loginRewards[i].claimed) n = i + 1;
  }
  loginClaimIndex = Math.max(loginClaimIndex || 0, n);
  loginClaimIndex = clamp(loginClaimIndex, 0, loginRewards.length);
}


function normalizeDailyRewards(){
  if(!Array.isArray(loginRewards)) return;
  loginClaimIndex = clamp(loginClaimIndex || 0, 0, loginRewards.length);
  for(let i=0;i<loginRewards.length;i++){
    loginRewards[i].claimed = i < loginClaimIndex;
  }
}

function fixEventData(){
  if(!Array.isArray(loginRewards)) loginRewards = [];
  if(!Array.isArray(levelRewards)) levelRewards = [];
  for(const r of loginRewards){
    if(typeof r.claimed !== "boolean") r.claimed = false;
  }
  for(const r of levelRewards){
    if(typeof r.claimed !== "boolean") r.claimed = false;
  }
  syncLoginClaimIndex();
  normalizeDailyRewards();
}

function fixRuntimeValues(){
  if(!Number.isFinite(playerLevel) || playerLevel < 1) playerLevel = 1;
  if(!Number.isFinite(playerExp) || playerExp < 0) playerExp = 0;
  if(!Number.isFinite(playerExpNeed) || playerExpNeed < 1) playerExpNeed = 1600;
  if(!Number.isFinite(protagonistStoryLevel) || protagonistStoryLevel < 1) protagonistStoryLevel = 1;
  syncProtagonistStoryLevelFromProgress();
  if(!Number.isFinite(crystals) || crystals < 0) crystals = 0;
  if(!Number.isFinite(gold) || gold < 0) gold = 0;
}
function normalizeProfile(){
  if(hasCreatedProfile && !playerUID){
    playerUID = createUID();
    saveGame();
  }
}

function getClearedStageCount(){
  let n = 0;
  for(let i=1;i<=stages.length;i++){
    if(cleared[i]) n = i;
  }
  return n;
}

function getProfileProgressText(){
  const n = getClearedStageCount();
  if(n <= 0) return mt("notCleared");
  return mt("chapterProgressPrefix") + n + "/" + stages.length;
}

function goMode(mode){
  clicked = false;
  mouseDown = false;
  mouseAttackConsumed = false;
  gameMode = mode;
}

function createUID(){
  return String(10000000 + Math.floor(Math.random()*90000000));
}

function cleanPlayerName(s){
  return String(s || "").trim().replace(/\s+/g, "").slice(0, 12);
}

const PZ_BLOCKED_TEXT_TERMS = [
  "操你妈","草你妈","草泥马","傻逼","煞笔","妈的","狗日","去死","滚你妈","废物东西",
  "色情","约炮","援交","裸聊","毒品","冰毒","海洛因","赌博","诈骗","代充","外挂",
  "fuck","fucker","fucking","shit","bitch","cunt","nigger","nigga","porn","hentai","nazi"
];

function normalizeTextForSafety(value){
  let s=String(value||"").normalize("NFKC").toLowerCase();
  s=s.replace(/[@4]/g,"a").replace(/[3]/g,"e").replace(/[1!|]/g,"i").replace(/[0]/g,"o").replace(/[$5]/g,"s").replace(/[7+]/g,"t");
  return s.replace(/[\s\-_.·,，。!?！？~～*#%^&()（）\[\]{}<>《》'"`]/g,"");
}

function checkWritableText(value){
  const normalized=normalizeTextForSafety(value);
  const blocked=PZ_BLOCKED_TEXT_TERMS.some(term=>normalized.includes(normalizeTextForSafety(term)));
  return {ok:!blocked,message:language==="en"?"This text contains restricted language. Please revise it.":"文案中包含敏感词汇，请修改后再试。"};
}

function textSafetyWarning(){
  const text=language==="en"?"Restricted language is not allowed.":"不允许使用敏感词汇。";
  showCenter(text,80);
  return text;
}

window.PZTextSafety={check:checkWritableText,normalize:normalizeTextForSafety};

function validPlayerName(s){
  return /^[\u4e00-\u9fa5a-zA-Z0-9]{2,12}$/.test(String(s || ""))&&checkWritableText(s).ok;
}
function formatStoryText(text){
  return String(text || "").replaceAll("{playerName}", playerName || "");
}

function confirmNameInput(){
  const n = cleanPlayerName(nameInput);
  if(!checkWritableText(n).ok){nameError=textSafetyWarning();return;}
  if(!validPlayerName(n)){
    nameError = msg("nameNeedOne");
    return;
  }
  playerName = n;
  if(pzHiddenTextInput) pzHiddenTextInput.blur();
  if(!playerUID) playerUID = createUID();
  hasCreatedProfile = true;
  tutorialCompleted = false;
  tutorialInProgress = true;
  tutorialResumeMode = "intro";
  saveGame();
  autoCloudSaveNow(true);
  clicked = false;
  mouseDown = false;
  if(window.PZStory && window.PZ_STORY_SCRIPTS && window.PZ_STORY_SCRIPTS.tutorial_intro){
    window.PZStory.start("tutorial_intro");
  }else{
    startPrologue();
  }
}

function updateNameInput(){
  menuPulse++;
  syncNameInputFocus();
  if(clicked){
    if(inRect(W/2-190, 283, 380, 58)){
      syncNameInputFocus();
    }
    if(inRect(W/2-160, H/2+160, 320, 52)){
      confirmNameInput();
    }
  }
  if(justPressed("enter")) confirmNameInput();
  if(justPressed("backspace")){
    nameInput = nameInput.slice(0, -1);
    nameError = "";
  }
  clicked=false;
}





function setNoticeDefault(){
  notice = msg("defaultNotice");
}

function refreshLanguageRuntimeText(){
  setNoticeDefault();
  const knownPassiveMessages = [
    ...Object.values(MSG_TEXT.zh),
    ...Object.values(MSG_TEXT.en)
  ];
  if(knownPassiveMessages.includes(shopMsg)) shopMsg = msg("shopDefault");
  if(knownPassiveMessages.includes(packMsg)) packMsg = msg("packDefault");
  if(knownPassiveMessages.includes(mailMsg)) mailMsg = mailClaimed ? msg("mailAlready") : msg("mailDefault");
  if(knownPassiveMessages.includes(eventMsg)) eventMsg = msg("eventDefault");
  if(knownPassiveMessages.includes(warehouseMsg)) warehouseMsg = msg("warehouseDefault");
  achievementMsg = localizeText(achievementMsg || "");
  achievementNotice = localizeText(achievementNotice || "");
}

function resetPassivePageMessages(){
  shopMsg = msg("shopDefault");
  packMsg = msg("packDefault");
  eventMsg = msg("eventDefault");
  warehouseMsg = msg("warehouseDefault");
  if(!mailClaimed) mailMsg = msg("mailDefault");
}

function returnToLogin(){
  releaseMobileButtons();
  clearMobileMoveKeys();
  clearTransientBattleState();
  gameMode = "login";
  accountMsg = "";
  cloudSyncStatus = "";
}

function openSettingsFrom(origin="lobby"){
  settingsReturnMode = origin === "login" ? "login" : "lobby";
  logoutConfirm=false;
  localDeleteConfirm=false;
  gameMode="settings";
}

function closeSettingsToOrigin(){
  if(settingsReturnMode === "login") returnToLogin();
  else enterLobby();
}

function startLoading(target="lobby"){
  releaseMobileButtons();
  clearMobileMoveKeys();
  clearTransientBattleState && clearTransientBattleState();
  fixRuntimeValues && fixRuntimeValues();
rebuildStoryScripts();
fixEventData();
  normalizeProfile && normalizeProfile();
  loadingTimer = 0;
  loadingProgress = 0;
  loadingTarget = (target==="lobby" && (!hasCreatedProfile || !validPlayerName(playerName))) ? "nameInput" : target;
  if(target === "tutorialResume" && (!hasCreatedProfile || !validPlayerName(playerName))) loadingTarget = "nameInput";
  loadingMessage = mt("initializingSystem");
  gameMode = "loading";
}


function resumeTutorialFromSave(){
  clearTransientBattleState();
  rebuildStoryScripts();
  fixEventData && fixEventData();
  tutorialInProgress = true;
  if(!tutorialResumeMode) tutorialResumeMode = "intro";
  if(tutorialResumeMode === "battle"){
    startTutorialBattle();
    return;
  }
  if(tutorialResumeMode === "afterBattle"){
    if(window.PZStory && window.PZ_STORY_SCRIPTS && window.PZ_STORY_SCRIPTS.tutorial_after_battle){
      window.PZStory.start("tutorial_after_battle");
    }else{
      prologueAfterBattle = true;
      prologueLine = 0;
      gameMode = "prologue";
    }
    return;
  }
  tutorialResumeMode = "intro";
  if(window.PZStory && window.PZ_STORY_SCRIPTS && window.PZ_STORY_SCRIPTS.tutorial_intro){
    window.PZStory.start("tutorial_intro");
  }else{
    startPrologue();
  }
}

function startTutorialLobbyLoading(){
  clearTransientBattleState();
  loadingTimer = 0;
  loadingProgress = 0;
  loadingTarget = "lobby";
  loadingMessage = mt("tutorialLoadingLobby");
  gameMode = "tutorialLobbyLoading";
}

function updateBattleResumePrompt(){
  menuPulse++;
  if(justPressed("escape")){
    discardBattleResumeSnapshot();
    enterLobby();
    clicked=false;
    return;
  }
  if(clicked){
    if(inRect(W/2-245,H/2+76,220,54)){
      restoreBattleResumeSnapshot();
      clicked=false;
      return;
    }
    if(inRect(W/2+25,H/2+76,220,54)){
      discardBattleResumeSnapshot();
      enterLobby();
      clicked=false;
      return;
    }
  }
  clicked=false;
}

function drawBattleResumePrompt(){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#0b1020");bg.addColorStop(1,"#03050b");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.fillStyle="rgba(10,14,27,.96)";ctx.fillRect(W/2-330,H/2-155,660,330);
  ctx.strokeStyle="rgba(124,199,255,.55)";ctx.lineWidth=2;ctx.strokeRect(W/2-330,H/2-155,660,330);
  ctx.fillStyle="#7cc7ff";ctx.fillRect(W/2-330,H/2-155,8,330);
  ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 31px "+FONT_UI;ctx.fillText(language==="en"?"UNFINISHED BATTLE":"检测到未完成战斗",W/2,H/2-82);
  ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="17px "+FONT_UI;ctx.fillText(language==="en"?"Continue from the saved battle state?":"是否继续上次中断的战斗？",W/2,H/2-35);
  if(validBattleResumeSnapshot(battleResumeSnapshot)){
    const code=battleResumeSnapshot.source==="commission"?("C"+(Number(battleResumeSnapshot.selectedCommissionChapter||0)+1)+"-"+battleResumeSnapshot.selectedStage):stageCode(battleResumeSnapshot.selectedStage||1);
    ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="13px "+FONT_UI;ctx.fillText(code+"  ·  "+(language==="en"?"Area ":"区域 ")+battleResumeSnapshot.area,W/2,H/2+4);
  }
  const buttons=[{x:W/2-245,label:language==="en"?"Continue":"继续战斗",accent:"#ffe066"},{x:W/2+25,label:language==="en"?"Not Now":"不需要",accent:"#7cc7ff"}];
  for(const b of buttons){const hover=inRect(b.x,H/2+76,220,54);ctx.fillStyle=hover?"rgba(255,255,255,.14)":"rgba(255,255,255,.06)";ctx.fillRect(b.x,H/2+76,220,54);ctx.strokeStyle=hover?b.accent:"rgba(255,255,255,.25)";ctx.strokeRect(b.x,H/2+76,220,54);ctx.fillStyle="#fff";ctx.font="bold 18px "+FONT_UI;ctx.fillText(b.label,b.x+110,H/2+110);}
  ctx.fillStyle="rgba(255,255,255,.40)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"Esc: Not Now":"ESC：不需要",W/2,H/2+158);
  ctx.restore();
}

function updateTutorialLobbyLoading(){
  loadingTimer += frameScale;
  loadingProgress = clamp(loadingTimer / 90, 0, 1);

  if(loadingProgress < 0.35) loadingMessage = mt("cleaningBattle");
  else if(loadingProgress < 0.85) loadingMessage = mt("tutorialLoadingLobby");
  else loadingMessage = mt("tutorialLoadingReady");

  if(loadingTimer >= 90){
    loadingProgress = 1;
    loadingMessage = mt("tutorialLoadingReady");
    enterLobby();
    return;
  }
  clicked = false;
}

function drawTutorialLobbyLoading(){
  drawLoading();
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.34)";
  ctx.fillRect(W/2-250, H/2+78, 500, 36);
  ctx.strokeStyle = "rgba(255,224,102,.24)";
  ctx.strokeRect(W/2-250, H/2+78, 500, 36);
  ctx.fillStyle = "#ffe066";
  ctx.font = "bold 16px " + FONT_UI;
  ctx.textAlign = "center";
  ctx.fillText(mt("tutorialLoadingLobby"), W/2, H/2+102);
  ctx.restore();
}

function updateLoading(){
  menuPulse++;
  loadingTimer++;
  loadingProgress = clamp(loadingTimer / 95, 0, 1);

  if(loadingTimer < 22) loadingMessage = mt("checkingSave");
  else if(loadingTimer < 44) loadingMessage = mt("checkingProfile");
  else if(loadingTimer < 66) loadingMessage = mt("cleaningBattle");
  else if(loadingTimer < 88) loadingMessage = mt("loadingLobby");
  else loadingMessage = mt("welcomeBack") + (playerName || "PLAYER");

  if(loadingTimer >= 105){
    if(loadingTarget === "lobby") enterLobby();
    else if(loadingTarget === "tutorialResume") resumeTutorialFromSave();
    else gameMode = loadingTarget;
  }
}

function drawLoading(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#060814");
  bg.addColorStop(.6,"#10172a");
  bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.textAlign="center";
  ctx.save();
  ctx.shadowBlur=34;
  ctx.shadowColor="#7cc7ff";
  ctx.fillStyle="#fff";
  ctx.font="bold 62px " + FONT_UI;
  ctx.fillText("PROJECT ZERO",W/2,H/2-105);
  ctx.restore();

  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.font="18px " + FONT_UI;
  ctx.fillText(loadingMessage,W/2,H/2-35);

  const bw=420,bh=16,bx=W/2-bw/2,by=H/2+10;
  ctx.fillStyle="rgba(255,255,255,.12)";
  ctx.fillRect(bx,by,bw,bh);
  ctx.fillStyle="#7cc7ff";
  ctx.fillRect(bx,by,bw*loadingProgress,bh);
  ctx.strokeStyle="rgba(255,255,255,.24)";
  ctx.strokeRect(bx,by,bw,bh);

  ctx.fillStyle="rgba(255,255,255,.56)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(Math.floor(loadingProgress*100)+"%",W/2,by+42);

  const loadingTips=language==="en"?[
    "During an enemy warning, press R to parry the incoming attack.",
    "Crystals can be exchanged for limited resources in Permanent Recruitment.",
    "Material Dungeons consume Stamina and unlock higher difficulties with story progress.",
    "New-content diamonds disappear after the related feature is opened once."
  ]:[
    "敌人出现攻击预警时，按R可以弹刀并打断攻击。",
    "水晶可在常驻招募下方兑换有限次数的培养资源。",
    "材料副本消耗体力，更高难度会随主线进度开放。",
    "新内容菱形提示会在对应功能打开一次后消失。"
  ];
  const phases=language==="en"?["SAVE","PROFILE","RUNTIME","LOBBY"]:["存档","资料","运行环境","大厅"];
  const activePhase=Math.min(3,Math.floor(loadingProgress*4));
  for(let i=0;i<4;i++){
    const px=W/2-250+i*132;
    ctx.fillStyle=i<=activePhase?"#7cc7ff":"rgba(255,255,255,.16)";
    ctx.fillRect(px,H/2+86,112,3);
    ctx.fillStyle=i===activePhase?"rgba(255,255,255,.78)":"rgba(255,255,255,.34)";
    ctx.font="bold 10px "+FONT_UI;
    ctx.fillText("0"+(i+1)+"  "+phases[i],px+56,H/2+108);
  }
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(W/2-360,H-76,720,38);
  ctx.strokeStyle="rgba(124,199,255,.16)";ctx.strokeRect(W/2-360,H-76,720,38);
  ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="12px "+FONT_UI;
  ctx.fillText(loadingTips[Math.floor(loadingTimer/32)%loadingTips.length],W/2,H-51);
}


function updatePrologue(){
  menuPulse++;
  const lines = prologueAfterBattle ? getPrologueAfterLines() : getPrologueLines();

  if(clicked || justPressed("enter") || justPressed(" ")){
    prologueLine++;
    if(prologueLine >= lines.length){
      if(!prologueAfterBattle){
        startTutorialBattle();
      }else{
        finishPrologue();
      }
    }
  }
  clicked=false;
}

function drawRavenhadoColorBlock(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#10172a");
  bg.addColorStop(.52,"#171a24");
  bg.addColorStop(1,"#08090f");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // big classical blocks
  ctx.fillStyle="#2b2e38"; ctx.fillRect(0,385,W,275);
  ctx.fillStyle="#3a3a42"; ctx.fillRect(70,220,170,170);
  ctx.fillStyle="#464650"; ctx.fillRect(260,185,150,205);
  ctx.fillStyle="#363842"; ctx.fillRect(445,245,190,145);
  ctx.fillStyle="#40424d"; ctx.fillRect(670,205,160,185);
  ctx.fillStyle="#343640"; ctx.fillRect(860,235,190,155);

  // rooftops
  ctx.fillStyle="#22242b";
  for(const [x,y,w,h] of [[60,195,190,35],[250,160,170,35],[660,180,185,34],[850,210,210,35]]){
    ctx.beginPath(); ctx.moveTo(x,y+h); ctx.lineTo(x+w/2,y); ctx.lineTo(x+w,y+h); ctx.closePath(); ctx.fill();
  }

  // clock tower
  ctx.fillStyle="#565761"; ctx.fillRect(505,90,100,300);
  ctx.fillStyle="#2c2e36"; ctx.beginPath(); ctx.moveTo(490,90); ctx.lineTo(555,35); ctx.lineTo(620,90); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#ffe066"; ctx.beginPath(); ctx.arc(555,150,25,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#1b1d24"; ctx.beginPath(); ctx.arc(555,150,17,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#ffe066"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(555,150); ctx.lineTo(555,136); ctx.moveTo(555,150); ctx.lineTo(568,156); ctx.stroke();

  // light cyber accents
  ctx.fillStyle="#7cc7ff";
  for(let i=0;i<9;i++) ctx.fillRect(110+i*98,415,42,4);
  ctx.globalAlpha=.8;
  ctx.strokeStyle="#7cc7ff"; ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,175); ctx.bezierCurveTo(260,130,520,210,1120,125); ctx.stroke();
  ctx.globalAlpha=1;

  // ground
  ctx.fillStyle="#24262e"; ctx.fillRect(0,505,W,155);
  ctx.strokeStyle="rgba(255,255,255,.08)";
  for(let x=0;x<W;x+=70){ ctx.beginPath(); ctx.moveTo(x,505); ctx.lineTo(x+130,660); ctx.stroke(); }
  ctx.strokeStyle="rgba(255,255,255,.05)";
  for(let y=535;y<660;y+=35){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
}

function drawPrologue(){
  const lines = prologueAfterBattle ? getPrologueAfterLines() : getPrologueLines();
  const line = lines[prologueLine] || lines[lines.length-1];
  drawRavenhadoColorBlock();

  // main character simple silhouette
  ctx.save();
  ctx.translate(210,455);
  ctx.fillStyle="#eeeeee"; ctx.fillRect(-12,-72,24,45);
  ctx.fillStyle="#222"; ctx.fillRect(-9,-55,18,28);
  ctx.fillStyle="#d7d7d7"; ctx.beginPath(); ctx.arc(0,-86,15,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#dedede"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,-26); ctx.lineTo(-18,22); ctx.moveTo(0,-26); ctx.lineTo(18,22); ctx.stroke();
  ctx.strokeStyle="#c0c0c0"; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(18,-50); ctx.lineTo(52,-86); ctx.stroke();
  ctx.restore();

  // vendor/Kane simplified if after battle
  if(prologueAfterBattle){
    ctx.save(); ctx.translate(760,455);
    ctx.fillStyle="#111"; ctx.fillRect(-16,-78,32,55);
    ctx.fillStyle="#ff5757"; ctx.fillRect(10,-68,8,22);
    ctx.fillStyle="#d8d8d8"; ctx.beginPath(); ctx.arc(0,-92,15,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="#888"; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,-24); ctx.lineTo(-22,23); ctx.moveTo(0,-24); ctx.lineTo(22,23); ctx.stroke();
    ctx.strokeStyle="#ffe066"; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-2,-56); ctx.lineTo(42,-108); ctx.stroke();
    ctx.restore();
  }else{
    ctx.save(); ctx.translate(790,465);
    ctx.fillStyle="#8b6b38"; ctx.fillRect(-18,-64,36,45);
    ctx.fillStyle="#f0d0aa"; ctx.beginPath(); ctx.arc(0,-78,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#594226"; ctx.fillRect(-54,-26,110,46);
    ctx.restore();
  }

  ctx.fillStyle="rgba(0,0,0,.72)";
  ctx.fillRect(65,H-190,W-130,150);
  ctx.strokeStyle="rgba(255,255,255,.16)";
  ctx.strokeRect(65,H-190,W-130,150);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 24px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(speakerName(line[0]),95,H-146);

  ctx.fillStyle="#fff";
  ctx.font="22px " + FONT_UI;
  wrapText(line[1],95,H-102,W-230,32);

  drawBtn(ui("next"),"CLICK",W-390,H-82,165,48,true,"#ffe066");
  ctx.fillStyle="rgba(255,255,255,.45)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(tx("prologueTitle"),75,72);
}


// V41.2 Improved Tutorial Helpers
function tutorialTextPack(){
  return language === "en" ? {
    area:"AREA",
    click:"Click to continue",
    area1Title:"AREA 01  Basic Movement",
    area1Text:"Use WASD to move. Reach the blue marker to continue.",
    area2Title:"AREA 02  Attack & Exploration",
    area2Text:"Left click to attack. Break both wooden crates before moving on.",
    area3Title:"AREA 03  Real Combat",
    area3Text:"Complete the combat checklist. When the enemy warning appears, press R to parry.",
    completeTitle:"Tutorial Complete",
    completeText:"You have completed movement, attacks, skill, ultimate, dodge, parry, and chain training.",
    moveObj:"Objective: move to the blue marker.",
    crateObj:"Objective: left click near the crates to break them.",
    combatObj:"Complete the combat checklist, then defeat the training target.",
    parryHint:"Enemy warning! Press R now to parry.",
    continueAfter:"Click to continue the story."
  } : {
    area:"AREA",
    click:"点击继续",
    area1Title:"AREA 01  基础移动",
    area1Text:"使用 WASD 移动。到达蓝色光圈后继续。",
    area2Title:"AREA 02  攻击与探索",
    area2Text:"点击鼠标左键攻击。先打碎两个训练木箱。",
    area3Title:"AREA 03  实战教学",
    area3Text:"完成战斗清单。敌人出现攻击预警时，按R进行弹刀。",
    completeTitle:"教程完成",
    completeText:"你已经完成移动、普攻、技能、大招、闪避、弹刀与连携教学。",
    moveObj:"目标：移动到蓝色光圈。",
    crateObj:"目标：靠近木箱并左键攻击打碎它们。",
    combatObj:"目标：完成战斗清单后击败训练目标。",
    parryHint:"敌人预警！现在按R弹刀。",
    continueAfter:"点击继续剧情。"
  };
}

function openTutorialPanel(title, text, action){
  tutorialPanelTitle = title || "";
  tutorialPanelText = text || "";
  tutorialPanelAction = action || null;
  tutorialPanelActive = true;
  clicked = false;
}

function closeTutorialPanel(){
  tutorialPanelActive = false;
  if(typeof tutorialPanelAction === "function"){
    const fn = tutorialPanelAction;
    tutorialPanelAction = null;
    fn();
  }
}

function drawTutorialPanel(){
  if(!tutorialPanelActive) return;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.62)";
  ctx.fillRect(0,0,W,H);
  const x = W/2 - 335, y = H/2 - 125, w = 670, h = 250;
  ctx.fillStyle = "rgba(10,16,28,.94)";
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = "rgba(124,199,255,.45)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x,y,w,h);

  ctx.fillStyle = "#7cc7ff";
  ctx.font = "bold 24px " + FONT_UI;
  ctx.textAlign = "left";
  ctx.fillText(tutorialPanelTitle, x+32, y+52);

  ctx.fillStyle = "#fff";
  ctx.font = "20px " + FONT_UI;
  wrapText(tutorialPanelText, x+32, y+98, w-64, 32);

  ctx.fillStyle="rgba(124,199,255,.10)";ctx.fillRect(x+32,y+h-56,122,30);
  ctx.strokeStyle="rgba(124,199,255,.28)";ctx.strokeRect(x+32,y+h-56,122,30);
  ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="center";
  ctx.fillText(language==="en"?"SKIP TUTORIAL":"跳过教程",x+93,y+h-36);
  ctx.fillStyle = "rgba(255,224,102,.95)";
  ctx.font = "bold 16px " + FONT_UI;
  ctx.textAlign = "right";
  ctx.fillText(tutorialTextPack().click, x+w-32, y+h-30);
  ctx.restore();

  if(tutorialSkipConfirm){
    ctx.save();ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);
    const sx=W/2-260,sy=H/2-105;
    ctx.beginPath();ctx.roundRect(sx,sy,520,210,14);ctx.fillStyle="rgba(8,13,28,.98)";ctx.fill();ctx.strokeStyle="#ffe066";ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Skip the tutorial?":"确认跳过教程？",sx+32,sy+48);
    ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="14px "+FONT_UI;wrapText(language==="en"?"The tutorial cannot be replayed after skipping. The story text will remain in the archive.":"跳过后无法重新游玩教程；剧情文本仍会保留在档案中。",sx+32,sy+82,456,22);
    drawBtn(language==="en"?"Keep Training":"继续教学","ESC",sx+32,sy+140,210,46,false,"#7cc7ff");
    drawBtn(language==="en"?"Skip":"确认跳过","",sx+278,sy+140,210,46,true,"#ffe066");
    ctx.restore();
  }
}

function drawTutorialObjective(text){
  ctx.save();
  ctx.fillStyle="rgba(5,10,22,.78)";
  ctx.fillRect(30,28,640,72);
  ctx.fillStyle="#7cc7ff";ctx.fillRect(30,28,5,72);
  ctx.strokeStyle="rgba(124,199,255,.22)";
  ctx.strokeRect(30,28,640,72);
  ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="left";
  ctx.fillText((language==="en"?"BASIC OPERATION TRAINING  ":"基础行动教学  ")+String(Math.min(3,tutorialArea)).padStart(2,"0")+" / 03",50,49);
  ctx.fillStyle="#ffe066";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(text,50,78);
  ctx.restore();
}

function tutorialAdvanceToArea(nextArea, nextStep, title, text){
  tutorialArea = nextArea;
  tutorialStep = nextStep;
  area = nextArea;
  openTutorialPanel(title, text, () => {});
}

function startTutorialBattle(){
  tutorialInProgress = true;
  tutorialResumeMode = "battle";
  saveGame();
  clearTransientBattleState();
  gameMode="tutorialBattle";
  tutorialStep=0;
  tutorialArea=1;
  area=1;
  tutorialTarget={x:360,y:H/2+120};
  tutorialCrates=[
    {x:620,y:H/2+130,hp:3,alive:true},
    {x:715,y:H/2+105,hp:3,alive:true}
  ];
  tutorialEnemy=null;
  tutorialUsedAttack=false;
  tutorialUsedSkill=false;
  tutorialUsedDash=false;
  tutorialUsedUltimate=false;
  tutorialUsedChain=false;
  tutorialParried=false;
  team=[PROTAGONIST_ROLE,0];
  player.role=PROTAGONIST_ROLE;
  player.x=165; player.y=H/2+120; player.hp=100; player.energy=100; player.ult=ULT_MAX; player.inv=0;
  player.attackCd=0; player.skillCd=0; player.dashCd=0;
  particles=[]; slashes=[]; texts=[]; projectiles=[]; enemies=[];
  const t = tutorialTextPack();
  openTutorialPanel(t.area1Title, t.area1Text, () => { tutorialStep=1; });
}
function spawnTutorialEnemy(){
  tutorialEnemy = createEnemy(780,H/2+112,false,"normal");
  tutorialEnemy.hp = 900;
  tutorialEnemy.maxHp = 900;
  tutorialEnemy.attackCd = 105;
  tutorialEnemy.tutorial = true;
  tutorialEnemy.shield = 80;
  tutorialEnemy.maxShield = 80;
  enemies = [tutorialEnemy];
}

function updateTutorialBattle(){
  if(tutorialPanelActive){
    if(tutorialSkipConfirm){
      if(justPressed("escape")){tutorialSkipConfirm=false;clicked=false;prev={...keys};return;}
      if(clicked){
        const sx=W/2-260,sy=H/2-105;
        if(inRect(sx+32,sy+140,210,46)) tutorialSkipConfirm=false;
        else if(inRect(sx+278,sy+140,210,46)){
          tutorialSkipConfirm=false;tutorialPanelActive=false;tutorialPanelAction=null;
          finishPrologue();clicked=false;prev={...keys};return;
        }
      }
      clicked=false;prev={...keys};return;
    }
    if(clicked){
      const x=W/2-335,y=H/2-125;
      if(inRect(x+32,y+194,122,30)){tutorialSkipConfirm=true;clicked=false;prev={...keys};return;}
    }
    if(clicked || justPressed("enter") || justPressed(" ")){
      closeTutorialPanel();
    }
    clicked=false;
    prev={...keys};
    return;
  }

  if(hitStop>0){ hitStop -= fpsScale(); updateEffects(); return; }
  updateProjectiles();

  const moduleSpeed=window.PZModules?window.PZModules.totals(player.role,charData).speedPct:0;
  const speed = roles[player.role].speed * (1+moduleSpeed) * MOVE_SPEED_MULT * 0.88;
  let mx=0,my=0;
  if(keys["w"]||keys["arrowup"])my--;
  if(keys["s"]||keys["arrowdown"])my++;
  if(keys["a"]||keys["arrowleft"])mx--;
  if(keys["d"]||keys["arrowright"])mx++;
  if(mx||my){
    const l=Math.hypot(mx,my)||1;
    player.x+=mx/l*speed*frameScale;
    player.y+=my/l*speed*frameScale;
    if(Math.abs(mx)>.1) player.facing = mx>0 ? 1 : -1;
  }
  player.x=clamp(player.x,80,W-80); player.y=clamp(player.y,330,H-75);

  const T = tutorialTextPack();

  if(tutorialStep===1){
    tutorialTarget = {x:360,y:H/2+120};
    if(withinDist(player.x,player.y,tutorialTarget.x,tutorialTarget.y,55)){
      tutorialAdvanceToArea(2,2,T.area2Title,T.area2Text);
    }
  }

  if(tutorialStep===2 || tutorialStep===3){
    tutorialStep = 3;
    if(mouseDown && !mouseAttackConsumed){
      mouseAttackConsumed=true;
      addSlash(player.x+player.facing*46,player.y,84,"#ffffff",12,"slash");
      sfx("slash1");
      for(const c of tutorialCrates){
        if(c.alive && withinDist(player.x,player.y,c.x,c.y,105)){
          c.hp--;
          addParticles(c.x,c.y,"#d0a060",10,4);
          addText(c.x,c.y-28,"CRACK","#ffe066");
          if(c.hp<=0){
            c.alive=false;
            addText(c.x,c.y-48,"+50","#ffe066",true);
            gold+=50;
            totalGoldEarned+=50;
          }
        }
      }
      if(tutorialCrates.every(c=>!c.alive)){
        tutorialAdvanceToArea(3,4,T.area3Title,T.area3Text);
        spawnTutorialEnemy();
      }
    }
  }

  if(tutorialStep>=4 && tutorialStep<8){
    tutorialStep = 5;
    const e = tutorialEnemy;
    if(e && e.alive){
      const dx=player.x-e.x, dy=player.y-e.y;
      const dd=Math.sqrt(dx*dx+dy*dy)||1;
      e.x += dx/dd*0.92*frameScale;
      e.y += dy/dd*.55*frameScale;
      e.attackCd -= frameScale;
      e.warning = e.attackCd < 34 && e.attackCd > 0;
      e.windup = e.warning ? 20 : 0;

      if(e.warning) showActionPrompt(T.parryHint,40);

      if(e.attackCd <= 0){
        if(withinDist(player.x,player.y,e.x,e.y,78) && player.inv<=0){
          player.hp = clamp(player.hp-7,0,100);
          addText(player.x,player.y-35,"-7","#ff7777");
          doShake(4);
        }
        e.attackCd = 112;
      }

      if(justPressed("shift")){
        tutorialUsedDash = true;
        dash();
      }

      if(justPressed("q")){
        tutorialUsedUltimate = true;
        player.ult=ULT_MAX;
        ultimate();
      }

      if(justPressed("r")){
        // Tutorial parry follows the warning shown on screen instead of the
        // normal close-range detector. This keeps the prompt and input window
        // identical across browsers and frame rates.
        if(e.warning && e.alive){
          player.parryTarget=e;
          player.guardTimer=18;
          player.parryReady=1;
          parryCounter();
          totalParries++;
          checkAchievements();
          tutorialParried=true;
          e.warning=false;
          e.windup=0;
          e.attackCd=112;
        }else{
          showActionPrompt(language==="en"?"Wait for the enemy warning":"等待敌人攻击预警",28);
        }
      }

      if(justPressed("f") && chainReady){
        tutorialUsedChain=true;
        chainAttack();
        // The assist demonstration must not leave the player controlling Kane.
        if(player.role!==PROTAGONIST_ROLE) setBattleRole(PROTAGONIST_ROLE);
      }

      if(justPressed("e")){
        tutorialUsedSkill = true;
        const sx=player.x+player.facing*70;
        player.skillCd=50;
        player.energy=clamp(player.energy-20,0,100);
        addSlash(sx,player.y,128,"#7cc7ff",18,"skill");
        addParticles(sx,player.y,"#7cc7ff",14,5);
        sfx("skill");
        if(withinDist(sx,player.y,e.x,e.y,145)){
          e.hp -= 32;
          e.stun -= 30;
          e.shield=Math.max(0,(e.shield||0)-30);
          addText(e.x,e.y-38,"SKILL","#7cc7ff",true);
          addText(e.x,e.y-15,"-32","#7cc7ff");
          doShake(8);
        }
      }

      if(mouseDown && !mouseAttackConsumed){
        mouseAttackConsumed=true;
        tutorialUsedAttack=true;
        if(withinDist(player.x,player.y,e.x,e.y,112)){
          e.hp -= 18;
          e.shield=Math.max(0,(e.shield||0)-20);
          sfx("slash2");
          addSlash(e.x,e.y,90,"#fff",14,"slash");
          addText(e.x,e.y-34,"-18","#fff");
          player.energy=clamp(player.energy+6,0,100);
        }
      }

      if((e.shield||0)<=0 && !tutorialUsedChain && !chainReady){
        triggerBreak(e);
        showActionPrompt(language==="en"?"Shield broken — press F for Chain":"护盾已破——按F发动连携",90);
      }

      if(e.hp<=0){
        const checklistDone=tutorialUsedAttack&&tutorialUsedSkill&&tutorialUsedDash&&tutorialUsedUltimate&&tutorialUsedChain&&tutorialParried;
        if(!checklistDone){
          e.alive=true;e.hp=180;e.shield=0;
          showActionPrompt(language==="en"?"Complete the remaining tutorial actions":"请先完成剩余教学操作",75);
        }else{
          e.alive=false;
          totalKills++;
          checkAchievements();
          addText(e.x,e.y-55,"K.O.","#fff",true);
          addParticles(e.x,e.y,"#fff",18,6);
          tutorialStep=8;
          openTutorialPanel(T.completeTitle, T.completeText, () => { tutorialStep=9; });
        }
      }
    }
  }

  // Real combat effects can defeat the training target after the tutorial input
  // block has already run. Recover it on the next frame until every required
  // action has been demonstrated, otherwise finish the tutorial normally.
  if(tutorialStep>=5 && tutorialStep<8 && tutorialEnemy && !tutorialEnemy.alive){
    const checklistDone=tutorialUsedAttack&&tutorialUsedSkill&&tutorialUsedDash&&tutorialUsedUltimate&&tutorialUsedChain&&tutorialParried;
    if(!checklistDone){
      tutorialEnemy.alive=true;
      tutorialEnemy.hp=180;
      tutorialEnemy.shield=0;
      enemies=[tutorialEnemy];
      showActionPrompt(language==="en"?"Complete the remaining tutorial actions":"请先完成剩余教学操作",75);
    }else{
      tutorialStep=8;
      openTutorialPanel(T.completeTitle,T.completeText,()=>{tutorialStep=9;});
    }
  }

  if(tutorialStep===9){
    openTutorialPanel(tutorialTextPack().completeTitle, tutorialTextPack().continueAfter, () => {
      tutorialInProgress = true;
      tutorialResumeMode = "afterBattle";
      saveGame();
      if(window.PZStory && window.PZ_STORY_SCRIPTS && window.PZ_STORY_SCRIPTS.tutorial_after_battle){
        window.PZStory.start("tutorial_after_battle");
      }else{
        prologueAfterBattle=true;
        prologueLine=0;
        gameMode="prologue";
      }
    });
    tutorialStep=10;
  }

  if(player.inv>0) player.inv-=frameScale;
  if(player.attackCd>0) player.attackCd-=frameScale;
  if(player.skillCd>0) player.skillCd-=frameScale;
  if(player.dashCd>0) player.dashCd-=frameScale;
  centerTimer=Math.max(0,centerTimer-frameScale);
  actionPromptTimer=Math.max(0,actionPromptTimer-frameScale);
  updateEffects();
  clicked=false;
}
function drawTutorialBattle(){
  drawRavenhadoColorBlock();
  drawGrid();

  const T = tutorialTextPack();

  // Area label
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.50)";
  ctx.fillRect(W/2-120,28,240,52);
  ctx.strokeStyle="rgba(124,199,255,.28)";
  ctx.strokeRect(W/2-120,28,240,52);
  ctx.fillStyle="#7cc7ff";
  ctx.font="bold 18px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(T.area + " 0" + tutorialArea, W/2, 61);
  ctx.restore();

  if(tutorialStep===1){
    const pulse=0.55+Math.sin(menuPulse*.12)*.2;
    ctx.strokeStyle="rgba(124,199,255,.85)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(360,H/2+120,38+pulse*8,0,Math.PI*2);
    ctx.stroke();
    drawTutorialObjective(T.moveObj);
  }

  for(const c of tutorialCrates){
    if(!c.alive) continue;
    ctx.save();
    ctx.translate(c.x,c.y);
    ctx.fillStyle="#7a5530";
    ctx.fillRect(-22,-32,44,42);
    ctx.strokeStyle="#d0a060";
    ctx.lineWidth=2;
    ctx.strokeRect(-22,-32,44,42);
    ctx.strokeStyle="rgba(0,0,0,.32)";
    ctx.beginPath();
    ctx.moveTo(-22,-32); ctx.lineTo(22,10);
    ctx.moveTo(22,-32); ctx.lineTo(-22,10);
    ctx.stroke();
    ctx.restore();
  }

  if(tutorialStep===3) drawTutorialObjective(T.crateObj);
  if(tutorialStep>=5 && tutorialStep<8) drawTutorialObjective(T.combatObj);

  for(const e of enemies) if(e.alive) drawEnemy(e);
  drawPlayer();
  drawEffects();

  // combat checklist in Area 03
  if(tutorialStep>=5 && tutorialStep<8){
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,.50)";
    ctx.fillRect(30,94,390,176);
    ctx.strokeStyle="rgba(255,255,255,.12)";
    ctx.strokeRect(30,94,390,176);
    ctx.font="15px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillStyle=tutorialUsedAttack?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialUsedAttack?"✓ ":"□ ") + (language==="en"?"Left click: normal attack":"左键：普通攻击"),50,120);
    ctx.fillStyle=tutorialUsedDash?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialUsedDash?"✓ ":"□ ") + (language==="en"?"Shift: dodge":"Shift：闪避"),50,142);
    ctx.fillStyle=tutorialUsedSkill?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialUsedSkill?"✓ ":"□ ") + (language==="en"?"E: skill":"E：技能"),50,164);
    ctx.fillStyle=tutorialUsedUltimate?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialUsedUltimate?"✓ ":"□ ") + (language==="en"?"Q: ultimate":"Q：大招"),50,186);
    ctx.fillStyle=tutorialParried?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialParried?"✓ ":"□ ") + (language==="en"?"R during warning: parry":"预警时按R：弹刀"),50,208);
    ctx.fillStyle=tutorialUsedChain?"#7cc7ff":"#aaa";
    ctx.fillText((tutorialUsedChain?"✓ ":"□ ") + (language==="en"?"F after break: chain":"破盾后按F：连携"),50,230);
    ctx.restore();
  }

  drawBattleUI();

  if(centerTimer>0){
    ctx.fillStyle="#fff"; ctx.font="bold 42px " + FONT_UI; ctx.textAlign="center";
    ctx.fillText(centerText,W/2,H*.42);
  }
  if(actionPromptTimer>0){
    ctx.fillStyle="rgba(0,0,0,.62)"; ctx.fillRect(W/2-300,104,600,42);
    ctx.strokeStyle="rgba(255,224,102,.38)"; ctx.strokeRect(W/2-300,104,600,42);
    ctx.fillStyle="#ffe066"; ctx.font="bold 16px " + FONT_UI; ctx.textAlign="center";
    ctx.fillText(actionPrompt,W/2,132);
  }

  drawTutorialPanel();
}

function updateLogin(){
  menuPulse++;

  if(guestCloudOverwritePromptActive){
    if(justPressed("escape")){
      guestCloudOverwritePromptActive=false;
      accountFocusedField="password";
    }else if(clicked){
      if(inRect(W/2-175,H/2+95,165,48)){
        guestCloudOverwritePromptActive=false;
        accountLoginFlow(true);
      }else if(inRect(W/2+10,H/2+95,165,48)){
        guestCloudOverwritePromptActive=false;
        accountFocusedField="password";
      }
    }
    clicked=false;
    return;
  }

  if(deletionPromptActive && cloudUser){
    if(clicked){
      if(inRect(W/2-175,H/2+95,165,48)) cancelDeleteRequest();
      else if(inRect(W/2+10,H/2+95,165,48)) signOutAndClearLocal(true);
    }
    clicked=false;
    return;
  }

  if(clicked && inRect(W-82,H-82,56,56)){
    clicked=false;
    openSettingsFrom("login");
    return;
  }

  if(cloudUser){
    if(clicked || justPressed("enter") || justPressed(" ")){
      clicked=false;
      startLoggedInAccountGame();
    }
    clicked=false;
    return;
  }

  if(guestMode && hasCreatedProfile && validPlayerName(playerName)){
    if(clicked || justPressed("enter") || justPressed(" ")){
      clicked=false;
      setStoredGuestSessionActive(true);
      explicitGuestSession=true;
      startLoading(startTargetAfterAuth());
    }
    clicked=false;
    return;
  }

  if(clicked){
    const panelX=W/2-210, panelY=165;
    if(inRect(panelX+45,panelY+103,330,44)){
      accountFocusedField = "email";
      accountMsg = "";
    }
    else if(inRect(panelX+45,panelY+175,330,44)){
      accountFocusedField = "password";
      accountMsg = "";
    }
    else if(inRect(panelX+70,panelY+245,280,48)){
      if(accountMode==="register") accountRegisterFlow();
      else accountLoginFlow();
    }
    else if(inRect(panelX+70,panelY+300,280,38)){
      accountMode = accountMode==="register" ? "login" : "register";
      accountFocusedField = "email";
      accountMsg = "";
    }
    else if(inRect(W/2-120,H-58,240,40)){
      accountGuestFlow();
    }
  }
  clicked=false;
}

const UI_GUIDE_TEXT = {
  achievements:{
    title:{zh:"事务处档案｜成就",en:"Affairs Office Archive | Achievements"},
    body:{zh:"成就记录长期游玩目标。达成后需要在此手动领取奖励，未领取项目会显示菱形提示。",en:"Achievements track long-term goals. Completed entries must be claimed here; unclaimed rewards show a diamond alert."}
  },
  manual:{
    title:{zh:"事务处档案｜战斗手册",en:"Affairs Office Archive | Battle Manual"},
    body:{zh:"战斗手册整理每日任务与成长引导。完成基础行动即可获得稳定经验和培养资源。",en:"The Battle Manual contains daily tasks and growth objectives. Complete core activities for steady EXP and upgrade resources."}
  },
  pass:{
    title:{zh:"事务处档案｜通行证",en:"Affairs Office Archive | Action Record"},
    body:{zh:"通行证通过任务积累行动记录经验。等级奖励分轨展示，达到等级后需要手动领取。",en:"Action Record missions grant pass EXP. Reward tracks are shown separately and must be claimed after reaching each level."}
  },
  profile:{
    title:{zh:"事务处档案｜个人资料",en:"Affairs Office Archive | Profile"},
    body:{zh:"个人资料展示账号进度、常用执行官、头像与头像框。未获得角色不能设为头像或展示角色。",en:"Profile displays account progress, featured Operators, avatar, and frame. Unowned Operators cannot be selected for display."}
  },
  notice:{
    title:{zh:"事务处档案｜公告",en:"Affairs Office Archive | Notices"},
    body:{zh:"公告用于查看版本内容、活动信息与维护说明。阅读后，对应的新内容提示会自动消失。",en:"Notices contain version updates, event information, and maintenance notes. Related new-content alerts clear after viewing."}
  },
  checkin:{
    title:{zh:"事务处档案｜月签到",en:"Affairs Office Archive | Monthly Check-in"},
    body:{zh:"月签到拥有独立的30日奖励与累计登录里程碑。每天登录后点击当日区域领取。",en:"Monthly Check-in has a separate 30-day track and login milestones. Open it each day to claim the current reward."}
  },
  operation:{
    title:{zh:"事务处档案｜作战",en:"Affairs Office Archive | Operation"},
    body:{zh:"作战是主线与委托入口。你可以查看关卡、确认奖励，并在准备队伍后进入战斗。",en:"Operation is the entry for main stages and commissions. View stages, check rewards, prepare your team, then deploy."}
  },
  operators:{
    title:{zh:"事务处档案｜执行官",en:"Affairs Office Archive | Operators"},
    body:{zh:"执行官页面用于查看角色、升级等级、强化技能与武器。主角会在开局默认拥有，不会丢失。",en:"The Operators page lets you view characters, level them up, and improve skills and weapons. The protagonist is owned from the start and cannot be lost."}
  },
  shop:{
    title:{zh:"事务处档案｜商店",en:"Affairs Office Archive | Shop"},
    body:{zh:"商店用于查看角色、武器与资源内容。当前测试版本为模拟购买，不会产生真实收费。",en:"The Shop shows characters, weapons, and resources. This test build uses simulated purchases only."}
  },
  mail:{
    title:{zh:"事务处档案｜邮件",en:"Affairs Office Archive | Mail"},
    body:{zh:"邮件用于领取补给、公告奖励与测试奖励。建议每次登录后先查看是否有新邮件。",en:"Mail is used for supplies, announcements, and test rewards. Check it after logging in."}
  },
  event:{
    title:{zh:"事务处档案｜活动",en:"Affairs Office Archive | Events"},
    body:{zh:"活动页面会显示签到、成长奖励与阶段任务。活动奖励通常有领取条件或顺序限制。",en:"Events include check-ins, growth rewards, and milestone tasks. Some rewards have conditions or claim order."}
  },
  warehouse:{
    title:{zh:"事务处档案｜仓库",en:"Affairs Office Archive | Inventory"},
    body:{zh:"仓库用于查看金币、经验材料、武器材料与道具。后续档案功能也可以从这里扩展。",en:"Inventory shows Gold, EXP materials, weapon materials, and items. Future archive functions can expand from here."}
  },
  settings:{
    title:{zh:"事务处档案｜设置",en:"Affairs Office Archive | Settings"},
    body:{zh:"设置用于调整语言、画质、帧率、音效与账号相关选项。修改会在退出页面时自动保存。",en:"Settings controls language, quality, FPS, audio, and account options. Changes are saved automatically when you leave the page."}
  },
  mainStage:{
    title:{zh:"事务处档案｜主线作战",en:"Affairs Office Archive | Main Operation"},
    body:{zh:"主线作战会推进章节剧情。选择节点后可查看任务信息，确认后进入队伍准备。",en:"Main Operation advances chapter story. Select a node to view mission details, then confirm and prepare your team."}
  },
  commission:{
    title:{zh:"事务处档案｜委托作战",en:"Affairs Office Archive | Commission"},
    body:{zh:"委托作战是额外战斗任务，适合获取水晶、经验与培养资源。",en:"Commissions offer additional combat missions that reward Crystals, EXP, and upgrade materials."}
  },
  dungeon:{
    title:{zh:"事务处档案｜副本",en:"Affairs Office Archive | Dungeon"},
    body:{zh:"副本包含材料、Boss、探索与巡逻入口。不同副本会消耗体力并提供不同资源。",en:"Dungeon includes materials, bosses, exploration, and patrol entries. Different modes cost stamina and provide different resources."}
  },
  sideStory:{
    title:{zh:"事务处档案｜Side Story",en:"Affairs Office Archive | Side Story"},
    body:{zh:"外传用于补充角色故事与支线内容。当前版本只开放入口展示，正式内容会在后续版本加入。",en:"Side Story expands character stories and side content. This build only shows the entry; full content will arrive later."}
  },
  daydream:{
    title:{zh:"事务处档案｜白日梦重现",en:"Affairs Office Archive | Daydream Reconstruction"},
    body:{zh:"白日梦是调查型肉鸽玩法。你需要收集线索、控制精神污染，并在污染失控前抵达终点。",en:"Daydream is a roguelite investigation mode. Collect clues, manage mental pollution, and reach the end before contamination overwhelms you."}
  }
};

function uiGuidePick(v){ return v ? (language === "en" ? (v.en || v.zh || "") : (v.zh || v.en || "")) : ""; }

function ensureStarterRoster(){
  while(owned.length < roles.length) owned.push(false);
  for(const roleId of [0,1,2,PROTAGONIST_ROLE]) owned[roleId] = true;
  if(!Array.isArray(team) || team.length < 1) team = [PROTAGONIST_ROLE,1,2];
  if(!owned[team[0]]) team[0] = PROTAGONIST_ROLE;
}

// Compatibility name for older call sites and external extensions.
function ensureStarterProtagonist(){ ensureStarterRoster(); }

function featureGuideData(key){ return UI_GUIDE_TEXT[key] || UI_GUIDE_TEXT.operation; }

function featureGuideSteps(key){
  const zh={
    achievements:["查看分类与进度","选择已达成记录","领取完成奖励"],
    manual:["查看每日任务","完成指定行动","领取任务奖励"],
    pass:["完成通行证任务","积累行动记录经验","领取等级奖励"],
    profile:["查看账号概况","选择展示角色与头像","配置头像框"],
    notice:["选择公告分类","阅读版本与活动内容","关闭后标记已读"],
    checkin:["确认当月进度","领取今日奖励","查看累计里程碑"],
    operation:["选择作战类型","查看关卡与奖励","编队后开始行动"],
    operators:["选择执行官","查看养成项目","确认升级与配置"],
    shop:["选择商品分类","确认消耗与内容","完成兑换"],
    mail:["选择邮件","领取附件","清理已读邮件"],
    event:["选择活动","查看达成条件","领取活动奖励"],
    warehouse:["切换物品分类","查看持有数量","确认获取来源"],
    settings:["选择设置分类","调整选项","返回时自动保存"],
    mainStage:["选择章节","选择关卡节点","编队并开始行动"],
    commission:["切换委托章节","查看机制与限时","完成全部波次"],
    dungeon:["选择副本类型","选择独立难度","消耗体力进入"],
    sideStory:["选择外传档案","查看开放条件","进入支线内容"],
    daydream:["选择白日梦档案","配置词条与队伍","调查随机节点"]
  };
  const en={
    achievements:["Review categories","Select completed records","Claim completion rewards"],
    manual:["Review daily tasks","Complete listed actions","Claim task rewards"],
    pass:["Complete pass missions","Earn Action Record EXP","Claim level rewards"],
    profile:["Review account summary","Choose display and avatar","Equip an avatar frame"],
    notice:["Choose a notice category","Read update information","Close to mark as read"],
    checkin:["Review monthly progress","Claim today's reward","Check login milestones"],
    operation:["Choose operation type","Review stage and rewards","Deploy after squad setup"],
    operators:["Select an Operator","Review upgrade options","Confirm upgrades and loadout"],
    shop:["Choose a category","Check cost and contents","Complete the exchange"],
    mail:["Select mail","Claim attachments","Clear read mail"],
    event:["Choose an event","Review objectives","Claim event rewards"],
    warehouse:["Switch item category","Review owned amount","Check acquisition source"],
    settings:["Choose a settings tab","Adjust options","Changes save on return"],
    mainStage:["Choose a chapter","Select a stage node","Prepare and deploy"],
    commission:["Switch commission chapter","Review rules and timer","Clear every wave"],
    dungeon:["Choose dungeon type","Select its difficulty","Spend stamina to enter"],
    sideStory:["Choose an archive","Review unlock condition","Enter the side story"],
    daydream:["Choose a Daydream file","Set modifiers and squad","Investigate random nodes"]
  };
  const source=language==="en"?en:zh;
  return source[key]||source.operation;
}

function requestFeatureGuide(key, enterFn){
  ensureStarterProtagonist();
  if(uiGuideSeen && uiGuideSeen[key]){
    if(typeof enterFn === "function") enterFn();
    return true;
  }
  uiGuidePrompt = {key:key, enter:enterFn, step:0};
  sfx("ui");
  return true;
}

function closeFeatureGuidePrompt(markSeen, enterAfter){
  const prompt = uiGuidePrompt;
  if(!prompt) return;
  if(markSeen){
    uiGuideSeen[prompt.key] = true;
    saveGame();
  }
  uiGuidePrompt = null;
  clicked = false;
  mouseDown = false;
  if(enterAfter && prompt && typeof prompt.enter === "function") prompt.enter();
}

function updateFeatureGuidePrompt(){
  if(!uiGuidePrompt) return false;
  if(justPressed("enter") || justPressed(" ")){
    const steps=featureGuideSteps(uiGuidePrompt.key);
    if((uiGuidePrompt.step||0) < steps.length-1){uiGuidePrompt.step=(uiGuidePrompt.step||0)+1;sfx("ui");}
    else closeFeatureGuidePrompt(true,true);
    clicked=false;
    return true;
  }
  if(clicked){
    const x=W/2-300, y=H/2-154;
    const steps=featureGuideSteps(uiGuidePrompt.key);
    if(inRect(x+352,y+238,210,50)){
      if((uiGuidePrompt.step||0) < steps.length-1){
        uiGuidePrompt.step=(uiGuidePrompt.step||0)+1;
        clicked=false;
        sfx("ui");
      }else closeFeatureGuidePrompt(true, true);
      return true;
    }
    if(inRect(x+32,y+250,120,28) || inRect(x+548,y+12,40,40)){
      closeFeatureGuidePrompt(true, true);
      return true;
    }
  }
  if(justPressed("escape")){
    closeFeatureGuidePrompt(true, true);
    return true;
  }
  clicked=false;
  return true;
}

function drawFeatureGuidePrompt(){
  if(!uiGuidePrompt) return;
  const data = featureGuideData(uiGuidePrompt.key);
  const title = uiGuidePick(data.title);
  const body = uiGuidePick(data.body);
  const steps=featureGuideSteps(uiGuidePrompt.key);
  const step=Math.max(0,Math.min(steps.length-1,uiGuidePrompt.step||0));
  const x=W/2-300, y=H/2-154, w=600, h=308;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.76)";
  ctx.fillRect(0,0,W,H);
  ctx.beginPath();ctx.roundRect(x,y,w,h,18);
  ctx.fillStyle="rgba(7,10,22,.97)";ctx.fill();
  ctx.strokeStyle="rgba(124,199,255,.48)";
  ctx.lineWidth=1.5;
  ctx.stroke();
  const sweep=(Date.now()/18)%(w-80);
  const sweepGrad=ctx.createLinearGradient(x+sweep-80,0,x+sweep+80,0);
  sweepGrad.addColorStop(0,"rgba(124,199,255,0)");
  sweepGrad.addColorStop(.5,"rgba(124,199,255,.38)");
  sweepGrad.addColorStop(1,"rgba(124,199,255,0)");
  ctx.fillStyle=sweepGrad;ctx.fillRect(x+20,y,w-40,2);
  ctx.fillStyle="#ffe066";ctx.fillRect(x,y,6,h);

  ctx.fillStyle="rgba(124,199,255,.9)";
  ctx.font="bold 12px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText((language==="en"?"UI GUIDE  ":"界面引导  ")+String(step+1).padStart(2,"0")+" / "+String(steps.length).padStart(2,"0"),x+34,y+34);

  ctx.fillStyle="#fff";
  ctx.font="bold 24px " + FONT_UI;
  ctx.fillText(title,x+34,y+70);

  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  wrapText(body,x+34,y+101,w-68,22);

  const cardY=y+150;
  ctx.beginPath();ctx.roundRect(x+34,cardY,w-68,62,10);
  ctx.fillStyle="rgba(124,199,255,.075)";ctx.fill();
  ctx.strokeStyle="rgba(124,199,255,.28)";ctx.stroke();
  ctx.fillStyle="#ffe066";ctx.font="bold 22px "+FONT_UI;ctx.fillText("0"+(step+1),x+50,cardY+38);
  ctx.fillStyle="#fff";ctx.font="bold 17px "+FONT_UI;ctx.fillText(steps[step],x+100,cardY+38);
  for(let i=0;i<steps.length;i++){
    ctx.beginPath();ctx.arc(x+34+i*19,y+228,4,0,Math.PI*2);
    ctx.fillStyle=i<=step?"#7cc7ff":"rgba(255,255,255,.22)";ctx.fill();
  }

  ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="11px " + FONT_UI;ctx.textAlign="left";
  ctx.fillText(language==="en" ? "Completed or skipped guides cannot be replayed." : "完成或跳过后均无法再次查看。",x+34,y+244);
  ctx.fillStyle="rgba(124,199,255,.58)";ctx.textAlign="right";
  ctx.fillText(language==="en"?"Enter / Space: Next  ·  Esc: Skip":"Enter / Space：下一步  ·  Esc：跳过",x+w-34,y+226);
  ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.66)";ctx.font="bold 13px "+FONT_UI;ctx.fillText(language==="en"?"Skip Guide":"跳过引导",x+34,y+273);

  drawBtn(step===steps.length-1?(language==="en"?"Enter":"进入功能"):(language==="en"?"Next":"下一步"),step===steps.length-1?"":"→",x+352,y+238,210,50,true,"#ffe066");
  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="bold 20px Arial";
  ctx.textAlign="center";
  ctx.fillText("×",x+568,y+39);
  ctx.restore();
}

function setOperationTabWithGuide(tab, guideKey, after){
  return requestFeatureGuide(guideKey, function(){
    selectedTab=tab;
    selectedStage=1;
    operationDetailVisible=false;
    if(typeof after === "function") after();
  });
}

function exitPZDaydreamFullscreen(){
  selectedTab="main";
  mainChapterView="chapters";
  operationDetailVisible=false;
  clicked=false;
}
window.exitPZDaydreamFullscreen=exitPZDaydreamFullscreen;


// V49.17.9 Feature gates
// Before Chapter 0 is complete, core onboarding systems are usable, including Shop.
// Dungeon and Daydream are temporarily open for testing. Side Story and
// Action Record keep their story progression requirements.
function chapter0Complete(){ return !!cleared[11]; }
function chapter1Complete(){ return !!cleared["ch1_10"]; }
const DUNGEON_EARLY_ACCESS = false;
const DAYDREAM_EARLY_ACCESS = false;
function lockTextChapter0(){ return language === "en" ? "Complete Chapter 0 to unlock this feature" : "通关第0章后解锁该功能"; }
function lockTextChapter1(){ return language === "en" ? "Complete Chapter 1 to unlock this feature" : "通关第1章后解锁该功能"; }
function lockTextChapter2(){ return language === "en" ? "Complete Chapter 2 to unlock Daydream Reconstruction" : "通关第2章后解锁白日梦重现"; }
function lockTextFuture(){ return language === "en" ? "This feature will be available in a future version" : "该功能将在未来版本开放"; }
function showFeatureLocked(kind="chapter0"){
  showCenter(kind === "future" ? lockTextFuture() : kind === "chapter2" ? lockTextChapter2() : kind === "chapter1" ? lockTextChapter1() : lockTextChapter0(), 90);
}
function canUseActionRecord(){ return chapter0Complete(); }
function canUseDungeon(){ return DUNGEON_EARLY_ACCESS || chapter0Complete(); }
function canUseSideStory(){ return chapter0Complete(); }
function canUseDaydream(){ return DAYDREAM_EARLY_ACCESS || storyChapterComplete(2); }
function canUseModuleDungeon(){ return storyChapterComplete(1); }
function canUseShop(){ return true; }

function lobbyRecommendedMission(){
  let chapter=0, list=chapter0Stages, keyFor=id=>id;
  if(chapter0Complete()){
    chapter=1;list=chapter1Stages;keyFor=id=>"ch1_"+id;
  }
  if(storyChapterComplete(1)){
    chapter=2;list=chapter2Stages;keyFor=id=>"ch2_"+id;
  }
  if(storyChapterComplete(2)){
    return {
      chapter:3,stage:1,total:1,completed:0,progress:1,
      code:language==="en"?"DAYDREAM":"白日梦",
      title:language==="en"?"Reconstruction Available":"重现调查现已开放",
      chapterText:language==="en"?"NEW INVESTIGATION":"新调查任务",
      hint:language==="en"?"Enter Operations to begin":"前往作战开始调查"
    };
  }
  let completed=0,next=null;
  for(let i=1;i<=list.length;i++){
    if(cleared[keyFor(i)]) completed++;
    else if(next===null) next=i;
  }
  if(next===null) next=list.length;
  const stage=list[next-1]||list[0]||{};
  return {
    chapter,stage:next,total:list.length,completed,
    progress:list.length?Math.max(0,Math.min(1,completed/list.length)):0,
    code:String(chapter).padStart(2,"0")+"-"+String(next).padStart(2,"0"),
    title:language==="en"?(stage.name||"Next Mission"):(stage.zh||"下一任务"),
    chapterText:language==="en"?("CHAPTER "+chapter+" · CURRENT MISSION"):("第"+chapter+"章 · 当前任务"),
    hint:language==="en"?(completed+" / "+list.length+" CLEARED"):("已完成 "+completed+" / "+list.length)
  };
}

function lobbyRecommendedText(){
  const mission=lobbyRecommendedMission();
  return mission.code+" · "+mission.title;
}

function finishLobbyGuide(){
  lobbyGuideDone=true;lobbyGuideStep=3;notice=msg("defaultNotice");
  saveGame();autoCloudSaveNow(true);sfx("ui");
}

function updateLobbyStarterGuide(){
  if(!prologueDone||lobbyGuideDone)return false;
  if(justPressed("escape")){finishLobbyGuide();clicked=false;return true;}
  if(clicked){
    if(inRect(622,538,130,40)){finishLobbyGuide();clicked=false;return true;}
    if(inRect(770,532,178,50)){
      if(lobbyGuideStep<3){lobbyGuideStep++;saveGame();sfx("ui");}
      else finishLobbyGuide();
      clicked=false;return true;
    }
  }
  clicked=false;return true;
}

function drawLobbyStarterGuide(){
  if(!prologueDone||lobbyGuideDone)return;
  const steps=language==="en"?[
    {title:"Start with Operations",body:"Continue the main story first. New systems unlock as chapters are cleared.",rect:[684,88,386,202]},
    {title:"Know Your Resources",body:"Crystal buys limited growth resources. Gold upgrades characters and weapons. Stamina is spent in Dungeons.",rect:[564,16,506,58]},
    {title:"Prepare Your Squad",body:"Open Executors to review roles, skills and weapons before difficult battles.",rect:[874,292,196,86]},
    {title:"Collect Before You Deploy",body:"Check Mail, Events and the monthly Check-in for available supplies and objectives.",rect:[682,292,388,182]}
  ]:[
    {title:"先从作战开始",body:"优先推进主线。章节通关后会依次开放副本、模块与白日梦等系统。",rect:[684,88,386,202]},
    {title:"认识三种资源",body:"水晶可兑换限量培养资源；金币用于角色和武器养成；体力用于进入副本。",rect:[564,16,506,58]},
    {title:"整理出战队伍",body:"高难战斗前进入执行官页面，确认角色定位、技能和武器配置。",rect:[874,292,196,86]},
    {title:"出发前领取补给",body:"邮件、活动与月度签到会提供当前可领取的资源和阶段目标。",rect:[682,292,388,182]}
  ];
  const s=steps[clamp(lobbyGuideStep,0,3)],r=s.rect;
  ctx.save();ctx.fillStyle="rgba(0,0,0,.68)";ctx.fillRect(0,0,W,H);
  const glow=.7+Math.sin(menuPulse*.1)*.18;
  ctx.beginPath();ctx.roundRect(r[0],r[1],r[2],r[3],15);ctx.strokeStyle="rgba(255,224,102,"+glow+")";ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle="rgba(8,13,25,.98)";ctx.beginPath();ctx.roundRect(205,450,770,150,16);ctx.fill();ctx.strokeStyle="rgba(124,199,255,.46)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle="#ffe066";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";ctx.fillText((language==="en"?"QUICK GUIDE ":"快速引导 ")+"0"+(lobbyGuideStep+1)+" / 04",232,476);
  ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.fillText(s.title,232,510);
  ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="13px "+FONT_UI;wrapText(s.body,232,538,365,18);
  drawBtn(language==="en"?"Skip":"跳过","ESC",622,538,130,40,false,"#999");
  drawBtn(lobbyGuideStep===3?(language==="en"?"Finish":"完成"):(language==="en"?"Next":"下一步"),"",770,532,178,50,true,"#ffe066");
  ctx.restore();
}

function updateLobby(){
  menuPulse++;
  const parallaxTargetX=clamp((mouseX-W/2)/W*8,-4,4);
  const parallaxTargetY=clamp((mouseY-H/2)/H*6,-3,3);
  lobbyParallaxX+=(parallaxTargetX-lobbyParallaxX)*.08;
  lobbyParallaxY+=(parallaxTargetY-lobbyParallaxY)*.08;
  if(!lobbyCheckinOpen&&!lobbyNoticeOpen&&!staminaRecoverOpen&&Date.now()>=lobbyDialogueNextAt) showLobbyDialogue("idle");
  if(updateStaminaRecoverOverlay()) return;
  if(lobbyAssistantSelectorOpen){
    updateLobbyAssistantSelector();
    return;
  }
  if(lobbyCheckinOpen){
    if(justPressed("escape")){ lobbyCheckinOpen=false; clicked=false; return; }
    if(clicked){
      // The visible close icon is centered at (1051,56). Use a generous,
      // symmetric hit target so canvas scaling never leaves half of it inert.
      if(dist(mouseX,mouseY,1051,56)<=32 || inRect(1018,22,66,66)){ lobbyCheckinOpen=false; clicked=false; return; }
      if(inRect(80,535,580,44)){ claimMonthlyCheckinDay(); clicked=false; return; }
      const milestones=monthlyCheckinMilestones();
      for(let i=0;i<milestones.length;i++) if(inRect(938,175+i*50,76,30)){ claimMonthlyMilestone(milestones[i]); clicked=false; return; }
    }
    clicked=false;return;
  }
  if(lobbyNoticeOpen){
    if(justPressed("escape")){
      lobbyNoticeOpen=false;
      clicked=false;
      return;
    }
    if(clicked){
      if(inRect(1028,44,42,42)){
        lobbyNoticeOpen=false;
      }else{
        for(let i=0;i<3;i++){
          if(inRect(350+i*180,58,160,42)){
            lobbyNoticeCategory=i;
            lobbyNoticeSelected=0;
            clicked=false;
            return;
          }
        }
        const list=lobbyNoticeData()[lobbyNoticeCategory] || [];
        for(let i=0;i<list.length;i++){
          if(inRect(68,132+i*74,256,62)){
            lobbyNoticeSelected=i;
            clicked=false;
            return;
          }
        }
      }
    }
    clicked=false;
    return;
  }
  if(updateLobbyStarterGuide()) return;
  if(justPressed("escape")){
    if(!requestReturnToLauncherFromGame()){
      gameMode = "login";
    }
    clicked = false;
    return;
  }
  if(clicked){
    if(inRect(28,30,96,58)){ seeContent("achievements"); requestFeatureGuide("achievements",function(){gameMode="achievements";}); clicked=false; return; }
    if(inRect(28,100,96,58)){ seeContent("manual"); requestFeatureGuide("manual",function(){growthGuideTab="daily";gameMode="growthGuide";}); clicked=false; return; }
    if(inRect(28,170,96,58)){ if(canUseActionRecord()){seeContent("pass");requestFeatureGuide("pass",function(){gameMode="actionRecord";});} else showFeatureLocked("chapter0"); clicked=false; return; }
    if(inRect(28,405,166,54)){ seeContent("profile"); requestFeatureGuide("profile",function(){gameMode="profile";}); clicked=false; return; }
    if(inRect(194,405,84,54)){ showFeatureLocked("future"); clicked=false; return; }
    if(inRect(286,490,62,54)){ seeContent("notice"); requestFeatureGuide("notice",function(){lobbyNoticeOpen=true;lobbyNoticeSelected=0;}); clicked=false; return; }
    if(inRect(278,542,78,70)){ seeContent("checkin"); requestFeatureGuide("checkin",function(){normalizeMonthlyLoginCheckin();lobbyCheckinOpen=true;monthlyCheckinMsg="";}); clicked=false; return; }
    if(inRect(570,22,180,46)){shopTab="recruit";shopSubTab="regular";shopMsg=language==="en"?"Limited Crystal exchanges are shown below Permanent Recruitment.":"常驻招募下方可使用水晶兑换限量培养资源。";requestFeatureGuide("shop",function(){gameMode="shop";});clicked=false;return;}
    if(inRect(750,22,170,46)){warehouseTab="all";warehouseMsg=language==="en"?"Review Gold and upgrade materials here.":"可在仓库查看金币与全部培养材料。";requestFeatureGuide("warehouse",function(){gameMode="warehouse";});clicked=false;return;}
    if(inRect(920,22,144,46)){ openStaminaRecover(); clicked=false; return; }
    if(inRect(194,355,84,42)){ openLobbyAssistantSelector(); return; }
    if(inRect(690,94,374,190)){seeContent("operation");requestFeatureGuide("operation", function(){ enterOperation(); });}
    else if(inRect(690,298,175,74)){ seeContent("event"); requestFeatureGuide("event", function(){ eventMsg = msg("eventDefault"); gameMode="event"; }); }
    else if(inRect(880,298,184,74)){seeContent("operators");requestFeatureGuide("operators", function(){ gameMode="operators"; });}
    else if(inRect(690,386,260,82)){seeContent("shop");requestFeatureGuide("shop", function(){ shopMsg = msg("shopDefault"); gameMode="shop"; }); }
    else if(inRect(964,386,100,82)){ seeContent("mail"); requestFeatureGuide("mail", function(){ gameMode="mail"; }); }
    else if(inRect(690,482,300,122)) requestFeatureGuide("warehouse", function(){ warehouseMsg = msg("warehouseDefault"); gameMode="warehouse"; });
    else if(inRect(1003,482,61,122)) requestFeatureGuide("settings", function(){ openSettingsFrom("lobby"); });
    else if(inRect(300,70,370,570)){ showLobbyDialogue("click"); clicked=false; return; }
  }
  clicked=false;
}
function nodePos(i){ const pts=[[120,345],[205,285],[300,345],[395,285],[490,345],[585,285],[680,345],[775,285],[870,345],[965,285],[1020,410]]; return {x:pts[i][0], y:pts[i][1]}; }

// V41.5 Dungeon / Material Dungeon helpers
function currentMonthKey(){
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
}

function currentDateKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return y + "-" + m + "-" + day;
}


function normalizeMonthlyCardRuntime(){
  const today = currentDateKey();
  if(typeof monthlyClaimDate !== "string") monthlyClaimDate = "";
  // Legacy save compatibility: older builds stored only monthlyClaimed boolean.
  // If an old save says claimed=true but has no date, treat it as not claimed today after migration.
  if(monthlyClaimDate === "" && monthlyClaimed === true){
    monthlyClaimed = false;
  }
  monthlyClaimed = monthlyClaimDate === today;
}

function canClaimMonthlyCard(){
  normalizeMonthlyCardRuntime();
  return monthlyOwned && monthlyClaimDate !== currentDateKey();
}

function claimMonthlyCardReward(){
  normalizeMonthlyCardRuntime();
  if(!monthlyOwned){
    shopMsg = msg("monthlyNeedBuy");
    return;
  }
  if(monthlyClaimDate === currentDateKey()){
    shopMsg = msg("monthlyClaimed");
    return;
  }
  const granted=grantFreeCrystals(150);
  monthlyClaimDate = currentDateKey();
  monthlyClaimed = true;
  shopMsg = (language==="en"?"Claimed: +":"领取成功：+")+granted+(language==="en"?" Crystal":"水晶");
  sfx("reward");
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(true);
}

function currentWeekKeyLegacyV41(){
  const d = new Date();
  const oneJan = new Date(d.getFullYear(),0,1);
  const day = Math.floor((d - oneJan) / 86400000);
  const week = Math.ceil((day + oneJan.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + week;
}

function normalizeDungeonRuntimeLegacyV41(){
  if(typeof dungeonStamina !== "number") dungeonStamina = Math.max(dungeonStamina || 0, 240);
  // Natural stamina cap is 240, but item stamina can overflow.
  dungeonStamina = clamp(dungeonStamina, 0, 9999);

  const today = currentDateKey();
  if(dungeonLastStaminaDate !== today){
    dungeonLastStaminaDate = today;
    dungeonStamina = Math.max(dungeonStamina, 240);
  }

  if(typeof dungeonCandy !== "number") dungeonCandy = 2400;
  if(typeof dungeonStimulant !== "number") dungeonStimulant = 0;
  dungeonCandy = clamp(Math.floor(dungeonCandy), 0, 2400);
  dungeonStimulant = clamp(Math.floor(dungeonStimulant), 0, 4);

  const monthKey = currentMonthKey();
  if(dungeonCandyMonthKey !== monthKey){
    dungeonCandyMonthKey = monthKey;
    dungeonCandy = 2400;
  }

  if(typeof dungeonWeeklyCrystalLeft !== "number") dungeonWeeklyCrystalLeft = 3;
  const wk = currentWeekKey();
  if(dungeonCrystalWeekKey !== wk){
    dungeonCrystalWeekKey = wk;
    dungeonWeeklyCrystalLeft = 3;
  }
  dungeonRewardMultiplier = clamp(Math.floor(dungeonRewardMultiplier || 1), 1, 4);
  materialDungeonDifficulty = clamp(Math.floor(materialDungeonDifficulty || 1), 1, 6);
  materialDungeonSelected = clamp(Math.floor(materialDungeonSelected || 0), 0, 3);
}

function dungeonModes(){
  return language === "en" ? [
    {name:"Materials", full:"Material Trials", icon:"◆", color:"#7cc7ff", desc:"Earn Gold, Executor EXP, Weapon Ore, and Modules."},
    {name:"Boss", full:"Boss Challenge", icon:"B", color:"#ff6b9b", desc:"Challenge powerful enemies for rare rewards. Coming soon."},
    {name:"Explore", full:"Exploration", icon:"◇", color:"#7cffb2", desc:"Explore routes and collect one-time rewards. Coming soon."},
    {name:"Patrol", full:"Patrol", icon:"P", color:"#ffe066", desc:"Send operators to gather resources over time. Coming soon."}
  ] : [
    {name:"材料", full:"材料副本", icon:"◆", color:"#7cc7ff", desc:"金币、角色升级材料、武器强化材料。"},
    {name:"Boss", full:"Boss挑战", icon:"B", color:"#ff6b9b", desc:"挑战强敌，获得稀有奖励。开发中。"},
    {name:"探索", full:"探索地图", icon:"◇", color:"#7cffb2", desc:"探索区域、宝箱、木箱和一次性奖励。开发中。"},
    {name:"巡逻", full:"巡逻", icon:"P", color:"#ffe066", desc:"派遣执行官巡逻获得资源。开发中。"}
  ];
}

function materialDungeons(){
  return language === "en" ? [
    {name:"Gold Trial", short:"Gold", type:"gold", color:"#ffe066", desc:"Obtain a large amount of Gold.", monster:"Crystal Worker", base:{gold:2500, expBooks:0, weaponOre:0}},
    {name:"Character EXP Material", short:"EXP", type:"exp", color:"#7cffb2", desc:"Obtain character upgrade materials.", monster:"Crystal Beast", base:{gold:650, expBooks:4, weaponOre:0}},
    {name:"Weapon Upgrade", short:"Weapon", type:"weapon", color:"#7cc7ff", desc:"Earn Weapon Ore used to upgrade weapons.", monster:"Crystal Guard", base:{gold:650, expBooks:0, weaponOre:4}}
  ] : [
    {name:"金币试炼", short:"金币", type:"gold", color:"#ffe066", desc:"获得大量金币。", monster:"晶体工人", base:{gold:2500, expBooks:0, weaponOre:0}},
    {name:"角色升级材料", short:"角色", type:"exp", color:"#7cffb2", desc:"获得角色升级材料。", monster:"晶体兽", base:{gold:650, expBooks:4, weaponOre:0}},
    {name:"武器强化材料", short:"武器", type:"weapon", color:"#7cc7ff", desc:"获得武器强化材料。", monster:"晶体守卫", base:{gold:650, expBooks:0, weaponOre:4}}
  ];
}

function romanLegacyV41(n){
  return ["","Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ"][n] || String(n);
}

function materialRewardPreview(){
  normalizeDungeonRuntime();
  const d = materialDungeons()[materialDungeonSelected] || materialDungeons()[0];
  const diff = materialDungeonDifficulty;
  const mult = dungeonRewardMultiplier;
  const scale = diff;
  const staminaCost = 20 * mult;
  const base = d.base;
  return {
    gold: Math.floor((base.gold + diff * 450) * mult),
    expBooks: Math.floor((base.expBooks + Math.max(0,diff-1)*2) * mult),
    weaponOre: Math.floor((base.weaponOre + Math.max(0,diff-1)*2) * mult),
    crystal: dungeonWeeklyCrystalLeft > 0 ? 20 : 0,
    staminaCost
  };
}

function claimMaterialDungeonReward(){
  normalizeDungeonRuntime();
  const r = materialRewardPreview();
  if(dungeonStamina < r.staminaCost){
    showCenter(language==="en" ? "Not enough stamina" : "体力不足", 70);
    return;
  }
  dungeonStamina -= r.staminaCost;
  gold += r.gold;
  expBooks += r.expBooks;
  weaponOre += r.weaponOre;
  if(r.crystal > 0){
    r.crystal=grantFreeCrystals(r.crystal);
    dungeonWeeklyCrystalLeft = Math.max(0, dungeonWeeklyCrystalLeft - 1);
  }
  totalGoldEarned += r.gold;
  sfx("reward");
  const parts = [];
  if(r.gold) parts.push((language==="en"?"Gold ":"金币 ")+r.gold);
  if(r.expBooks) parts.push((language==="en"?"EXP Mat ":"角色材料 ")+r.expBooks);
  if(r.weaponOre) parts.push((language==="en"?"Weapon Mat ":"武器材料 ")+r.weaponOre);
  if(r.crystal) parts.push("Crystal 20");
  showCenter((language==="en"?"Reward: ":"获得：") + parts.join(" / "), 130);
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(false);
  clicked = false;
  mouseDown = false;
}

function drawDungeonTopBar(){
  normalizeDungeonRuntime();
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.46)";
  ctx.fillRect(W-390,34,320,42);
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.strokeRect(W-390,34,320,42);
  ctx.fillStyle="#fff";
  ctx.font="bold 16px " + FONT_UI;
  ctx.textAlign="left";
  drawStaminaIcon(W-375,42,25);
  ctx.fillText((language==="en"?"Stamina ":"体力 ")+Math.floor(dungeonStamina)+"/240",W-346,61);
  ctx.fillStyle="#ffe066";
  ctx.fillText((language==="en"?"Weekly Crystal ":"每周水晶 ")+dungeonWeeklyCrystalLeft+"/3",W-218,61);
  ctx.restore();
}

function drawDungeonInlinePanelLegacyV41(){
  normalizeDungeonRuntime();
  const modes = dungeonModes();

  ctx.save();
  uiPanel(70,145,980,390,"rgba(124,199,255,.22)","rgba(5,8,18,.82)");

  ctx.fillStyle="#fff";
  ctx.font="bold 28px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Dungeon":"副本",95,190);
  ctx.fillStyle="rgba(255,255,255,.56)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Material / Boss / Exploration / Patrol":"材料 / Boss / 探索 / 巡逻",97,214);

  drawDungeonTopBar();

  // left categories
  for(let i=0;i<modes.length;i++){
    const m=modes[i], x=92, y=245+i*64, w=210, h=50;
    const sel=dungeonSelected===i;
    ctx.fillStyle=sel?"rgba(255,224,102,.18)":"rgba(255,255,255,.055)";
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=sel?"#ffe066":"rgba(255,255,255,.12)";
    ctx.strokeRect(x,y,w,h);
    ctx.fillStyle=m.color;
    ctx.font="bold 20px Arial";
    ctx.textAlign="center";
    ctx.fillText(m.icon,x+28,y+32);
    ctx.fillStyle="#fff";
    ctx.font="bold 16px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(m.full,x+58,y+31);
  }

  // right content
  if(dungeonSelected===0) drawMaterialDungeonContent();
  else drawComingSoonDungeonContent(modes[dungeonSelected]);
  ctx.restore();
}

function drawComingSoonDungeonContent(mode){
  const x=330,y=245,w=675,h=235;
  ctx.fillStyle="rgba(255,255,255,.05)";
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=mode.color;
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(mode.full,x+28,y+50);
  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="16px " + FONT_UI;
  wrapText(mode.desc,x+28,y+86,w-56,28);
  ctx.fillStyle="rgba(255,224,102,.85)";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(language==="en"?"Coming Soon":"开发中",x+28,y+h-38);
}

function drawMaterialDungeonContent(){
  const list=materialDungeons();
  const x=330,y=235,w=690,h=275;

  // material dungeon cards
  for(let i=0;i<list.length;i++){
    const d=list[i], cx=x+i*220, cy=y, cw=205, ch=78;
    const sel=materialDungeonSelected===i;
    ctx.fillStyle=sel?"rgba(255,224,102,.18)":"rgba(255,255,255,.055)";
    ctx.fillRect(cx,cy,cw,ch);
    ctx.strokeStyle=sel?"#ffe066":"rgba(255,255,255,.13)";
    ctx.lineWidth=sel?2:1;
    ctx.strokeRect(cx,cy,cw,ch);
    ctx.fillStyle=d.color;
    ctx.font="bold 18px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(d.name,cx+16,cy+34);
    ctx.fillStyle="rgba(255,255,255,.50)";
    ctx.font="12px " + FONT_UI;
    ctx.fillText(d.desc,cx+16,cy+58);
  }

  const d=list[materialDungeonSelected];
  const r=materialRewardPreview();

  // difficulty
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Difficulty":"难度",x,y+120);
  for(let i=1;i<=6;i++){
    const bx=x+(i-1)*54, by=y+135;
    const sel=materialDungeonDifficulty===i;
    ctx.fillStyle=sel?"rgba(255,128,64,.22)":"rgba(255,255,255,.055)";
    ctx.fillRect(bx,by,44,42);
    ctx.strokeStyle=sel?"#ff9955":"rgba(255,255,255,.16)";
    ctx.strokeRect(bx,by,44,42);
    ctx.fillStyle=sel?"#ff9955":"#fff";
    ctx.font="bold 22px Arial";
    ctx.textAlign="center";
    ctx.fillText(roman(i),bx+22,by+28);
  }

  // details
  ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.65)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Recommended Lv.":"建议等级 Lv.") + (10 + materialDungeonDifficulty*10), x+360, y+128);
  ctx.fillText((language==="en"?"Enemy: ":"登场怪物：") + d.monster + " Lv." + (10 + materialDungeonDifficulty*10), x+360, y+158);

  // reward preview
  ctx.fillStyle="#ffe066";
  ctx.font="bold 17px " + FONT_UI;
  ctx.fillText(language==="en"?"Reward Preview":"奖励预览",x,y+210);
  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="15px " + FONT_UI;
  let ry=y+238;
  if(r.gold) { ctx.fillText((language==="en"?"Gold ×":"金币 ×")+r.gold,x,ry); ry+=24; }
  if(r.expBooks) { ctx.fillText((language==="en"?"Executor EXP ×":"角色升级材料 ×")+r.expBooks,x,ry); ry+=24; }
  if(r.weaponOre) { ctx.fillText((language==="en"?"Weapon Ore ×":"武器强化材料 ×")+r.weaponOre,x,ry); ry+=24; }
  ctx.fillStyle=r.crystal>0?"#7cc7ff":"rgba(255,255,255,.38)";
  ctx.fillText(r.crystal>0 ? ((language==="en"?"Weekly Crystal +":"每周水晶 +")+r.crystal+"  ("+dungeonWeeklyCrystalLeft+"/3)") : (language==="en"?"Weekly Crystal claimed":"每周水晶已领取完"),x+330,y+210);

  // multiplier controls
  ctx.fillStyle="rgba(255,255,255,.56)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Reward Multiplier":"奖励倍率",x+330,y+248);
  drawBtn("－","",x+330,y+262,48,38,false,"#fff");
  ctx.fillStyle="#fff";
  ctx.font="bold 22px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText("×"+dungeonRewardMultiplier,x+425,y+288);
  drawBtn("＋","",x+470,y+262,48,38,false,"#fff");

  ctx.fillStyle="rgba(255,255,255,.50)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText((language==="en"?"Cost: ":"消耗：")+r.staminaCost+" / 240",x+545,y+286);

  drawBtn(language==="en"?"Enter":"进入",(language==="en"?"Cost ":"消耗 ")+r.staminaCost,x+515,y+310,175,48,dungeonStamina>=r.staminaCost,dungeonStamina>=r.staminaCost?"#ffe066":"#888");
}

function updateDungeonInlineClicksLegacyV41(){
  const modes=dungeonModes();
  for(let i=0;i<modes.length;i++){
    const x=92, y=245+i*64, w=210, h=50;
    if(inRect(x,y,w,h)){
      dungeonSelected=i;
      dungeonPanelMode="list";
      clicked=false;
      return true;
    }
  }

  if(dungeonSelected===0){
    const x=330,y=235;
    for(let i=0;i<3;i++){
      if(inRect(x+i*220,y,205,78)){
        materialDungeonSelected=i;
        clicked=false;
        return true;
      }
    }
    for(let i=1;i<=6;i++){
      const bx=x+(i-1)*54, by=y+135;
      if(inRect(bx,by,44,42)){
        materialDungeonDifficulty=i;
        clicked=false;
        return true;
      }
    }
    if(inRect(x+330,y+262,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier-1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(x+470,y+262,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier+1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(x+515,y+310,175,48)){
      claimMaterialDungeonReward();
      clicked=false;
      return true;
    }
  }
  return false;
}

function updateOperation(){
  menuPulse++;
  if(selectedTab==="daydream"&&!canUseDaydream()){
    selectedTab="main";mainChapterView="chapters";operationDetailVisible=false;
  }
  if(updateStaminaRecoverOverlay()) return;
  if(justPressed("escape")){
    if(selectedTab==="daydream" && window.PZDaydream){
      const handled=typeof window.PZDaydream.handleEscape==="function"&&window.PZDaydream.handleEscape();
      if(!handled) exitPZDaydreamFullscreen();
    }else if(selectedTab==="sideStory" && window.PZSideStory &&
             typeof window.PZSideStory.handleEscape==="function" &&
             window.PZSideStory.handleEscape()){
      // The Side Story popup owns ESC before the Operation page does.
    }else if(selectedTab==="main" && mainChapterView==="stages"){
      mainChapterView="chapters";
      operationDetailVisible=false;
    }else if(selectedTab==="dungeon" && dungeonPanelMode!=="home"){
      dungeonPanelMode="home";
      materialDungeonRun=null;
      moduleArchiveWheelDelta=0;
    }else{
      enterLobby();
    }
    clicked=false;
    return;
  }
  if(clicked){
    let handled = false;

    // Fullscreen Daydream owns the entire game canvas. Consume the click here
    // so its UI can never fall through to the operation tabs underneath.
    if(selectedTab==="daydream" && window.PZDaydream &&
       typeof window.PZDaydream.isFullscreen==="function" && window.PZDaydream.isFullscreen()){
      if(typeof window.PZDaydream.handleClick==="function") window.PZDaydream.handleClick();
      clicked=false;
      return;
    }

    if(selectedTab==="main" && mainChapterView==="chapters"){
      if(inRect(72,154,220,345)){
        loadMainChapter(0);
        mainChapterView="stages";
        handled=true;
      }else if(inRect(306,184,164,305)){
        if(chapter0Complete()){
          loadMainChapter(1);
          mainChapterView="stages";
        }else showFeatureLocked("chapter0");
        handled=true;
      }else if(inRect(490,184,164,305)){
        if(chapter1Complete()){
          loadMainChapter(2);
          mainChapterView="stages";
        }else showFeatureLocked("chapter1");
        handled=true;
      }else{
        for(let i=3;i<5;i++){
          if(inRect(306+(i-1)*184,184,164,305)){
            showFeatureLocked("future");
            handled=true;
            break;
          }
        }
      }
    }

    if(inRect(90,595,135,38)){
      handled = setOperationTabWithGuide("main", "mainStage", function(){ mainChapterView="chapters"; });
    }else if(inRect(240,595,135,38)){
      handled = setOperationTabWithGuide("combat", "commission", function(){ selectedCommissionChapter=0; selectedStage=1; operationDetailVisible=false; });
    }else if(inRect(390,595,135,38)){
      if(!canUseDungeon()){ showFeatureLocked("chapter0"); handled=true; }
      else handled = setOperationTabWithGuide("dungeon", "dungeon", function(){ dungeonSelected=0; });
    }else if(inRect(540,595,135,38)){
      if(!canUseSideStory()){ showFeatureLocked("chapter0"); handled=true; }
      else handled = setOperationTabWithGuide("sideStory", "sideStory");
    }else if(inRect(690,595,135,38)){
      if(!canUseDaydream()){ showFeatureLocked("chapter2"); handled=true; }
      else handled = setOperationTabWithGuide("daydream", "daydream", function(){
        seeContent("daydream");
        if(window.PZDaydream){
          window.PZDaydream.selectedDaydreamScenario=null;
          window.PZDaydream.page="home";
          window.PZDaydream.archiveInline=true;
        }
      });
    }else if(inRect(890,595,170,38)){
      enterLobby();
      handled = true;
    }

    if(!handled && selectedTab==="dungeon"){
      handled = updateDungeonInlineClicks();
    }

    if(!handled && selectedTab==="sideStory" && window.PZSideStory){
      handled = window.PZSideStory.handleClick();
    }

    if(!handled && selectedTab==="daydream" && window.PZDaydream){
      handled = window.PZDaydream.handleClick();
    }

    if(!handled && selectedTab==="combat" && inRect(52,305,52,52)){
      selectedCommissionChapter=(selectedCommissionChapter+commissionChapters.length-1)%commissionChapters.length;
      selectedStage=currentCommissionStages()[0].id; operationDetailVisible=false; handled=true;
    }else if(!handled && selectedTab==="combat" && inRect(1016,305,52,52)){
      selectedCommissionChapter=(selectedCommissionChapter+1)%commissionChapters.length;
      selectedStage=currentCommissionStages()[0].id; operationDetailVisible=false; handled=true;
    }

    if(!handled && operationDetailVisible && selectedTab!=="dungeon" && selectedTab!=="sideStory" && selectedTab!=="daydream"){
      const locked = selectedTab==="combat" ? false : (selectedStage>1 && !isMainStageCleared(selectedStage-1));
      if(inRect(W-338,486,255,52)){
        if(!locked){
          if(selectedTab==="combat"){
            startCommissionBattle(selectedStage);
          }else{
            enterStory(selectedStage);
          }
        }
        handled = true;
      }
      if(inRect(W-360,145,300,390)){
        handled = true;
      }
    }

    if(!handled && selectedTab!=="dungeon" && selectedTab!=="sideStory" && selectedTab!=="daydream"){
      let picked = false;
      const list = currentOperationStages();
      for(let i=0;i<list.length;i++){
        const p = selectedTab==="combat" ? operationNodePos(i) : nodePos(i);
        const locked = selectedTab==="combat" ? false : (i>0&&!isMainStageCleared(i));
        if(!locked && dist(mouseX,mouseY,p.x,p.y)<28){
          selectedStage=list[i].id;
          operationDetailVisible=true;
          picked = true;
          handled = true;
          break;
        }
      }
      if(!picked){
        operationDetailVisible=false;
      }
    }
  }
  clicked=false;
}


function completeChapter0Epilogue(){
  if(!cleared[11]){
    cleared[11]=true;
    // Chapter 0 completion syncs only the protagonist story level to Lv.10 and unlocks Dungeon.
    setProtagonistStoryLevel(10);
    checkAchievements();
    saveGame(); autoCloudSaveNow(true);
  }
  selectedTab="main";
  operationDetailVisible=false;
  showCenter(language==="en"?"Chapter 0 Complete | Protagonist Lv.10 | Dungeon Unlocked":"第0章完成｜主角 Lv.10｜副本已解锁",120);
  gameMode="operation";
}

function completeStoryOnlyStage(){
  const st=stages[selectedStage-1];
  if(!st) return;
  const key=mainStageClearKey(selectedStage);
  let granted=0;
  if(!cleared[key]){
    cleared[key]=true;
    granted=grantFreeCrystals(st.reward||0);
    addPlayerExp(500);
    if(selectedMainChapter===0) setProtagonistStoryLevel(Math.min(9,Math.max(protagonistStoryLevel||1,selectedStage)));
    checkAchievements();
    saveGame(); autoCloudSaveNow(true);
  }
  operationDetailVisible=false;
  gameMode="operation";
  if(selectedMainChapter===2 && selectedStage===11){
    cleared.ch2_complete=true;
    saveGame();autoCloudSaveNow(true);
    showCenter(language==="en"?"Chapter 2 Complete · Daydream Reconstruction Unlocked":"第二章完成｜白日梦重现已解锁",130);
  }else showCenter(selectedMainChapter===1 && selectedStage===10
      ? (language==="en"?"Chapter 1 Complete · The rescue operation begins":"第一章完成｜真正的救援行动即将开始")
      : (granted?((language==="en"?"Story Clear · Crystal +":"剧情完成｜水晶 +")+granted):(language==="en"?"Story replay complete":"剧情回顾完成")),100);
}

function updateStory(){
  menuPulse++;
  const chapter0Final = selectedTab==="main" && selectedMainChapter===0 && selectedStage===11;
  const storyOnly = selectedTab==="main" && !!(stages[selectedStage-1]&&stages[selectedStage-1].storyOnly);
  const finish=()=>{ if(chapter0Final) completeChapter0Epilogue(); else if(storyOnly) completeStoryOnlyStage(); else enterTeamSetup(); };
  if(clicked && inRect(W-205,H-82,165,48)){ clicked=false; mouseDown=false; finish(); return; }
  if(clicked || justPressed("enter") || justPressed(" ")){ storyIndex++; if(storyIndex>=currentStory.length) finish(); }
  if(justPressed("escape")) finish();
  clicked=false;
}
function updateSettlement(){
  menuPulse++;
  if(clicked||justPressed("enter")||justPressed(" ")){
    clicked=false;
    mouseDown=false;
    mouseAttackConsumed=false;
    if(settlement && settlement.mode==="projectArea"){
      selectedTab="dungeon";
      dungeonPanelMode="projectArea";
      operationDetailVisible=false;
      battleModeSource="main";
      projectAreaRun=null;
      projectAreaObjects=[];
      paState=null;
    }else if(settlement && settlement.mode==="bossKros"){
      selectedTab="dungeon";
      dungeonPanelMode="boss";
      operationDetailVisible=false;
      battleModeSource="main";
      bossKrosRun=null;
      bossHazards=[];
    }else if(settlement && settlement.mode==="material"){
      selectedTab="dungeon";
      dungeonPanelMode="material";
      operationDetailVisible=false;
      battleModeSource="main";
      materialDungeonRun=null;
    }else if(settlement && settlement.mode==="commission"){
      selectedTab="combat";
      operationDetailVisible=true;
      battleModeSource="main";
    }
    gameMode="operation";
  }
}
function updateOperators(){
  menuPulse++;
  if(operatorPageMode==="list"){
    const order=executorOrder(), cardW=200, gap=12, visibleW=W-84;
    const maxScroll=Math.max(0,order.length*(cardW+gap)-gap-visibleW);
    if(operatorListWheelDelta){
      operatorListScrollX=clamp(operatorListScrollX+operatorListWheelDelta*.72,0,maxScroll);
      operatorListWheelDelta=0;
    }
    operatorListScrollX=clamp(operatorListScrollX,0,maxScroll);
  }else{
    operatorListWheelDelta=0;
  }
  if(clicked){
    if(operatorPageMode==="list"){
      if(inRect(60,592,190,46)){ enterLobby(); clicked=false; return; }
      const order=executorOrder(), cardW=200, cardH=430, gap=12, startX=42, y=150;
      for(let idx=0; idx<order.length; idx++){
        const x=startX+idx*(cardW+gap)-operatorListScrollX, i=order[idx];
        if(x+cardW<startX || x>W-42) continue;
        if(inRect(x,y,cardW,cardH)){ selectedOperator=i; moduleWarehouseSlot=null; moduleWarehouseScroll=0; if(owned[i]) player.role=i; operatorPageMode="detail"; clicked=false; return; }
      }
    }else{
      if(inRect(46,36,54,42) || inRect(60,592,190,46)){ moduleWarehouseSlot=null; operatorPageMode="list"; clicked=false; return; }
      const rx=780, ry=112, rh=506;
      if(inRect(rx+10,ry+20,52,36)){operatorTab="level";moduleWarehouseSlot=null;}
      else if(inRect(rx+68,ry+20,52,36)){operatorTab="skill";moduleWarehouseSlot=null;}
      else if(inRect(rx+126,ry+20,52,36)){operatorTab="weapon";moduleWarehouseSlot=null;}
      else if(inRect(rx+184,ry+20,52,36)) operatorTab="module";
      else if(inRect(rx+242,ry+20,52,36)){operatorTab="break";moduleWarehouseSlot=null;}
      if(operatorTab==="weapon"){
        ensureWeaponBag();
        const wx=rx+22, wy=ry+68+122;
        const list=compatibleWeaponsForRole(selectedOperator);
        for(let wi=0;wi<Math.min(3,list.length);wi++){
          if(inRect(wx,wy+wi*48,258,40)){
            selectedWeaponId=list[wi].id;
            clicked=false;
            return;
          }
        }
      }
      if(operatorTab==="skill"){
        const sx=rx+22, sy=ry+74;
        if(inRect(sx,sy,258,42)){ selectedSkillKey="normal"; clicked=false; return; }
        if(inRect(sx,sy+52,258,42)){ selectedSkillKey="skill"; clicked=false; return; }
        if(inRect(sx,sy+104,258,42)){ selectedSkillKey="ultimate"; clicked=false; return; }
      }
      if(operatorTab==="module"){
        if(moduleWarehouseSlot){
          if(inRect(52,174,112,26)){
            const ids=["all"].concat(Object.keys(window.PZModules.SETS)),idx=ids.indexOf(moduleWarehouseSetFilter);moduleWarehouseSetFilter=ids[(idx+1)%ids.length];moduleWarehouseScroll=0;clicked=false;return;
          }
          if(inRect(170,174,112,26)){moduleWarehouseSortMode=moduleWarehouseSortMode==="grade"?"set":"grade";moduleWarehouseScroll=0;clicked=false;return;}
          const options=moduleWarehouseOptions(selectedOperator,moduleWarehouseSlot),vx=52,vy=208,vw=230,vh=323,rowH=62;
          if(inRect(vx,vy,vw,vh)){
            const idx=Math.floor((mouseY-vy+moduleWarehouseScroll)/rowH);
            if(options[idx]) equipRoleModule(selectedOperator,moduleWarehouseSlot,options[idx].id);
            clicked=false;return;
          }
          if(inRect(52,545,105,34)){equipRoleModule(selectedOperator,moduleWarehouseSlot,null);clicked=false;return;}
          if(inRect(177,545,105,34)){moduleWarehouseSlot=null;moduleWarehouseScroll=0;clicked=false;return;}
        }
        for(let n=0;n<4;n++) if(inRect(rx+22,ry+82+n*66,258,54)){moduleWarehouseSlot=window.PZModules.SLOTS[n];moduleWarehouseScroll=0;moduleWarehouseWheelDelta=0;moduleWarehouseSetFilter="all";clicked=false;return;}
      }
      const i=selectedOperator, cd=charData[i]||{}, bx=rx+40, by=ry+rh-78;
      if(!(!owned[i]) && !isProtagonist(i) && inRect(bx,by,222,46)){
        if(operatorTab==="level"){
          const cost=roleUpgradeCost(i);
          if(canBreakthrough(i)){ performBreakthrough(i); } else if(expBooks>=cost.books && gold>=cost.gold && cd.level<roleLevelCap(i)){ expBooks-=cost.books; gold-=cost.gold; cd.level++; saveGame(); autoCloudSaveNow(true); }
          else if(!canBreakthrough(i) && cd.level<roleLevelCap(i)) showCenter(language==="en"?"Not enough upgrade materials":"升级材料不足",70);
        }else if(operatorTab==="skill"){
          upgradeSelectedSkill(i);
        }else if(operatorTab==="weapon"){
          const bx2=rx+22+18, by2=ry+rh-78;
          if(inRect(bx2,by2,106,46)) equipWeaponToRole(i,selectedWeaponId);
          else if(inRect(bx2+116,by2,106,46)) upgradeWeaponSelected(i);
        }
      }
    }
  }
  if(justPressed("escape")){ if(moduleWarehouseSlot){moduleWarehouseSlot=null;moduleWarehouseScroll=0;} else if(operatorPageMode==="detail") operatorPageMode="list"; else enterLobby(); }
  clicked=false;
}
const CRYSTAL_EXCHANGE_ITEMS=[
  {id:"gold",cost:100,max:5,zh:"金币补给",en:"Gold Supply",descZh:"5000 金币",descEn:"5,000 Gold",apply(){gold+=5000;totalGoldEarned+=5000;}},
  {id:"exp",cost:120,max:3,zh:"经验资料",en:"EXP Data",descZh:"3 本经验书",descEn:"3 EXP Books",apply(){expBooks+=3;}},
  {id:"ore",cost:140,max:3,zh:"武器素材",en:"Weapon Material",descZh:"2 份精炼合金",descEn:"2 Refine Materials",apply(){weaponOre+=2;}},
  {id:"stamina",cost:90,max:2,zh:"体力补给",en:"Stamina Supply",descZh:"40 点副本体力",descEn:"40 Dungeon Stamina",apply(){dungeonStamina=Math.min(9999,dungeonStamina+40);}}
];
const SHOP_PACKS=[
  {id:"starter",cat:1,accent:"#7cffb2",zh:"启程补给",en:"Starter Supply",descZh:"经验书×8 · 金币×8000 · 水晶×180",descEn:"EXP ×8 · Gold ×8,000 · Crystal ×180",price:"$2.99",limitZh:"永久限购1次",limitEn:"ONE-TIME"},
  {id:"tactical",cat:2,accent:"#ff8d72",zh:"战术支援",en:"Tactical Support",descZh:"武器素材×5 · 经验书×6 · 水晶×360",descEn:"Ore ×5 · EXP ×6 · Crystal ×360",price:"$7.99",limitZh:"限时限购1次",limitEn:"LIMITED · 1"},
  {id:"field",cat:3,accent:"#7cc7ff",zh:"野外资源",en:"Field Resources",descZh:"金币×12000 · 体力×40",descEn:"Gold ×12,000 · Stamina ×40",limitZh:"每周限购",limitEn:"WEEKLY"},
  {id:"growth",cat:4,accent:"#c58cff",zh:"成长档案",en:"Growth Archive",descZh:"经验书×15 · 武器素材×6 · 水晶×680",descEn:"EXP ×15 · Ore ×6 · Crystal ×680",price:"$12.99",limitZh:"每月限购",limitEn:"MONTHLY"},
  {id:"module",cat:2,accent:"#72e1ff",zh:"模块支援",en:"Module Support",descZh:"模块副本入场券×3",descEn:"Module Entry Ticket ×3",limitZh:"限时限购1次",limitEn:"LIMITED · 1"},
  {id:"reserve",cat:3,accent:"#ffe066",zh:"作战储备",en:"Operation Reserve",descZh:"体力×80 · 金币×5000",descEn:"Stamina ×80 · Gold ×5,000",limitZh:"每周限购",limitEn:"WEEKLY"},
  {id:"monthly_exp",cat:4,accent:"#8fa8ff",zh:"月度经验补给",en:"Monthly EXP Supply",descZh:"经验书×24 · 金币×10000 · 水晶×980",descEn:"EXP ×24 · Gold ×10,000 · Crystal ×980",price:"$19.99",limitZh:"每月限购",limitEn:"MONTHLY"},
  {id:"standard",cat:1,accent:"#d8e1ec",zh:"标准启程包",en:"Standard Starter Pack",descZh:"体力×40 · 经验书×5",descEn:"Stamina ×40 · EXP ×5",limitZh:"永久限购1次",limitEn:"ONE-TIME"}
];
function crystalTopupCardRect(i){return{x:48+i*174,y:215,w:156,h:318};}
function visibleShopPacks(){return shopPackCategory===0?SHOP_PACKS:SHOP_PACKS.filter(v=>v.cat===shopPackCategory);}
function buyCrystalExchange(index){
  const item=CRYSTAL_EXCHANGE_ITEMS[index];
  if(!item)return;
  const bought=Math.max(0,Number(crystalExchangePurchases[item.id])||0);
  if(bought>=item.max){shopMsg=language==="en"?"Exchange limit reached.":"该资源已达到兑换上限。";return;}
  if(crystals<item.cost){shopMsg=language==="en"?"Not enough Crystals.":"水晶不足。";return;}
  crystals-=item.cost;item.apply();crystalExchangePurchases[item.id]=bought+1;sfx("buy");
  shopMsg=(language==="en"?"Exchanged: ":"兑换成功：")+(language==="en"?item.en:item.zh);
  saveGame();autoCloudSaveNow(true);
}
function updateShop(){
  menuPulse++;
  normalizeMonthlyCardRuntime();
  if(justPressed("escape")){
    enterLobby();
    clicked=false;
    return;
  }
  if(clicked){
    if(inRect(60,560,220,52)){
      enterLobby();
      clicked=false;
      return;
    }

    const tabs = ["recommend","recruit","weapon","skin","crystal","monthly","packs","support"];
    for(let i=0;i<tabs.length;i++){
      if(inRect(40+i*132,135,122,42)){
        shopTab = tabs[i];
        if(shopTab==="recruit") shopSubTab="limited";
        if(shopTab==="weapon") shopSubTab="limited";
      }
    }

    if((shopTab==="recruit" || shopTab==="weapon") && inRect(70,190,150,38)) shopSubTab="limited";
    if((shopTab==="recruit" || shopTab==="weapon") && inRect(235,190,150,38)) shopSubTab="permanent";
    if(shopTab==="recommend"){
      for(let i=0;i<4;i++) if(inRect(70,230+i*66,205,54)){shopRecommendIndex=i;shopMsg=language==="en"?"Recommendation selected.":"已切换推荐内容。";}
      if(inRect(830,447,175,42)){
        if(shopRecommendIndex===0){shopTab="recruit";shopSubTab="limited";}
        else if(shopRecommendIndex===1) shopTab="monthly";
        else if(shopRecommendIndex===2) shopTab="packs";
        else {shopTab="recruit";shopSubTab="permanent";}
      }
    }


    if(shopTab==="recruit"){
      if(shopSubTab==="limited" && inRect(70,250,420,230)){
        if(owned[3]) shopMsg=msg("floraOwned");
        else if(crystals>=4100){
          crystals-=4100; owned[3]=true; shopMsg=msg("floraBought"); sfx("buy"); saveGame(); autoCloudSaveNow(true);
        }else shopMsg=tx("floraPriceLow");
      }
      if(shopSubTab==="permanent"){
        const items=[{i:0,price:1800},{i:1,price:2200},{i:2,price:2400}];
        for(let n=0;n<items.length;n++){
          const x=70+n*315,y=250;
          if(inRect(x,y,285,185)){
            const it=items[n];
            if(owned[it.i]) shopMsg=roleName(it.i)+mt("alreadyOwnedSuffix");
            else if(crystals>=it.price){ crystals-=it.price; owned[it.i]=true; shopMsg=roleName(it.i)+mt("recruitedSuffix"); sfx("buy"); saveGame(); autoCloudSaveNow(true); }
            else shopMsg=mt("notEnoughCrystal");
          }
        }
        for(let i=0;i<CRYSTAL_EXCHANGE_ITEMS.length;i++) if(inRect(70+i*240,445,215,58)){buyCrystalExchange(i);break;}
      }
    }

    if(shopTab==="weapon"){
      if(shopSubTab==="limited" && inRect(845,410,175,42)){
        if(!owned[3]) shopMsg=tx("recruitFloraFirst");
        else if(ownedWeapons.flora) shopMsg=tx("everwinterOwned");
        else if(crystals>=888){ crystals-=888; ownedWeapons.flora=true; shopMsg=tx("everwinterBought"); sfx("buy"); saveGame(); autoCloudSaveNow(true); }
        else shopMsg=tx("everwinterLow");
      }
      if(shopSubTab==="permanent"){
        for(let n=0;n<WEAPON_MASTER.length;n++){
          const col=n%4,row=Math.floor(n/4),cx=70+col*245,cy=366+row*68;
          if(inRect(cx,cy,230,58)){shopWeaponSelectedId=WEAPON_MASTER[n].id;shopMsg=language==="en"?"Weapon details selected.":"已切换武器详情。";break;}
        }
      }
    }


    if(shopTab==="monthly"){
      if(inRect(80,240,420,210)){
        if(monthlyOwned) shopMsg=msg("monthlyOwned");
        else { monthlyOwned=true; monthlyClaimed=false; monthlyClaimDate=""; shopMsg=msg("monthlyBought"); sfx("buy"); saveGame(); autoCloudSaveNow(true); }
      }
      if(inRect(540,290,260,92)){
        claimMonthlyCardReward();
      }
    }

    if(shopTab==="crystal"){
      for(let i=0;i<CRYSTAL_TOPUP_TIERS.length;i++){
        const r=crystalTopupCardRect(i);
        if(inRect(r.x,r.y,r.w,r.h)) shopMsg=language==="en"?"Crystal top-up is unavailable in this test build.":"测试版本暂未接入水晶充值。";
      }
    }

    if(shopTab==="packs"){
      for(let i=0;i<5;i++) if(inRect(60,223+i*54,180,42)){shopPackCategory=i;shopMsg=language==="en"?"Pack category selected.":"已切换礼包分类。";}
      const packList=visibleShopPacks();
      for(let i=0;i<Math.min(6,packList.length);i++){
        const col=i%3,row=Math.floor(i/3),x=270+col*250,y=215+row*142;
        if(inRect(x,y,226,122)) shopMsg=(language==="en"?"Selected: ":"已选择：")+(language==="en"?packList[i].en:packList[i].zh)+(language==="en"?" · Test display only.":" · 当前仅展示内容。 ");
      }
    }
    if(shopTab==="support"){
      shopMsg = tx("supportDemo");
    }
  }
  clicked=false;
}
function updateBattle(){
  if(battlePaused){
    updateBattlePauseMenu();
    return;
  }
  if(justPressed("escape") || (clicked&&inRect(W-72,18,50,44))){
    battlePaused=true;clicked=false;mouseDown=false;mouseAttackConsumed=false;
    return;
  }
  if(battleModeSource==="commission"){
    commissionTimeLeft=Math.max(0,commissionTimeLeft-frameScale/60);
    if(commissionTimeLeft<=0){ showCenter(language==="en"?"TIME UP":"时间到",70); failMission(); return; }
  }
  if(battleModeSource==="main"&&selectedMainChapter===2&&selectedStage===10){
    chapter2EvacTimeLeft=Math.max(0,chapter2EvacTimeLeft-frameScale/60);
    if(chapter2EvacTimeLeft<=0){showCenter(language==="en"?"THE EXIT CLOSED":"出口已经关闭",80);failMission();return;}
  }
  if(player.hp<=0){ failMission(); return; }
  updateProtagonistCombatEffects();
  updateKaneCombatEffects();
  updateAiloCombatEffects();
  if(hitStop>0){ hitStop -= fpsScale(); updateEffects(); return; }
  if(ult.active){ ult.timer++; if(ult.timer===48&&!ult.hitDone){ult.hitDone=true; resolveUltimate();} if(ult.timer>=96)ult.active=false; updateEffects(); return; }
  updateProjectiles();
  updateFrostFields();
  updateBossHazards();
  updateBossKrosBattleLogic();
  if(chainSelect){
    chainSelectTimer -= frameScale;
    if(!chainTarget || !chainTarget.alive){ chainSelect=false; chainReady=false; chainTarget=null; }
    slowMo = Math.max(slowMo, 4);
    if(mouseDown && !mouseAttackConsumed){
      chainAttack(0);
      mouseAttackConsumed=true;
    }
    if(keys["mouse2"]){
      chainAttack(1);
      keys["mouse2"]=false;
    }
    if(chainSelectTimer<=0){
      chainSelect=false;
      chainReady=false;
      chainTarget=null;
      showActionPrompt("CHAIN TIMEOUT", 35);
    }
    updateEffects();
    return;
  }

  const attackPressed = mouseDown && !mouseAttackConsumed;
  if(attackPressed){ if(player.attackCd<=6) attackBuffer=10; mouseAttackConsumed=true; }
  if(attackBuffer>0 && chainReady){ chainAttack(); attackBuffer=0; }
  else if(attackBuffer>0 && player.attackCd<=0 && attackInputLock<=0){ attack(); attackBuffer=0; } if(justPressed("e")) skillBuffer=10;
  if(justPressed("q")) ultBuffer=10;
  if(justPressed("shift")) dashBuffer=8;
  if(keys["mouse2"] && !chainSelect){
    dashBuffer=8;
    keys["mouse2"]=false;
  }
  if(skillBuffer>0 && player.skillCd<=0) { skill(); skillBuffer=0; }
  if(ultBuffer>0 && player.ultCd<=0) { ultimate(); ultBuffer=0; }
  if(dashBuffer>0 && player.dashCd<=0) { dash(); dashBuffer=0; }
  if(justPressed("r"))handleBattleRAction(); if(justPressed("tab"))toggleLock(); if(justPressed("f")){ if(!battleExploreInteract() && !projectAreaInteract()) chainAttack(); }
  let dx=0,dy=0; if(keys.w)dy-=1; if(keys.s)dy+=1; if(keys.a)dx-=1; if(keys.d)dx+=1;
  const role=roles[player.role];
  if(dx||dy){ const l=Math.hypot(dx,dy); dx/=l; dy/=l; player.vx+=dx*role.speed*MOVE_SPEED_MULT*.35*frameScale; player.vy+=dy*role.speed*MOVE_SPEED_MULT*.35*frameScale; if(Math.abs(dx)>.1)player.facing=dx>0?1:-1; }
  if(lockTarget&&lockTarget.alive) player.facing=lockTarget.x>player.x?1:-1; else if(lockTarget&&!lockTarget.alive) lockTarget=null;
  const slow=slowMo>0?.45:1; player.x+=player.vx*slow*frameScale; player.y+=player.vy*slow*frameScale; player.vx*=Math.pow(.82,frameScale); player.vy*=Math.pow(.82,frameScale); player.x=clamp(player.x,35,W-35); player.y=clamp(player.y,105,H-35);
  player.attackCd=Math.max(0,player.attackCd-frameScale); attackInputLock=Math.max(0,attackInputLock-frameScale); attackBuffer=Math.max(0,attackBuffer-frameScale); skillBuffer=Math.max(0,skillBuffer-frameScale); ultBuffer=Math.max(0,ultBuffer-frameScale); dashBuffer=Math.max(0,dashBuffer-frameScale); player.skillCd=Math.max(0,player.skillCd-frameScale); player.ultCd=Math.max(0,player.ultCd-frameScale); player.dashCd=Math.max(0,player.dashCd-frameScale); player.switchCd=Math.max(0,player.switchCd-frameScale); player.inv=Math.max(0,player.inv-frameScale); player.chainTimer=Math.max(0,player.chainTimer-frameScale); player.guardTimer=Math.max(0,player.guardTimer-frameScale); player.parryReady=Math.max(0,player.parryReady-frameScale); player.perfectBuff=Math.max(0,player.perfectBuff-frameScale); teamDamageAmpTimer=Math.max(0,teamDamageAmpTimer-frameScale); lisaTeamDamageAmpTimer=Math.max(0,lisaTeamDamageAmpTimer-frameScale); lisaSelfDamageAmpTimer=Math.max(0,lisaSelfDamageAmpTimer-frameScale); noxDamageAmpTimer=Math.max(0,noxDamageAmpTimer-frameScale); if(player.parryReady<=0)player.parryTarget=null;
  for(const e of enemies){
    if(!e.alive)continue; e.parried=Math.max(0,e.parried-frameScale); e.breakLock=Math.max(0,(e.breakLock||0)-frameScale); e.freeze=Math.max(0,(e.freeze||0)-frameScale); e.chill=Math.max(0,(e.chill||0)-frameScale); e.physicalPain=Math.max(0,(e.physicalPain||0)-frameScale); e.weathering=Math.max(0,(e.weathering||0)-frameScale);
    if(e.trainingDummy){
      e.hp=e.maxHp;e.shield=0;e.windup=0;e.attackCd=999999;e.rage=false;
      e.vx*=Math.pow(.76,frameScale);e.vy*=Math.pow(.76,frameScale);
      e.x=clamp(e.x+e.vx*frameScale,610,900);e.y=clamp(e.y+e.vy*frameScale,H/2+20,H-80);
      e.hit=Math.max(0,e.hit-frameScale);
      continue;
    }
    if((e.freeze||0)>0){ e.vx*=.82; e.vy*=.82; e.windup=0; e.attackCd=Math.max(e.attackCd,20); e.hit=Math.max(e.hit,2); e.x+=e.vx*frameScale; e.y+=e.vy*frameScale; continue; }
    if((e.hit||0)>3){ e.vx*=Math.pow(.90,frameScale); e.vy*=Math.pow(.90,frameScale); e.x+=e.vx*slow*frameScale; e.y+=e.vy*slow*frameScale; e.hit=Math.max(0,e.hit-frameScale); continue; }
    if(e.stun<=0){ e.vx*=.84; e.vy*=.84; e.stun++; if(e.stun>=0)e.stun=e.maxStun; }
    else {
      e.aiTick = Math.max(0, (e.aiTick||0) - frameScale);
      if(e.aiTick<=0){
        e.cachedDx = player.x-e.x;
        e.cachedDy = player.y-e.y;
        e.cachedDist = Math.sqrt(e.cachedDx*e.cachedDx+e.cachedDy*e.cachedDy)||1;
        e.aiTick = e.boss ? 6 : 10;
      }
      const dx=e.cachedDx, dy=e.cachedDy, l=e.cachedDist||1;
      if(e.boss && !e.crystalColossus && e.hp < e.maxHp*0.55 && e.phase===1){ e.phase=2; e.shield=Math.max(e.shield,900); e.maxShield=Math.max(e.maxShield,900); showActionPrompt(msg("bossPhase2"),90); }
      if(e.boss && !e.crystalColossus && e.hp < e.maxHp*0.25 && e.phase===2){ e.phase=3; e.rage=true; showActionPrompt(msg("bossPhase3"),90); }
      if(e.type==="berserker" && e.hp < e.maxHp*0.55) e.rage=true;

      if(e.type==="ranged" && !withinDist(player.x,player.y,e.x,e.y,130)){
        e.shotCd -= slow;
        e.vx += dx/l*0.018*slow;
        e.vy += dy/l*0.018*slow;
        if(e.shotCd<=0){
          projectiles.push({x:e.x,y:e.y,vx:dx/l*4.0,vy:dy/l*4.0,life:90});
          e.shotCd=105;
          addText(e.x,e.y-35,"SHOT","#ff8888");
        }
      } else {
        const spd = e.rage ? .095 : (e.boss?.05:.068);
        e.vx+=dx/l*spd*slow*frameScale; e.vy+=dy/l*spd*slow*frameScale;
        e.attackCd-=slow;
        if(e.attackCd<=0&&e.windup<=0&&withinDist(player.x,player.y,e.x,e.y,(e.boss?190:128))){
          e.windup=e.boss?(e.phase===3?32:50):(e.rage?28:38);
          e.attackCd=e.boss?(e.phase===3?75:120):(e.rage?70:105);
        }
      } }
    if(e.windup>0){ e.windup-=slow; if(e.windup<=0) enemyHit(e); }
    e.x+=e.vx*slow*frameScale; e.y+=e.vy*slow*frameScale; e.vx*=Math.pow(.88,frameScale); e.vy*=Math.pow(.88,frameScale); e.x=clamp(e.x,35,W-35); e.y=clamp(e.y,105,H-35); e.hit=Math.max(0,e.hit-frameScale);
  }
  const combatFinished=enemies.every(e=>!e.alive);
  const objectivePending=hasPendingChapterAreaObjective();
  if(combatFinished && objectivePending && !chapterObjectivePrompted){
    chapterObjectivePrompted=true;
    const destroyObjective=battleExploreObjects.some(o=>o.required&&!o.done&&o.type==="crate");
    showActionPrompt(destroyObjective
      ? (language==="en"?"Area secure. Destroy the marked blockade.":"区域已安全。破坏标记的封锁障碍。")
      : (language==="en"?"Area secure. Approach the marked point and press F.":"区域已安全。靠近标记点并按 F 完成目标。"),150);
  }
  if(combatFinished && !objectivePending && !areaCleared){
    areaCleared=true; battleExitDelay=35; player.energy=clamp(player.energy+35,0,100); gainUlt(520, "chain");
    if(battleSideArea){ showCenter(language==="en"?"SIDE AREA CLEAR":"支线区域已清理",65); }
    else if(area<battleAreaLimit()){
      showCenter(battleModeSource==="commission" ? (language==="en"?"Wave clear. Enter the next wave.":"波次完成，进入下一波。") : (battleModeSource==="projectArea" ? (language==="en"?"Area clear. Move to the next Area.":"区域清理完成，前往下一区域。") : msg("moveRight")),80);
      addText(W-145,H/2,battleModeSource==="commission"?(language==="en"?"NEXT WAVE →":"下一波 →"):(language==="en"?"NEXT AREA →":"下一区域 →"),"#ffe066",true);
    }
    else {
      if(battleModeSource==="daydream"){
        if(window.PZDaydream&&typeof window.PZDaydream.completeBattle==="function") window.PZDaydream.completeBattle(true);
        selectedTab="daydream";
        battleModeSource="main";
        daydreamBattleConfig=null;
        clearTransientBattleState();
        gameMode="operation";
        showCenter(language==="en"?"RECONSTRUCTION STABILIZED":"重现节点已稳定",90);
        return;
      }
      let reward=0;
      let expReward=500;
      let settlementMode=battleModeSource;
      if(battleModeSource==="projectArea"){
        const run=ensureProjectAreaRun();
        run.areasCleared = 3;
        const projectAreaReward = applyProjectAreaReward();
        settlement={stage:0,reward:projectAreaReward.crystal||0,expReward:projectAreaReward.expReward||0,stars:3,mode:"projectArea",projectAreaReward};
      }else if(battleModeSource==="bossKros"){
        const bossReward = applyBossKrosReward();
        settlement={stage:0,reward:bossReward.crystal||0,expReward:bossReward.expReward||0,stars:3,mode:"bossKros",bossReward};
      }else if(battleModeSource==="materialDungeon"){
        const matReward = applyMaterialDungeonReward();
        settlement={stage:0,reward:matReward.crystal||0,expReward:matReward.expReward||0,stars:3,mode:"material",matReward};
      }else if(battleModeSource==="commission"){
        const st=commissionStages[selectedStage-1] || commissionStages[0];
        const key="c"+selectedStage;
        reward=st.reward || 50;
        expReward=st.exp || 500;
        if(!cleared[key]){
          reward=grantFreeCrystals(reward);
          gold += 300 + selectedStage*50;
          totalGoldEarned += 300 + selectedStage*50;
          expBooks += 1;
          weaponOre += selectedStage%3===0 ? 1 : 0;
          addPlayerExp(expReward);
          cleared[key]=true;
          saveGame(); autoCloudSaveNow(true);
        }else{
          reward=0;
          expReward=0;
        }
        settlement={stage:selectedStage,reward,expReward,stars:3,mode:"commission"};
      }else{
        const st=stages[selectedStage-1];
        const clearKey=mainStageClearKey(selectedStage);
        if(!cleared[clearKey]){
          reward=st.reward;
          reward=grantFreeCrystals(reward);
          gold += 500 + selectedStage*80;
          totalGoldEarned += 500 + selectedStage*80;
          expBooks += 2;
          weaponOre += selectedStage%3===0 ? 2 : 1;
          addPlayerExp(500);
          cleared[clearKey]=true;
          if(battleModeSource==="main" && selectedMainChapter===0) setProtagonistStoryLevel(Math.min(9, Math.max(protagonistStoryLevel||1, selectedStage)));
          saveGame(); autoCloudSaveNow(true);
        }
        settlement={stage:selectedStage,reward,expReward:500,stars:3,mode:"main"};
      }
      sfx("reward"); gameMode="settlement"; showCenter(ui("settlement"),60);
    }
  }
  battleExitDelay=Math.max(0,battleExitDelay-frameScale);
  for(const n of battleRewardNotices) n.timer-=frameScale;
  battleRewardNotices=battleRewardNotices.filter(n=>n.timer>0);
  if(battleExitDelay<=0 && supportsStageExploration()){
    if(battleSideArea==="upper" && player.y>H-55) returnToMainBattleArea();
    else if(battleSideArea==="lower" && player.y<125) returnToMainBattleArea();
    else if(!battleSideArea && areaCleared){
    if(area<battleAreaLimit() && player.x>W-85) enterNextBattleArea("center");
      else if(Math.abs(player.x-W/2)<155 && player.y<125) enterSideBattleArea("upper");
      else if(Math.abs(player.x-W/2)<155 && player.y>H-55) enterSideBattleArea("lower");
    }
  }else if(areaCleared && area<battleAreaLimit() && battleExitDelay<=0 && player.x>W-85){
    enterNextBattleArea("center");
  }
  saveCurrentRoleResources();
  if(comboTimer>0)comboTimer -= fpsScale(); else combo=0; updateEffects();
}
function enemyHit(e){
  if(dist(player.x,player.y,e.x,e.y)<(e.boss?105:78)&&player.inv<=0&&player.guardTimer<=0){
    if(e.bossKros && e.phase>=2) playerBleedTimer=Math.max(playerBleedTimer,150);
    let dmg = e.boss ? (e.phase===3?26:18) : (e.rage?14:10);
    if(e.crystalColossus && e.phase>=2) dmg*=1.10;
    if(damageCurrentRoleHp(dmg, "HIT", "#ff5555")) return;
    doShake(e.boss?10:6); flash=Math.max(flash,5);
  }
  else if(player.guardTimer>0) addText(player.x,player.y-35,"BLOCKED","#7cc7ff",true);
  addSlash(e.x,e.y,e.boss?120:85,"#ff3333",12,"enemy");
}
function updateEffects(){
  particles=particles.filter(p=>(p.life-=frameScale)>0); for(const p of particles){p.x+=p.vx*frameScale;p.y+=p.vy*frameScale;p.vx*=Math.pow(.94,frameScale);p.vy*=Math.pow(.94,frameScale);}
  slashes=slashes.filter(s=>(s.life-=frameScale)>0); texts=texts.filter(t=>(t.life-=frameScale)>0); for(const t of texts){t.y+=t.vy*frameScale;t.vy*=Math.pow(.96,frameScale);}
  if(particles.length>70)particles.splice(0,particles.length-70); if(slashes.length>18)slashes.splice(0,slashes.length-18); if(frostFields.length>8)frostFields.splice(0,frostFields.length-8); if(texts.length>9)texts.splice(0,texts.length-9); if(projectiles.length>18)projectiles.splice(0,projectiles.length-18);
  shake*=Math.pow(.82,frameScale); slowMo=Math.max(0,slowMo-frameScale); flash=Math.max(0,flash-frameScale); centerTimer=Math.max(0,centerTimer-frameScale); actionPromptTimer=Math.max(0,actionPromptTimer-frameScale); if(player) player.perfectDodgeTimer=Math.max(0,(player.perfectDodgeTimer||0)-frameScale);
}



function enterTeamSetup(){
  if(selectedTab==="main" && !daydreamTeamSetupPending) resetBattleSourceToMain();
  gameMode = "team";
  teamSelectSlot = 0;
  team=normalizeBattleTeam(team);
  teamPresets=normalizeTeamPresets(teamPresets);
  teamPresetNames=normalizeTeamPresetNames(teamPresetNames);
  cancelTeamPresetRename();
  showCenter(ui("team"), 40);
}

function openPZDaydreamTeamSetup(squad){
  daydreamTeamSetupPending=true;
  team=normalizeBattleTeam(Array.isArray(squad)?squad:team);
  enterTeamSetup();
}
window.openPZDaydreamTeamSetup=openPZDaydreamTeamSetup;

function updateTeam(){
  menuPulse++;

  if(teamRenamePreset>=0){
    syncNameInputFocus();
    if(clicked){
      if(inRect(W/2+15,H/2+42,225,46)){clicked=false;commitTeamPresetRename();return;}
      if(inRect(W/2-240,H/2+42,225,46)){clicked=false;cancelTeamPresetRename();return;}
    }
    clicked=false;
    return;
  }

  if(justPressed("escape")){
    saveGame();
    if(daydreamTeamSetupPending){daydreamTeamSetupPending=false;gameMode="operation";selectedTab="daydream";if(window.PZDaydream)window.PZDaydream.page="setupTraits";}
    else {resetBattleSourceToMain();gameMode="operation";}
    return;
  }

  const listX=95, listY=378, cardW=210, cardStep=245, visibleW=930;
  const totalW = roles.length * cardStep;
  const maxScroll = Math.max(0, totalW - visibleW);

  if(teamRosterWheelDelta){
    if(mouseX >= listX-20 && mouseX <= listX+visibleW+20 && mouseY >= listY-30 && mouseY <= listY+170){
      teamRosterScrollX = clamp((teamRosterScrollX || 0) + teamRosterWheelDelta, 0, maxScroll);
    }
    teamRosterWheelDelta = 0;
  }
  teamRosterScrollX = clamp(teamRosterScrollX || 0, 0, maxScroll);

  if(clicked){
    for(let i=0;i<3;i++){
      const x=95+i*260,y=155;
      if(i<team.length&&inRect(x+184,y+8,28,28)){
        if(team.length<=1) showCenter(language==="en"?"At least one executor is required":"至少保留一名执行官",55);
        else{
          team.splice(i,1);
          teamSelectSlot=Math.min(i,team.length);
          sfx("ui");
        }
        clicked=false;
        return;
      }
      if(inRect(x,y,220,130)) teamSelectSlot = Math.min(i,team.length);
    }

    const materialList=materialDungeonsV42();
    for(let i=0;i<materialList.length;i++){
      const x=95+i*235,y=300;
      if(inRect(x,y,126,34)){loadTeamPreset(i);clicked=false;return;}
      if(inRect(x+130,y,55,34)){saveCurrentTeamPreset(i);clicked=false;return;}
      if(inRect(x+189,y,37,34)){beginTeamPresetRename(i);clicked=false;return;}
    }

    for(let i=0;i<roles.length;i++){
      const x = listX + i*cardStep - teamRosterScrollX;
      const y = listY;
      if(x + cardW < listX-16 || x > listX+visibleW+16) continue;
      if(inRect(x,y,cardW,120) && owned[i]){
        const existingSlot = roleTeamSlot(i);
        if(existingSlot >= 0){
          teamSelectSlot = existingSlot;
        }else{
          if(teamSelectSlot<team.length) team[teamSelectSlot]=i;
          else if(team.length<3) team.push(i);
          team=normalizeBattleTeam(team);
          teamSelectSlot = Math.min(2, team.length);
        }
      }
    }

    if(inRect(W-330,560,250,56)){
      team=normalizeBattleTeam(team);
      player.role = team[0];
      selectedOperator = team[0];
      saveGame();
      if(daydreamTeamSetupPending){
        daydreamTeamSetupPending=false;gameMode="operation";selectedTab="daydream";
        if(window.PZDaydream&&typeof window.PZDaydream.confirmMainTeam==="function")window.PZDaydream.confirmMainTeam(team.slice(0,3));
      }else startBattle();
    }

    if(inRect(60,560,220,52)){
      saveGame();
      if(daydreamTeamSetupPending){daydreamTeamSetupPending=false;gameMode="operation";selectedTab="daydream";if(window.PZDaydream)window.PZDaydream.page="setupTraits";}
      else {resetBattleSourceToMain();gameMode = "operation";}
    }
  }
  clicked=false;
}


function drawTeam(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#11172d");
  bg.addColorStop(.55,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(30,30,1060,82);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(30,30,1060,82);
  ctx.fillStyle="#fff";
  ctx.font="bold 34px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(ui("team"),58,78);
  ctx.font="14px " + FONT_UI;
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.fillText(tx("teamHint"),60,101);

  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(ui("currentTeam"),95,135);

  for(let i=0;i<3;i++){
    const roleIndex=team[i];
    const r=Number.isInteger(roleIndex)?roles[roleIndex]:null;
    const x=95+i*260, y=155;
    const active=teamSelectSlot===i;
    const hover=inRect(x,y,220,130);
    ctx.fillStyle=active?"rgba(255,224,102,.20)":hover?"rgba(255,255,255,.13)":"rgba(255,255,255,.07)";
    ctx.fillRect(x,y,220,130);
    ctx.strokeStyle=active?"#ffe066":hover?"rgba(255,255,255,.35)":"rgba(255,255,255,.14)";
    ctx.lineWidth=active||hover?2:1;
    ctx.strokeRect(x,y,220,130);

    if(r) drawPortrait(x+18,y+15,70,95,r,false);
    else{
      ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(x+18,y+15,70,95);
      ctx.strokeStyle="rgba(255,255,255,.22)";ctx.strokeRect(x+18,y+15,70,95);
      ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="bold 34px Arial";ctx.textAlign="center";ctx.fillText("+",x+53,y+74);
    }
    ctx.fillStyle="#ffe066";
    ctx.font="bold 15px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText("Slot "+(i+1),x+105,y+28);
    ctx.fillStyle=r?"#fff":"rgba(255,255,255,.48)";
    ctx.font="bold 22px " + FONT_UI;
    ctx.fillText(r?roleName(roleIndex):(language==="en"?"Empty":"空位"),x+105,y+58);
    ctx.fillStyle="rgba(255,255,255,.65)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(r?(i===0?mt("teamLeader"):mt("teamSwitchable")):(language==="en"?"Select an executor":"选择一名执行官"),x+105,y+92);
    if(r){
      ctx.fillStyle="rgba(12,14,22,.86)";ctx.beginPath();ctx.arc(x+198,y+22,13,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=team.length>1?"rgba(255,255,255,.38)":"rgba(255,255,255,.15)";ctx.stroke();
      ctx.fillStyle=team.length>1?"#fff":"rgba(255,255,255,.30)";ctx.font="bold 15px Arial";ctx.textAlign="center";ctx.fillText("×",x+198,y+27);
    }
  }

  for(let i=0;i<4;i++){
    const x=95+i*235,y=300;
    const preset=teamPresets[i]||[];
    const loadHover=inRect(x,y,126,34),saveHover=inRect(x+130,y,55,34),renameHover=inRect(x+189,y,37,34);
    ctx.fillStyle=loadHover?"rgba(255,224,102,.18)":"rgba(255,255,255,.065)";ctx.fillRect(x,y,126,34);
    ctx.strokeStyle=loadHover?"#ffe066":"rgba(255,255,255,.16)";ctx.strokeRect(x,y,126,34);
    ctx.fillStyle="#fff";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";
    fitText(teamPresetDisplayName(i),82,12,"bold",9);ctx.fillText(teamPresetDisplayName(i),x+8,y+22);
    ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.55)";ctx.fillText(preset.length+"/3",x+119,y+22);
    ctx.fillStyle=saveHover?"rgba(124,199,255,.22)":"rgba(124,199,255,.09)";ctx.fillRect(x+130,y,55,34);
    ctx.strokeStyle=saveHover?"#7cc7ff":"rgba(124,199,255,.25)";ctx.strokeRect(x+130,y,55,34);
    ctx.fillStyle="#7cc7ff";ctx.textAlign="center";ctx.fillText(language==="en"?"SAVE":"保存",x+157.5,y+22);
    ctx.fillStyle=renameHover?"rgba(255,224,102,.22)":"rgba(255,224,102,.08)";ctx.fillRect(x+189,y,37,34);
    ctx.strokeStyle=renameHover?"#ffe066":"rgba(255,224,102,.24)";ctx.strokeRect(x+189,y,37,34);
    ctx.fillStyle="#ffe066";ctx.font="bold 16px Arial";ctx.fillText("✎",x+207.5,y+23);
  }

  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="bold 18px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(ui("selectOperator"),95,362);

  const listX=95, listY=378, cardW=210, cardStep=245, visibleW=930, listH=120;
  const totalW = roles.length * cardStep;
  const maxScroll = Math.max(0, totalW - visibleW);
  teamRosterScrollX = clamp(teamRosterScrollX || 0, 0, maxScroll);

  ctx.save();
  ctx.beginPath();
  ctx.rect(listX-8, listY-10, visibleW+16, listH+22);
  ctx.clip();

  for(let i=0;i<roles.length;i++){
    const r=roles[i], lock=!owned[i], slot=roleTeamSlot(i), inTeam=slot>=0;
    const x=listX+i*cardStep-teamRosterScrollX, y=listY;
    if(x + cardW < listX-16 || x > listX+visibleW+16) continue;

    const hover=inRect(x,y,cardW,120)&&!lock&&!inTeam;
    ctx.fillStyle=lock?"rgba(80,80,80,.10)":inTeam?"rgba(255,224,102,.13)":hover?"rgba(255,255,255,.14)":"rgba(255,255,255,.065)";
    ctx.fillRect(x,y,cardW,120);
    ctx.strokeStyle=inTeam?"rgba(255,224,102,.75)":hover?"rgba(255,224,102,.75)":"rgba(255,255,255,.14)";
    ctx.lineWidth=inTeam||hover?2:1;
    ctx.strokeRect(x,y,cardW,120);

    drawPortrait(x+12,y+12,65,90,r,lock);
    ctx.fillStyle=lock?"#777":"#fff";
    ctx.font="bold 20px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(roleName(i),x+92,y+42);
    ctx.fillStyle=lock?"#888":inTeam?"#ffe066":"rgba(255,255,255,.65)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(lock?mt("notOwned"):(inTeam?("Slot "+(slot+1)):mt("clickToJoin")),x+92,y+75);
    ctx.fillText(roleStyle(i),x+92,y+100);
  }

  ctx.restore();

  if(maxScroll>0){
    ctx.fillStyle="rgba(255,255,255,.10)";
    ctx.fillRect(listX, listY+134, visibleW, 5);
    const knobW = Math.max(90, visibleW * (visibleW / totalW));
    const knobX = listX + (visibleW - knobW) * (teamRosterScrollX / maxScroll);
    ctx.fillStyle="#ffe066";
    ctx.fillRect(knobX, listY+134, knobW, 5);
    ctx.fillStyle="rgba(255,255,255,.55)";
    ctx.font="12px " + FONT_UI;
    ctx.textAlign="right";
    ctx.fillText(language==="en"?"Mouse wheel to scroll":"鼠标滚轮滑动角色列表",listX+visibleW,listY-8);
  }

  drawBtn(tr("返回地图","Back to Map"),"CLICK",60,560,220,52);
  drawBtn(ui("startAction"),"CLICK",W-330,560,250,56,true,"#ffe066");
  if(teamRenamePreset>=0){
    ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(0,0,W,H);
    ctx.fillStyle="rgba(17,23,45,.98)";ctx.fillRect(W/2-280,H/2-105,560,210);
    ctx.strokeStyle="#ffe066";ctx.lineWidth=2;ctx.strokeRect(W/2-280,H/2-105,560,210);
    ctx.fillStyle="#fff";ctx.font="bold 25px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Rename Team":"命名队伍",W/2-240,H/2-57);
    ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(W/2-240,H/2-30,480,52);ctx.strokeStyle="rgba(255,224,102,.6)";ctx.strokeRect(W/2-240,H/2-30,480,52);
    ctx.fillStyle="#fff";ctx.font="bold 20px "+FONT_UI;ctx.fillText(teamRenameDraft||"_",W/2-220,H/2+4);
    const cancelHover=inRect(W/2-240,H/2+42,225,46),saveHover=inRect(W/2+15,H/2+42,225,46);
    ctx.fillStyle=cancelHover?"rgba(255,255,255,.16)":"rgba(255,255,255,.07)";ctx.fillRect(W/2-240,H/2+42,225,46);ctx.strokeStyle="rgba(255,255,255,.28)";ctx.strokeRect(W/2-240,H/2+42,225,46);
    ctx.fillStyle=saveHover?"rgba(255,224,102,.24)":"rgba(255,224,102,.11)";ctx.fillRect(W/2+15,H/2+42,225,46);ctx.strokeStyle=saveHover?"#ffe066":"rgba(255,224,102,.42)";ctx.strokeRect(W/2+15,H/2+42,225,46);
    ctx.font="bold 16px "+FONT_UI;ctx.textAlign="center";ctx.fillStyle="#fff";ctx.fillText(language==="en"?"Cancel":"取消",W/2-127.5,H/2+71);ctx.fillStyle="#ffe066";ctx.fillText(language==="en"?"Save Name":"保存名称",W/2+127.5,H/2+71);
    ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Enter: Save · Esc: Cancel":"Enter：保存 · Esc：取消",W/2-240,H/2+96);
  }
}

function updateProfile(){
  menuPulse++;
  if(!owned[profileAvatarRole]) profileAvatarRole=PROTAGONIST_ROLE;
  profileShowcase=profileShowcase.map(v=>owned[v]?v:PROTAGONIST_ROLE);
  if(justPressed("escape")){
    if(profilePickerMode) profilePickerMode="";
    else gameMode="lobby";
    clicked=false;return;
  }
  if(clicked){
    if(profilePickerMode){
      if(inRect(970,106,52,52)){profilePickerMode="";clicked=false;return;}
      for(let i=0;i<roles.length;i++){
        const x=245+(i%3)*220,y=180+Math.floor(i/3)*125;
        if(inRect(x,y,190,104)){
          if(!owned[i]) showCenter(tr("尚未获得该执行官","Operator not obtained"),60);
          else if(profilePickerMode==="avatar") profileAvatarRole=i;
          else profileShowcase[profileShowcaseSlot]=i;
          if(owned[i]){sfx("ui");saveGame();}
          clicked=false;return;
        }
      }
      if(profilePickerMode==="avatar"){
        const frames=["zero","crystal","raven","dream"];
        for(let i=0;i<frames.length;i++)if(inRect(245+i*170,465,154,46)){profileAvatarFrame=frames[i];sfx("ui");saveGame();clicked=false;return;}
      }
      clicked=false;return;
    }
    if(inRect(870,126,82,34)){profileTab="overview";sfx("ui");clicked=false;return;}
    if(inRect(958,126,100,34)){profileTab="records";sfx("ui");clicked=false;return;}
    if(inRect(58,132,132,132)){profilePickerMode="avatar";clicked=false;return;}
    if(profileTab==="overview") for(let i=0;i<3;i++)if(inRect(620+i*142,184,110,61)){profileShowcaseSlot=i;profilePickerMode="showcase";clicked=false;return;}
    if(inRect(42,568,200,46)){gameMode="lobby";clicked=false;return;}
  }
  clicked=false;
}

function profileFrameColor(id){return {zero:"#7cc7ff",crystal:"#76ffe1",raven:"#ffe066",dream:"#b998ff"}[id]||"#7cc7ff";}
function profileFrameName(id){const zh={zero:"零号记录",crystal:"晶体回响",raven:"雷文哈多",dream:"白日梦"},en={zero:"ZERO RECORD",crystal:"CRYSTAL ECHO",raven:"RAVENHADO",dream:"DAYDREAM"};return (language==="en"?en:zh)[id]||id;}

function drawProfileRecordTab(){
  const x=590,y=166,w=468,h=344;
  ctx.fillStyle="rgba(7,12,27,.97)";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(124,199,255,.16)";ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#ffe066";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";ctx.fillText(tr("作战履历摘要","COMBAT RECORD SUMMARY"),x+20,y+28);
  const records=[
    [tr("击败敌人","ENEMIES DEFEATED"),totalKills,"#fff"],
    [tr("首领讨伐","BOSS CLEARS"),totalBossKills,"#ffe066"],
    [tr("成功弹刀","PARRIES"),totalParries,"#7cc7ff"],
    [tr("连携发动","CHAIN ACTIONS"),totalChains,"#b998ff"],
    [tr("关卡档案","STAGE FILES"),getClearedStageCount(),"#76ffe1"],
    [tr("成就完成","ACHIEVEMENTS"),ACHIEVEMENT_LIST.filter(a=>achievements[a.id]&&achievements[a.id].unlocked).length+" / "+ACHIEVEMENT_LIST.length,"#ff9acb"]
  ];
  records.forEach((r,i)=>{const rx=x+20+(i%2)*220,ry=y+48+Math.floor(i/2)*76;ctx.beginPath();ctx.roundRect(rx,ry,204,60,8);ctx.fillStyle="rgba(255,255,255,.035)";ctx.fill();ctx.strokeStyle="rgba(124,199,255,.12)";ctx.stroke();ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="10px "+FONT_UI;ctx.fillText(r[0],rx+12,ry+18);ctx.fillStyle=r[2];ctx.font="bold 23px Arial";ctx.fillText(String(r[1]),rx+12,ry+47);});
  const story=storyChapterComplete(2)?tr("第二章已完成","CHAPTER 2 COMPLETE"):chapter1Complete()?tr("第二章进行中","CHAPTER 2 IN PROGRESS"):chapter0Complete()?tr("第一章进行中","CHAPTER 1 IN PROGRESS"):tr("第零章进行中","CHAPTER 0 IN PROGRESS");
  ctx.fillStyle="rgba(255,224,102,.07)";ctx.fillRect(x+20,y+282,424,42);ctx.fillStyle="#ffe066";ctx.font="bold 12px "+FONT_UI;ctx.fillText(tr("当前主线  ","CURRENT STORY  ")+story,x+34,y+308);
}
function drawProfilePicker(){
  ctx.fillStyle="rgba(2,5,13,.88)";ctx.fillRect(0,0,W,H);
  ctx.beginPath();ctx.roundRect(190,92,840,462,16);ctx.fillStyle="rgba(11,18,39,.98)";ctx.fill();ctx.strokeStyle=profileFrameColor(profileAvatarFrame);ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="bold 25px "+FONT_UI;ctx.textAlign="left";ctx.fillText(profilePickerMode==="avatar"?tr("选择头像与头像框","SELECT AVATAR & FRAME"):tr("选择展示执行官","SELECT SHOWCASE OPERATOR"),225,137);
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px "+FONT_UI;ctx.fillText(tr("仅可使用已获得角色；选择后立即保存","Only obtained operators can be selected; changes save immediately"),225,160);
  drawBtn("×","ESC",970,106,52,52,false,"#fff");
  for(let i=0;i<roles.length;i++){
    const x=245+(i%3)*220,y=180+Math.floor(i/3)*125,available=!!owned[i];
    ctx.fillStyle=available?"rgba(124,199,255,.07)":"rgba(255,255,255,.025)";ctx.fillRect(x,y,190,104);ctx.strokeStyle=available?roles[i].color:"rgba(255,255,255,.10)";ctx.strokeRect(x,y,190,104);
    drawPortrait(x+10,y+10,58,82,roles[i],!available);
    ctx.fillStyle=available?"#fff":"#666";ctx.font="bold 13px "+FONT_UI;ctx.fillText(roleName(i),x+80,y+39);
    ctx.fillStyle=available?"rgba(255,255,255,.48)":"#555";ctx.font="10px "+FONT_UI;ctx.fillText(available?roleStyle(i):tr("未获得","LOCKED"),x+80,y+64);
  }
  if(profilePickerMode==="avatar"){
    ["zero","crystal","raven","dream"].forEach((id,i)=>drawBtn(profileFrameName(id),profileAvatarFrame===id?"◆":"",245+i*170,465,154,46,profileAvatarFrame===id,profileFrameColor(id)));
  }
}



function updateAchievements(){
  menuPulse++;
  checkAchievements();
  if(clicked){
    if(inRect(60,560,220,52)){ enterLobby(); clicked=false; return; }
    let y = 145;
    for(const a of ACHIEVEMENT_LIST){
      const st = achievements[a.id];
      if(st && !st.claimed && inRect(760,y+8,190,38)){
        claimAchievement(a.id);
        clicked=false;
        return;
      }
      y += 52;
    }
  }
  if(justPressed("escape")) enterLobby();
  clicked=false;
}

function drawAchievements(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#14182d");
  bg.addColorStop(.55,"#070912");
  bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(30,30,1060,82);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(30,30,1060,82);
  ctx.fillStyle="#fff";
  ctx.font="bold 34px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(ui("achievement"),58,78);
  ctx.font="14px " + FONT_UI;
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.fillText(ui("achievementSubtitle"),60,101);

  const cats = {
    journey: tr("旅途记录","Journey"),
    combat: tr("战斗记录","Combat"),
    collection: tr("收集记录","Collection")
  };

  let y = 145;
  for(const a of ACHIEVEMENT_LIST){
    const st = achievements[a.id];
    const unlocked = !!st;
    const claimed = st && st.claimed;
    ctx.fillStyle = unlocked ? "rgba(255,224,102,.11)" : "rgba(255,255,255,.055)";
    ctx.fillRect(70,y,900,44);
    ctx.strokeStyle = unlocked ? "rgba(255,224,102,.34)" : "rgba(255,255,255,.10)";
    ctx.strokeRect(70,y,900,44);

    ctx.fillStyle = unlocked ? "#ffe066" : "rgba(255,255,255,.55)";
    ctx.font="bold 16px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(achievementName(a),90,y+18);

    ctx.fillStyle="rgba(255,255,255,.52)";
    ctx.font="12px " + FONT_UI;
    ctx.fillText(cats[a.cat] + " · " + achievementDesc(a),90,y+36);

    ctx.fillStyle="#7cc7ff";
    ctx.font="bold 13px " + FONT_UI;
    ctx.textAlign="right";
    ctx.fillText(achievementProgressText(a),740,y+27);

    if(unlocked && !claimed){
      drawBtn(ui("claimReward"),"+"+a.crystals,760,y+8,190,30,true,"#ffe066");
    }else{
      ctx.fillStyle=claimed?"rgba(255,255,255,.42)":"rgba(255,255,255,.32)";
      ctx.font="bold 13px " + FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(claimed?ui("claimed"):ui("achievementLocked"),855,y+28);
    }
    y += 52;
  }

  if(achievementMsg){
    ctx.textAlign="left";
    ctx.fillStyle="#7cc7ff";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(achievementMsg,70,535);
  }

  drawBtn(ui("backLobby"),"ESC",60,560,220,52);
}

function updateSettings(){
  menuPulse++;
  if(clicked){
    if(inRect(70,126,150,44)){ settingsTab="graphics"; logoutConfirm=false; localDeleteConfirm=false; }
    else if(inRect(235,126,150,44)){ settingsTab="audio"; logoutConfirm=false; localDeleteConfirm=false; }
    else if(inRect(400,126,150,44)){ settingsTab="account"; logoutConfirm=false; localDeleteConfirm=false; }

    if(inRect(60,560,220,52)){ closeSettingsToOrigin(); clicked=false; return; }
    if(settingsReturnMode!=="login" && inRect(310,560,220,52)){ returnToLogin(); clicked=false; return; }

    if(settingsTab==="graphics"){
      if(inRect(120,265,120,38)){ setRenderQualitySetting("STANDARD"); clicked=false; return; }
      if(inRect(250,265,120,38)){ setRenderQualitySetting("1080P"); clicked=false; return; }
      if(inRect(380,265,120,38)){ setRenderQualitySetting("2K"); clicked=false; return; }
      if(inRect(510,265,120,38)){ setRenderQualitySetting("AUTO"); clicked=false; return; }

      if(inRect(120,340,120,38)){ setTargetFPSSetting(30); clicked=false; return; }
      if(inRect(250,340,120,38)){ setTargetFPSSetting(60); clicked=false; return; }

      if(inRect(120,405,220,42)){ particlesEnabled=!particlesEnabled; saveGame(); clicked=false; return; }
      if(inRect(360,405,220,42)){ damageTextEnabled=!damageTextEnabled; saveGame(); clicked=false; return; }
      if(inRect(120,465,220,42)){ language = language==="zh" ? "en" : "zh"; rememberUiLanguage(language); rebuildStoryScripts(); refreshLanguageRuntimeText(); checkAchievements(); saveGame(); clicked=false; return; }
    }

    if(settingsTab==="audio"){
      if(inRect(120,245,260,52)){ audioMuted=!audioMuted; saveGame(); clicked=false; return; }
      if(inRect(120,325,360,44)){ bgmVolume = setVolumeFromMouse(120,360); saveGame(); clicked=false; return; }
      if(inRect(120,395,360,44)){ sfxVolume = setVolumeFromMouse(120,360); saveGame(); clicked=false; return; }
    }

    if(settingsTab==="account"){
      if(inRect(120,365,260,46)){
        if(!localDeleteConfirm){
          localDeleteConfirm = true;
          setAccountMsg(language==="en" ? "Click again to delete local save only." : "再次点击将只删除本地存档。", 160);
        }else{
          localDeleteConfirm = false;
          resetLocalAccount();
          setAccountMsg(language==="en" ? "Local save deleted." : "本地存档已删除。", 140);
        }
        clicked=false;
        return;
      }
      if(guestMode && inRect(120,425,260,46)){
        exitLocalGuestSession();
        clicked=false;
        return;
      }
      if(!cloudUser && inRect(720,305,170,46)){ openAccountCredentialPanel("login"); clicked=false; return; }
      if(!cloudUser && inRect(910,305,170,46)){ openAccountCredentialPanel("register"); clicked=false; return; }
      if(cloudUser && inRect(720,435,170,46)){ signOutAndClearLocal(); }
      if(cloudUser && inRect(910,435,190,46)){ requestDeleteAccount(); }
    }
  }
  if(justPressed("escape")) closeSettingsToOrigin();
  clicked=false;
}


function drawSettings(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#101631");
  bg.addColorStop(.58,"#070912");
  bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  drawPageHeader(tr(ui("settings"),"Settings"), tr("设置 / 画面 / 音效 / 账号","Settings / Graphics / Audio / Account"));

  drawBtn(tr(ui("graphics"),"Graphics"),"",70,126,150,44,settingsTab==="graphics","#ffffff");
  drawBtn(tr(ui("audio"),"Audio"),"",235,126,150,44,settingsTab==="audio","#ffffff");
  drawBtn(tr(ui("account"),"Account"),"",400,126,150,44,settingsTab==="account","#ffffff");

  if(settingsTab==="graphics"){
    ctx.fillStyle="rgba(255,255,255,.72)";
    ctx.font="18px " + FONT_UI;
    ctx.fillText(tr(ui("graphicsSettings"),"Graphics Settings"),120,220);

    ctx.fillStyle="rgba(255,255,255,.58)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(language==="en" ? "Clarity" : "画质清晰度",120,250);
    drawBtn(language==="en"?"Standard":"标准","",120,265,120,38,renderQuality==="STANDARD","#7cc7ff");
    drawBtn("1080P","",250,265,120,38,renderQuality==="1080P","#7cc7ff");
    drawBtn("2K","",380,265,120,38,renderQuality==="2K","#7cc7ff");
    drawBtn(language==="en"?"Auto":"自动",qualityName("AUTO"),510,265,120,38,renderQuality==="AUTO","#7cc7ff");

    ctx.fillStyle="rgba(255,255,255,.58)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(language==="en" ? "Frame Rate" : "帧数",120,325);
    drawBtn("30 FPS","",120,340,120,38,targetFPS===30,"#ffe066");
    drawBtn("60 FPS","",250,340,120,38,targetFPS===60,"#ffe066");

    drawBtn(tr(ui("particles"),"Particles"),particlesEnabled?tr(ui("on"),"On"):tr(ui("off"),"Off"),120,405,220,42,particlesEnabled,"#7cc7ff");
    drawBtn(tr(ui("damageText"),"Damage Text"),damageTextEnabled?tr(ui("on"),"On"):tr(ui("off"),"Off"),360,405,220,42,damageTextEnabled,"#ffe066");
    drawBtn(tr(ui("language"),"Language"),language==="zh"?"中文":"English",120,465,220,42,true,"#7cc7ff");

    ctx.fillStyle=deviceMayHeatFor(activeRenderQuality(), targetFPS) ? "rgba(255,160,120,.90)" : "rgba(255,255,255,.45)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(
      deviceMayHeatFor(activeRenderQuality(), targetFPS)
        ? (language==="en" ? "Warning: current settings may heat low-end devices." : "提示：当前设置可能导致低配设备发热。")
        : tr("关闭粒子/伤害数字可提升低配设备流畅度。","Turning off particles/damage text can improve performance."),
      120,530
    );
  }

  if(settingsTab==="audio"){
    ctx.fillStyle="rgba(255,255,255,.72)";
    ctx.font="18px " + FONT_UI;
    ctx.fillText(tr(ui("audioSettings"),"Audio Settings"),120,220);
    drawBtn(tr(ui("gameAudio"),"Game Audio"),audioMuted?tr(ui("off"),"Off"):tr(ui("on"),"On"),120,245,260,52,!audioMuted,"#7cc7ff");

    drawVolumeSlider(language==="en" ? "Music Volume" : "音乐音量", bgmVolume, 120, 320, 360, "#7cc7ff");
    drawVolumeSlider(language==="en" ? "SFX Volume" : "音效音量", sfxVolume, 120, 390, 360, "#ffe066");

    ctx.fillStyle="rgba(255,255,255,.44)";
    ctx.font="13px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(language==="en" ? "Login music fades automatically; SFX defaults to 100%." : "登录音乐自动淡入淡出；音效默认 100%。",120,465);
  }

  if(settingsTab==="account"){
    ctx.fillStyle="rgba(255,255,255,.72)";
    ctx.font="18px " + FONT_UI;
    ctx.fillText(tr(ui("accountInfo"),"Account Info"),120,220);
    ctx.fillStyle="#fff";
    ctx.font="bold 24px " + FONT_UI;
    ctx.fillText(playerName || "PLAYER",120,270);
    ctx.fillStyle="rgba(255,255,255,.62)";
    ctx.font="16px " + FONT_UI;
    ctx.fillText("UID: "+(playerUID||"--------"),120,305);
    ctx.fillText("Lv."+playerLevel+"   "+getProfileProgressText(),120,332);

    drawBtn(
      localDeleteConfirm ? (language==="en" ? "Confirm Delete Local Save" : "确认删除本地存档") : (language==="en" ? "Delete Local Save" : "删除本地存档"),
      language==="en" ? "Local only" : "仅本地",
      120,365,260,46,
      localDeleteConfirm,
      localDeleteConfirm ? "#ff5555" : "#ff9999"
    );
    ctx.fillStyle=localDeleteConfirm ? "rgba(255,130,130,.92)" : "rgba(255,255,255,.45)";
    ctx.font="13px " + FONT_UI;
    ctx.fillText(
      language==="en" ? "This clears this device only. Cloud save is not deleted." : "只清除此设备存档，不删除云端存档。",
      120,421
    );

    drawBtn(
      language==="en" ? "Exit Local Save" : "退出本地存档",
      language==="en" ? "Keep progress" : "保留进度",
      120,425,260,46,
      false,
      guestMode ? "#7cc7ff" : "#687286"
    );
    ctx.fillStyle="rgba(255,255,255,.45)";
    ctx.font="13px " + FONT_UI;
    ctx.fillText(
      guestMode
        ? (language==="en" ? "Returns to sign-in without deleting guest progress." : "返回登录页面，但不会删除游客进度。")
        : (language==="en" ? "Available while a local guest save is active." : "仅在当前使用游客本地存档时可用。"),
      120,492
    );

    ctx.fillStyle="rgba(124,199,255,.85)";
    ctx.font="bold 18px " + FONT_UI;
    ctx.fillText(cloudTx("cloudTitle"),720,220);
    ctx.fillStyle="rgba(255,255,255,.68)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText((cloudUser ? cloudTx("cloudLoggedIn")+": "+(cloudUser.email||"") : cloudTx("cloudOffline")),720,250);
    if(cloudMsg){ ctx.fillStyle="rgba(255,224,102,.9)"; ctx.fillText(cloudMsg,720,276); }

    if(cloudUser){
      ctx.fillStyle="rgba(124,255,178,.82)";
      ctx.font="15px " + FONT_UI;
      ctx.fillText(cloudSyncStatus || accTx("autoSynced"),720,315);
      drawBtn(language==="en" ? "Sign Out" : "退出登录","",720,435,170,46,false,"#ff9999");
      drawBtn(language==="en" ? "Request Deletion" : "申请注销账号","7 days",910,435,190,46,false,"#ff5555");
      ctx.fillStyle="rgba(255,255,255,.42)";
      ctx.font="13px " + FONT_UI;
      ctx.fillText(language==="en" ? "Sign Out clears local cache. Cloud save remains." : "退出登录会清除本地缓存；云端存档保留。",720,520);
      ctx.fillText(language==="en" ? "Deletion can be cancelled only by logging in again during the 7-day grace period." : "注销申请只能在7天内重新登录该账号时取消。",720,545);
    }else{
      drawBtn(cloudTx("cloudLogin"),cloudTx("cloudEmail"),720,305,170,46,false,"#7cc7ff");
      drawBtn(cloudTx("cloudRegister"),cloudTx("cloudEmail"),910,305,170,46,false,"#7cc7ff");
      ctx.fillStyle="rgba(255,255,255,.45)";
      ctx.font="14px " + FONT_UI;
      ctx.fillText(cloudTx("cloudOffline"),720,390);
    }
  }

  drawBtn(settingsReturnMode==="login" ? ui("backLogin") : ui("backLobby"),"ESC",60,560,220,52);
  if(settingsReturnMode!=="login") drawBtn(ui("backLogin"),"",310,560,220,52);


}



function updateMail(){
  menuPulse++;
  if(clicked){
    if(inRect(60,560,220,52)){ enterLobby(); clicked=false; return; }
    if(inRect(310,560,250,52)){
      if(mailClaimed && !mailDeleted){
        mailDeleted=true;
        mailMsg=language==="en"?"Read mail deleted":"已删除已读邮件";
        saveGame(); autoCloudSaveNow(true);
      }else if(!mailClaimed){
        mailMsg=language==="en"?"Claim the reward before deleting":"请先领取邮件奖励";
      }
      clicked=false; return;
    }
    if(!mailDeleted && inRect(120,210,760,110)){
      if(!mailClaimed){
        sfx("reward"); const mailCrystalReward=grantFreeCrystals(300);
        gold += 1000;
        expBooks += 5;
        sfx("buy"); mailClaimed = true; saveGame(); autoCloudSaveNow(true);
        mailMsg = (language==="en"?"Claimed: Crystal ":"领取成功：水晶 ")+mailCrystalReward+(language==="en"?" / Gold 1000 / EXP Books 5":" / 金币1000 / 经验书5");
      } else {
        mailMsg = msg("mailAlready");
      }
    }
  }
  if(justPressed("escape")) enterLobby();
  clicked=false;
}


function drawProfile(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#111a34"); bg.addColorStop(.55,"#080c1a"); bg.addColorStop(1,"#03050d");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  const haze=ctx.createRadialGradient(760,255,30,760,255,520);haze.addColorStop(0,"rgba(104,92,210,.18)");haze.addColorStop(.48,"rgba(70,150,210,.07)");haze.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(124,199,255,.045)";ctx.lineWidth=1;
  for(let x=-180;x<W+180;x+=42){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+300,H);ctx.stroke();}

  ctx.fillStyle="rgba(8,13,29,.82)";ctx.fillRect(22,20,W-44,76);ctx.strokeStyle="rgba(124,199,255,.22)";ctx.strokeRect(22,20,W-44,76);
  ctx.fillStyle="#7cc7ff";ctx.fillRect(22,20,6,76);
  ctx.fillStyle="#fff";ctx.font="bold 28px "+FONT_UI;ctx.textAlign="left";ctx.fillText(tr("个人资料","PROFILE"),52,57);
  ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="11px Arial";ctx.fillText("PROJECT ZERO / IDENTITY ARCHIVE",54,80);
  ctx.textAlign="right";ctx.fillStyle="rgba(124,199,255,.66)";ctx.font="bold 12px Arial";ctx.fillText("PZ-REC // "+(playerUID||"--------"),W-54,61);
  ctx.fillStyle="rgba(255,255,255,.28)";ctx.font="10px Arial";ctx.fillText(tr("本地行动记录已同步","LOCAL ACTION RECORD SYNCED"),W-54,80);

  const completedAchievements=ACHIEVEMENT_LIST.filter(a=>achievements[a.id]&&achievements[a.id].unlocked).length;
  const operatorCount=owned.filter(Boolean).length;
  const weaponCount=Array.isArray(weaponInventory)?weaponInventory.filter(v=>v&&v.owned).length:0;
  const archiveCount=getClearedStageCount();
  const ddLevel=window.PZDaydream&&window.PZDaydream.reconstructionLevel?window.PZDaydream.reconstructionLevel():1;
  const chapterTitle=storyChapterComplete(2)?tr("雷文哈多篇 · 第二章完成","Ravenhado · Chapter 2 Complete"):(chapter1Complete()?tr("雷文哈多篇 · 第二章进行中","Ravenhado · Chapter 2 Active"):(chapter0Complete()?tr("雷文哈多篇 · 第一章进行中","Ravenhado · Chapter 1 Active"):tr("第零章 · 初入","Chapter 0 · Arrival")));

  // PZ identity core: translucent archive panel with restrained executor color.
  ctx.beginPath();ctx.roundRect(42,116,500,205,15);ctx.fillStyle="rgba(10,17,37,.78)";ctx.fill();ctx.strokeStyle="rgba(124,199,255,.30)";ctx.stroke();
  const roleAccent=roles[profileAvatarRole]&&roles[profileAvatarRole].color||"#7cc7ff",frameColor=profileFrameColor(profileAvatarFrame);
  ctx.fillStyle="rgba(124,199,255,.07)";ctx.fillRect(58,132,132,132);drawPortrait(72,140,104,116,roles[profileAvatarRole],false);
  ctx.save();ctx.shadowColor=frameColor;ctx.shadowBlur=16;ctx.strokeStyle=frameColor;ctx.lineWidth=3;ctx.strokeRect(58,132,132,132);ctx.restore();
  ctx.fillStyle=frameColor;ctx.beginPath();ctx.moveTo(58,132);ctx.lineTo(82,132);ctx.lineTo(58,156);ctx.closePath();ctx.fill();
  ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="bold 9px "+FONT_UI;ctx.textAlign="center";ctx.fillText(tr("点击更换","CHANGE"),124,281);
  ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 28px "+FONT_UI;ctx.fillText(playerName||"PLAYER",216,156);
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px Arial";ctx.fillText("UID  "+(playerUID||"--------"),217,181);
  ctx.fillStyle="#7cc7ff";ctx.font="bold 11px "+FONT_UI;ctx.fillText(tr("◆ 行动记录启用","◆ ACTION RECORD ONLINE"),217,207);
  ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(216,222,292,1);
  [[tr("权限等级","AUTHORITY"),String(playerLevel).padStart(2,"0"),"#ffe066"],[tr("白日梦等级","DAYDREAM"),String(ddLevel).padStart(2,"0"),"#b998ff"]].forEach((v,i)=>{const x=216+i*148;ctx.fillStyle="rgba(255,255,255,.045)";ctx.fillRect(x,240,136,56);ctx.fillStyle="rgba(255,255,255,.45)";ctx.font="10px "+FONT_UI;ctx.fillText(v[0],x+10,258);ctx.fillStyle=v[2];ctx.font="bold 24px Arial";ctx.fillText(v[1],x+10,286);});

  // Journey record
  ctx.beginPath();ctx.roundRect(42,337,500,108,13);ctx.fillStyle="rgba(12,18,39,.78)";ctx.fill();ctx.strokeStyle="rgba(180,140,255,.25)";ctx.stroke();
  const journeyGlow=ctx.createLinearGradient(42,337,542,445);journeyGlow.addColorStop(0,"rgba(124,199,255,.08)");journeyGlow.addColorStop(1,"rgba(185,152,255,.13)");ctx.fillStyle=journeyGlow;ctx.fillRect(48,343,488,96);
  ctx.fillStyle="#b998ff";ctx.font="bold 11px "+FONT_UI;ctx.fillText(tr("当前行动记录","CURRENT JOURNEY"),66,362);
  ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.fillText(chapterTitle,66,393);
  ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="13px "+FONT_UI;ctx.fillText(getProfileProgressText(),66,420);

  // Collection counters
  const counters=[[tr("执行官","OPERATORS"),operatorCount],[tr("武器","WEAPONS"),weaponCount],[tr("关卡档案","FILES"),archiveCount]];
  counters.forEach((c,i)=>{const x=42+i*170;ctx.beginPath();ctx.roundRect(x,460,160,67,10);ctx.fillStyle="rgba(10,16,34,.78)";ctx.fill();ctx.strokeStyle="rgba(124,199,255,.18)";ctx.stroke();ctx.fillStyle=i===0?"#7cc7ff":i===1?"#ffe066":"#b998ff";ctx.font="bold 27px Arial";ctx.fillText(c[1],x+14,491);ctx.font="10px "+FONT_UI;ctx.fillStyle="rgba(255,255,255,.48)";ctx.fillText(c[0],x+14,514);});

  // Right-side PZ tactical display
  ctx.beginPath();ctx.roundRect(570,116,508,411,15);ctx.fillStyle="rgba(9,14,31,.80)";ctx.fill();ctx.strokeStyle="rgba(124,199,255,.28)";ctx.stroke();
  ctx.fillStyle="#7cc7ff";ctx.fillRect(570,116,5,411);
  ctx.fillStyle="#fff";ctx.font="bold 18px "+FONT_UI;ctx.fillText(tr("执行官展示","EXECUTOR SHOWCASE"),598,151);
  ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(598,166,452,102);
  profileShowcase.slice(0,3).forEach((role,i)=>{const x=620+i*142;ctx.beginPath();ctx.roundRect(x,184,110,61,8);ctx.fillStyle="rgba(255,255,255,.045)";ctx.fill();ctx.strokeStyle=roles[role].color;ctx.stroke();drawPortrait(x+7,190,34,49,roles[role],false);ctx.fillStyle="#fff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(roleName(role),x+47,211);ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="9px "+FONT_UI;ctx.fillText(roleStyle(role),x+47,229);});

  ctx.fillStyle="#b998ff";ctx.font="bold 18px "+FONT_UI;ctx.fillText(tr("旅途数据","JOURNEY DATA"),598,307);
  const stats=[[tr("击败敌人","ENEMIES"),totalKills],[tr("首领记录","BOSSES"),totalBossKills],[tr("累计水晶","CRYSTAL"),totalCrystalsEarned],[tr("成就记录","ACHIEVEMENTS"),completedAchievements+"/"+ACHIEVEMENT_LIST.length]];
  stats.forEach((s,i)=>{const x=598+(i%2)*224,y=322+Math.floor(i/2)*72;ctx.beginPath();ctx.roundRect(x,y,210,58,8);ctx.fillStyle="rgba(255,255,255,.04)";ctx.fill();ctx.strokeStyle="rgba(124,199,255,.12)";ctx.stroke();ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="10px "+FONT_UI;ctx.fillText(s[0],x+12,y+19);ctx.fillStyle=i===3?"#b998ff":"#fff";ctx.font="bold 21px Arial";ctx.fillText(String(s[1]),x+12,y+46);});
  ctx.fillStyle="rgba(255,255,255,.38)";ctx.font="11px "+FONT_UI;ctx.fillText(tr("数据来自当前本地行动记录","DATA SOURCE / CURRENT LOCAL RECORD"),598,491);

  if(profileTab==="records") drawProfileRecordTab();
  const overviewActive=profileTab!=="records";
  ctx.fillStyle=overviewActive?"rgba(124,199,255,.16)":"rgba(255,255,255,.035)";ctx.fillRect(870,126,82,34);
  ctx.strokeStyle=overviewActive?"#7cc7ff":"rgba(255,255,255,.14)";ctx.strokeRect(870,126,82,34);
  ctx.fillStyle=!overviewActive?"rgba(255,224,102,.14)":"rgba(255,255,255,.035)";ctx.fillRect(958,126,100,34);
  ctx.strokeStyle=!overviewActive?"#ffe066":"rgba(255,255,255,.14)";ctx.strokeRect(958,126,100,34);
  ctx.textAlign="center";ctx.font="bold 11px "+FONT_UI;ctx.fillStyle=overviewActive?"#7cc7ff":"rgba(255,255,255,.58)";ctx.fillText(tr("总览","OVERVIEW"),911,148);
  ctx.fillStyle=!overviewActive?"#ffe066":"rgba(255,255,255,.58)";ctx.fillText(tr("作战记录","RECORDS"),1008,148);
  ctx.textAlign="left";

  drawBtn(tr("返回大厅","Back to Lobby"),"ESC",42,568,200,46,false,"#7cc7ff");
  if(profilePickerMode) drawProfilePicker();
}

function drawMail(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#101631");
  bg.addColorStop(.6,"#070912");
  bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(30,30,1060,82);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(30,30,1060,82);
  ctx.fillStyle="#fff";
  ctx.font="bold 34px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(ui("mail"),58,78);

  if(!mailDeleted){
    const hover=inRect(120,210,760,110);
    ctx.fillStyle=hover?"rgba(255,224,102,.14)":"rgba(255,255,255,.075)";
    ctx.fillRect(120,210,760,110);
    ctx.strokeStyle=hover?"rgba(255,224,102,.75)":"rgba(255,255,255,.14)";
    ctx.strokeRect(120,210,760,110);
    ctx.fillStyle=mailClaimed?"#888":"#ffe066";
    ctx.font="bold 22px " + FONT_UI;
    ctx.fillText(tx("launchSupply"),150,250);
    ctx.fillStyle="rgba(255,255,255,.70)";
    ctx.font="15px " + FONT_UI;
    ctx.fillText(tx("mailRewardLine"),150,282);
    ctx.textAlign="right";
    ctx.fillStyle=mailClaimed?"#888":"#ffffff";
    ctx.fillText(mailClaimed?ui("claimed"):ui("claim"),850,270);
  }else{
    ctx.fillStyle="rgba(255,255,255,.38)";
    ctx.font="18px " + FONT_UI;
    ctx.textAlign="center";
    ctx.fillText(language==="en"?"No mail":"暂无邮件",W/2,270);
  }

  ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.75)";
  ctx.font="16px " + FONT_UI;
  ctx.fillText(tx("tipPrefix")+mailMsg,120,370);
  drawBtn(ui("backLobby"),"CLICK",60,560,220,52);
  drawBtn(language==="en"?"Delete Read Mail":"删除已读邮件","",310,560,250,52,mailClaimed&&!mailDeleted,mailClaimed&&!mailDeleted?"#ff9999":"#666");
}






function warehouseEntries(){
  const out=[
    {key:"material:crystal",category:"material",name:ui("crystal"),count:crystals,color:"#7cc7ff",icon:"◆",currencyKind:"crystal",source:tr("任务、活动与关卡奖励","Missions, events and stage rewards"),desc:tr("通用资源，可用于招募及商店兑换。","General currency used for recruitment and shop exchanges.")},
    {key:"material:gold",category:"material",name:tr("金币","Gold"),count:gold,color:"#ffe066",icon:"●",currencyKind:"gold",source:tr("金币试炼与关卡奖励","Gold Trial and stage rewards"),desc:tr("角色与武器养成所需的基础资源。","Basic resource for operator and weapon growth.")},
    {key:"material:exp",category:"material",name:tr("经验书","EXP Books"),count:expBooks,color:"#7cffb2",icon:"▤",source:tr("角色升级材料副本","Executor EXP Trial"),desc:tr("用于提升执行官等级。","Used to level up executors.")},
    {key:"material:ore",category:"material",name:tr("精炼合金","Weapon Ore"),count:weaponOre,color:"#c98cff",icon:"◇",source:tr("武器材料副本","Weapon Upgrade Trial"),desc:tr("用于武器精炼。","Used to upgrade weapons.")},
    {key:"material:skillbook",category:"material",name:tr("技能书","Skill Book"),count:skillBooks,color:"#ffcf7c",icon:"▥",source:tr("技能训练副本","Skill Training"),desc:tr("用于非主角执行官的技能升级。","Used to upgrade non-protagonist skills.")},
    {key:"material:normal",category:"material",name:tr("攻击训练记录","Attack Drill"),count:skillMaterials.normal,color:"#ff9f7c",icon:"N",source:tr("技能训练副本","Skill Training"),desc:tr("用于升级普通攻击。","Used to upgrade normal attacks.")},
    {key:"material:skill",category:"material",name:tr("技能核心","Skill Core"),count:skillMaterials.skill,color:"#7cc7ff",icon:"E",source:tr("技能训练副本","Skill Training"),desc:tr("用于升级角色技能。","Used to upgrade skills.")},
    {key:"material:ultimate",category:"material",name:tr("终结技档案","Ultimate Record"),count:skillMaterials.ultimate,color:"#c98cff",icon:"Q",source:tr("技能训练副本","Skill Training"),desc:tr("用于升级角色大招。","Used to upgrade ultimates.")},
    {key:"material:candy",category:"material",name:tr("体力糖","Stamina Candy"),count:dungeonCandy,color:"#ff9dc8",icon:"✦",source:tr("活动与签到","Events and check-in"),desc:tr("材料副本消耗资源。","Consumed when entering material dungeons.")},
    {key:"material:stimulant",category:"material",name:tr("体力补充剂","Stamina Stimulant"),count:dungeonStimulant,color:"#70e6ff",icon:"＋",source:tr("活动奖励","Event rewards"),desc:tr("用于补充副本体力。","Restores dungeon stamina.")},
    {key:"material:claw",category:"material",name:tr("龙爪徽记","Dragon Claw"),count:dragonClaw,color:"#ff837c",icon:"▲",source:tr("高难挑战","High-difficulty challenges"),desc:tr("稀有挑战纪念资源。","Rare challenge token.")}
  ];
  ensureWeaponBag();
  (weaponInventory||[]).filter(v=>v&&v.owned).forEach(v=>{const d=weaponData(v.id);out.push({key:"weapon:"+v.id,category:"weapon",name:language==="en"?d.nameEn:d.nameZh,count:1,level:v.level||1,rarity:d.rarity,color:d.rarity==="S"?"#ffe066":d.rarity==="A"?"#b98cff":"#7cc7ff",icon:"╱",source:tr("武器获取与奖励","Weapon acquisition and rewards"),desc:language==="en"?d.passiveEn:d.passiveZh,extra:tr("攻击 ","ATK ")+d.baseAtk+"  ·  "+tr("暴击 ","CRIT ")+d.crit+"%"});});
  if(window.PZModules){
    const counts={};(crystalModuleInventory||[]).forEach(id=>counts[id]=(counts[id]||0)+1);
    Object.keys(counts).forEach(id=>{const d=window.PZModules.item(id);if(!d)return;const set=window.PZModules.SETS[d.setId],slot=window.PZModules.SLOT_TEXT[d.slot];const stats=Object.entries(d.stats||{}).map(([k,v])=>({hp:"HP",atk:tr("攻击","ATK"),def:tr("防御","DEF"),speedPct:tr("速度","Speed")}[k]||k)+" +"+(k.endsWith("Pct")?Math.round(v*1000)/10+"%":v)).join("  ·  ");out.push({key:"module:"+id,category:"module",name:language==="en"?d.nameEn:d.nameZh,count:counts[id],grade:d.grade,color:set.color,icon:"⬡",source:tr("材料副本 · 模块档案","Material Dungeon · Module Archive"),desc:(language==="en"?set.en:set.zh)+" · "+(language==="en"?slot[1]:slot[0]),extra:stats,drawback:language==="en"?d.drawbackEn:d.drawbackZh});});
  }
  return out;
}

function visibleWarehouseEntries(){
  let list=warehouseEntries().filter(v=>warehouseTab==="all"||v.category===warehouseTab);
  const categoryOrder={material:0,weapon:1,module:2};
  list.sort((a,b)=>{
    if(warehouseSortMode==="quantity") return (b.count||0)-(a.count||0)||a.name.localeCompare(b.name);
    if(warehouseSortMode==="grade") return (b.grade||b.level||0)-(a.grade||a.level||0)||a.name.localeCompare(b.name);
    return (categoryOrder[a.category]||0)-(categoryOrder[b.category]||0)||(b.grade||b.level||0)-(a.grade||a.level||0)||a.name.localeCompare(b.name);
  });
  return list;
}

function updateWarehouse(){
  menuPulse++;
  const list=visibleWarehouseEntries(),rows=Math.ceil(list.length/3),maxScroll=Math.max(0,rows*104-396);
  if(warehouseWheelDelta){warehouseScroll=clamp(warehouseScroll+warehouseWheelDelta*.65,0,maxScroll);warehouseWheelDelta=0;}
  if(justPressed("escape")){enterLobby();clicked=false;return;}
  if(clicked){
    if(inRect(42,118,146,52)){warehouseTab="all";warehouseScroll=0;}
    else if(inRect(42,178,146,52)){warehouseTab="material";warehouseScroll=0;}
    else if(inRect(42,238,146,52)){warehouseTab="weapon";warehouseScroll=0;}
    else if(inRect(42,298,146,52)){warehouseTab="module";warehouseScroll=0;}
    else if(inRect(604,82,148,30)){warehouseSortMode=warehouseSortMode==="category"?"quantity":warehouseSortMode==="quantity"?"grade":"category";warehouseScroll=0;}
    else if(inRect(60,570,196,46)){enterLobby();clicked=false;return;}
    else{
      for(let i=0;i<list.length;i++){
        const x=210+(i%3)*178,y=130+Math.floor(i/3)*104-warehouseScroll;
        if(y>108&&y<523&&inRect(x,y,164,90)){warehouseSelectedKey=list[i].key;break;}
      }
    }
  }
  clicked=false;
}

function drawWarehouse(){
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#101a35");bg.addColorStop(.6,"#080b15");bg.addColorStop(1,"#03040a");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(10,15,29,.88)";ctx.fillRect(24,22,1072,596);ctx.strokeStyle="rgba(124,199,255,.24)";ctx.strokeRect(24,22,1072,596);
  ctx.fillStyle="#fff";ctx.font="bold 32px "+FONT_UI;ctx.textAlign="left";ctx.fillText(ui("warehouse"),48,64);
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="12px "+FONT_UI;ctx.fillText(tr("全局物资管理 / 按类别查看已持有内容","GLOBAL STORAGE / OWNED ITEMS BY CATEGORY"),50,87);
  ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.66)";ctx.font="12px "+FONT_UI;ctx.fillText(tr("物品总类 ","ITEM TYPES ")+warehouseEntries().length,1058,62);ctx.textAlign="left";

  const tabs=[["all",tr("全部","All")],["material",tr("物资","Materials")],["weapon",tr("武器","Weapons")],["module",tr("晶体模块","Modules")]];
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(36,108,158,420);
  tabs.forEach((t,i)=>{const y=118+i*60,active=warehouseTab===t[0];ctx.fillStyle=active?"rgba(124,199,255,.18)":"rgba(255,255,255,.035)";ctx.fillRect(42,y,146,52);ctx.fillStyle=active?"#7cc7ff":"rgba(255,255,255,.72)";ctx.fillRect(42,y,active?4:2,52);ctx.font="bold 15px "+FONT_UI;ctx.fillText(t[1],58,y+31);});
  ctx.fillStyle="rgba(255,255,255,.045)";ctx.fillRect(202,108,558,420);ctx.strokeStyle="rgba(255,255,255,.1)";ctx.strokeRect(202,108,558,420);
  ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(604,82,148,30);ctx.fillStyle="#dcecff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="center";const sortLabel={category:tr("分类排序","Category"),quantity:tr("数量排序","Quantity"),grade:tr("等级排序","Grade")}[warehouseSortMode];ctx.fillText(sortLabel+"  ↻",678,102);ctx.textAlign="left";

  const list=visibleWarehouseEntries();ctx.save();ctx.beginPath();ctx.rect(202,108,558,420);ctx.clip();
  list.forEach((v,i)=>{const x=210+(i%3)*178,y=130+Math.floor(i/3)*104-warehouseScroll,active=v.key===warehouseSelectedKey,hover=inRect(x,y,164,90);if(y<-10||y>535)return;ctx.fillStyle=active?"rgba(124,199,255,.16)":hover?"rgba(255,255,255,.09)":"rgba(255,255,255,.055)";ctx.fillRect(x,y,164,90);ctx.strokeStyle=active?v.color:"rgba(255,255,255,.12)";ctx.lineWidth=active?2:1;ctx.strokeRect(x,y,164,90);if(v.currencyKind)drawCurrencyIcon(v.currencyKind,x+10,y+9,28);else{ctx.fillStyle=v.color;ctx.font="bold 24px "+FONT_UI;ctx.fillText(v.icon,x+12,y+30);}ctx.fillStyle="#fff";ctx.font="bold 12px "+FONT_UI;ctx.fillText(fitTextToWidth(v.name,116,12,true),x+42,y+24);ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="10px "+FONT_UI;const meta=v.category==="module"?tr("模块 ","MODULE ")+v.grade:v.category==="weapon"?"LV."+v.level:tr("物资","MATERIAL");ctx.fillText(meta,x+42,y+43);ctx.textAlign="right";ctx.fillStyle="#fff";ctx.font="bold 16px "+FONT_UI;ctx.fillText("×"+(v.count||0),x+150,y+75);ctx.textAlign="left";});ctx.restore();
  if(list.length===0){ctx.fillStyle="rgba(255,255,255,.45)";ctx.font="15px "+FONT_UI;ctx.textAlign="center";ctx.fillText(tr("该分类暂无物品","No items in this category"),481,320);ctx.textAlign="left";}

  let selected=warehouseEntries().find(v=>v.key===warehouseSelectedKey);if(!selected||!list.some(v=>v.key===selected.key))selected=list[0]||null;
  ctx.fillStyle="rgba(255,255,255,.045)";ctx.fillRect(774,108,304,420);ctx.strokeStyle="rgba(255,255,255,.12)";ctx.strokeRect(774,108,304,420);
  if(selected){ctx.fillStyle=selected.color;ctx.fillRect(774,108,5,420);ctx.textAlign="center";if(selected.currencyKind)drawCurrencyIcon(selected.currencyKind,891,125,70);else{ctx.fillStyle=selected.color;ctx.font="bold 42px "+FONT_UI;ctx.fillText(selected.icon,926,178);}ctx.fillStyle="#fff";ctx.font="bold 22px "+FONT_UI;ctx.fillText(fitTextToWidth(selected.name,260,22,true),926,219);ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="11px "+FONT_UI;const typeText={material:tr("基础物资","MATERIAL"),weapon:tr("武器","WEAPON"),module:tr("晶体模块","CRYSTAL MODULE")}[selected.category];ctx.fillText(typeText+(selected.grade?"  G"+selected.grade:""),926,241);ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 25px "+FONT_UI;ctx.fillText(tr("持有 ","OWNED ")+"×"+(selected.count||0),800,284);ctx.fillStyle=selected.color;ctx.font="bold 12px "+FONT_UI;if(selected.extra)wrapText(selected.extra,800,316,250,18);ctx.fillStyle=selected.drawback?"#ff9a9a":"rgba(255,255,255,.7)";ctx.font="12px "+FONT_UI;if(selected.drawback)wrapText(tr("副作用：","Drawback: ")+selected.drawback,800,350,250,17);ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="12px "+FONT_UI;wrapText(selected.desc||"",800,390,250,18);ctx.fillStyle="rgba(124,199,255,.72)";ctx.font="11px "+FONT_UI;wrapText(tr("来源：","Source: ")+selected.source,800,465,250,17);}
  ctx.fillStyle="rgba(0,0,0,.38)";ctx.fillRect(280,570,798,46);ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="12px "+FONT_UI;ctx.fillText(tr("滚轮浏览物品 · 点击查看详情 · 仓库仅用于查看与管理","Wheel to browse · Click for details · Storage is for inspection and management"),300,598);
  drawBtn(ui("backLobby"),"ESC",60,570,196,46);
}


function clickBackToLobby(){
  clicked=false;
  enterLobby();
}


function todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return y + "-" + m + "-" + day;
}

function canClaimDailyLogin(){
  return todayKey() !== lastLoginClaimDate && loginClaimIndex < loginRewards.length;
}

function nextLoginRewardIndex(){
  return clamp(loginClaimIndex, 0, loginRewards.length-1);
}

function claimLoginReward(index){
  const today = todayKey();
  if(loginClaimIndex >= loginRewards.length){
    eventMsg = msg("eventAllDone");
    return;
  }
  if(today === lastLoginClaimDate){
    eventMsg = msg("eventAlreadyToday");
    return;
  }
  if(index !== loginClaimIndex){
    if(index < loginClaimIndex) eventMsg = msg("eventRewardClaimed");
    else eventMsg = msg("eventNeedOrder");
    return;
  }

  const r = loginRewards[index];
  if(!r) return;
  grantReward(r);
  r.claimed = true;
  lastLoginClaimDate = today;
  loginClaimIndex = Math.min(loginClaimIndex + 1, loginRewards.length);
  eventMsg = msg("eventClaimPrefix") + rewardText(r);
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}

function versionLoginRewards(){ return [150,150,150,150,150,150,200]; }
function canClaimVersionLogin(){
  if(versionLoginCheckin.build!=="2026072205") versionLoginCheckin={build:"2026072205",claimedDays:[],lastClaimDate:""};
  return versionLoginCheckin.claimedDays.length<7 && versionLoginCheckin.lastClaimDate!==todayKey();
}
function claimVersionLogin(index){
  if(index!==versionLoginCheckin.claimedDays.length){ eventMsg=language==="en"?"Claim rewards in order.":"请按顺序领取版本签到奖励。"; return; }
  if(!canClaimVersionLogin()){ eventMsg=language==="en"?"Come back tomorrow.":"今日已领取，请明天再来。"; return; }
  const rewards=versionLoginRewards(), amount=rewards[index];
  if(!amount) return;
  grantExactEventCrystals(amount);
  versionLoginCheckin.claimedDays.push(index);
  versionLoginCheckin.lastClaimDate=todayKey();
  eventMsg=(language==="en"?"Version sign-in: Crystal +":"版本签到：水晶 +")+amount;
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}

function monthlyCheckinRewards(){
  return Array.from({length:30},(_,i)=>{
    const day=i+1;
    if(day===30) return {crystals:200,gold:3000,expBooks:3,ore:2};
    if(day===28) return {crystals:125,gold:2000,expBooks:2,ore:1};
    if(day===21) return {crystals:100,gold:1500,expBooks:2,ore:1};
    if(day===14) return {crystals:75,gold:1200,expBooks:2,ore:0};
    if(day===7) return {crystals:50,gold:1000,expBooks:1,ore:0};
    if(day%5===0) return {crystals:0,gold:1000,expBooks:2,ore:1};
    if(day%3===0) return {crystals:0,gold:800,expBooks:2,ore:0};
    return {crystals:0,gold:600,expBooks:1,ore:0};
  });
}

function monthlyCheckinMilestones(){
  return [
    {id:"d7l5",days:7,level:5,reward:{crystals:200,gold:5000,expBooks:5,ore:1}},
    {id:"d15l10",days:15,level:10,reward:{crystals:350,gold:8000,expBooks:8,ore:3}},
    {id:"d25l15",days:25,level:15,reward:{crystals:500,gold:12000,expBooks:12,ore:5}},
    {id:"d100l25",days:100,level:25,reward:{crystals:800,gold:25000,expBooks:20,ore:8}},
    {id:"d150l30",days:150,level:30,reward:{crystals:1000,gold:35000,expBooks:30,ore:12}},
    {id:"d365l40",days:365,level:40,reward:{crystals:2000,gold:60000,expBooks:50,ore:20}},
    {id:"d1000l60",days:1000,level:60,reward:{crystals:5000,gold:150000,expBooks:100,ore:40}}
  ];
}

function normalizeMonthlyLoginCheckin(){
  const key=currentMonthKey();
  if(!monthlyLoginCheckin || typeof monthlyLoginCheckin!=="object") monthlyLoginCheckin={month:key,dates:[],totalDates:[],milestones:{}};
  if(!Array.isArray(monthlyLoginCheckin.dates)) monthlyLoginCheckin.dates=[];
  if(!Array.isArray(monthlyLoginCheckin.totalDates)) monthlyLoginCheckin.totalDates=monthlyLoginCheckin.dates.slice();
  if(!monthlyLoginCheckin.milestones || typeof monthlyLoginCheckin.milestones!=="object") monthlyLoginCheckin.milestones={};
  if(monthlyLoginCheckin.month!==key){
    monthlyLoginCheckin.month=key;
    monthlyLoginCheckin.dates=[];
  }
  monthlyLoginCheckin.dates=[...new Set(monthlyLoginCheckin.dates.filter(v=>typeof v==="string"))].slice(0,30);
  monthlyLoginCheckin.totalDates=[...new Set(monthlyLoginCheckin.totalDates.filter(v=>typeof v==="string"))].slice(0,2000);
}

function monthlyCheckinCanSign(){
  normalizeMonthlyLoginCheckin();
  return monthlyLoginCheckin.dates.length<30 && !monthlyLoginCheckin.dates.includes(todayKey());
}

function claimMonthlyCheckinDay(){
  normalizeMonthlyLoginCheckin();
  if(!monthlyCheckinCanSign()){
    monthlyCheckinMsg=language==="en"?"Already checked in today.":"今天已经签到过了。";
    return;
  }
  const reward=monthlyCheckinRewards()[monthlyLoginCheckin.dates.length];
  grantReward(reward);
  const today=todayKey();
  monthlyLoginCheckin.dates.push(today);
  if(!monthlyLoginCheckin.totalDates.includes(today)) monthlyLoginCheckin.totalDates.push(today);
  monthlyCheckinMsg=(language==="en"?"Check-in reward: ":"签到奖励：")+rewardText(reward);
  sfx("reward");saveGame();autoCloudSaveNow(true);
}

function monthlyMilestoneCanClaim(m){
  normalizeMonthlyLoginCheckin();
  return monthlyLoginCheckin.totalDates.length>=m.days && playerLevel>=m.level && !monthlyLoginCheckin.milestones[m.id];
}

function claimMonthlyMilestone(m){
  if(!m || !monthlyMilestoneCanClaim(m)) return;
  grantReward(m.reward);monthlyLoginCheckin.milestones[m.id]=true;
  monthlyCheckinMsg=(language==="en"?"Milestone reward: ":"里程碑奖励：")+rewardText(m.reward);
  sfx("reward");saveGame();autoCloudSaveNow(true);
}

function claimLevelReward(index){
  const r = levelRewards[index];
  if(!r || r.claimed) return;
  if(playerLevel < r.lv){
    eventMsg = msg("eventLevelLow") + r.lv;
    return;
  }
  grantReward(r);
  r.claimed = true;
  eventMsg = msg("eventClaimPrefix") + rewardText(r);
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}

function updateEvent(){
  menuPulse++;
  if(clicked){
    if(inRect(58,560,220,52)){
      clickBackToLobby();
      return;
    }

    // left event list
    if(inRect(38,150,185,58)){ eventTab="login"; markUiNewSeen("event.login.v1"); }
    else if(inRect(38,220,185,58)){ eventTab="level"; markUiNewSeen("event.level.v1"); }
    else if(inRect(38,290,185,58)){ eventTab="supply"; markUiNewSeen("event.supply.v1"); }
    else if(inRect(38,360,185,58)){ eventTab="match3"; markMatch3Seen(); markUiNewSeen("event.match3.v1"); }
    else if(inRect(38,430,185,58)){ eventTab="version"; markUiNewSeen("event.version.2026072205"); }

    if(eventTab==="match3" && inRect(675,245,290,58)){
      if(window.PZMatch3) window.PZMatch3.start("campaign");
      clicked=false;
      return;
    }
    if(eventTab==="match3" && inRect(675,330,290,58)){
      if(window.PZMatch3) window.PZMatch3.start("endless");
      clicked=false;
      return;
    }

    // reward grid
    if(eventTab==="login"){
      const sx=640, sy=155, cw=118, ch=112, gap=14;
      for(let i=0;i<loginRewards.length;i++){
        const col=i%3, row=Math.floor(i/3);
        const x=sx+col*(cw+gap), y=sy+row*(ch+gap);
        if(inRect(x,y,cw,ch)){
          claimLoginReward(i);
        }
      }
    }

    if(eventTab==="level"){
      const sx=640, sy=165, cw=136, ch=112, gap=18;
      for(let i=0;i<levelRewards.length;i++){
        const col=i%2, row=Math.floor(i/2);
        const x=sx+col*(cw+gap), y=sy+row*(ch+gap);
        if(inRect(x,y,cw,ch)){
          claimLevelReward(i);
        }
      }
    }

    if(eventTab==="version"){
      const sx=630,sy=220,cw=52,gap=7;
      for(let i=0;i<7;i++) if(inRect(sx+i*(cw+gap),sy,cw,126)) claimVersionLogin(i);
    }

    if(eventTab==="supply"){
      if(inRect(640,245,315,74)){
        if(!eventClaimed){
          eventClaimed = true;
          grantReward({crystals:500,gold:3000,expBooks:6,ore:2});
          eventMsg = msg("eventSupplySuccess");
          sfx("reward");
          saveGame(); autoCloudSaveNow(true);
        }else{
          eventMsg = msg("eventSupplyClaimed");
        }
      }
    }
  }
  if(justPressed("escape")) enterLobby();
  clicked=false;
}

function drawEventPosterIllustration(kind,x,y,w,h,accent){
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  const cx=x+w*.5,cy=y+h*.57,pulse=(Math.sin(menuPulse*.035)+1)*.5;
  if(kind==="login"){
    const dawn=ctx.createLinearGradient(x,y,x+w,y+h);dawn.addColorStop(0,"rgba(255,197,109,.19)");dawn.addColorStop(1,"rgba(189,167,255,.08)");ctx.fillStyle=dawn;ctx.fillRect(x,y,w,h);
    ctx.fillStyle="rgba(255,224,102,.13)";ctx.beginPath();ctx.arc(cx,cy-60,82+pulse*8,0,Math.PI*2);ctx.fill();
    drawLisaPortrait(cx-58,cy-120,116,205,false);
    for(let i=0;i<7;i++){const bx=x+26+i*39,by=y+h-54+(i%2)*5;ctx.fillStyle=i===loginClaimIndex?"rgba(255,224,102,.28)":"rgba(255,255,255,.08)";ctx.fillRect(bx,by,31,31);ctx.strokeStyle=i===loginClaimIndex?"#ffe066":"rgba(255,255,255,.18)";ctx.strokeRect(bx,by,31,31);ctx.fillStyle="#fff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="center";ctx.fillText(String(i+1),bx+15.5,by+20);}
  }else if(kind==="level"){
    ctx.fillStyle="rgba(141,124,255,.10)";ctx.fillRect(x,y,w,h);
    for(let i=0;i<5;i++){const sw=62,sh=35+i*14,sx=x+26+i*57,sy=y+h-42-sh;ctx.fillStyle=i<=Math.floor(playerLevel/5)?"rgba(141,124,255,.32)":"rgba(255,255,255,.07)";ctx.fillRect(sx,sy,sw,sh);ctx.strokeStyle=i<=Math.floor(playerLevel/5)?"#a899ff":"rgba(255,255,255,.16)";ctx.strokeRect(sx,sy,sw,sh);ctx.fillStyle="#fff";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="center";ctx.fillText("Lv."+levelRewards[i].lv,sx+sw/2,sy+22);}
    ctx.strokeStyle="#ffe066";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+36,y+h-145);ctx.lineTo(x+w-35,y+70);ctx.stroke();ctx.fillStyle="#ffe066";ctx.beginPath();ctx.moveTo(x+w-35,y+70);ctx.lineTo(x+w-58,y+75);ctx.lineTo(x+w-40,y+93);ctx.closePath();ctx.fill();
  }else if(kind==="supply"){
    const red=ctx.createLinearGradient(x,y,x+w,y+h);red.addColorStop(0,"rgba(255,74,91,.22)");red.addColorStop(1,"rgba(255,224,102,.06)");ctx.fillStyle=red;ctx.fillRect(x,y,w,h);
    ctx.save();ctx.translate(cx,cy+12);ctx.rotate(-.08);ctx.fillStyle="#252d41";ctx.fillRect(-90,-58,180,116);ctx.strokeStyle="#ff6b78";ctx.lineWidth=4;ctx.strokeRect(-90,-58,180,116);ctx.fillStyle="#111623";ctx.fillRect(-76,-44,152,88);ctx.strokeStyle="#ffe066";ctx.beginPath();ctx.moveTo(-68,0);ctx.lineTo(68,0);ctx.stroke();ctx.fillStyle="#ffe066";ctx.fillRect(-18,-12,36,24);ctx.restore();
    ctx.fillStyle="rgba(255,107,120,"+(.10+pulse*.08)+")";for(let i=0;i<7;i++)ctx.fillRect(x+18,y+100+i*28,w-36,2);
  }else if(kind==="match3"){
    ctx.fillStyle="rgba(42,24,74,.46)";ctx.fillRect(x,y,w,h);
    const colors=["#7cc7ff","#ff6b78","#ffe066","#7cffb2","#b98cff"];const s=37,ox=cx-s*3.5,oy=cy-s*3.25;
    for(let gy=0;gy<6;gy++)for(let gx=0;gx<7;gx++){const c=colors[(gx*3+gy*2)%colors.length],px=ox+gx*s,py=oy+gy*s;ctx.fillStyle=c;ctx.globalAlpha=.72+(Math.sin(menuPulse*.04+gx+gy)+1)*.08;ctx.beginPath();ctx.moveTo(px,py-11);ctx.lineTo(px+11,py);ctx.lineTo(px,py+11);ctx.lineTo(px-11,py);ctx.closePath();ctx.fill();}
    ctx.globalAlpha=1;ctx.strokeStyle="#fff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ox+s*1,oy+s*2);ctx.lineTo(ox+s*3,oy+s*2);ctx.stroke();
  }else{
    const aurora=ctx.createLinearGradient(x,y,x+w,y+h);aurora.addColorStop(0,"rgba(124,255,178,.14)");aurora.addColorStop(.5,"rgba(124,199,255,.12)");aurora.addColorStop(1,"rgba(185,140,255,.11)");ctx.fillStyle=aurora;ctx.fillRect(x,y,w,h);
    for(let i=0;i<7;i++){const px=x+31+i*41,base=y+h-50,hh=70+(i%3)*25;ctx.fillStyle=i<versionLoginCheckin.claimedDays.length?"rgba(124,255,178,.36)":"rgba(124,199,255,.18)";ctx.beginPath();ctx.moveTo(px,base-hh);ctx.lineTo(px+13,base-hh-20);ctx.lineTo(px+26,base-hh);ctx.lineTo(px+22,base);ctx.lineTo(px+4,base);ctx.closePath();ctx.fill();ctx.strokeStyle=i===versionLoginCheckin.claimedDays.length?"#7cffb2":"rgba(255,255,255,.22)";ctx.stroke();}
  }
  ctx.restore();
}

function drawEvent(){
  const eventAccent=eventTab==="version"?"#7cffb2":eventTab==="match3"?"#7cc7ff":eventTab==="supply"?"#ff6b78":eventTab==="level"?"#8d7cff":"#ffe066";
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#151a31");
  bg.addColorStop(.48,"#0a0d18");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  // soft poster background
  ctx.globalAlpha=.9;
  const eventWash=ctx.createLinearGradient(180,80,980,600);
  eventWash.addColorStop(0,eventTab==="supply"?"rgba(255,80,95,.15)":eventTab==="level"?"rgba(141,124,255,.13)":"rgba(124,199,255,.10)");
  eventWash.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle=eventWash;
  ctx.beginPath();
  ctx.moveTo(260,80);
  ctx.lineTo(840,65);
  ctx.lineTo(1035,590);
  ctx.lineTo(180,610);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha=1;

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(24,24,1072,86);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(24,24,1072,86);

  ctx.fillStyle="#fff";
  ctx.textAlign="left";
  ctx.font="bold 34px " + FONT_UI;
  ctx.fillText(ui("event"),52,72);
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(ui("eventSubtitle"),54,96);

  // left activity list
  const list = [
    ["login",ui("loginEvent"),ui("dailyReward")],
    ["level",ui("levelEvent"),ui("growthGoal")],
    ["supply",ui("supplyEvent"),ui("oneTimeSupply")],
    ["match3",language==="en"?"X4 Match!":"消消消消乐！",language==="en"?"Match-3 Event":"消除小游戏"],
    ["version",language==="en"?"Version Sign-in":"版本签到",language==="en"?"7-day reward":"连续7日奖励"]
  ];
  for(let i=0;i<list.length;i++){
    const y=150+i*70;
    const active=eventTab===list[i][0];
    ctx.fillStyle=active?"rgba(255,224,102,.20)":"rgba(255,255,255,.065)";
    ctx.fillRect(38,y,185,58);
    ctx.strokeStyle=active?eventAccent:"rgba(255,255,255,.14)";
    ctx.strokeRect(38,y,185,58);
    ctx.fillStyle=active?eventAccent:"#fff";
    ctx.font="bold 20px " + FONT_UI;
    ctx.fillText(list[i][1],58,y+27);
    ctx.fillStyle="rgba(255,255,255,.52)";
    ctx.font="12px " + FONT_UI;
    ctx.fillText(list[i][2],58,y+47);
    const rawFresh=i===0?canClaimDailyLogin():i===1?levelRewards.some(r=>playerLevel>=r.lv&&!r.claimed):i===2?!eventClaimed:i===3?isMatch3New():canClaimVersionLogin();
    const fresh=hasUiNewDot("event."+list[i][0]+".v1",rawFresh);
    drawNewDiamond(211,y+12,fresh);
  }

  // central event poster
  const posterX=260, posterY=145, posterW=325, posterH=365;
  const posterGrad=ctx.createLinearGradient(posterX,posterY,posterX+posterW,posterY+posterH);
  posterGrad.addColorStop(0,"rgba(24,39,68,.96)"); posterGrad.addColorStop(1,"rgba(8,11,22,.98)");
  ctx.fillStyle=posterGrad;
  ctx.fillRect(posterX,posterY,posterW,posterH);
  ctx.strokeStyle=eventAccent;
  ctx.strokeRect(posterX,posterY,posterW,posterH);

  drawEventPosterIllustration(eventTab,posterX+1,posterY+1,posterW-2,posterH-2,eventAccent);

  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="bold 30px " + FONT_UI;
  const title = eventTab==="login" ? ui("loginEvent") : eventTab==="level" ? tx("rookieGrowth") : eventTab==="match3" ? (language==="en"?"X4 Match!":"消消消消乐！") : eventTab==="version"?(language==="en"?"Version Sign-in":"版本签到"):ui("supplyEvent");
  ctx.fillText(title,posterX+posterW/2,posterY+58);
  if(eventTab!=="match3" && eventTab!=="version"){
    ctx.fillStyle="rgba(255,255,255,.62)";
    ctx.font="15px " + FONT_UI;
    const sub = eventTab==="login" ? mt("eventLoginSub") : eventTab==="level" ? mt("eventLevelSub") : mt("eventSupplySub");
    ctx.fillText(sub,posterX+posterW/2,posterY+88);
  }

  // right reward panel
  const panelX=615, panelY=130, panelW=430, panelH=420;
  const eventPanelGrad=ctx.createLinearGradient(panelX,panelY,panelX+panelW,panelY+panelH);
  eventPanelGrad.addColorStop(0,"rgba(27,34,52,.98)"); eventPanelGrad.addColorStop(1,"rgba(10,13,24,.98)");
  ctx.fillStyle=eventPanelGrad;
  ctx.fillRect(panelX,panelY,panelW,panelH);
  ctx.strokeStyle="rgba(124,199,255,.32)";
  ctx.strokeRect(panelX,panelY,panelW,panelH);
  ctx.fillStyle=eventAccent; ctx.fillRect(panelX,panelY,5,panelH);

  ctx.textAlign="left";
  ctx.fillStyle="#fff";
  ctx.font="bold 25px " + FONT_UI;
  ctx.fillText(eventTab==="login"?mt("eventPanelLoginTitle"):eventTab==="level"?mt("eventPanelLevelTitle"):eventTab==="match3"?(language==="en"?"X4 Match!":"消消消消乐！"):eventTab==="version"?(language==="en"?"7-DAY VERSION LOGIN":"7日版本签到"):mt("eventPanelSupplyTitle"),panelX+25,panelY+40);
  ctx.fillStyle="rgba(255,255,255,.58)";
  ctx.font="13px " + FONT_UI;
  const eventPanelHint = eventTab==="match3" ? "" : (eventMsg || (eventTab==="login" ? (canClaimDailyLogin() ? mt("dailyCheckAvailable") : mt("claimedTodayComeTomorrow")) : mt("eventDefaultHint")));
  if(eventPanelHint) ctx.fillText(eventPanelHint,panelX+25,panelY+64);

  if(eventTab==="login"){
    const sx=640, sy=155, cw=118, ch=112, gap=14;
    for(let i=0;i<loginRewards.length;i++){
      const r=loginRewards[i];
      const col=i%3, row=Math.floor(i/3);
      const x=sx+col*(cw+gap), y=sy+row*(ch+gap);
      const claimed=i < loginClaimIndex || r.claimed;
      const current=i===loginClaimIndex;
      const locked=i>loginClaimIndex;
      const todayClaimed=lastLoginClaimDate===todayKey();
      const canClaim=current && !todayClaimed;
      ctx.fillStyle=claimed?"rgba(255,255,255,.055)":canClaim?"rgba(255,224,102,.16)":"rgba(255,255,255,.075)";
      ctx.fillRect(x,y,cw,ch);
      ctx.strokeStyle=canClaim?"rgba(255,224,102,.55)":claimed?"rgba(255,255,255,.12)":"rgba(255,255,255,.14)";
      ctx.strokeRect(x,y,cw,ch);
      ctx.textAlign="center";
      ctx.fillStyle=claimed?"rgba(255,255,255,.45)":"#ffe066";
      ctx.font="bold 16px " + FONT_UI;
      ctx.fillText(ui("day")+(i+1)+ui("daySuffix"),x+cw/2,y+25);
      ctx.fillStyle="#fff";
      ctx.font="13px " + FONT_UI;
      ctx.fillText(rewardText(r).split(" / ")[0] || mt("rewardWord"),x+cw/2,y+57);
      ctx.fillStyle=claimed?"rgba(255,255,255,.38)":canClaim?"#fff":"rgba(255,255,255,.45)";
      ctx.font="12px " + FONT_UI;
      let status = claimed ? ui("claimed") : canClaim ? ui("claim") : locked ? ui("locked") : mt("tomorrowAgain");
      ctx.fillText(status,x+cw/2,y+91);
    }
  }

  if(eventTab==="level"){
    const sx=640, sy=165, cw=136, ch=112, gap=18;
    for(let i=0;i<levelRewards.length;i++){
      const r=levelRewards[i];
      const col=i%2, row=Math.floor(i/2);
      const x=sx+col*(cw+gap), y=sy+row*(ch+gap);
      const can=playerLevel>=r.lv && !r.claimed;
      ctx.fillStyle=r.claimed?"rgba(255,255,255,.055)":can?"rgba(124,199,255,.16)":"rgba(255,255,255,.075)";
      ctx.fillRect(x,y,cw,ch);
      ctx.strokeStyle=can?"rgba(124,199,255,.55)":"rgba(255,255,255,.13)";
      ctx.strokeRect(x,y,cw,ch);
      ctx.textAlign="center";
      ctx.fillStyle=can?"#7cc7ff":"rgba(255,255,255,.62)";
      ctx.font="bold 16px " + FONT_UI;
      ctx.fillText("Lv."+r.lv,x+cw/2,y+25);
      ctx.fillStyle="#fff";
      ctx.font="13px " + FONT_UI;
      ctx.fillText(rewardText(r).split(" / ")[0] || mt("rewardWord"),x+cw/2,y+57);
      ctx.fillStyle=r.claimed?"rgba(255,255,255,.38)":can?"#fff":"rgba(255,255,255,.45)";
      ctx.font="12px " + FONT_UI;
      ctx.fillText(r.claimed?ui("claimed"):can?ui("claim"):ui("notReached"),x+cw/2,y+91);
    }
  }

  if(eventTab==="supply"){
    ctx.fillStyle=eventClaimed?"rgba(255,255,255,.06)":"rgba(255,224,102,.16)";
    ctx.fillRect(640,245,315,74);
    ctx.strokeStyle=eventClaimed?"rgba(255,255,255,.12)":"rgba(255,224,102,.5)";
    ctx.strokeRect(640,245,315,74);
    ctx.textAlign="left";
    ctx.fillStyle="#fff";
    ctx.font="bold 20px " + FONT_UI;
    ctx.fillText(mt("starterSupply"),665,275);
    ctx.fillStyle="rgba(255,255,255,.62)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(mt("starterSupplyReward"),665,300);
    ctx.textAlign="right";
    ctx.fillStyle=eventClaimed?"rgba(255,255,255,.45)":"#ffe066";
    ctx.font="bold 16px " + FONT_UI;
    ctx.fillText(eventClaimed?ui("claimed"):ui("claim"),930,289);
  }

  if(eventTab==="match3"){
    ctx.fillStyle="rgba(124,199,255,.10)";ctx.fillRect(650,205,360,205);
    ctx.strokeStyle="rgba(124,199,255,.32)";ctx.strokeRect(650,205,360,205);
    ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="14px "+FONT_UI;ctx.textAlign="left";
    ctx.fillText(language==="en"?"Choose a mode":"选择玩法模式",680,232);
    drawBtn(language==="en"?"Stage Mode":"关卡模式",language==="en"?"20 STAGES":"20关",675,245,290,58,true,"#ffe066");
    drawBtn(language==="en"?"Endless Mode":"无尽模式",language==="en"?"INFINITE":"无限",675,330,290,58,true,"#7cc7ff");
    const ms=window.PZMatch3&&window.PZMatch3.rewardSummary?window.PZMatch3.rewardSummary():{campaign:0,endless:0,total:3000};
    ctx.fillStyle="rgba(124,255,178,.75)";ctx.font="12px "+FONT_UI;ctx.textAlign="left";
    ctx.fillText((language==="en"?"One-time rewards: ":"一次性奖励：")+(language==="en"?"Stage ":"关卡 ")+ms.campaign+"/20 · "+(language==="en"?"Endless ":"无尽 ")+ms.endless+"/4 · "+(language==="en"?"Total 3,000 Crystals":"总计3000水晶"),660,438);
  }

  if(eventTab==="version"){
    const rewards=versionLoginRewards(),sx=630,sy=220,cw=52,gap=7;
    ctx.fillStyle="rgba(124,255,178,.08)";ctx.fillRect(630,175,405,205);
    ctx.strokeStyle="rgba(124,255,178,.28)";ctx.strokeRect(630,175,405,205);
    ctx.fillStyle="rgba(255,255,255,.65)";ctx.font="13px "+FONT_UI;ctx.textAlign="left";
    ctx.fillText(language==="en"?"Sign in once per day. Total: 1,100 Crystals":"每日登录领取一次，总计 1100 水晶",650,202);
    for(let i=0;i<7;i++){
      const x=sx+i*(cw+gap),claimed=versionLoginCheckin.claimedDays.includes(i),current=i===versionLoginCheckin.claimedDays.length&&canClaimVersionLogin();
      ctx.fillStyle=claimed?"rgba(255,255,255,.06)":current?"rgba(124,255,178,.22)":"rgba(255,255,255,.09)";ctx.fillRect(x,sy,cw,126);
      ctx.strokeStyle=current?"#7cffb2":"rgba(255,255,255,.15)";ctx.strokeRect(x,sy,cw,126);
      ctx.textAlign="center";ctx.fillStyle=claimed?"rgba(255,255,255,.4)":"#fff";ctx.font="bold 12px "+FONT_UI;ctx.fillText((language==="en"?"D":"第")+(i+1),x+cw/2,sy+24);
      ctx.fillStyle="#7cc7ff";ctx.font="bold 13px Arial";ctx.fillText("◆"+rewards[i],x+cw/2,sy+61);
      ctx.fillStyle=current?"#7cffb2":"rgba(255,255,255,.45)";ctx.font="11px "+FONT_UI;ctx.fillText(claimed?(language==="en"?"DONE":"已领"):current?(language==="en"?"CLAIM":"领取"):(language==="en"?"LOCK":"未到"),x+cw/2,sy+104);
    }
  }

  drawBtn(ui("backLobby"),"ESC",58,560,220,52);
}

function drawNameInput(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#050711");
  bg.addColorStop(.5,"#10172a");
  bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  for(let i=0;i<34;i++){
    const x=(i*113 + menuPulse*.22)%W;
    const y=80 + ((i*67 + menuPulse*.12)%(H-160));
    ctx.globalAlpha=.12;
    ctx.fillStyle=i%2?"#7cc7ff":"#ffffff";
    ctx.beginPath();
    ctx.arc(x,y,1.3+(i%3),0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1;

  ctx.textAlign="center";
  ctx.save();
  ctx.shadowBlur=26;
  ctx.shadowColor="#7cc7ff";
  ctx.fillStyle="#ffffff";
  ctx.font="bold 48px " + FONT_UI;
  ctx.fillText(language==="en"?"WELCOME TO RAVENHADO":"欢迎来到雷文哈多",W/2,132);
  ctx.restore();

  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="18px " + FONT_UI;
  ctx.fillText(tx("nameInputTitle"),W/2,190);

  const panelX=W/2-260, panelY=225, panelW=520, panelH=235;
  ctx.fillStyle="rgba(0,0,0,.36)";
  ctx.fillRect(panelX,panelY,panelW,panelH);
  ctx.strokeStyle="rgba(124,199,255,.32)";
  ctx.strokeRect(panelX,panelY,panelW,panelH);

  const boxX=W/2-190, boxY=panelY+58, boxW=380, boxH=58;
  ctx.fillStyle="rgba(255,255,255,.07)";
  ctx.fillRect(boxX,boxY,boxW,boxH);
  ctx.strokeStyle=validPlayerName(cleanPlayerName(nameInput))?"rgba(255,224,102,.85)":"rgba(124,199,255,.75)";
  ctx.lineWidth=2;
  ctx.strokeRect(boxX,boxY,boxW,boxH);

  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  const blink = Math.floor(menuPulse/28)%2===0 ? "|" : "";
  ctx.fillText((nameInput || "") + blink, W/2, boxY+38);

  ctx.fillStyle="rgba(255,255,255,.48)";
  ctx.font="13px " + FONT_UI;
  ctx.fillText(tx("nameInputHint"), W/2, boxY+84);

  ctx.fillStyle="rgba(255,255,255,.58)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en" ? "Your name will be used in story dialogue and character information." : "你的名字将用于剧情对话和角色信息。",W/2,panelY+170);

  if(nameError){
    ctx.fillStyle="#ff7777";
    ctx.font="15px " + FONT_UI;
    ctx.fillText(nameError,W/2,panelY+202);
  }

  const canConfirm = validPlayerName(cleanPlayerName(nameInput));
  drawBtn(language==="en"?"Begin Journey":"开始旅途","ENTER",W/2-160,H/2+160,320,52,canConfirm,"#ffe066");

  ctx.fillStyle="rgba(255,255,255,.52)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText("Salt Fish Studio",W/2,H-62);

  ctx.fillStyle="rgba(255,255,255,.45)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(language==="en" ? "This step cannot be skipped." : "该步骤不可跳过。", W/2, H/2+222);
}

function drawDeletionPeriodPrompt(){
  ctx.fillStyle="rgba(3,6,14,.88)";
  ctx.fillRect(0,0,W,H);
  const boxW=440, boxH=250, boxX=W/2-boxW/2, boxY=H/2-boxH/2;
  ctx.fillStyle="rgba(20,27,45,.98)";
  ctx.fillRect(boxX,boxY,boxW,boxH);
  ctx.strokeStyle="rgba(124,199,255,.72)";
  ctx.lineWidth=2;
  ctx.strokeRect(boxX,boxY,boxW,boxH);
  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="bold 27px " + FONT_UI;
  ctx.fillText(language==="en"?"Account is still in the deletion period":"账号仍处于注销期",W/2,boxY+65);
  ctx.fillStyle="rgba(255,255,255,.7)";
  ctx.font="15px " + FONT_UI;
  const remain = deletionScheduledAtMs ? Math.max(0,Math.ceil((deletionScheduledAtMs-Date.now())/(24*60*60*1000))) : DELETE_GRACE_DAYS;
  ctx.fillText(language==="en"?("About "+remain+" day(s) remain. Cancel deletion to continue playing."):("注销期尚余约"+remain+"天。取消后可正常进入游戏。"),W/2,boxY+110);
  drawBtn(language==="en"?"Cancel Deletion":"取消注销","",W/2-175,H/2+95,165,48,false,"#7cc7ff");
  drawBtn(language==="en"?"Never Mind":"算了","",W/2+10,H/2+95,165,48,false,"#ff9999");
}

function drawGuestCloudOverwritePrompt(){
  ctx.fillStyle="rgba(3,6,14,.90)";
  ctx.fillRect(0,0,W,H);
  const boxW=500,boxH=280,boxX=W/2-boxW/2,boxY=H/2-boxH/2;
  ctx.fillStyle="rgba(14,22,40,.985)";
  ctx.fillRect(boxX,boxY,boxW,boxH);
  ctx.strokeStyle="rgba(255,224,102,.78)";
  ctx.lineWidth=2;
  ctx.strokeRect(boxX,boxY,boxW,boxH);
  ctx.fillStyle="#ffe066";
  ctx.fillRect(boxX,boxY,7,boxH);
  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="bold 27px "+FONT_UI;
  ctx.fillText(tr("是否载入云端存档？","Load Cloud Save?"),W/2,boxY+58);
  ctx.fillStyle="rgba(255,255,255,.76)";
  ctx.font="15px "+FONT_UI;
  ctx.fillText(tr("该账号的云端进度将覆盖当前游客进度。","This account's cloud progress will replace the current guest progress."),W/2,boxY+105);
  ctx.fillStyle="rgba(255,170,170,.82)";
  ctx.font="13px "+FONT_UI;
  ctx.fillText(tr("账号存档成功载入后，当前游客存档将被清除。","The current guest save will be removed after the account loads successfully."),W/2,boxY+137);
  drawBtn(tr("确认登录","Continue"),"ENTER",W/2-175,H/2+95,165,48,false,"#ffe066");
  drawBtn(tr("取消","Cancel"),"ESC",W/2+10,H/2+95,165,48,false,"#9aa7bd");
}

function drawLogin(){
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#070a16");
  bg.addColorStop(.58,"#10172a");
  bg.addColorStop(1,"#04050b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  for(let i=0;i<38;i++){
    const x=(i*97 + menuPulse*0.35)%W;
    const y=70 + ((i*53 + menuPulse*0.18)%(H-140));
    ctx.globalAlpha=.16;
    ctx.fillStyle=i%3===0?"#7cc7ff":i%3===1?"#ffe066":"#ffffff";
    ctx.beginPath();
    ctx.arc(x,y,1.4+(i%3),0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1;
  ctx.textAlign="center";

  ctx.save();
  ctx.shadowBlur=34;
  ctx.shadowColor="#7cc7ff";
  ctx.fillStyle="#ffffff";
  ctx.font="bold 68px " + FONT_UI;
  ctx.fillText("PROJECT ZERO",W/2,H/2-92);
  ctx.restore();

  function drawLoginSettingsIcon(){
    const cx=W-54,cy=H-54;
    ctx.save();
    ctx.fillStyle="rgba(8,12,25,.72)";
    ctx.strokeStyle="rgba(124,199,255,.62)";
    ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(cx,cy,27,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.translate(cx,cy);
    ctx.strokeStyle="rgba(255,255,255,.88)";
    ctx.lineWidth=3;
    for(let i=0;i<8;i++){
      ctx.rotate(Math.PI/4);
      ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(0,-20);ctx.stroke();
    }
    ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fillStyle="#7cc7ff";ctx.fill();
    ctx.restore();
  }

  if(cloudUser){
    if(deletionPromptActive){
      drawDeletionPeriodPrompt();
      return;
    }
    const pulse=.58 + Math.sin(menuPulse/20)*.28;
    ctx.globalAlpha=pulse;
    ctx.fillStyle="#ffe066";
    ctx.font="bold 26px " + FONT_UI;
    ctx.fillText(tr("点击开始","Tap To Start"),W/2,H/2+18);
    ctx.globalAlpha=1;

    ctx.fillStyle="rgba(255,255,255,.58)";
    ctx.font="15px " + FONT_UI;
    ctx.fillText(cloudUser.email || cloudTx("cloudLoggedIn"),W/2,H/2+62);

    ctx.fillStyle="rgba(255,255,255,.58)";
    ctx.font="15px " + FONT_UI;
    ctx.fillText(accountMsg || cloudSyncStatus || "Salt Fish Studio", W/2, H-70);
    ctx.fillStyle="rgba(255,255,255,.32)";
    ctx.font="12px " + FONT_UI;
    ctx.fillText(tr("已登录账号 / 点击开始进入游戏","Signed in / Tap to start"),W/2,H-38);
    drawLoginSettingsIcon();
    return;
  }

  if(guestMode && hasCreatedProfile && validPlayerName(playerName)){
    const pulse=.58 + Math.sin(menuPulse/20)*.28;
    ctx.globalAlpha=pulse;
    ctx.fillStyle="#ffe066";
    ctx.font="bold 26px " + FONT_UI;
    ctx.fillText(tr("点击开始","Tap To Start"),W/2,H/2+18);
    ctx.globalAlpha=1;
    ctx.fillStyle="rgba(255,255,255,.66)";
    ctx.font="15px " + FONT_UI;
    ctx.fillText((playerName||"PLAYER")+"  ·  "+tr("游客本地存档","Local Guest Save"),W/2,H/2+62);
    ctx.fillStyle="rgba(255,255,255,.48)";
    ctx.fillText(accountMsg || tr("游客进度已保存在此设备","Guest progress is saved on this device"),W/2,H-70);
    ctx.fillStyle="rgba(255,255,255,.32)";
    ctx.font="12px " + FONT_UI;
    ctx.fillText(tr("本地游客 / 点击开始进入游戏","Local guest / Tap to start"),W/2,H-38);
    drawLoginSettingsIcon();
    return;
  }

  const panelX=W/2-210, panelY=165, panelW=420, panelH=360;
  ctx.fillStyle="rgba(0,0,0,.36)";
  ctx.fillRect(panelX,panelY,panelW,panelH);
  ctx.strokeStyle="rgba(124,199,255,.38)";
  ctx.lineWidth=2;
  ctx.strokeRect(panelX,panelY,panelW,panelH);
  drawLoginSettingsIcon();

  ctx.fillStyle="#fff";
  ctx.font="bold 25px " + FONT_UI;
  ctx.fillText(accountMode==="register" ? accTx("registerTitle") : accTx("loginTitle"), W/2, panelY+48);

  ctx.textAlign="left";
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(accTx("email"), panelX+48, panelY+92);
  ctx.fillText(accTx("password"), panelX+48, panelY+164);

  const emailActive = accountFocusedField === "email";
  const passActive = accountFocusedField === "password";
  ctx.fillStyle="rgba(255,255,255,.08)";
  ctx.fillRect(panelX+45,panelY+103,330,44);
  ctx.fillRect(panelX+45,panelY+175,330,44);
  ctx.strokeStyle=emailActive ? "rgba(124,199,255,.85)" : "rgba(255,255,255,.20)";
  ctx.lineWidth=emailActive ? 2 : 1;
  ctx.strokeRect(panelX+45,panelY+103,330,44);
  ctx.strokeStyle=passActive ? "rgba(124,199,255,.85)" : "rgba(255,255,255,.20)";
  ctx.lineWidth=passActive ? 2 : 1;
  ctx.strokeRect(panelX+45,panelY+175,330,44);
  ctx.lineWidth=1;

  ctx.fillStyle=accountEmail ? "#fff" : "rgba(255,255,255,.42)";
  ctx.font="16px " + FONT_UI;
  const emailText = accountEmail || accTx("enterEmail");
  ctx.fillText(emailText, panelX+60, panelY+132);
  ctx.fillStyle=accountPassword ? "#fff" : "rgba(255,255,255,.42)";
  const passText = accountPassword ? "●".repeat(Math.min(16,accountPassword.length)) : accTx("enterPassword");
  ctx.fillText(passText, panelX+60, panelY+204);
  if(Math.floor(performance.now()/480)%2===0){
    ctx.fillStyle="rgba(124,199,255,.95)";
    if(emailActive){
      const w=accountEmail ? ctx.measureText(accountEmail).width : 0;
      ctx.fillRect(panelX+60+w+2,panelY+114,2,22);
    }else if(passActive){
      const w=accountPassword ? ctx.measureText("●".repeat(Math.min(16,accountPassword.length))).width : 0;
      ctx.fillRect(panelX+60+w+2,panelY+186,2,22);
    }
  }

  drawBtn(accountMode==="register" ? accTx("register") : accTx("login"), accountBusy?"...":"", panelX+70, panelY+245, 280, 48, true, "#ffe066");
  drawBtn(accountMode==="register" ? accTx("haveAccount") : accTx("noAccount"), "", panelX+70, panelY+300, 280, 38, false, "#7cc7ff");

  ctx.textAlign="center";
  ctx.fillStyle="rgba(255,255,255,.58)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(accountMsg || cloudSyncStatus || "Salt Fish Studio", W/2, H-70);
  ctx.fillStyle="rgba(255,255,255,.36)";
  ctx.font="12px " + FONT_UI;
  ctx.fillText(accTx("guest"), W/2, H-38);
  if(guestCloudOverwritePromptActive)drawGuestCloudOverwritePrompt();
}

function drawAchievementMiniButton(){
  const unclaimed = ACHIEVEMENT_LIST.filter(a=>achievements[a.id] && !achievements[a.id].claimed).length;
  const x = W - 62, y = 24, r = 22;
  const hover = dist(mouseX, mouseY, x, y) < r + 6;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = hover ? "rgba(255,224,102,.30)" : "rgba(255,224,102,.16)";
  ctx.fill();
  ctx.lineWidth = hover ? 2 : 1;
  ctx.strokeStyle = hover ? "rgba(255,224,102,.95)" : "rgba(255,224,102,.58)";
  ctx.stroke();

  // Vector trophy icon, avoids emoji/font rendering issues
  ctx.strokeStyle = "#ffe066";
  ctx.fillStyle = "#ffe066";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x-9,y-10,18,14,3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x-5,y+4); ctx.lineTo(x-2,y+11); ctx.lineTo(x+2,y+11); ctx.lineTo(x+5,y+4);
  ctx.stroke();
  ctx.fillRect(x-8,y+12,16,3);
  ctx.beginPath();
  ctx.arc(x-12,y-4,5,Math.PI*.5,Math.PI*1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x+12,y-4,5,Math.PI*1.45,Math.PI*.5);
  ctx.stroke();

  if(unclaimed>0){
    ctx.beginPath();
    ctx.arc(x+17, y-15, 9, 0, Math.PI*2);
    ctx.fillStyle = "#ff5757";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    setFont(11,"bold");
    ctx.fillText(String(Math.min(unclaimed,9)), x+17, y-15);
  }

  if(hover){
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(0,0,0,.66)";
    ctx.fillRect(W-190, 54, 150, 30);
    ctx.strokeStyle = "rgba(255,224,102,.35)";
    ctx.strokeRect(W-190, 54, 150, 30);
    ctx.fillStyle = "#ffe066";
    setFont(13,"bold");
    ctx.textAlign = "center";
    ctx.fillText(ui("achievement"), W-115, 74);
  }

  ctx.restore();
}


function roleTeamSlot(roleIndex){
  for(let i=0;i<team.length;i++){
    if(team[i]===roleIndex) return i;
  }
  return -1;
}

function normalizeBattleTeam(value,fallback=[PROTAGONIST_ROLE]){
  const source=Array.isArray(value)?value:fallback;
  const out=[];
  for(const raw of source){
    const role=Math.floor(Number(raw));
    if(!Number.isFinite(role)||role<0||role>=roles.length||out.includes(role)) continue;
    if(Array.isArray(owned)&&!owned[role]) continue;
    out.push(role);
    if(out.length>=3) break;
  }
  if(!out.length){
    const safe=(Array.isArray(fallback)?fallback:[PROTAGONIST_ROLE]).find(v=>Number.isInteger(v)&&v>=0&&v<roles.length&&(!Array.isArray(owned)||owned[v]));
    out.push(Number.isInteger(safe)?safe:PROTAGONIST_ROLE);
  }
  return out;
}

function normalizeTeamPresets(value){
  const defaults=[[PROTAGONIST_ROLE,1,2],[PROTAGONIST_ROLE],[0,2],[1,2]];
  const source=Array.isArray(value)?value:defaults;
  const result=[];
  for(let i=0;i<4;i++) result.push(normalizeBattleTeam(source[i],defaults[i]));
  return result;
}

function normalizeTeamPresetNames(value){
  const source=Array.isArray(value)?value:[];
  return Array.from({length:4},(_,i)=>String(source[i]||"").replace(/[\r\n\t]/g,"").trim().slice(0,16));
}

function teamPresetDisplayName(index){
  teamPresetNames=normalizeTeamPresetNames(teamPresetNames);
  return teamPresetNames[index] || (language==="en"?("Team "+(index+1)):("队伍 "+(index+1)));
}

function beginTeamPresetRename(index){
  teamRenamePreset=clamp(Math.floor(index),0,3);
  teamPresetNames=normalizeTeamPresetNames(teamPresetNames);
  teamRenameDraft=teamPresetNames[teamRenamePreset] || teamPresetDisplayName(teamRenamePreset);
  teamRenameReplaceOnType=true;
  const input=ensurePZHiddenTextInput();
  input.maxLength=16;
  input.value=teamRenameDraft;
  try{input.focus({preventScroll:true});input.select();}catch(e){input.focus();}
  sfx("ui");
}

function commitTeamPresetRename(){
  if(teamRenamePreset<0)return;
  const slot=teamRenamePreset;
  const value=String(teamRenameDraft||"").replace(/[\r\n\t]/g,"").trim().slice(0,16);
  if(!checkWritableText(value).ok){textSafetyWarning();return;}
  teamPresetNames=normalizeTeamPresetNames(teamPresetNames);
  teamPresetNames[slot]=value;
  teamRenamePreset=-1;teamRenameDraft="";teamRenameReplaceOnType=false;
  if(pzHiddenTextInput)pzHiddenTextInput.blur();
  syncNameInputFocus();
  saveGame();autoCloudSaveNow(true);sfx("ui");
  showCenter(language==="en"?"Team name saved":"队伍名称已保存",45);
}

function cancelTeamPresetRename(){
  teamRenamePreset=-1;teamRenameDraft="";teamRenameReplaceOnType=false;
  if(pzHiddenTextInput)pzHiddenTextInput.blur();
  syncNameInputFocus();
}

function saveCurrentTeamPreset(index){
  const slot=clamp(Math.floor(index),0,3);
  team=normalizeBattleTeam(team);
  teamPresets=normalizeTeamPresets(teamPresets);
  teamPresets[slot]=team.slice();
  saveGame();
  autoCloudSaveNow(true);
  sfx("ui");
  showCenter(language==="en"?("Team "+(slot+1)+" saved"):("队伍 "+(slot+1)+" 已保存"),55);
}

function loadTeamPreset(index){
  const slot=clamp(Math.floor(index),0,3);
  teamPresets=normalizeTeamPresets(teamPresets);
  team=normalizeBattleTeam(teamPresets[slot]);
  teamSelectSlot=Math.min(team.length,2);
  saveGame();
  sfx("ui");
  showCenter(language==="en"?("Team "+(slot+1)+" loaded"):("已载入队伍 "+(slot+1)),45);
}


function drawFloraLobbyPortraitCentered(){
  return false;
}

function drawHermitPortrait(x,y,w,h,variant="full"){
  if(!hermitPortraitReady || !hermitPortraitImg.width) return false;
  // One original illustration, three layouts: a bottom-anchored lobby half-body,
  // a close vertical card portrait, and a complete detail-page composition.
  const source = variant==="card"
    ? {x:420,y:385,w:540,h:968}
    : {x:205,y:330,w:1000,h:1305};
  const scale=Math.min(w/source.w,h/source.h);
  const dw=source.w*scale,dh=source.h*scale;
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(hermitPortraitImg,source.x,source.y,source.w,source.h,x+(w-dw)/2,y+(h-dh)/2,dw,dh);
  ctx.restore();
  return true;
}

function drawLobbyHermitPortrait(){
  const cx=W/2-100;
  ctx.save();
  // Restore the earlier character scale without bringing back a rectangular crop.
  // The full source is rendered into a tall layer whose sides dissolve naturally;
  // its top and bottom remain outside the visible game area.
  if(!hermitLobbyBorderlessLayer){
    const layer=document.createElement("canvas");
    layer.width=840;layer.height=1208;
    const lctx=layer.getContext("2d");
    lctx.imageSmoothingEnabled=true;lctx.imageSmoothingQuality="high";
    lctx.drawImage(hermitPortraitImg,0,0,1423,2048,0,0,840,1208);
    lctx.globalCompositeOperation="destination-in";
    const dissolve=lctx.createLinearGradient(0,0,840,0);
    dissolve.addColorStop(0,"rgba(255,255,255,0)");
    dissolve.addColorStop(.12,"rgba(255,255,255,1)");
    dissolve.addColorStop(.88,"rgba(255,255,255,1)");
    dissolve.addColorStop(1,"rgba(255,255,255,0)");
    lctx.fillStyle=dissolve;lctx.fillRect(0,0,840,1208);
    hermitLobbyBorderlessLayer=layer;
  }
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(hermitLobbyBorderlessLayer,cx-420,-170);
  ctx.restore();
}

function drawLobbyPlaceholderRole(i){
  const role=roles[i] || roles[0];
  ctx.save();
  ctx.translate(W/2-100,H/2+30);
  ctx.fillStyle="rgba(255,80,80,.12)";
  ctx.beginPath(); ctx.ellipse(0,115,120,35,0,0,Math.PI*2); ctx.fill();

  ctx.save();
  ctx.shadowBlur=35;
  ctx.shadowColor=role.color;
  ctx.fillStyle=role.color;
  ctx.beginPath(); ctx.ellipse(0,20,40,95,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.fillStyle=role.sub;
  ctx.beginPath(); ctx.arc(0,-85,31,0,Math.PI*2); ctx.fill();

  ctx.strokeStyle=role.sub;
  ctx.lineWidth=10;
  ctx.lineCap="round";
  ctx.beginPath(); ctx.moveTo(32,-10); ctx.lineTo(86,-88); ctx.stroke();

  ctx.strokeStyle="rgba(255,80,80,.25)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,10,64,0,Math.PI*2); ctx.stroke();

  ctx.restore();
}

function drawLobbyExecutor(){
  if(lobbyExecutor===PROTAGONIST_ROLE && hermitPortraitReady){
    drawLobbyHermitPortrait();
    return;
  }
  ctx.save();
  ctx.translate(W/2-100,H/2+30);
  ctx.scale(1.14,1.14);
  ctx.translate(-(W/2-100),-(H/2+30));
  if(lobbyExecutor === 3 && drawFloraLobbyPortraitCentered()){
    ctx.save();
    ctx.fillStyle="#fff";
    ctx.font="bold 28px " + FONT_UI;
    ctx.textAlign="center";
    ctx.fillText(roleName(3), W/2-100, H/2+196);
    ctx.fillStyle="rgba(255,255,255,.68)";
    ctx.font="16px " + FONT_UI;
    ctx.fillText(roleStyle(3), W/2-100, H/2+226);
    ctx.restore();
  }else{
    drawLobbyPlaceholderRole(lobbyExecutor);
  }
  ctx.restore();
}

function nextLobbyRole(){
  for(let step=1; step<=roles.length; step++){
    const idx=(lobbyExecutor+step)%roles.length;
    if(owned[idx]){
      lobbyExecutor=idx;
      selectedOperator=idx;
      saveGame();
      showLobbyDialogue("switch");
      return;
    }
  }
}

const LOBBY_BACKGROUND_THEMES = [
  {id:"raven",zh:"雷文哈多",en:"Ravenhado",accent:"#7cc7ff",a:"#17274d",b:"#070b18"},
  {id:"night",zh:"深夜值守",en:"Night Watch",accent:"#88a7ff",a:"#111a38",b:"#02040c"},
  {id:"crystal",zh:"晶体回响",en:"Crystal Echo",accent:"#c38cff",a:"#281947",b:"#080615"},
  {id:"zero",zh:"灰白边界",en:"Zero Boundary",accent:"#e6edf5",a:"#353b46",b:"#08090c"}
];

function openLobbyAssistantSelector(){
  lobbyAssistantSelectorOpen=true;lobbyAssistantSelectorTab="executor";
  lobbyAssistantPreviewRole=lobbyExecutor;lobbyBackgroundPreviewTheme=lobbyBackgroundTheme;
  lobbyDialogueText="";clicked=false;sfx("ui");
}

function closeLobbyAssistantSelector(){lobbyAssistantSelectorOpen=false;clicked=false;}

function applyLobbyAssistantSelection(){
  if(owned[lobbyAssistantPreviewRole]){lobbyExecutor=lobbyAssistantPreviewRole;selectedOperator=lobbyExecutor;}
  lobbyBackgroundTheme=lobbyBackgroundPreviewTheme;
  saveGame();autoCloudSaveNow(true);closeLobbyAssistantSelector();showLobbyDialogue("switch");sfx("reward");
}

function updateLobbyAssistantSelector(){
  if(justPressed("escape")){closeLobbyAssistantSelector();return;}
  if(!clicked)return;
  if(inRect(1024,48,48,48)){closeLobbyAssistantSelector();return;}
  if(inRect(70,92,170,44)){lobbyAssistantSelectorTab="executor";clicked=false;return;}
  if(inRect(252,92,170,44)){lobbyAssistantSelectorTab="background";clicked=false;return;}
  if(lobbyAssistantSelectorTab==="executor"){
    for(let i=0;i<roles.length;i++){
      if(inRect(62+i*174,174,156,265)){
        if(owned[i]){lobbyAssistantPreviewRole=i;sfx("ui");}
        else showCenter(language==="en"?"Operator not obtained":"尚未获得该执行官",60);
        clicked=false;return;
      }
    }
  }else{
    for(let i=0;i<LOBBY_BACKGROUND_THEMES.length;i++){
      const x=72+(i%2)*338,y=180+Math.floor(i/2)*145;
      if(inRect(x,y,312,118)){lobbyBackgroundPreviewTheme=LOBBY_BACKGROUND_THEMES[i].id;sfx("ui");clicked=false;return;}
    }
  }
  if(inRect(790,550,250,54)){applyLobbyAssistantSelection();return;}
  if(inRect(590,550,180,54)){closeLobbyAssistantSelector();return;}
  clicked=false;
}

function drawLobbyThemeEffect(themeId=lobbyBackgroundTheme){
  const theme=LOBBY_BACKGROUND_THEMES.find(v=>v.id===themeId)||LOBBY_BACKGROUND_THEMES[0];
  if(theme.id==="raven")return;
  ctx.save();
  const tint=ctx.createLinearGradient(0,0,W,H);tint.addColorStop(0,theme.a+"66");tint.addColorStop(1,theme.b+"88");ctx.fillStyle=tint;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=theme.id==="zero"?.11:.16;ctx.strokeStyle=theme.accent;ctx.lineWidth=2;
  for(let i=0;i<9;i++){const x=80+i*145,y=100+(i%4)*125;ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.strokeRect(-18,-18,36,36);ctx.restore();}
  ctx.restore();
}

function drawLobbyAssistantSelector(){
  if(!lobbyAssistantSelectorOpen)return;
  ctx.save();ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(0,0,W,H);
  const x=38,y=30,w=1044,h=600,theme=LOBBY_BACKGROUND_THEMES.find(v=>v.id===lobbyBackgroundPreviewTheme)||LOBBY_BACKGROUND_THEMES[0];
  const shell=ctx.createLinearGradient(x,y,x+w,y+h);shell.addColorStop(0,"rgba(21,29,48,.99)");shell.addColorStop(1,"rgba(5,8,15,.99)");ctx.beginPath();ctx.roundRect(x,y,w,h,18);ctx.fillStyle=shell;ctx.fill();ctx.strokeStyle="rgba(124,199,255,.38)";ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle="#fff";ctx.font="bold 28px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"LOBBY DISPLAY":"大厅展示",70,72);
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"Choose the displayed executor and lobby atmosphere":"选择大厅展示执行官与背景氛围",70,91);
  const tabs=[["executor",language==="en"?"EXECUTOR":"执行官"],["background",language==="en"?"BACKGROUND":"背景"]];
  for(let i=0;i<tabs.length;i++){const xx=70+i*182,sel=lobbyAssistantSelectorTab===tabs[i][0];ctx.fillStyle=sel?"rgba(124,199,255,.20)":"rgba(255,255,255,.06)";ctx.fillRect(xx,104,170,44);ctx.strokeStyle=sel?"#7cc7ff":"rgba(255,255,255,.15)";ctx.strokeRect(xx,104,170,44);ctx.fillStyle=sel?"#7cc7ff":"#fff";ctx.font="bold 14px "+FONT_UI;ctx.textAlign="center";ctx.fillText(tabs[i][1],xx+85,132);}
  ctx.fillStyle="rgba(255,255,255,.10)";ctx.beginPath();ctx.arc(1048,72,24,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(255,255,255,.32)";ctx.stroke();ctx.fillStyle="#fff";ctx.font="bold 24px Arial";ctx.fillText("×",1048,80);
  if(lobbyAssistantSelectorTab==="executor"){
    for(let i=0;i<roles.length;i++){const xx=62+i*174,yy=174,sel=lobbyAssistantPreviewRole===i,lock=!owned[i],hover=inRect(xx,yy,156,265)&&!lock;ctx.fillStyle=sel?"rgba(255,224,102,.15)":hover?"rgba(124,199,255,.14)":"rgba(255,255,255,.045)";ctx.fillRect(xx,yy,156,265);ctx.strokeStyle=sel?"#ffe066":hover?"#7cc7ff":"rgba(255,255,255,.14)";ctx.lineWidth=sel?3:1;ctx.strokeRect(xx,yy,156,265);drawPortrait(xx+18,yy+18,120,170,roles[i],lock);ctx.fillStyle=lock?"#777":"#fff";ctx.font="bold 18px "+FONT_UI;ctx.textAlign="left";ctx.fillText(roleName(i),xx+16,yy+218);ctx.fillStyle=lock?"#666":"rgba(255,255,255,.58)";ctx.font="11px "+FONT_UI;ctx.fillText(lock?(language==="en"?"NOT OBTAINED":"尚未获得"):roleStyle(i),xx+16,yy+242);if(sel){ctx.fillStyle="#ffe066";ctx.font="bold 10px "+FONT_UI;ctx.fillText(language==="en"?"PREVIEW":"预览中",xx+16,yy+259);}}
  }else{
    for(let i=0;i<LOBBY_BACKGROUND_THEMES.length;i++){const item=LOBBY_BACKGROUND_THEMES[i],xx=72+(i%2)*338,yy=180+Math.floor(i/2)*145,sel=lobbyBackgroundPreviewTheme===item.id,hover=inRect(xx,yy,312,118);const g=ctx.createLinearGradient(xx,yy,xx+312,yy+118);g.addColorStop(0,item.a);g.addColorStop(1,item.b);ctx.fillStyle=g;ctx.fillRect(xx,yy,312,118);ctx.strokeStyle=sel?"#ffe066":hover?item.accent:"rgba(255,255,255,.18)";ctx.lineWidth=sel?3:1;ctx.strokeRect(xx,yy,312,118);ctx.fillStyle=item.accent;ctx.fillRect(xx,yy,5,118);ctx.fillStyle="#fff";ctx.font="bold 20px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?item.en:item.zh,xx+22,yy+50);ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="11px "+FONT_UI;ctx.fillText(sel?(language==="en"?"SELECTED":"已选择"):(language==="en"?"CLICK TO PREVIEW":"点击预览"),xx+22,yy+82);}
    ctx.fillStyle="rgba(255,255,255,.05)";ctx.fillRect(770,180,270,263);ctx.strokeStyle=theme.accent;ctx.strokeRect(770,180,270,263);ctx.fillStyle=theme.a;ctx.fillRect(782,192,246,190);ctx.fillStyle=theme.b+"cc";ctx.fillRect(782,287,246,95);ctx.fillStyle=theme.accent;ctx.beginPath();ctx.arc(905,275,42,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?theme.en:theme.zh,905,415);
  }
  drawBtn(language==="en"?"Cancel":"取消","ESC",590,550,180,54,false,"#fff");drawBtn(language==="en"?"Apply":"应用","CLICK",790,550,250,54,true,"#ffe066");
  ctx.restore();
}

const LOBBY_DIALOGUE_LINES = [
  {
    zh:["今天的巡逻路线已经确认。","别站得太远，通讯会有延迟。","有任务就叫我，我随时可以出发。","大厅很安静……暴风雨前通常也是这样。"],
    en:["Today's patrol route is confirmed.","Stay within comms range. We cannot afford a delay.","Call me when there is a mission. I am ready.","The lobby is quiet... It often is before a storm."]
  },
  {
    zh:["风带来了新的消息，要听听吗？","如果累了，就先休息一会儿吧。","我刚整理完今天的行动记录。","下一次行动，也让我一起去吧。"],
    en:["The wind brought news. Want to hear it?","If you are tired, take a short break.","I just finished sorting today's operation log.","Let me join the next operation too."]
  },
  {
    zh:["别把沉默误认为放松警惕。","队伍状态正常，随时可以出发。","我会留意异常的晶体反应。","任务开始前，再检查一次装备。"],
    en:["Do not mistake silence for safety.","The squad is ready to deploy.","I will monitor abnormal crystal signals.","Check your gear once more before deployment."]
  },
  {
    zh:["温度刚刚好，要来杯热饮吗？","狐灵说，今天会有好事发生。","别担心，我会控制好冰霜的范围。","回来就好。下一次也要平安。"],
    en:["The temperature is just right. Want a warm drink?","The fox spirit says something good may happen today.","Do not worry. I will keep the frost under control.","Good, you are back. Return safely next time too."]
  },
  {
    zh:["那些黑白线条……似乎又安静下来了。","我还在适应这里，不过已经好多了。","下一次任务，我会走在前面。","白日梦留下的声音，有时还会出现。"],
    en:["Those black-and-white traces... they are quiet again.","I am still getting used to this place, but it is getting easier.","On the next mission, I will take the lead.","Sometimes I can still hear echoes left by the Daydream."]
  }
];

function scheduleNextLobbyDialogue(){
  lobbyDialogueNextAt=Date.now()+30000+Math.random()*30000;
}

function showLobbyDialogue(reason="click"){
  const role=clamp(Math.floor(lobbyExecutor||0),0,roles.length-1);
  const data=LOBBY_DIALOGUE_LINES[role]||LOBBY_DIALOGUE_LINES[0];
  const list=(language==="en"?data.en:data.zh)||[];
  if(!list.length)return;
  let index=Math.floor(Math.random()*list.length);
  const previous=lobbyDialogueLastIndex[role];
  if(list.length>1&&index===previous)index=(index+1+Math.floor(Math.random()*(list.length-1)))%list.length;
  lobbyDialogueLastIndex[role]=index;
  lobbyDialogueText=list[index];
  lobbyDialogueStartedAt=Date.now();
  lobbyDialogueUntil=lobbyDialogueStartedAt+(reason==="idle"?9000:8000);
  scheduleNextLobbyDialogue();
  if(reason!=="idle")sfx("ui");
}

function drawLobbyDialogue(){
  if(!lobbyDialogueText||Date.now()>=lobbyDialogueUntil)return;
  const now=Date.now(),fadeIn=clamp((now-lobbyDialogueStartedAt)/220,0,1),fadeOut=clamp((lobbyDialogueUntil-now)/500,0,1),alpha=Math.min(fadeIn,fadeOut);
  const x=28,y=278,w=158,h=104;
  ctx.save();ctx.globalAlpha=alpha;
  const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"rgba(13,25,43,.96)");g.addColorStop(1,"rgba(4,8,16,.92)");
  ctx.beginPath();ctx.roundRect(x,y,w,h,12);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle="rgba(136,216,255,.54)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.fillStyle=roles[lobbyExecutor].color||"#88d8ff";ctx.fillRect(x,y+12,4,h-24);
  ctx.fillStyle="rgba(255,255,255,.50)";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="left";ctx.fillText(roleName(lobbyExecutor),x+16,y+23);
  ctx.fillStyle="#fff";ctx.font="bold 13px "+FONT_UI;wrapTextBlock(lobbyDialogueText,x+16,y+47,w-29,18,3);
  ctx.globalAlpha=alpha*(.48+Math.sin(menuPulse*.09)*.18);ctx.fillStyle="#88d8ff";ctx.beginPath();ctx.moveTo(x+w,y+67);ctx.lineTo(x+w+9,y+72);ctx.lineTo(x+w,y+77);ctx.closePath();ctx.fill();
  ctx.restore();
}



const GROWTH_TASK_BASE_REWARD = {exp:500,gold:1000,books:1,ore:0};

const GROWTH_GUIDE_PAGES = [
  {title:{zh:"初入雷文哈多",en:"Arrival in Ravenhado"}, pageReward:{crystal:200,gold:5000,books:3,ore:1}, tasks:[
    {zh:"完成主线 00-01",en:"Clear Main 00-01", check:()=>!!cleared[1], reward:{exp:500,gold:1000,books:1}},
    {zh:"完成1次作战委托",en:"Clear 1 Operation Commission", check:()=>!!cleared.c1, reward:{exp:500,gold:1000,books:1}},
    {zh:"获得芙洛拉",en:"Recruit Flora", check:()=>!!owned[3], reward:{exp:500,gold:1200,books:1}},
    {zh:"强化任意武器1次",en:"Upgrade any weapon once", check:()=>charData.some(c=>c.weaponLevel>1), reward:{exp:500,gold:1000,ore:1}},
    {zh:"玩家等级达到 Lv.2",en:"Reach Player Lv.2", check:()=>playerLevel>=2, reward:{exp:500,gold:1500,books:1}}
  ]},
  {title:{zh:"执行官训练",en:"Executor Training"}, pageReward:{crystal:250,gold:6000,books:4,ore:1}, tasks:[
    {zh:"玩家等级达到 Lv.3",en:"Reach Player Lv.3", check:()=>playerLevel>=3, reward:{exp:500,gold:1000,books:1}},
    {zh:"任意执行官达到 Lv.5",en:"Any executor reaches Lv.5", check:()=>charData.some(c=>c.level>=5), reward:{exp:500,gold:1200,books:2}},
    {zh:"完成2次作战委托",en:"Clear 2 Operation Commissions", check:()=>countClearedCommissions()>=2, reward:{exp:500,gold:1000,books:1}},
    {zh:"强化技能1次",en:"Upgrade any skill once", check:()=>charData.some(c=>c.normal>1||c.skill>1||c.ultimate>1), reward:{exp:500,gold:1000,books:1}},
    {zh:"累计获得5000金币",en:"Earn 5000 Gold total", check:()=>totalGoldEarned>=5000 || gold>=5000, reward:{exp:500,gold:1500,ore:1}}
  ]},
  {title:{zh:"稳定战线",en:"Stable Frontline"}, pageReward:{crystal:300,gold:7000,books:5,ore:2}, tasks:[
    {zh:"完成主线 00-03",en:"Clear Main 00-03", check:()=>!!cleared[3], reward:{exp:500,gold:1000,books:1}},
    {zh:"完成3次作战委托",en:"Clear 3 Operation Commissions", check:()=>countClearedCommissions()>=3, reward:{exp:500,gold:1000,books:1}},
    {zh:"击败50名敌人",en:"Defeat 50 enemies", check:()=>totalKills>=50, reward:{exp:500,gold:1200,books:1}},
    {zh:"拥有2名执行官",en:"Own 2 executors", check:()=>owned.filter(Boolean).length>=2, reward:{exp:500,gold:1000,ore:1}},
    {zh:"玩家等级达到 Lv.5",en:"Reach Player Lv.5", check:()=>playerLevel>=5, reward:{exp:500,gold:1500,books:2}}
  ]},
  {title:{zh:"武装检查",en:"Armament Check"}, pageReward:{crystal:350,gold:8000,books:5,ore:2}, tasks:[
    {zh:"完成主线 00-05",en:"Clear Main 00-05", check:()=>!!cleared[5], reward:{exp:500,gold:1000,books:1}},
    {zh:"任意武器达到 Lv.5",en:"Any weapon reaches Lv.5", check:()=>charData.some(c=>c.weaponLevel>=5), reward:{exp:500,gold:1000,ore:1}},
    {zh:"完成4次作战委托",en:"Clear 4 Operation Commissions", check:()=>countClearedCommissions()>=4, reward:{exp:500,gold:1200,books:1}},
    {zh:"累计弹刀10次",en:"Parry 10 times", check:()=>totalParries>=10, reward:{exp:500,gold:1000,ore:1}},
    {zh:"玩家等级达到 Lv.7",en:"Reach Player Lv.7", check:()=>playerLevel>=7, reward:{exp:500,gold:1500,books:2}}
  ]},
  {title:{zh:"队伍成型",en:"Team Formation"}, pageReward:{crystal:500,gold:9000,books:6,ore:3}, tasks:[
    {zh:"拥有3名执行官",en:"Own 3 executors", check:()=>owned.filter(Boolean).length>=3, reward:{exp:500,gold:1200,books:1}},
    {zh:"完成5次作战委托",en:"Clear 5 Operation Commissions", check:()=>countClearedCommissions()>=5, reward:{exp:500,gold:1000,books:1}},
    {zh:"击败100名敌人",en:"Defeat 100 enemies", check:()=>totalKills>=100, reward:{exp:500,gold:1200,books:1}},
    {zh:"任意执行官达到 Lv.10",en:"Any executor reaches Lv.10", check:()=>charData.some(c=>c.level>=10), reward:{exp:500,gold:1000,books:2}},
    {zh:"玩家等级达到 Lv.10",en:"Reach Player Lv.10", check:()=>playerLevel>=10, reward:{exp:500,gold:1500,ore:1}}
  ]},
  {title:{zh:"突破准备",en:"Breakthrough Prep"}, pageReward:{crystal:400,gold:10000,books:7,ore:3}, tasks:[
    {zh:"完成主线 00-07",en:"Clear Main 00-07", check:()=>!!cleared[7], reward:{exp:500,gold:1000,books:1}},
    {zh:"完成6次作战委托",en:"Clear 6 Operation Commissions", check:()=>countClearedCommissions()>=6, reward:{exp:500,gold:1000,books:1}},
    {zh:"完成3次连携攻击",en:"Trigger Chain Attack 3 times", check:()=>totalChains>=3, reward:{exp:500,gold:1200,ore:1}},
    {zh:"任意技能达到 Lv.3",en:"Any skill reaches Lv.3", check:()=>charData.some(c=>c.normal>=3||c.skill>=3||c.ultimate>=3), reward:{exp:500,gold:1200,books:1}},
    {zh:"玩家等级达到 Lv.12",en:"Reach Player Lv.12", check:()=>playerLevel>=12, reward:{exp:500,gold:1500,books:2}}
  ]},
  {title:{zh:"困难委托",en:"Hard Commissions"}, pageReward:{crystal:450,gold:11000,books:8,ore:4}, tasks:[
    {zh:"完成7次作战委托",en:"Clear 7 Operation Commissions", check:()=>countClearedCommissions()>=7, reward:{exp:500,gold:1000,books:1}},
    {zh:"击败150名敌人",en:"Defeat 150 enemies", check:()=>totalKills>=150, reward:{exp:500,gold:1200,books:1}},
    {zh:"累计获得20000金币",en:"Earn 20000 Gold total", check:()=>totalGoldEarned>=20000 || gold>=20000, reward:{exp:500,gold:1500,ore:1}},
    {zh:"任意武器达到 Lv.10",en:"Any weapon reaches Lv.10", check:()=>charData.some(c=>c.weaponLevel>=10), reward:{exp:500,gold:1000,ore:1}},
    {zh:"玩家等级达到 Lv.15",en:"Reach Player Lv.15", check:()=>playerLevel>=15, reward:{exp:500,gold:1500,books:2}}
  ]},
  {title:{zh:"高阶训练",en:"Advanced Training"}, pageReward:{crystal:500,gold:12000,books:9,ore:4}, tasks:[
    {zh:"完成主线 00-09",en:"Clear Main 00-09", check:()=>!!cleared[9], reward:{exp:500,gold:1000,books:1}},
    {zh:"完成8次作战委托",en:"Clear 8 Operation Commissions", check:()=>countClearedCommissions()>=8, reward:{exp:500,gold:1000,books:1}},
    {zh:"累计弹刀25次",en:"Parry 25 times", check:()=>totalParries>=25, reward:{exp:500,gold:1200,ore:1}},
    {zh:"任意执行官达到 Lv.15",en:"Any executor reaches Lv.15", check:()=>charData.some(c=>c.level>=15), reward:{exp:500,gold:1200,books:2}},
    {zh:"玩家等级达到 Lv.18",en:"Reach Player Lv.18", check:()=>playerLevel>=18, reward:{exp:500,gold:1500,books:2}}
  ]},
  {title:{zh:"临战整备",en:"Final Preparation"}, pageReward:{crystal:600,gold:13000,books:10,ore:5}, tasks:[
    {zh:"完成9次作战委托",en:"Clear 9 Operation Commissions", check:()=>countClearedCommissions()>=9, reward:{exp:500,gold:1000,books:1}},
    {zh:"击败200名敌人",en:"Defeat 200 enemies", check:()=>totalKills>=200, reward:{exp:500,gold:1200,books:1}},
    {zh:"完成5次连携攻击",en:"Trigger Chain Attack 5 times", check:()=>totalChains>=5, reward:{exp:500,gold:1200,ore:1}},
    {zh:"拥有4名执行官",en:"Own 4 executors", check:()=>owned.filter(Boolean).length>=4, reward:{exp:500,gold:1000,books:2}},
    {zh:"玩家等级达到 Lv.20",en:"Reach Player Lv.20", check:()=>playerLevel>=20, reward:{exp:500,gold:1500,ore:1}}
  ]},
  {title:{zh:"旅途起点",en:"Journey Begins"}, pageReward:{crystal:1000,gold:20000,books:15,ore:6}, tasks:[
    {zh:"完成主线 00-11",en:"Clear Main 00-11", check:()=>!!cleared[11], reward:{exp:500,gold:1200,books:1}},
    {zh:"完成10次作战委托",en:"Clear 10 Operation Commissions", check:()=>countClearedCommissions()>=10, reward:{exp:500,gold:1200,books:1}},
    {zh:"击败1名Boss",en:"Defeat 1 Boss", check:()=>totalBossKills>=1, reward:{exp:500,gold:1500,ore:1}},
    {zh:"玩家等级达到 Lv.25",en:"Reach Player Lv.25", check:()=>playerLevel>=25, reward:{exp:500,gold:1500,books:2}},
    {zh:"累计获得50000金币",en:"Earn 50000 Gold total", check:()=>totalGoldEarned>=50000 || gold>=50000, reward:{exp:500,gold:2000,ore:1}}
  ]}
];



// V49.17.6 Battle Manual Daily Tasks - real content, independent from Action Record.
function bmDailyKey(){
  const d=new Date();
  if(d.getHours()<4) d.setDate(d.getDate()-1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function bmNormalizeDaily(){
  battleManualDailyClaimed = battleManualDailyClaimed || {key:"",tasks:{},page:false};
  const k=bmDailyKey();
  if(battleManualDailyClaimed.key!==k){ battleManualDailyClaimed={key:k,tasks:{},page:false}; }
  if(!battleManualDailyClaimed.tasks) battleManualDailyClaimed.tasks={};
}
function bmDailyDefs(){
  return [
    {id:"login", zh:"登录游戏", en:"Log in", descZh:"今日首次进入 Project Zero。", descEn:"Enter Project Zero today.", target:1, progress:()=>1, reward:{gold:1000,books:1,crystal:10}},
    {id:"stage", zh:"完成1次作战", en:"Clear 1 operation", descZh:"完成任意主线或委托关卡。", descEn:"Clear any main stage or commission.", target:1, progress:()=>Math.min(1, arStageClearCount()), reward:{gold:1500,books:1,crystal:20}},
    {id:"kill", zh:"击败20名敌人", en:"Defeat 20 enemies", descZh:"在任意战斗中累计击败敌人。", descEn:"Defeat enemies in any battle.", target:20, progress:()=>totalKills||0, reward:{gold:1800,books:1}},
    {id:"parry", zh:"成功弹刀3次", en:"Parry 3 times", descZh:"把握敌人攻击瞬间，完成弹刀。", descEn:"Parry at the moment of enemy impact.", target:3, progress:()=>totalParries||0, reward:{gold:1200,ore:1}},
    {id:"chain", zh:"触发1次连携", en:"Trigger 1 chain attack", descZh:"在战斗中完成一次连携入场。", descEn:"Trigger a chain entry in battle.", target:1, progress:()=>totalChains||0, reward:{gold:1200,books:1}},
    {id:"gold", zh:"累计获得1000金币", en:"Earn 1000 Gold", descZh:"今日目标：积累基础养成资源。", descEn:"Daily goal: gather basic upgrade resources.", target:1, progress:()=>Math.min(1, Math.floor((totalGoldEarned||gold||0)/1000)), reward:{gold:1000,crystal:10}}
  ];
}
function bmDailyClaimed(id){ bmNormalizeDaily(); return !!battleManualDailyClaimed.tasks[id]; }
function bmDailyDone(t){ try{return Math.min(t.progress(),t.target)>=t.target;}catch(e){return false;} }
function bmDailyCanClaim(t){ return bmDailyDone(t) && !bmDailyClaimed(t.id); }
function bmDailyCompletedCount(){ const list=bmDailyDefs(); return list.filter(t=>bmDailyClaimed(t.id)).length; }
function bmDailyCanClaimPage(){ bmNormalizeDaily(); const list=bmDailyDefs(); return list.every(t=>bmDailyClaimed(t.id)) && !battleManualDailyClaimed.page; }
function hasBattleManualDailyReward(){ bmNormalizeDaily(); if(bmDailyCanClaimPage()) return true; return bmDailyDefs().some(t=>bmDailyCanClaim(t)); }
function bmDailyPageReward(){ return {crystal:80,gold:5000,books:3,ore:1}; }
function bmClaimDailyTask(t){
  bmNormalizeDaily();
  if(!bmDailyCanClaim(t)) return;
  applyGrowthReward(t.reward);
  battleManualDailyClaimed.tasks[t.id]=true;
  showCenter(language==="en"?"Daily task claimed":"每日任务奖励已领取",60);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}
function bmClaimAllDaily(){
  bmNormalizeDaily();
  let n=0;
  for(const t of bmDailyDefs()) if(bmDailyCanClaim(t)){ applyGrowthReward(t.reward); battleManualDailyClaimed.tasks[t.id]=true; n++; }
  if(!n){ showCenter(language==="en"?"No daily tasks to claim":"没有可领取的每日任务",60); return; }
  showCenter((language==="en"?"Claimed daily tasks: ":"已领取每日任务：")+n,70);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}
function bmClaimDailyPage(){
  bmNormalizeDaily();
  if(!bmDailyCanClaimPage()) return;
  applyGrowthReward(bmDailyPageReward());
  battleManualDailyClaimed.page=true;
  showCenter(language==="en"?"Daily completion reward claimed":"每日完成奖励已领取",70);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}
function drawBattleManualDailyTasks(){
  bmNormalizeDaily();
  const list=bmDailyDefs();
  const claimed=bmDailyCompletedCount();
  const done=list.filter(t=>bmDailyDone(t)).length;
  const canAll=list.some(t=>bmDailyCanClaim(t));
  const canPage=bmDailyCanClaimPage();

  ctx.fillStyle="rgba(0,0,0,.25)";
  ctx.fillRect(72,162,976,86);
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.strokeRect(72,162,976,86);

  ctx.fillStyle="#88d8ff";
  ctx.font="bold 44px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Daily":"每日",100,216);

  ctx.fillStyle="#fff";
  ctx.font="bold 22px " + FONT_UI;
  ctx.fillText(language==="en"?"Daily Tasks":"每日任务",235,196);
  ctx.fillStyle="rgba(255,255,255,.58)";
  ctx.font="13px " + FONT_UI;
  ctx.fillText(language==="en"?"Refreshes every day at 04:00. Rewards are normal growth resources, separate from Action Record missions.":"每日凌晨4:00刷新。这里是战斗手册的日常任务奖励，和通行证任务分开。",235,224);

  drawEmbeddedText((language==="en"?"Completed ":"已完成 ")+done+"/"+list.length,760,178,126,28,{font:"bold 13px ",fill:"rgba(136,216,255,.09)",stroke:"rgba(136,216,255,.20)",color:"#88d8ff"});
  drawEmbeddedText((language==="en"?"Claimed ":"已领取 ")+claimed+"/"+list.length,896,178,126,28,{font:"bold 13px ",fill:"rgba(255,255,255,.08)",stroke:"rgba(255,255,255,.10)",color:"#fff"});

  drawEmbeddedText((language==="en"?"Full Clear Reward: ":"全部完成奖励：")+growthRewardText(bmDailyPageReward()),72,260,690,36,{font:"bold 14px ",fill:"rgba(255,224,102,.08)",stroke:"rgba(255,224,102,.22)",color:"#ffe066"});
  drawBtn(battleManualDailyClaimed.page?(language==="en"?"Claimed":"已领取"):(language==="en"?"Claim Full Clear":"领取完成奖励"),"",780,260,202,36,canPage,"#ffe066");
  drawBtn(language==="en"?"Claim All":"全部领取","",72,560,170,42,canAll,"#ffe066");

  for(let i=0;i<list.length;i++){
    const t=list[i], y=315+i*39;
    const p=Math.min(t.progress(),t.target), doneTask=bmDailyDone(t), claimedTask=bmDailyClaimed(t.id), can=bmDailyCanClaim(t);
    ctx.fillStyle=claimedTask?"rgba(136,216,255,.10)":doneTask?"rgba(255,224,102,.10)":"rgba(255,255,255,.055)";
    ctx.fillRect(92,y,920,32);
    ctx.strokeStyle=claimedTask?"rgba(136,216,255,.34)":doneTask?"rgba(255,224,102,.28)":"rgba(255,255,255,.12)";
    ctx.strokeRect(92,y,920,32);
    drawEmbeddedText(claimedTask?"✓":doneTask?"!":"□",105,y+4,30,24,{align:"center",pad:0,font:"bold 14px ",fill:"rgba(0,0,0,.22)",stroke:"rgba(255,255,255,.10)",color:claimedTask?"#88d8ff":doneTask?"#ffe066":"#aaa"});
    ctx.fillStyle="#fff"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(language==="en"?t.en:t.zh,148,y+21);
    ctx.fillStyle="rgba(255,255,255,.44)"; ctx.font="12px "+FONT_UI; ctx.fillText(language==="en"?t.descEn:t.descZh,330,y+21);
    const bx=552, bw=128; ctx.fillStyle="rgba(255,255,255,.13)"; ctx.fillRect(bx,y+11,bw,8); ctx.fillStyle=doneTask?"#ffe066":"#88d8ff"; ctx.fillRect(bx,y+11,bw*clamp(p/t.target,0,1),8);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="bold 12px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(Math.floor(p)+" / "+t.target,bx+bw/2,y+27);
    drawEmbeddedText(growthRewardText(t.reward),700,y+4,150,24,{font:"bold 11px ",fill:"rgba(124,199,255,.08)",stroke:"rgba(124,199,255,.16)",color:"#bfe8ff"});
    drawBtn(claimedTask?(language==="en"?"Claimed":"已领取"):(doneTask?(language==="en"?"Claim":"领取"):(language==="en"?"Doing":"进行中")),"",868,y+3,118,26,can,doneTask?"#ffe066":"#777");
  }
  ctx.fillStyle="rgba(255,255,255,.45)"; ctx.font="13px " + FONT_UI; ctx.textAlign="left";
  ctx.fillText(language==="en"?"Daily tasks are designed for a short 10–20 minute login loop.":"每日任务用于10～20分钟的轻量登录循环，不影响通行证任务。",78,620);
}

function countClearedCommissions(){
  let n=0;
  for(let i=1;i<=20;i++) if(cleared["c"+i]) n++;
  return n;
}

function growthGuidePageUnlocked(i){
  if(i<=0) return true;
  return !!growthGuidePageClaimed[i-1];
}

function growthTaskDone(page, task){
  const p=GROWTH_GUIDE_PAGES[page];
  if(!p || !p.tasks[task]) return false;
  try{return !!p.tasks[task].check();}catch(e){return false;}
}

function growthTaskClaimed(page, task){
  return !!(growthGuideTaskClaimed[page] && growthGuideTaskClaimed[page][task]);
}

function growthGuideCompleted(i){
  const p=GROWTH_GUIDE_PAGES[i];
  return !!p && p.tasks.every((t,idx)=>growthTaskClaimed(i,idx));
}

function growthGuideCanClaimPage(i){
  return growthGuidePageUnlocked(i) && growthGuideCompleted(i) && !growthGuidePageClaimed[i];
}

function hasGrowthGuideReward(){
  if(hasBattleManualDailyReward()) return true;
  for(let i=0;i<GROWTH_GUIDE_PAGES.length;i++){
    if(growthGuideCanClaimPage(i)) return true;
    if(growthGuidePageUnlocked(i)){
      for(let t=0;t<5;t++) if(growthTaskDone(i,t) && !growthTaskClaimed(i,t)) return true;
    }
  }
  return false;
}

function applyGrowthReward(r){
  if(!r) return;
  addPlayerExp(r.exp||0);
  gold += r.gold||0;
  totalGoldEarned += r.gold||0;
  expBooks += r.books||0;
  weaponOre += r.ore||0;
  if(r.crystal) grantFreeCrystals(r.crystal);
}

function growthRewardText(r){
  const parts=[];
  if(r.exp) parts.push("EXP "+r.exp);
  if(r.gold) parts.push((language==="en"?"Gold ":"金币 ")+r.gold);
  if(r.books) parts.push((language==="en"?"Books ":"经验书 ")+r.books);
  if(r.ore) parts.push((language==="en"?"Ore ":"精炼合金 ")+r.ore);
  if(r.crystal) parts.push((language==="en"?"Crystal ":"水晶 ")+boostedCrystalReward(r.crystal));
  return parts.join("   ");
}

function claimGrowthGuideTask(page, task){
  if(!growthGuidePageUnlocked(page)) return;
  if(!growthTaskDone(page,task) || growthTaskClaimed(page,task)) return;
  const r=GROWTH_GUIDE_PAGES[page].tasks[task].reward || GROWTH_TASK_BASE_REWARD;
  applyGrowthReward(r);
  growthGuideTaskClaimed[page][task]=true;
  showCenter(language==="en"?"Task Reward Claimed":"任务奖励已领取",60);
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}

function claimGrowthGuidePage(){
  const i=growthGuidePage;
  if(!growthGuideCanClaimPage(i)) return;
  applyGrowthReward(GROWTH_GUIDE_PAGES[i].pageReward);
  growthGuidePageClaimed[i]=true;
  if(i<GROWTH_GUIDE_PAGES.length-1) growthGuidePage=i+1;
  showCenter(language==="en"?"Page Reward Claimed":"页面奖励已领取",70);
  sfx("reward");
  saveGame(); autoCloudSaveNow(true);
}



const ACTION_RECORD_MAX_LEVEL = 50;
const ACTION_RECORD_LEVELS_PER_PAGE = 7;
const ACTION_RECORD_ADVANCED_PRICE = 1500;
const ACTION_RECORD_ULTIMATE_PRICE_TEXT = "US$14.99";
const RAVENHADO_WEAPONS = [
  {id:"nameless_blade", zh:"无名剑刃", en:"Nameless Blade", typeZh:"剑", typeEn:"Sword"},
  {id:"ice_book", zh:"寒冰书", en:"Ice Book", typeZh:"法器", typeEn:"Codex"},
  {id:"ashley_greatsword", zh:"阿什列之剑", en:"Ashley's Sword", typeZh:"重剑", typeEn:"Greatsword"}
];
function arText(zh,en){ return language==="en" ? en : zh; }
function arMaxPage(){ return Math.ceil(ACTION_RECORD_MAX_LEVEL/ACTION_RECORD_LEVELS_PER_PAGE)-1; }
function arRewardLayout(){ return {x0:342,y0:198,colW:88,gap:6,boxH:82,rowGap:112}; }
function arTrackName(track){
  if(track==="free") return arText("免费","Free");
  if(track==="advanced") return arText("高级","Advanced");
  return arText("顶级","Ultimate");
}
function arReward(track, lv){
  if(track==="free"){
    if(lv%5===0) return {kind:"crystal", amount:120, zh:"水晶 ×120", en:"Crystal ×120"};
    if(lv%2===1) return {kind:"crystal", amount:60, zh:"水晶 ×60", en:"Crystal ×60"};
    if(lv%4===0) return {kind:"gold", amount:5000+lv*120, zh:"金币 ×"+(5000+lv*120), en:"Gold ×"+(5000+lv*120)};
    return {kind:"books", amount:2+Math.floor(lv/10), zh:"经验书 ×"+(2+Math.floor(lv/10)), en:"EXP Book ×"+(2+Math.floor(lv/10))};
  }
  if(track==="advanced"){
    if(lv===25) return {kind:"weapon_standard", zh:"雷文哈多武器库（标准）", en:"Ravenhado Armory (Standard)"};
    if([5,10,15,20,30,35,40,45,50].includes(lv)) return {kind:"crystal", amount:200, zh:"水晶 ×200", en:"Crystal ×200"};
    if(lv%3===0) return {kind:"ore", amount:4+Math.floor(lv/10), zh:"精炼合金 ×"+(4+Math.floor(lv/10)), en:"Refined Alloy ×"+(4+Math.floor(lv/10))};
    return {kind:"books", amount:5+Math.floor(lv/8), zh:"经验书 ×"+(5+Math.floor(lv/8)), en:"EXP Book ×"+(5+Math.floor(lv/8))};
  }
  if(lv===1) return {kind:"avatar", zh:"头像", en:"Avatar"};
  if(lv===2) return {kind:"frame", zh:"头像框", en:"Avatar Frame"};
  if(lv===25) return {kind:"weapon_full", zh:"雷文哈多武器库（完整）", en:"Ravenhado Armory (Full)"};
  if([5,10,15,20,30,35,40,45,50].includes(lv)) return {kind:"crystal", amount:400, zh:"水晶 ×400", en:"Crystal ×400"};
  if(lv%4===0) return {kind:"ore", amount:8, zh:"精炼合金 ×8", en:"Refined Alloy ×8"};
  return {kind:"books", amount:8, zh:"经验书 ×8", en:"EXP Book ×8"};
}
function arRewardLabel(r){ return language==="en" ? r.en : r.zh; }
function arClaimed(track, lv){ return !!(actionRecordClaimed[track] && actionRecordClaimed[track][lv]); }
function arTierUnlocked(track){
  if(track==="free") return true;
  if(track==="advanced") return actionRecordAdvanced || actionRecordUltimate;
  if(track==="ultimate") return actionRecordUltimate;
  return false;
}
function arCanClaim(track, lv){ return lv<=actionRecordLevel && arTierUnlocked(track) && !arClaimed(track,lv); }
function arHasClaimable(){
  for(let lv=1; lv<=ACTION_RECORD_MAX_LEVEL; lv++){
    if(arCanClaim("free",lv) || arCanClaim("advanced",lv) || arCanClaim("ultimate",lv)) return true;
  }
  return false;
}
function arSetMsg(text, frames=90){ actionRecordMsg=text; actionRecordMsgTimer=frames; if(showCenter) showCenter(text, frames); }
function arAddExp(amount, toast=true){
  amount = Math.max(0, Math.floor(amount || 0));
  if(!amount) return;
  const before = actionRecordLevel;
  actionRecordExp += amount;
  while(actionRecordLevel < ACTION_RECORD_MAX_LEVEL && actionRecordExp >= actionRecordExpNeed){
    actionRecordExp -= actionRecordExpNeed;
    actionRecordLevel++;
    actionRecordExpNeed = Math.floor(actionRecordExpNeed * 1.12 + 120);
  }
  if(actionRecordLevel >= ACTION_RECORD_MAX_LEVEL) actionRecordExp = Math.min(actionRecordExp, actionRecordExpNeed);
  if(toast){
    arSetMsg(before !== actionRecordLevel ? arText("行动记录升级：Lv.","Action Record Lv.")+before+" → "+actionRecordLevel : "+"+amount+" EXP", 90);
    sfx("reward");
  }
  saveGame();
}
function arGrantReward(track, lv){
  const r=arReward(track,lv);
  if(!actionRecordClaimed[track]) actionRecordClaimed[track]={};
  if(r.kind==="weapon_standard"){ actionRecordWeaponSelecting="standard"; actionRecordSelectedWeapon=0; return; }
  if(r.kind==="weapon_full"){ actionRecordWeaponSelecting="full"; actionRecordSelectedWeapon=0; return; }
  if(r.kind==="crystal") grantFreeCrystals(r.amount);
  if(r.kind==="gold"){ gold += r.amount; totalGoldEarned += r.amount; }
  if(r.kind==="books") expBooks += r.amount;
  if(r.kind==="ore") weaponOre += r.amount;
  if(r.kind==="avatar") ownedWeapons.actionRecordAvatar = true;
  if(r.kind==="frame") ownedWeapons.actionRecordFrame = true;
  actionRecordClaimed[track][lv]=true;
  arSetMsg(arText("行动记录奖励已领取","Action Record reward claimed"),70);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}
function arClaim(track,lv){ if(arCanClaim(track,lv)) arGrantReward(track,lv); }
function arArmoryList(){ return actionRecordWeaponSelecting==="standard" ? RAVENHADO_WEAPONS.slice(0,2) : RAVENHADO_WEAPONS; }
function arConfirmWeapon(){
  const list=arArmoryList(); const w=list[actionRecordSelectedWeapon]||list[0];
  if(!actionRecordWeaponChoice) actionRecordWeaponChoice={};
  actionRecordWeaponChoice[actionRecordWeaponSelecting]=w.id;
  ownedWeapons["actionRecord_"+w.id]=true;
  const track=actionRecordWeaponSelecting==="standard" ? "advanced" : "ultimate";
  actionRecordClaimed[track][25]=true;
  arSetMsg(arText("已选择：","Selected: ")+(language==="en"?w.en:w.zh),90);
  actionRecordWeaponSelecting=null;
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}
function buyActionRecordAdvanced(){
  if(actionRecordAdvanced || actionRecordUltimate){ arSetMsg(arText("高级行动记录已解锁","Advanced Action Record unlocked"),60); return; }
  if(crystals < ACTION_RECORD_ADVANCED_PRICE){ arSetMsg(arText("水晶不足","Not enough Crystals"),70); return; }
  crystals -= ACTION_RECORD_ADVANCED_PRICE;
  actionRecordAdvanced = true;
  arSetMsg(arText("高级行动记录已解锁","Advanced Action Record unlocked"),80);
  sfx("buy"); saveGame(); autoCloudSaveNow(true);
}
function buyActionRecordUltimate(){
  if(actionRecordUltimate){ arSetMsg(arText("顶级行动记录已解锁","Ultimate Action Record unlocked"),60); return; }
  actionRecordUltimate = true; actionRecordAdvanced = true;
  arSetMsg(arText("顶级行动记录已解锁（测试版不接真钱）","Ultimate Action Record unlocked (demo only)"),90);
  sfx("buy"); saveGame(); autoCloudSaveNow(true);
}

// Action Record missions: inside the pass UI. Battle Manual stays unchanged.
function arDayKey(offsetDays=0){
  const d=new Date(Date.now()+offsetDays*86400000);
  if(d.getHours()<4) d.setDate(d.getDate()-1);
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
function arWeekKey(){
  const d=new Date(); if(d.getHours()<4) d.setDate(d.getDate()-1);
  const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day);
  return d.getFullYear()+"-W"+String(Math.ceil((((d - new Date(d.getFullYear(),0,1))/86400000)+1)/7)).padStart(2,"0");
}
function arMonthKey(){ const d=new Date(); if(d.getDate()===1 && d.getHours()<4) d.setMonth(d.getMonth()-1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); }
function arNormalizeTasks(){
  actionRecordTaskClaimed = actionRecordTaskClaimed || {dailyKey:"",weeklyKey:"",monthlyKey:"",daily:{},weekly:{},monthly:{}};
  const dk=arDayKey(), wk=arWeekKey(), mk=arMonthKey();
  if(actionRecordTaskClaimed.dailyKey!==dk){ actionRecordTaskClaimed.dailyKey=dk; actionRecordTaskClaimed.daily={}; }
  if(actionRecordTaskClaimed.weeklyKey!==wk){ actionRecordTaskClaimed.weeklyKey=wk; actionRecordTaskClaimed.weekly={}; }
  if(actionRecordTaskClaimed.monthlyKey!==mk){ actionRecordTaskClaimed.monthlyKey=mk; actionRecordTaskClaimed.monthly={}; }
}
function arStageClearCount(){
  try{return Object.keys(cleared||{}).filter(k=>cleared[k]).length;}catch(e){return 0;}
}
function arMetric(metric){
  if(metric==="login") return 1;
  if(metric==="stage") return arStageClearCount();
  if(metric==="kill") return totalKills || 0;
  if(metric==="parry") return totalParries || 0;
  if(metric==="chain") return totalChains || 0;
  if(metric==="boss") return totalBossKills || 0;
  if(metric==="gold") return Math.floor((totalGoldEarned||0)/1000);
  if(metric==="crystal") return Math.floor((totalCrystalsEarned||0)/100);
  if(metric==="arlevel") return actionRecordLevel || 1;
  if(metric==="weapon") return Object.keys(ownedWeapons||{}).length;
  return 0;
}
function arMissionDefs(cat){
  const daily=[
    {id:"login", zh:"登录游戏", en:"Log in", metric:"login", target:1, exp:30, crystal:10},
    {id:"stage1", zh:"完成1个委托", en:"Clear 1 commission", metric:"stage", target:1, exp:80, crystal:20},
    {id:"kill20", zh:"击败20名敌人", en:"Defeat 20 enemies", metric:"kill", target:20, exp:80, crystal:0},
    {id:"parry5", zh:"成功弹刀5次", en:"Parry 5 times", metric:"parry", target:5, exp:60, crystal:0},
    {id:"chain2", zh:"触发2次连携", en:"Trigger 2 chains", metric:"chain", target:2, exp:60, crystal:0},
    {id:"gold5", zh:"累计获得5000金币", en:"Earn 5000 Gold", metric:"gold", target:5, exp:50, crystal:0}
  ];
  const weekly=[
    {id:"stage10", zh:"完成10个委托", en:"Clear 10 commissions", metric:"stage", target:10, exp:350, crystal:80},
    {id:"kill200", zh:"击败200名敌人", en:"Defeat 200 enemies", metric:"kill", target:200, exp:350, crystal:60},
    {id:"parry50", zh:"成功弹刀50次", en:"Parry 50 times", metric:"parry", target:50, exp:280, crystal:40},
    {id:"chain20", zh:"触发20次连携", en:"Trigger 20 chains", metric:"chain", target:20, exp:280, crystal:40},
    {id:"boss3", zh:"击败3名Boss", en:"Defeat 3 bosses", metric:"boss", target:3, exp:400, crystal:100},
    {id:"ar5", zh:"行动记录达到Lv.5", en:"Reach Action Record Lv.5", metric:"arlevel", target:5, exp:250, crystal:40}
  ];
  const monthly=[
    {id:"stage25", zh:"完成25个委托", en:"Clear 25 commissions", metric:"stage", target:25, exp:900, crystal:200},
    {id:"kill1000", zh:"击败1000名敌人", en:"Defeat 1000 enemies", metric:"kill", target:1000, exp:1000, crystal:200},
    {id:"parry300", zh:"成功弹刀300次", en:"Parry 300 times", metric:"parry", target:300, exp:850, crystal:150},
    {id:"boss10", zh:"击败10名Boss", en:"Defeat 10 bosses", metric:"boss", target:10, exp:1000, crystal:250},
    {id:"ar20", zh:"行动记录达到Lv.20", en:"Reach Action Record Lv.20", metric:"arlevel", target:20, exp:1200, crystal:300},
    {id:"weapon3", zh:"获得3件特殊物品或武器", en:"Own 3 special items / weapons", metric:"weapon", target:3, exp:700, crystal:120}
  ];
  return cat==="weekly"?weekly:(cat==="monthly"?monthly:daily);
}
function arTaskName(cat){ return cat==="daily"?arText("简单任务","Simple"):(cat==="weekly"?arText("每周任务","Weekly"):arText("高难任务","High Difficulty")); }
function arTaskClaimed(cat,id){ arNormalizeTasks(); return !!(actionRecordTaskClaimed[cat] && actionRecordTaskClaimed[cat][id]); }
function arTaskProgress(t){ return clamp(arMetric(t.metric),0,t.target); }
function arTaskCanClaim(cat,t){ return arTaskProgress(t)>=t.target && !arTaskClaimed(cat,t.id); }
function arHasTaskClaimable(){
  arNormalizeTasks();
  for(const cat of ["daily","weekly","monthly"]){ for(const t of arMissionDefs(cat)){ if(arTaskCanClaim(cat,t)) return true; } }
  return false;
}
function arClaimTask(cat,t){
  if(!arTaskCanClaim(cat,t)) return;
  if(!actionRecordTaskClaimed[cat]) actionRecordTaskClaimed[cat]={};
  actionRecordTaskClaimed[cat][t.id]=true;
  const crystalGranted=t.crystal?grantFreeCrystals(t.crystal):0;
  arAddExp(t.exp||0, true);
  arSetMsg((language==="en"?t.en:t.zh)+"  +"+(t.exp||0)+" EXP"+(crystalGranted?" / "+arText("水晶 ×","Crystal ×")+crystalGranted:""),90);
  saveGame(); autoCloudSaveNow(true);
}
function arClaimAllTasks(){
  let n=0, exp=0, cry=0;
  for(const t of arMissionDefs(actionRecordTaskTab)){
    if(arTaskCanClaim(actionRecordTaskTab,t)){
      if(!actionRecordTaskClaimed[actionRecordTaskTab]) actionRecordTaskClaimed[actionRecordTaskTab]={};
      actionRecordTaskClaimed[actionRecordTaskTab][t.id]=true;
      n++; exp += t.exp||0; cry += t.crystal||0;
    }
  }
  if(!n){ arSetMsg(arText("没有可领取的任务","No completed missions"),60); return; }
  if(cry) cry=grantFreeCrystals(cry);
  arAddExp(exp,true);
  arSetMsg(arText("已领取任务：","Claimed missions: ")+n+"  +"+exp+" EXP"+(cry?" / "+arText("水晶 ×","Crystal ×")+cry:""),90);
  saveGame(); autoCloudSaveNow(true);
}
function arCompletedCount(cat){ const list=arMissionDefs(cat); return list.filter(t=>arTaskProgress(t)>=t.target).length; }

function drawActionRecordMiniButton(){
  const x=W-162, y=24, r=22;
  const hover = dist(mouseX, mouseY, x, y) < r + 6;
  ctx.save();
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle=hover?"rgba(124,199,255,.26)":"rgba(0,0,0,.42)"; ctx.fill();
  ctx.strokeStyle=hover?"rgba(124,199,255,.92)":"rgba(124,199,255,.58)"; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle="#bfe8ff"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("AR",x,y+1);
  if(arHasClaimable() || arHasTaskClaimable()){
    ctx.fillStyle="#ff4d4d"; ctx.beginPath(); ctx.arc(x+16,y-14,6,0,Math.PI*2); ctx.fill();
  }
  if(hover){
    ctx.textBaseline="alphabetic"; ctx.fillStyle="rgba(0,0,0,.66)"; ctx.fillRect(W-258,54,145,30); ctx.strokeStyle="rgba(124,199,255,.35)"; ctx.strokeRect(W-258,54,145,30);
    ctx.fillStyle="#bfe8ff"; ctx.font="bold 13px "+FONT_UI; ctx.fillText(arText("通行证","Action Record"),W-185,74);
  }
  ctx.restore();
}
function drawArRewardBox(track, lv, x, y, w, h){
  const r=arReward(track,lv), reached=lv<=actionRecordLevel, unlocked=arTierUnlocked(track), claimed=arClaimed(track,lv), can=arCanClaim(track,lv);
  ctx.save();
  ctx.fillStyle=can?"rgba(255,224,102,.16)":(claimed?"rgba(124,199,255,.13)":(reached&&unlocked?"rgba(255,255,255,.08)":"rgba(255,255,255,.035)"));
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=can?"rgba(255,224,102,.82)":(claimed?"rgba(124,199,255,.52)":"rgba(255,255,255,.12)");
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=claimed?"#7cc7ff":(can?"#ffe066":(reached&&unlocked?"#fff":"rgba(255,255,255,.35)"));
  ctx.font="bold 11px "+FONT_UI; ctx.textAlign="center";
  wrapText(arRewardLabel(r),x+5,y+19,w-10,14);
  ctx.font="bold 13px "+FONT_UI;
  if(claimed) ctx.fillText("✓",x+w-12,y+16);
  else if(can) ctx.fillText(arText("领","GET"),x+w/2,y+h-10);
  else if(!unlocked) ctx.fillText("LOCK",x+w/2,y+h-10);
  ctx.restore();
}
function drawArRewardPreview(track,lv){
  const r=arReward(track,lv),claimed=arClaimed(track,lv),can=arCanClaim(track,lv),unlocked=arTierUnlocked(track);
  const x=828,y=178,w=190,h=356,color=track==="free"?"#d8e1ec":track==="advanced"?"#7cc7ff":"#ffe066";
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=color;ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=color;ctx.font="bold 13px "+FONT_UI;ctx.textAlign="left";ctx.fillText(arTrackName(track).toUpperCase(),x+18,y+30);
  ctx.fillStyle="#fff";ctx.font="bold 34px Arial";ctx.fillText("LV."+String(lv).padStart(2,"0"),x+18,y+74);
  ctx.fillStyle="rgba(255,255,255,.08)";ctx.fillRect(x+18,y+96,w-36,110);
  ctx.strokeStyle="rgba(255,255,255,.14)";ctx.strokeRect(x+18,y+96,w-36,110);
  ctx.fillStyle=color;ctx.font="bold 20px "+FONT_UI;ctx.textAlign="center";wrapText(arRewardLabel(r),x+28,y+132,w-56,27);
  ctx.fillStyle="rgba(255,255,255,.56)";ctx.font="12px "+FONT_UI;ctx.textAlign="left";
  ctx.fillText(arText("奖励状态","Reward Status"),x+18,y+242);
  ctx.fillStyle=claimed?"#7cc7ff":can?"#ffe066":unlocked?"rgba(255,255,255,.62)":"#ff8d8d";
  ctx.font="bold 15px "+FONT_UI;
  ctx.fillText(claimed?arText("已领取","Claimed"):can?arText("点击奖励格领取","Click box to claim"):!unlocked?arText("轨道未解锁","Track locked"):arText("等级未达到","Level required"),x+18,y+272);
  const p=clamp(actionRecordExp/actionRecordExpNeed,0,1);
  ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(x+18,y+302,w-36,8);
  ctx.fillStyle="#7cc7ff";ctx.fillRect(x+18,y+302,(w-36)*p,8);
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="11px Arial";ctx.fillText(actionRecordExp+" / "+actionRecordExpNeed+" EXP",x+18,y+330);
  ctx.restore();
}
function drawActionRecordLeft(){
  ctx.fillStyle="#fff"; ctx.font="bold 30px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(arText("通行证","Action Record"),82,104);
  ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font="12px "+FONT_UI; ctx.fillText("PROJECT ZERO",84,128);
  ctx.fillStyle="#bfe8ff"; ctx.font="bold 64px "+FONT_UI; ctx.fillText(String(actionRecordLevel).padStart(2,"0"),84,210);
  ctx.fillStyle="rgba(255,255,255,.62)"; ctx.font="13px "+FONT_UI; ctx.fillText(arText("行动记录等级","Action Record Level"),86,232);
  ctx.fillStyle="rgba(255,255,255,.12)"; ctx.fillRect(84,260,186,10);
  ctx.fillStyle="#7cc7ff"; ctx.fillRect(84,260,186*clamp(actionRecordExp/actionRecordExpNeed,0,1),10);
  ctx.fillStyle="rgba(255,255,255,.68)"; ctx.font="13px "+FONT_UI; ctx.fillText(actionRecordExp+" / "+actionRecordExpNeed+" EXP",84,292);
  drawBtn(actionRecordAdvanced||actionRecordUltimate?arText("高级已解锁","Advanced Unlocked"):arText("高级 1500 水晶","Advanced 1500 Crystal"),"",82,342,202,42,!(actionRecordAdvanced||actionRecordUltimate),"#7cc7ff");
  drawBtn(actionRecordUltimate?arText("顶级已解锁","Ultimate Unlocked"):arText("顶级 "+ACTION_RECORD_ULTIMATE_PRICE_TEXT,"Ultimate "+ACTION_RECORD_ULTIMATE_PRICE_TEXT),"",82,394,202,42,!actionRecordUltimate,"#ffe066");
  ctx.fillStyle="rgba(255,255,255,.48)"; ctx.font="12px "+FONT_UI; wrapText(arText("任务也在通行证内。完成任务获得行动记录EXP，再领取节点奖励。","Missions are inside the pass. Complete missions for Action Record EXP, then claim node rewards."),84,470,194,22);
  drawBtn(arText("返回","Back"),"ESC",82,548,202,42,true,"#fff");
}
function drawActionRecordRewards(){
  const start=actionRecordPage*ACTION_RECORD_LEVELS_PER_PAGE+1, end=Math.min(ACTION_RECORD_MAX_LEVEL,start+ACTION_RECORD_LEVELS_PER_PAGE-1);
  ctx.fillStyle="#fff"; ctx.font="bold 20px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(arText("奖励轨道","Reward Track"),342,130);
  ctx.fillStyle="rgba(255,255,255,.48)"; ctx.font="12px "+FONT_UI; ctx.fillText("Lv."+start+" - Lv."+end,342,154);
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px "+FONT_UI;ctx.textAlign="right";
  ctx.fillText(arText("第 ","Page ")+(actionRecordPage+1)+" / "+(arMaxPage()+1),900,133);
  drawBtn("<","",914,110,48,34,actionRecordPage>0,"#fff"); drawBtn(">","",972,110,48,34,actionRecordPage<arMaxPage(),"#fff");
  const {x0,y0,colW,gap,boxH,rowGap}=arRewardLayout();
  for(let i=0;i<ACTION_RECORD_LEVELS_PER_PAGE;i++){
    const lv=start+i, x=x0+i*(colW+gap); if(lv>ACTION_RECORD_MAX_LEVEL) continue;
    const reached=lv<=actionRecordLevel, current=lv===actionRecordLevel;
    ctx.fillStyle=current?"#ffe066":reached?"#7cc7ff":"rgba(255,255,255,.32)";
    ctx.beginPath(); ctx.arc(x+colW/2,174, current?7:5,0,Math.PI*2); ctx.fill();
    if(i<ACTION_RECORD_LEVELS_PER_PAGE-1){ ctx.strokeStyle=reached?"rgba(124,199,255,.75)":"rgba(255,255,255,.14)"; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x+colW/2+9,174); ctx.lineTo(x+colW+gap+colW/2-9,174); ctx.stroke(); }
    ctx.fillStyle="rgba(255,255,255,.66)"; ctx.font="11px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(String(lv),x+colW/2,158);
  }
  const tracks=["free","advanced","ultimate"];
  for(let row=0; row<tracks.length; row++){
    const track=tracks[row], y=y0+row*rowGap;
    ctx.fillStyle=track==="free"?"#d8e1ec":track==="advanced"?"#7cc7ff":"#ffe066";
    ctx.font="bold 14px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(arTrackName(track),342,y-12);
    for(let i=0;i<ACTION_RECORD_LEVELS_PER_PAGE;i++){
      const lv=start+i,x=x0+i*(colW+gap);if(lv>ACTION_RECORD_MAX_LEVEL)continue;
      drawArRewardBox(track,lv,x,y,colW,boxH);
    }
  }
}
function drawActionRecordTasks(){
  arNormalizeTasks();
  const cats=["daily","weekly","monthly"];
  const tabX=342, tabY=112;
  for(let i=0;i<cats.length;i++){
    const c=cats[i]; drawBtn(arTaskName(c),"",tabX+i*150,tabY,136,38,actionRecordTaskTab===c,c==="monthly"?"#ffe066":"#7cc7ff");
  }
  drawBtn(arText("全部领取","Claim All"),"",900,112,126,38,arMissionDefs(actionRecordTaskTab).some(t=>arTaskCanClaim(actionRecordTaskTab,t)),"#ffe066");
  const list=arMissionDefs(actionRecordTaskTab);
  ctx.fillStyle="rgba(255,255,255,.55)"; ctx.font="12px "+FONT_UI; ctx.textAlign="left";
  ctx.fillText(arText("完成任务获得行动记录EXP。简单任务每日4:00刷新，每周任务周一4:00刷新，高难任务每月1日4:00刷新。","Complete missions for Action Record EXP. Simple missions refresh daily at 04:00; weekly on Monday 04:00; high difficulty monthly at day 1 04:00."),342,168);
  ctx.fillText(arTaskName(actionRecordTaskTab)+"  "+arCompletedCount(actionRecordTaskTab)+" / "+list.length,342,190);
  const viewX=342, viewY=212, viewW=684, viewH=338, rowH=76;
  ctx.save(); ctx.beginPath(); ctx.rect(viewX,viewY,viewW,viewH); ctx.clip();
  const maxScroll=Math.max(0, list.length*rowH-viewH+8); actionRecordTaskScroll=clamp(actionRecordTaskScroll,0,maxScroll);
  for(let i=0;i<list.length;i++){
    const t=list[i], y=viewY+i*rowH-actionRecordTaskScroll, p=arTaskProgress(t), done=p>=t.target, claimed=arTaskClaimed(actionRecordTaskTab,t.id), can=arTaskCanClaim(actionRecordTaskTab,t);
    if(y+rowH<viewY || y>viewY+viewH) continue;
    ctx.fillStyle=can?"rgba(255,224,102,.13)":done?"rgba(124,199,255,.10)":"rgba(255,255,255,.055)"; ctx.fillRect(viewX,y,viewW-16,rowH-10);
    ctx.strokeStyle=can?"rgba(255,224,102,.50)":"rgba(255,255,255,.12)"; ctx.strokeRect(viewX,y,viewW-16,rowH-10);
    ctx.fillStyle=claimed?"#7cc7ff":"#fff"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(language==="en"?t.en:t.zh,viewX+18,y+26);
    ctx.fillStyle="rgba(255,255,255,.60)"; ctx.font="12px "+FONT_UI; ctx.fillText(p+" / "+t.target,viewX+18,y+48);
    ctx.fillStyle="rgba(255,255,255,.12)"; ctx.fillRect(viewX+110,y+40,210,7); ctx.fillStyle=done?"#7cc7ff":"rgba(124,199,255,.65)"; ctx.fillRect(viewX+110,y+40,210*clamp(p/t.target,0,1),7);
    ctx.fillStyle="#ffe066"; ctx.font="bold 13px "+FONT_UI; ctx.textAlign="right"; ctx.fillText("+"+t.exp+" EXP"+(t.crystal?"  /  "+arText("水晶","Crystal")+" ×"+t.crystal:""),viewX+520,y+30);
    drawBtn(claimed?arText("已领取","Claimed"):(can?arText("领取","Claim"):arText("进行中","Progress")),"",viewX+546,y+18,100,36,can,"#ffe066");
  }
  ctx.restore();
  if(maxScroll>0){
    ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(viewX+viewW-8,viewY,6,viewH);
    ctx.fillStyle="rgba(124,199,255,.70)"; const barH=Math.max(34,viewH*viewH/(list.length*rowH)); ctx.fillRect(viewX+viewW-8,viewY+(viewH-barH)*(actionRecordTaskScroll/maxScroll),6,barH);
  }
}
function drawActionRecord(){
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#11182d"); bg.addColorStop(.58,"#070a14"); bg.addColorStop(1,"#03040a"); ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,.055)"; ctx.fillRect(36,28,1048,604); ctx.strokeStyle="rgba(124,199,255,.18)"; ctx.strokeRect(36,28,1048,604);
  ctx.fillStyle="rgba(255,255,255,.05)"; ctx.fillRect(318,44,728,552); ctx.strokeStyle="rgba(255,255,255,.11)"; ctx.strokeRect(318,44,728,552);
  ctx.fillStyle="rgba(0,0,0,.28)";ctx.fillRect(650,62,376,38);ctx.strokeStyle="rgba(255,255,255,.10)";ctx.strokeRect(650,62,376,38);
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(arText("本期进度","SEASON PROGRESS"),666,85);
  ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(782,77,174,8);ctx.fillStyle="#d7ed4a";ctx.fillRect(782,77,174*clamp(actionRecordExp/actionRecordExpNeed,0,1),8);
  ctx.fillStyle="#fff";ctx.font="bold 12px Arial";ctx.textAlign="right";ctx.fillText(actionRecordExp+" / "+actionRecordExpNeed,1010,86);
  drawActionRecordLeft();
  drawBtn(arText("奖励","Rewards"),"",342,62,132,38,actionRecordTab==="rewards","#7cc7ff");
  drawBtn(arText("任务","Missions"),"",488,62,132,38,actionRecordTab==="tasks","#ffe066");
  if(actionRecordTab==="tasks") drawActionRecordTasks(); else drawActionRecordRewards();
  if(actionRecordMsgTimer>0){ ctx.fillStyle="rgba(0,0,0,.45)"; ctx.fillRect(342,566,670,34); ctx.strokeStyle="rgba(255,255,255,.12)"; ctx.strokeRect(342,566,670,34); ctx.fillStyle="#ffe066"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(actionRecordMsg,360,588); }
  if(actionRecordWeaponSelecting) drawActionRecordWeaponSelect();
}
function drawActionRecordWeaponSelect(){
  const list=arArmoryList(); const x=W/2-260,y=H/2-175,w=520,h=350;
  ctx.save(); ctx.fillStyle="rgba(0,0,0,.58)"; ctx.fillRect(0,0,W,H); ctx.fillStyle="rgba(7,10,18,.97)"; ctx.fillRect(x,y,w,h); ctx.strokeStyle="rgba(124,199,255,.56)"; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#fff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(arText("雷文哈多武器库","Ravenhado Armory"),x+34,y+52);
  ctx.fillStyle="rgba(255,255,255,.54)"; ctx.font="13px "+FONT_UI; ctx.fillText(actionRecordWeaponSelecting==="standard"?arText("标准","Standard"):arText("完整","Full"),x+36,y+78);
  for(let i=0;i<list.length;i++){ const yy=y+112+i*54, sel=i===actionRecordSelectedWeapon, item=list[i]; ctx.fillStyle=sel?"rgba(124,199,255,.16)":"rgba(255,255,255,.055)"; ctx.fillRect(x+38,yy,444,42); ctx.strokeStyle=sel?"rgba(124,199,255,.65)":"rgba(255,255,255,.12)"; ctx.strokeRect(x+38,yy,444,42); ctx.fillStyle=sel?"#bfe8ff":"#fff"; ctx.font="bold 15px "+FONT_UI; const label=language==="en"?(item.en+" ("+item.typeEn+")"):(item.zh+"（"+item.typeZh+"）"); ctx.fillText((sel?"● ":"○ ")+label,x+58,yy+27); }
  drawBtn(arText("确认","Confirm"),"",x+138,y+h-64,116,42,true,"#ffe066"); drawBtn(arText("取消","Cancel"),"",x+278,y+h-64,116,42,true,"#fff"); ctx.restore();
}
function updateActionRecord(){
  if(actionRecordMsgTimer>0) actionRecordMsgTimer-=frameScale;
  if(justPressed("escape")){ if(actionRecordWeaponSelecting){ actionRecordWeaponSelecting=null; } else gameMode="lobby"; clicked=false; return; }
  if(actionRecordTab==="tasks"){
    if(actionRecordWheelDelta){ actionRecordTaskScroll += actionRecordWheelDelta; actionRecordWheelDelta=0; }
    if(justPressed("pageup")) actionRecordTaskScroll -= 260;
    if(justPressed("pagedown")) actionRecordTaskScroll += 260;
  }else actionRecordWheelDelta=0;
  if(!clicked) return;
  if(actionRecordWeaponSelecting){
    const x=W/2-260,y=H/2-175,w=520,h=350,list=arArmoryList();
    for(let i=0;i<list.length;i++){ const yy=y+112+i*54; if(inRect(x+38,yy,444,42)){ actionRecordSelectedWeapon=i; clicked=false; return; } }
    if(inRect(x+138,y+h-64,116,42)){ arConfirmWeapon(); clicked=false; return; }
    if(inRect(x+278,y+h-64,116,42)){ actionRecordWeaponSelecting=null; clicked=false; return; }
    clicked=false; return;
  }
  if(inRect(82,548,202,42)){ gameMode="lobby"; clicked=false; return; }
  if(inRect(82,342,202,42)){ buyActionRecordAdvanced(); clicked=false; return; }
  if(inRect(82,394,202,42)){ buyActionRecordUltimate(); clicked=false; return; }
  if(inRect(342,62,132,38)){ actionRecordTab="rewards"; clicked=false; return; }
  if(inRect(488,62,132,38)){ actionRecordTab="tasks"; clicked=false; return; }
  if(actionRecordTab==="tasks"){
    const cats=["daily","weekly","monthly"], tabX=342, tabY=112;
    for(let i=0;i<cats.length;i++){ if(inRect(tabX+i*150,tabY,136,38)){ actionRecordTaskTab=cats[i]; actionRecordTaskScroll=0; clicked=false; return; } }
    if(inRect(900,112,126,38)){ arClaimAllTasks(); clicked=false; return; }
    const list=arMissionDefs(actionRecordTaskTab), viewX=342, viewY=212, rowH=76;
    for(let i=0;i<list.length;i++){ const y=viewY+i*rowH-actionRecordTaskScroll; if(inRect(viewX+546,y+18,100,36)){ arClaimTask(actionRecordTaskTab,list[i]); clicked=false; return; } }
    clicked=false; return;
  }
  if(inRect(914,110,48,34) && actionRecordPage>0){ actionRecordPage--; clicked=false; return; }
  if(inRect(972,110,48,34) && actionRecordPage<arMaxPage()){ actionRecordPage++; clicked=false; return; }
  const {x0,y0,colW,gap,boxH,rowGap}=arRewardLayout(), start=actionRecordPage*ACTION_RECORD_LEVELS_PER_PAGE+1;
  const tracks=["free","advanced","ultimate"];
  for(let row=0; row<tracks.length; row++){ const y=y0+row*rowGap; for(let i=0;i<ACTION_RECORD_LEVELS_PER_PAGE;i++){ const lv=start+i; if(lv>ACTION_RECORD_MAX_LEVEL) continue; const x=x0+i*(colW+gap); if(inRect(x,y,colW,boxH)){ arClaim(tracks[row], lv); clicked=false; return; } } }
  clicked=false;
}
function drawGrowthGuideMiniButton(){
  const x=W-112, y=24, r=22;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.42)";
  ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#88d8ff";
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.fillStyle="#88d8ff";
  ctx.font="bold 20px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText("📖",x,y+7);
  if(hasGrowthGuideReward()){
    ctx.fillStyle="#ff4d4d";
    ctx.beginPath(); ctx.arc(x+16,y-14,6,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawEmbeddedText(text,x,y,w,h,opts={}){
  ctx.save();
  const active = opts.active !== false;
  ctx.fillStyle = opts.fill || (active ? "rgba(255,255,255,.075)" : "rgba(255,255,255,.04)");
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle = opts.stroke || (active ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.08)");
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle = opts.color || (active ? "#fff" : "#777");
  ctx.font = (opts.font || "bold 15px ") + FONT_UI;
  ctx.textAlign = opts.align || "left";
  ctx.fillText(text, x+(opts.pad||14), y+h/2+5);
  ctx.restore();
}

function drawGrowthGuide(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#151a2f");
  bg.addColorStop(.55,"#090b14");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.07)";
  ctx.fillRect(36,28,1048,604);
  ctx.strokeStyle="rgba(255,255,255,.18)";
  ctx.strokeRect(36,28,1048,604);

  ctx.fillStyle="#fff";
  ctx.font="bold 32px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Battle Manual":"战斗手册",72,78);

  drawBtn(language==="en"?"Growth Guide":"成长引导","",72,104,170,44,growthGuideTab==="growth","#ffe066");
  drawBtn(language==="en"?"Daily Tasks":"每日任务","",256,104,170,44,growthGuideTab==="daily","#88d8ff");
  if(growthGuideTab==="daily"){ drawBattleManualDailyTasks(); drawBtn(language==="en"?"Back to Lobby":"返回大厅","ESC",820,560,220,52,true,"#fff"); return; }

  const i=growthGuidePage;
  const p=GROWTH_GUIDE_PAGES[i];
  const unlocked=growthGuidePageUnlocked(i);
  const doneCount=unlocked ? p.tasks.filter((t,idx)=>growthTaskClaimed(i,idx)).length : 0;
  const completeCount=unlocked ? p.tasks.filter((t,idx)=>growthTaskDone(i,idx)).length : 0;
  const canPageClaim=growthGuideCanClaimPage(i);

  ctx.fillStyle="rgba(0,0,0,.25)";
  ctx.fillRect(72,162,976,86);
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.strokeRect(72,162,976,86);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 54px " + FONT_UI;
  ctx.fillText(String(i+1).padStart(2,"0"),100,224);

  ctx.fillStyle="#fff";
  ctx.font="bold 23px " + FONT_UI;
  ctx.fillText((language==="en"?p.title.en:p.title.zh),190,197);

  drawEmbeddedText((language==="en"?"Claimed ":"已领取 ")+doneCount+"/5",190,210,120,26,{font:"bold 13px ",fill:"rgba(255,255,255,.08)",stroke:"rgba(255,255,255,.10)",color:"#fff"});
  drawEmbeddedText((language==="en"?"Completed ":"已完成 ")+completeCount+"/5",320,210,126,26,{font:"bold 13px ",fill:"rgba(136,216,255,.09)",stroke:"rgba(136,216,255,.20)",color:"#88d8ff"});

  ctx.fillStyle="rgba(255,255,255,.16)";
  ctx.fillRect(470,220,260,10);
  ctx.fillStyle="#ff9f43";
  ctx.fillRect(470,220,260*(doneCount/5),10);

  drawBtn("<","",760,186,54,48,i>0,"#fff");
  drawBtn(">","",970,186,54,48,i<GROWTH_GUIDE_PAGES.length-1,"#fff");

  drawEmbeddedText((language==="en"?"Page Reward: ":"页面奖励：")+growthRewardText(p.pageReward),72,260,680,36,{font:"bold 14px ",fill:"rgba(255,224,102,.08)",stroke:"rgba(255,224,102,.22)",color:"#ffe066"});
  drawBtn(growthGuidePageClaimed[i]?(language==="en"?"Claimed":"已领取"):(language==="en"?"Claim Page":"领取页面奖励"),"",770,260,210,36,canPageClaim,"#ffe066");

  for(let t=0;t<5;t++){
    const task=p.tasks[t];
    const y=315+t*50;
    const complete=growthTaskDone(i,t);
    const claimed=growthTaskClaimed(i,t);
    const canClaim=unlocked && complete && !claimed;

    ctx.fillStyle=claimed?"rgba(136,216,255,.10)":complete?"rgba(255,224,102,.10)":"rgba(255,255,255,.055)";
    ctx.fillRect(92,y,920,40);
    ctx.strokeStyle=claimed?"rgba(136,216,255,.34)":complete?"rgba(255,224,102,.28)":"rgba(255,255,255,.12)";
    ctx.strokeRect(92,y,920,40);

    drawEmbeddedText(claimed?"✓":complete?"!":"□",105,y+7,34,26,{align:"center",pad:0,font:"bold 15px ",fill:"rgba(0,0,0,.22)",stroke:"rgba(255,255,255,.10)",color:claimed?"#88d8ff":complete?"#ffe066":"#aaa"});
    drawEmbeddedText(language==="en"?task.en:task.zh,150,y+7,390,26,{font:"bold 14px ",fill:"rgba(0,0,0,.16)",stroke:"rgba(255,255,255,.08)",color:unlocked?"#fff":"#777"});
    drawEmbeddedText(growthRewardText(task.reward),552,y+7,260,26,{font:"bold 12px ",fill:"rgba(124,199,255,.08)",stroke:"rgba(124,199,255,.16)",color:"#bfe8ff"});
    drawBtn(claimed?(language==="en"?"Claimed":"已领取"):(complete?(language==="en"?"Claim":"领取"):(language==="en"?"Locked":"未完成")),"",832,y+5,150,30,canClaim,complete?"#ffe066":"#777");
  }

  if(!unlocked){
    ctx.fillStyle="rgba(0,0,0,.68)";
    ctx.fillRect(72,250,976,350);
    ctx.fillStyle="#fff";
    ctx.font="bold 26px " + FONT_UI;
    ctx.textAlign="center";
    ctx.fillText(language==="en"?"Claim the previous page reward first":"请先领取上一页页面奖励",W/2,420);
  }

  ctx.fillStyle="rgba(255,255,255,.45)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Each task gives 500 EXP and materials. Complete all 5 tasks to claim the page reward.":"每个任务可领取500EXP和材料；5个任务全部领取后，可领取页面大奖。",78,620);

  drawBtn(language==="en"?"Back to Lobby":"返回大厅","ESC",820,560,220,52,true,"#fff");
}

function updateGrowthGuide(){
  if(clicked){
    if(inRect(820,560,220,52)){ enterLobby(); clicked=false; return; }
    if(inRect(72,104,170,44)){ growthGuideTab="growth"; clicked=false; return; }
    if(inRect(256,104,170,44)){ growthGuideTab="daily"; clicked=false; return; }
    if(growthGuideTab==="daily"){
      if(inRect(72,560,170,42)){ bmClaimAllDaily(); clicked=false; return; }
      if(inRect(780,260,202,36)){ bmClaimDailyPage(); clicked=false; return; }
      const list=bmDailyDefs();
      for(let i=0;i<list.length;i++){ const y=315+i*39; if(inRect(868,y+3,118,26)){ bmClaimDailyTask(list[i]); clicked=false; return; } }
      clicked=false; return;
    }
    if(inRect(760,186,54,48) && growthGuidePage>0){ growthGuidePage--; clicked=false; return; }
    if(inRect(970,186,54,48) && growthGuidePage<GROWTH_GUIDE_PAGES.length-1){ growthGuidePage++; clicked=false; return; }
    if(inRect(770,260,210,36)){ claimGrowthGuidePage(); clicked=false; return; }
    for(let t=0;t<5;t++){
      const y=315+t*50;
      if(inRect(832,y+5,150,30)){ claimGrowthGuideTask(growthGuidePage,t); clicked=false; return; }
    }
  }
  if(justPressed("escape")) enterLobby();
  clicked=false;
}

function drawLobbySwitchButton(){
  const x=194,y=355,w=84,h=42,hover=inRect(x,y,w,h);
  ctx.save();
  ctx.translate(hover?2:0,hover?-2:0);
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,hover?"rgba(33,67,96,.97)":"rgba(12,22,37,.94)");
  g.addColorStop(1,"rgba(4,8,16,.97)");
  ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle=hover?"#88d8ff":"rgba(136,216,255,.42)";ctx.lineWidth=hover?2:1.25;ctx.stroke();
  ctx.globalAlpha=.55+Math.sin(menuPulse*.09)*.18;ctx.fillStyle="#88d8ff";ctx.fillRect(x+2,y+8,3,h-16);ctx.globalAlpha=1;
  ctx.strokeStyle="#fff";ctx.lineWidth=2.1;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.arc(x+20,y+21,8,-0.2,Math.PI*1.25);
  ctx.stroke();
  ctx.fillStyle="#fff";
  ctx.beginPath();
  ctx.moveTo(x+28,y+14);ctx.lineTo(x+33,y+14);ctx.lineTo(x+30,y+19);
  ctx.closePath();
  ctx.fill();
  ctx.textAlign="left";ctx.textBaseline="middle";ctx.font="bold 12px "+FONT_UI;ctx.fillText(language==="en"?"SWITCH":"切换",x+39,y+22);
  ctx.restore();
}

function lobbyNoticeData(){
  if(language==="en") return [
    [
      {date:"07/10",title:"Chapter 0 Available",tag:"NEW",headline:"Chapter 0: Arrival",body:"The opening chapter is now available. Select Main Story, choose Chapter 0, and enter the stage map.",foot:"Project Zero Development Team"},
      {date:"07/09",title:"Launch Supply",tag:"EVENT",headline:"Launch Supply Notice",body:"Remember to check Mail and Events after entering the lobby. Available rewards are shown inside each feature.",foot:"Project Zero Operations"},
      {date:"07/08",title:"Feature Unlocks",tag:"INFO",headline:"Chapter Progress and Unlocks",body:"Dungeon, Side Story, and Action Record unlock after completing Chapter 0.",foot:"Project Zero Operations"}
    ],
    [
      {date:"07/10",title:"Version Update",tag:"UPDATE",headline:"Game Interface Update",body:"The standalone index launch, Chapter 0 numbering, and the new chapter-card page are now included.",foot:"Project Zero Development Team"},
      {date:"07/09",title:"Save Information",tag:"SAVE",headline:"Local and Cloud Saves",body:"Local saves work in the standalone build. Cloud account features require an internet connection.",foot:"Project Zero Development Team"},
      {date:"07/08",title:"Known Features",tag:"NOTICE",headline:"Current Development Build",body:"Some later chapters and future modes remain locked while their content is under development.",foot:"Project Zero Development Team"}
    ],
    [
      {date:"07/10",title:"Follow Development",tag:"PZ",headline:"Project Zero Development News",body:"Major game changes and test announcements will appear in this notice center.",foot:"Project Zero"},
      {date:"07/09",title:"Test Feedback",tag:"TEST",headline:"Feedback Information",body:"When reporting a problem, include the page, action, and visible error so it can be reproduced.",foot:"Project Zero Development Team"}
    ]
  ];
  return [
    [
      {date:"07/10",title:"第零章现已开放",tag:"NEW",headline:"第零章：初入",body:"序章内容现已开放。进入主线后选择“第零章：初入”卡牌，即可前往关卡地图。",foot:"Project Zero 开发组"},
      {date:"07/09",title:"欢迎奖励提醒",tag:"活动",headline:"欢迎奖励公告",body:"进入大厅后记得查看邮件与活动页面，可领取的奖励会显示在对应功能中。",foot:"Project Zero 运营组"},
      {date:"07/08",title:"功能解锁说明",tag:"说明",headline:"章节进度与功能解锁",body:"完成第零章后，将解锁副本、Side Story 与行动记录等功能。",foot:"Project Zero 运营组"}
    ],
    [
      {date:"07/10",title:"版本更新说明",tag:"更新",headline:"游戏界面更新",body:"本次版本已加入 index 独立启动、第零章编号，以及全新的章节卡牌选择页面。",foot:"Project Zero 开发组"},
      {date:"07/09",title:"存档功能说明",tag:"存档",headline:"本地存档与云端存档",body:"独立版本可以使用本地存档；账号与云端存档功能需要连接网络。",foot:"Project Zero 开发组"},
      {date:"07/08",title:"当前开放内容",tag:"公告",headline:"当前开发版本说明",body:"后续章节与部分未来模式仍处于开发阶段，因此会暂时显示为锁定。",foot:"Project Zero 开发组"}
    ],
    [
      {date:"07/10",title:"关注开发动态",tag:"PZ",headline:"Project Zero 开发资讯",body:"重要游戏改动、测试安排和开发公告会集中显示在这个公告中心。",foot:"Project Zero"},
      {date:"07/09",title:"测试反馈说明",tag:"测试",headline:"问题反馈信息",body:"反馈问题时请附上所在页面、操作步骤和可见错误，方便准确复现与修复。",foot:"Project Zero 开发组"}
    ]
  ];
}

function drawSpeakerIcon(x,y,r=23){
  const hover=dist(mouseX,mouseY,x,y)<r+5;
  ctx.save();
  ctx.fillStyle=hover?"rgba(124,199,255,.22)":"rgba(0,0,0,.42)";
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=hover?"#ffe066":"#88d8ff";
  ctx.lineWidth=2;ctx.stroke();
  ctx.font="25px 'Segoe UI Emoji','Apple Color Emoji',sans-serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillStyle="#fff";
  ctx.fillText("📢",x,y+1);
  if(hasUiNewDot("lobby.notice.v1",!lobbyNoticeOpen)){ctx.fillStyle="#ff4058";ctx.translate(x+16,y-16);ctx.rotate(Math.PI/4);ctx.fillRect(-5,-5,10,10);}
  ctx.restore();
}

function drawLobbyNoticeCenter(){
  const cats=language==="en"?["Event Notices","Game Notices","News"]:["活动公告","游戏公告","资讯速报"];
  const list=lobbyNoticeData()[lobbyNoticeCategory] || [];
  lobbyNoticeSelected=clamp(lobbyNoticeSelected,0,Math.max(0,list.length-1));
  const item=list[lobbyNoticeSelected] || {headline:"",body:"",foot:""};
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.74)";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(235,241,246,.98)";ctx.fillRect(38,36,1044,588);
  ctx.strokeStyle="rgba(124,199,255,.55)";ctx.lineWidth=2;ctx.strokeRect(38,36,1044,588);

  ctx.fillStyle="#15202b";ctx.fillRect(38,36,1044,76);
  ctx.fillStyle="#fff";ctx.font="bold 24px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"NOTICE CENTER":"公告中心",68,82);
  for(let i=0;i<cats.length;i++){
    const x=350+i*180,sel=i===lobbyNoticeCategory;
    ctx.fillStyle=sel?"#e8edf2":"#26323d";ctx.fillRect(x,58,160,42);
    ctx.strokeStyle=sel?"#ffe066":"rgba(255,255,255,.18)";ctx.strokeRect(x,58,160,42);
    ctx.fillStyle=sel?"#17212c":"rgba(255,255,255,.78)";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="center";ctx.fillText(cats[i],x+80,85);
  }
  ctx.fillStyle="rgba(255,255,255,.14)";ctx.beginPath();ctx.arc(1049,65,17,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.fillText("×",1049,72);

  ctx.fillStyle="#1a242e";ctx.fillRect(56,124,282,474);
  for(let i=0;i<list.length;i++){
    const n=list[i],y=132+i*74,sel=i===lobbyNoticeSelected;
    ctx.fillStyle=sel?"#f4f7f9":"rgba(255,255,255,.055)";ctx.fillRect(68,y,256,62);
    if(sel){ctx.fillStyle="#ffe066";ctx.fillRect(68,y,5,62);}
    ctx.fillStyle=sel?"#17212c":"rgba(255,255,255,.82)";ctx.font="bold 14px "+FONT_UI;ctx.textAlign="left";ctx.fillText(n.title,86,y+25);
    ctx.fillStyle=sel?"#6b7780":"rgba(255,255,255,.42)";ctx.font="11px Arial";ctx.fillText(n.date,86,y+46);
    ctx.textAlign="right";ctx.fillStyle=sel?"#b27b00":"#ffe066";ctx.font="bold 10px "+FONT_UI;ctx.fillText(n.tag,310,y+45);
  }

  const cx=360,cy=124,cw=700,ch=474;
  ctx.fillStyle="#fff";ctx.fillRect(cx,cy,cw,ch);
  ctx.fillStyle="#eff3f6";ctx.fillRect(cx,cy,cw,92);
  ctx.fillStyle="#17212c";ctx.font="bold 30px "+FONT_UI;ctx.textAlign="left";ctx.fillText(item.headline,cx+38,cy+56);
  ctx.fillStyle="#b78600";ctx.fillRect(cx+38,cy+73,112,4);
  ctx.fillStyle="#33414c";ctx.font="17px "+FONT_UI;wrapText(item.body,cx+42,cy+145,cw-84,31);
  ctx.fillStyle="rgba(124,199,255,.13)";ctx.fillRect(cx+42,cy+245,cw-84,116);
  ctx.strokeStyle="rgba(28,57,78,.18)";ctx.strokeRect(cx+42,cy+245,cw-84,116);
  ctx.fillStyle="#1e3c50";ctx.font="bold 18px "+FONT_UI;ctx.fillText(language==="en"?"PROJECT ZERO INFORMATION":"PROJECT ZERO 资讯",cx+68,cy+286);
  ctx.fillStyle="#61717d";ctx.font="14px "+FONT_UI;ctx.fillText(language==="en"?"More notices will appear here as development continues.":"后续开发与测试公告将在这里持续更新。",cx+68,cy+322);
  ctx.fillStyle="#8a969e";ctx.font="13px "+FONT_UI;ctx.textAlign="right";ctx.fillText(item.foot,cx+cw-38,cy+ch-34);
  ctx.restore();
}

function drawLobbyFeatureCard(x,y,w,h,title,sub,accent="#7cc7ff",icon=""){
  const hover=inRect(x,y,w,h);
  ctx.save();
  ctx.translate(0,hover?-3:0);
  const grad=ctx.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,hover?"rgba(43,58,85,.96)":"rgba(28,37,58,.93)");
  grad.addColorStop(1,"rgba(4,7,16,.96)");
  ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle=hover?accent:"rgba(170,195,225,.34)";ctx.lineWidth=hover?2:1.35;ctx.stroke();
  ctx.beginPath();ctx.roundRect(x,y,hover?7:4,h,4);ctx.fillStyle=accent;ctx.fill();
  if(hover){
    ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.clip();
    const sx=x+((menuPulse*4)%(w+130))-80;
    const sheen=ctx.createLinearGradient(sx,y,sx+70,y);sheen.addColorStop(0,"rgba(255,255,255,0)");sheen.addColorStop(.5,"rgba(255,255,255,.10)");sheen.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=sheen;ctx.fillRect(x,y,w,h);ctx.restore();
  }
  ctx.textAlign="left";ctx.fillStyle="#fff";
  const compact=w<90, fontSize=compact?16:h>=150?48:h>=105?32:h>=80?25:21, pad=compact?11:24;
  ctx.font="bold "+fontSize+"px "+FONT_UI;ctx.fillText(title,x+pad,y+(h>=150?82:h>=105?58:h>=80?48:42));
  if(sub){ctx.fillStyle="rgba(255,255,255,.72)";ctx.font="12px "+FONT_UI;ctx.fillText(sub,x+pad+1,y+h-20);}
  if(icon){ctx.textAlign="right";ctx.fillStyle=hover?accent:"rgba(255,255,255,.25)";ctx.font="bold "+(compact?32:Math.min(76,h*.62))+"px Arial";ctx.fillText(icon,x+w-(compact?12:18),y+h-18+(hover?Math.sin(menuPulse*.12)*2:0));}
  ctx.restore();
}

function drawLobbyMissionTerminal(x,y,w,h){
  const hover=inRect(x,y,w,h),m=lobbyRecommendedMission(),lift=hover?-3:0;
  ctx.save();ctx.translate(0,lift);
  const grad=ctx.createLinearGradient(x,y,x+w,y+h);
  grad.addColorStop(0,hover?"rgba(43,58,85,.96)":"rgba(28,37,58,.93)");
  grad.addColorStop(1,"rgba(4,7,16,.96)");
  ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.fillStyle=grad;ctx.fill();
  ctx.strokeStyle=hover?"#ffe066":"rgba(170,195,225,.34)";ctx.lineWidth=hover?2:1.35;ctx.stroke();
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.clip();
  ctx.fillStyle="#ffe066";ctx.fillRect(x,y,hover?7:4,h);
  ctx.globalAlpha=.035;ctx.strokeStyle="#bcd4ed";ctx.lineWidth=1;
  for(let i=-h;i<w;i+=34){ctx.beginPath();ctx.moveTo(x+i,y+h);ctx.lineTo(x+i+h,y);ctx.stroke();}
  ctx.globalAlpha=.11;ctx.fillStyle="#fff";ctx.font="bold 64px "+FONT_UI;ctx.textAlign="right";ctx.fillText("PZ",x+w-18,y+h-22);
  if(hover){
    const sx=x+((menuPulse*4)%(w+150))-90;
    const sheen=ctx.createLinearGradient(sx,y,sx+80,y);sheen.addColorStop(0,"rgba(255,255,255,0)");sheen.addColorStop(.5,"rgba(255,255,255,.11)");sheen.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=sheen;ctx.fillRect(x,y,w,h);
  }
  ctx.restore();

  ctx.textAlign="left";ctx.fillStyle="#ffe066";ctx.font="bold 10px "+FONT_UI;ctx.fillText(m.chapterText,x+24,y+27);
  ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="bold 10px Arial";ctx.textAlign="right";ctx.fillText("OPERATIONS / TERMINAL",x+w-22,y+27);
  ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 42px "+FONT_UI;ctx.fillText(m.code,x+24,y+79);
  ctx.fillStyle="rgba(255,255,255,.93)";ctx.font="bold 18px "+FONT_UI;
  fitText(m.title,238,18,"bold",12);ctx.fillText(m.title,x+25,y+111);
  ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="11px "+FONT_UI;ctx.fillText(m.hint,x+25,y+136);

  const barX=x+25,barY=y+h-30,barW=w-118;
  ctx.fillStyle="rgba(255,255,255,.13)";ctx.fillRect(barX,barY,barW,4);
  const pulse=Math.sin(menuPulse*.08)*.025;
  ctx.fillStyle="#ffe066";ctx.fillRect(barX,barY,barW*Math.max(.035,Math.min(1,m.progress+pulse)),4);
  ctx.fillStyle="rgba(255,255,255,.36)";ctx.font="9px Arial";ctx.textAlign="left";ctx.fillText(language==="en"?"MISSION PROGRESS":"任务进度",barX,barY+17);

  const ax=x+w-70,ay=y+h/2+4;
  ctx.beginPath();ctx.arc(ax,ay,31,0,Math.PI*2);ctx.fillStyle=hover?"rgba(255,224,102,.20)":"rgba(255,255,255,.07)";ctx.fill();
  ctx.strokeStyle=hover?"#ffe066":"rgba(255,255,255,.20)";ctx.lineWidth=1.5;ctx.stroke();
  ctx.beginPath();ctx.moveTo(ax-8,ay-13);ctx.lineTo(ax+12,ay);ctx.lineTo(ax-8,ay+13);ctx.closePath();ctx.fillStyle=hover?"#ffe066":"rgba(255,255,255,.68)";ctx.fill();
  ctx.restore();
}

function drawLobbyRailButton(x,y,w,h,title,sub,accent){
  const hover=inRect(x,y,w,h);
  ctx.save();ctx.translate(hover?2:0,0);
  ctx.beginPath();ctx.roundRect(x,y,w,h,11);ctx.fillStyle=hover?"rgba(31,52,78,.96)":"rgba(8,14,27,.90)";ctx.fill();
  ctx.strokeStyle=hover?accent:"rgba(170,195,225,.32)";ctx.lineWidth=hover?2:1.25;ctx.stroke();
  ctx.beginPath();ctx.roundRect(x,y,4,h,3);ctx.fillStyle=accent;ctx.fill();
  const pad=w<80?7:14;
  ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold "+(w<80?11:16)+"px "+FONT_UI;ctx.fillText(title,x+pad,y+25);
  ctx.fillStyle="rgba(255,255,255,.67)";ctx.font=(w<80?8:10)+"px "+FONT_UI;ctx.fillText(sub,x+pad,y+43);
  if(hover){ctx.globalAlpha=.5+Math.sin(menuPulse*.1)*.2;ctx.fillStyle=accent;ctx.fillRect(x+w-8,y+8,2,h-16);ctx.globalAlpha=1;}
  ctx.restore();
}

function drawLobbyCheckinPopup(){
  normalizeMonthlyLoginCheckin();
  const x=50,y=35,w=1020,h=570,rewards=monthlyCheckinRewards(),days=monthlyLoginCheckin.dates.length,totalDays=monthlyLoginCheckin.totalDates.length;
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.76)";ctx.fillRect(0,0,W,H);
  const shell=ctx.createLinearGradient(x,y,x+w,y+h);shell.addColorStop(0,"rgba(22,29,45,.99)");shell.addColorStop(1,"rgba(7,10,18,.99)");
  ctx.beginPath();ctx.roundRect(x,y,w,h,20);ctx.fillStyle=shell;ctx.fill();ctx.strokeStyle="rgba(124,199,255,.30)";ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.roundRect(x,y,w,6,4);ctx.fillStyle="#ffe066";ctx.fill();
  ctx.fillStyle="#fff";ctx.font="bold 28px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Monthly Check-in":"月度签到",x+30,y+46);
  ctx.fillStyle="rgba(255,255,255,.50)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"30-day calendar · monthly progress resets, lifetime progress stays":"独立30日签到 · 月度进度重置，累计进度永久保留",x+30,y+69);
  ctx.fillStyle="#7cc7ff";ctx.font="bold 13px "+FONT_UI;ctx.fillText(monthlyLoginCheckin.month+"  ·  "+(language==="en"?"Logged ":"已登录 ")+days+" / 30",x+390,y+48);
  ctx.beginPath();ctx.arc(x+w-19,y+21,16,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.08)";ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 20px Arial";ctx.textAlign="center";ctx.fillText("×",x+w-19,y+28);

  const sx=80,sy=125,cw=90,ch=66,gapX=8,gapY=8;
  for(let i=0;i<rewards.length;i++){
    const col=i%6,row=Math.floor(i/6),xx=sx+col*(cw+gapX),yy=sy+row*(ch+gapY),claimed=i<days,current=i===days;
    ctx.beginPath();ctx.roundRect(xx,yy,cw,ch,9);ctx.fillStyle=claimed?"rgba(124,199,255,.08)":current?"rgba(255,224,102,.15)":"rgba(255,255,255,.045)";ctx.fill();
    ctx.strokeStyle=current?"#ffe066":claimed?"rgba(124,199,255,.28)":"rgba(255,255,255,.10)";ctx.lineWidth=current?2:1;ctx.stroke();
    ctx.fillStyle=current?"#ffe066":"rgba(255,255,255,.62)";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText((language==="en"?"D":"第")+(i+1)+(language==="en"?"":"天"),xx+8,yy+16);
    const r=rewards[i],short=r.crystals?"◆ "+r.crystals:r.ore?((language==="en"?"Ore ":"合金 ")+r.ore):r.expBooks?((language==="en"?"Book ":"经验书 ")+r.expBooks):((language==="en"?"Gold ":"金币 ")+r.gold);
    ctx.fillStyle=claimed?"rgba(255,255,255,.38)":"#fff";ctx.font="bold 11px "+FONT_UI;ctx.fillText(short,xx+8,yy+42);
    ctx.fillStyle=claimed?"#7cc7ff":"rgba(255,255,255,.28)";ctx.font="9px "+FONT_UI;ctx.fillText(claimed?"✓":current?(language==="en"?"TODAY":"今日"):"LOCK",xx+8,yy+58);
  }

  const rx=690,ry=105,rw=340;
  ctx.beginPath();ctx.roundRect(rx,ry,rw,62,12);ctx.fillStyle="rgba(255,224,102,.08)";ctx.fill();ctx.strokeStyle="rgba(255,224,102,.25)";ctx.stroke();
  ctx.fillStyle="#ffe066";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"LIFETIME LOGIN MILESTONES":"累计登录里程碑",rx+18,ry+25);
  ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="11px "+FONT_UI;ctx.fillText((language==="en"?"Lifetime login ":"累计登录 ")+totalDays+(language==="en"?" days":" 天")+"  ·  Lv."+playerLevel,rx+18,ry+47);

  const milestones=monthlyCheckinMilestones();
  for(let i=0;i<milestones.length;i++){
    const m=milestones[i],yy=168+i*50,claimed=!!monthlyLoginCheckin.milestones[m.id],can=monthlyMilestoneCanClaim(m);
    ctx.beginPath();ctx.roundRect(rx,yy,rw,44,9);ctx.fillStyle=claimed?"rgba(124,199,255,.055)":can?"rgba(255,224,102,.13)":"rgba(255,255,255,.045)";ctx.fill();
    ctx.strokeStyle=can?"#ffe066":claimed?"rgba(124,199,255,.25)":"rgba(255,255,255,.10)";ctx.lineWidth=can?2:1;ctx.stroke();
    ctx.fillStyle=claimed?"rgba(255,255,255,.45)":"#fff";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";ctx.fillText(m.days+(language==="en"?"d · Lv.":"天 · Lv.")+m.level,rx+12,yy+17);
    ctx.fillStyle="#ffe066";fitText(rewardText(m.reward),220,9,"bold",7);ctx.fillText(rewardText(m.reward),rx+12,yy+35);
    ctx.fillStyle="rgba(255,255,255,.40)";ctx.font="9px "+FONT_UI;ctx.textAlign="right";ctx.fillText(Math.min(totalDays,m.days)+"/"+m.days,rx+239,yy+17);
    drawBtn(claimed?(language==="en"?"Claimed":"已领取"):can?(language==="en"?"Claim":"领取"):(language==="en"?"Locked":"未达成"),"",938,yy+7,76,30,can,can?"#ffe066":"#777");
  }

  const available=monthlyCheckinCanSign(),nextReward=rewards[Math.min(days,29)];
  drawBtn(available?(language==="en"?"Check in · ":"立即签到 · ")+rewardText(nextReward):(language==="en"?"Checked in today":"今日已签到"),"",80,535,580,44,available,"#ffe066");
  if(monthlyCheckinMsg){ctx.fillStyle="#ffe066";fitText(monthlyCheckinMsg,570,11,"",8);ctx.textAlign="left";ctx.fillText(monthlyCheckinMsg,80,520);}
  ctx.restore();
}

function drawLobby(){
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#101a33");bg.addColorStop(.52,"#080b16");bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  if(lobbyBackgroundReady){
    // Cover the logical canvas without stretching the supplied 5:3 artwork.
    const scale=Math.max(W/lobbyBackgroundImg.width,H/lobbyBackgroundImg.height);
    const dw=lobbyBackgroundImg.width*scale,dh=lobbyBackgroundImg.height*scale;
    ctx.save();
    ctx.globalAlpha=.82;
    ctx.drawImage(lobbyBackgroundImg,(W-dw)/2,(H-dh)/2,dw,dh);
    ctx.restore();
  }
  drawLobbyThemeEffect();

  // Keep the dense left-side controls readable while preserving the artwork
  // on the center and right. The shade fades fully transparent toward center.
  const lobbyReadability=ctx.createLinearGradient(0,0,W*.58,0);
  lobbyReadability.addColorStop(0,"rgba(3,7,18,.86)");
  lobbyReadability.addColorStop(.42,"rgba(5,9,22,.54)");
  lobbyReadability.addColorStop(1,"rgba(5,9,22,0)");
  ctx.fillStyle=lobbyReadability;ctx.fillRect(0,0,W*.62,H);

  ctx.fillStyle="rgba(73,113,190,.045)";ctx.beginPath();ctx.moveTo(325,78);ctx.lineTo(665,78);ctx.lineTo(640,H);ctx.lineTo(286,H);ctx.closePath();ctx.fill();
  ctx.strokeStyle="rgba(124,199,255,.14)";ctx.strokeRect(14,14,W-28,H-28);
  ctx.save();
  ctx.translate(lobbyParallaxX,lobbyParallaxY);

  // Left quick-access rail: achievements / battle manual / pass.
  drawLobbyRailButton(28,30,96,58,language==="en"?"Achievements":"成就",language==="en"?"Records":"完成记录","#ffe066");
  drawLobbyRailButton(28,100,96,58,language==="en"?"Manual":"战斗手册",language==="en"?"Daily":"每日任务","#7cc7ff");
  drawLobbyRailButton(28,170,96,58,language==="en"?"Pass":"通行证","PROJECT ZERO","#d596ff");
  drawNewDiamond(116,38,contentDot("achievements"));
  drawNewDiamond(116,108,contentDot("manual"));
  drawNewDiamond(116,178,contentDot("pass",canUseActionRecord()));

  // Center executor is intentionally frameless so the portrait sits in the scene.
  ctx.save();
  ctx.translate(-lobbyParallaxX,-lobbyParallaxY);
  drawLobbyExecutor();
  ctx.restore();
  drawLobbyDialogue();
  drawLobbySwitchButton();

  // Time and resources.
  const now=new Date();
  ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="bold 16px Arial";ctx.textAlign="right";
  ctx.fillText(String(now.getHours()).padStart(2,"0")+":"+String(now.getMinutes()).padStart(2,"0"),554,51);
  drawCompactResourceBar(570,22,494,true);

  // Right-side functional card grid based on the supplied layout draft.
  drawLobbyMissionTerminal(690,94,374,190);
  drawLobbyFeatureCard(690,298,175,74,tr(ui("event"),"Event"),"NEW","#d596ff","+");
  drawLobbyFeatureCard(880,298,184,74,tr(ui("operators"),"Executors"),language==="en"?"TEAM":"队伍","#7cc7ff","◆");
  drawLobbyFeatureCard(690,386,260,82,tr(ui("shop"),"Shop"),language==="en"?"SUPPLIES":"补给","#ffe066","$");
  drawLobbyFeatureCard(964,386,100,82,tr(ui("mail"),"Mail"),mailClaimed?tr(ui("claimed"),"Claimed"):"NEW","#7cc7ff","✉");
  drawLobbyFeatureCard(690,482,300,122,tr(ui("warehouse"),"Inventory"),language==="en"?"ITEMS · MODULES":"物品 · 武器","#7cffb2","▦");
  drawLobbyFeatureCard(1003,482,61,122,language==="en"?"SET":"设置","","#7cc7ff","⚙");
  drawNewDiamond(1054,103,contentDot("operation"));
  drawNewDiamond(852,307,contentDot("event"));
  drawNewDiamond(1054,307,contentDot("operators"));
  drawNewDiamond(940,395,contentDot("shop"));
  drawNewDiamond(1054,395,contentDot("mail"));

  // Player/profile and version information cluster.
  const profileHover=inRect(28,405,166,54);
  ctx.beginPath();ctx.roundRect(28,405,166,54,11);ctx.fillStyle=profileHover?"rgba(31,52,78,.96)":"rgba(8,14,27,.91)";ctx.fill();
  ctx.strokeStyle=profileHover?"#7cc7ff":"rgba(170,195,225,.32)";ctx.stroke();
  ctx.fillStyle="#7cc7ff";ctx.beginPath();ctx.arc(52,432,16,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#071018";ctx.textAlign="center";ctx.font="bold 14px "+FONT_UI;ctx.fillText((playerName||"P").slice(0,1).toUpperCase(),52,437);
  ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 14px "+FONT_UI;ctx.fillText(playerName||"PLAYER",76,426);
  ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="10px "+FONT_UI;ctx.fillText("Lv."+playerLevel+" · UID "+(playerUID||"--------"),76,444);
  drawNewDiamond(186,413,contentDot("profile"));
  drawLobbyRailButton(194,405,84,54,language==="en"?"Archive":"档案",language==="en"?"SOON":"即将开放","#88d8ff");

  const versionSlides=language==="en"?[
    {title:"CHAPTER 1",headline:"Forgotten Project 4",sub:"Ravenhado Story Update",color:"#ffe066"},
    {title:"DAYDREAM",headline:"Reconstruction",sub:"Unlock after Chapter 1",color:"#b78cff"},
    {title:"LIMITED EVENT",headline:"X4 Match!",sub:"Stage and Endless Modes",color:"#72d8ff"}
  ]:[
    {title:"第一章",headline:"遗忘的 Project 4",sub:"雷文哈多篇现已开放",color:"#ffe066"},
    {title:"白日梦",headline:"重现调查",sub:"通关第一章后解锁",color:"#b78cff"},
    {title:"限时活动",headline:"消消消消乐！",sub:"关卡模式与无尽模式",color:"#72d8ff"}
  ];
  const versionIndex=Math.floor(Date.now()/10000)%versionSlides.length, versionSlide=versionSlides[versionIndex];
  const vg=ctx.createLinearGradient(28,470,278,604);vg.addColorStop(0,"rgba(35,55,91,.92)");vg.addColorStop(1,"rgba(4,7,15,.98)");
  ctx.beginPath();ctx.roundRect(28,470,250,134,12);ctx.fillStyle=vg;ctx.fill();ctx.strokeStyle="rgba(124,199,255,.42)";ctx.stroke();
  ctx.beginPath();ctx.roundRect(28,470,5,134,3);ctx.fillStyle=versionSlide.color;ctx.fill();
  ctx.fillStyle="#7cc7ff";ctx.font="bold 11px Arial";ctx.textAlign="left";ctx.fillText("VERSION 49.18.9",44,492);
  ctx.fillStyle="#fff";ctx.font="bold 23px "+FONT_UI;ctx.fillText(versionSlide.title,44,529);
  ctx.fillStyle=versionSlide.color;ctx.font="bold 16px "+FONT_UI;ctx.fillText(versionSlide.headline,44,555);
  ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="11px "+FONT_UI;ctx.fillText(versionSlide.sub,44,579);
  for(let i=0;i<versionSlides.length;i++){ctx.fillStyle=i===versionIndex?versionSlide.color:"rgba(255,255,255,.24)";ctx.beginPath();ctx.arc(118+i*16,592,3,0,Math.PI*2);ctx.fill();}

  drawLobbyRailButton(286,490,62,54,language==="en"?"Notice":"公告","NEWS","#ff8fab");
  drawLobbyRailButton(286,550,62,54,language==="en"?"Check-in":"签到","MONTHLY","#ffe066");
  drawNewDiamond(340,498,contentDot("notice"));
  drawNewDiamond(342,555,contentDot("checkin"));

  checkAchievementsThrottled();
  ctx.restore();
  if(lobbyCheckinOpen) drawLobbyCheckinPopup();
  if(lobbyNoticeOpen) drawLobbyNoticeCenter();
  drawStaminaRecoverOverlay();
  drawLobbyAssistantSelector();
  if(!lobbyCheckinOpen&&!lobbyNoticeOpen&&!staminaRecoverOpen&&!lobbyAssistantSelectorOpen) drawLobbyStarterGuide();
}

const commissionChapters = [
  {no:1,zh:"外围清扫",en:"Outer Sweep",color:"#7cc7ff",stages:[
    {name:"Street Sweep",zh:"街区清理",type:"annihilation",mechanicZh:"连续击破：每波敌人数量增加",mechanicEn:"Escalation: each wave adds an enemy",lv:4,time:210},
    {name:"Shield Line",zh:"护盾防线",type:"shield",mechanicZh:"护盾增幅：带盾敌人防御更高",mechanicEn:"Fortified: shield units gain defense",lv:7,time:200},
    {name:"Crossfire",zh:"交叉火力",type:"ranged",mechanicZh:"远程压制：优先处理射手",mechanicEn:"Crossfire: ranged units pressure the field",lv:10,time:190},
    {name:"Street Captain",zh:"街区队长",type:"elite",mechanicZh:"精英指挥：末波出现强化精英",mechanicEn:"Elite Command: empowered elite in wave 4",lv:13,time:180,boss:true}
  ]},
  {no:2,zh:"工业封锁",en:"Industrial Lockdown",color:"#ffe066",stages:[
    {name:"Power Relay",zh:"能源中继",type:"berserker",mechanicZh:"狂热：敌人低血量时加速",mechanicEn:"Frenzy: low-HP enemies accelerate",lv:18,time:175},
    {name:"Armored Depot",zh:"装甲仓库",type:"shield",mechanicZh:"装甲编队：护盾与远程单位混编",mechanicEn:"Armored formation: shields protect ranged units",lv:22,time:170},
    {name:"Conveyor Rush",zh:"传送带突袭",type:"mixed",mechanicZh:"增援：每波追加不同类型敌人",mechanicEn:"Reinforcements: mixed enemy types each wave",lv:26,time:165},
    {name:"Factory Core",zh:"工厂核心",type:"chapterBoss",mechanicZh:"核心过载：末波出现大型守卫",mechanicEn:"Core overload: guardian appears in wave 4",lv:30,time:160,boss:true}
  ]},
  {no:3,zh:"裂隙警戒",en:"Rift Alert",color:"#c35cff",stages:[
    {name:"Rift Echo",zh:"裂隙回响",type:"mixed",mechanicZh:"镜像增援：敌人组合快速轮换",mechanicEn:"Echo waves: enemy formations rotate quickly",lv:35,time:155},
    {name:"Hunter Pack",zh:"追猎群",type:"berserker",mechanicZh:"追猎：狂战敌人移动速度提升",mechanicEn:"Hunt: berserkers move faster",lv:40,time:150},
    {name:"Crystal Battery",zh:"晶体炮列",type:"ranged",mechanicZh:"弹幕：远程单位射击间隔缩短",mechanicEn:"Barrage: ranged attacks fire faster",lv:45,time:145},
    {name:"Rift Warden",zh:"裂隙监守",type:"chapterBoss",mechanicZh:"裂隙首领：最终波拥有护盾与狂暴阶段",mechanicEn:"Rift warden: shield and rage phases",lv:50,time:140,boss:true}
  ]},
  {no:4,zh:"零界试炼",en:"Zero Boundary",color:"#ff6b9b",stages:[
    {name:"Pressure Test",zh:"极限压力",type:"elite",mechanicZh:"高压：精英敌人从第二波开始出现",mechanicEn:"High pressure: elites appear from wave 2",lv:55,time:135},
    {name:"No Safe Range",zh:"无安全距离",type:"mixed",mechanicZh:"夹击：近战与远程敌人同步进攻",mechanicEn:"Pincer: melee and ranged attack together",lv:60,time:130},
    {name:"Red Threshold",zh:"红色临界",type:"bossPrep",mechanicZh:"临界：所有敌人低血量时进入狂热",mechanicEn:"Threshold: all enemies frenzy at low HP",lv:65,time:125},
    {name:"Final Commission",zh:"最终委托",type:"chapterBoss",mechanicZh:"最终考验：四波均为强化混合编队",mechanicEn:"Final trial: four empowered mixed waves",lv:70,time:120,boss:true}
  ]}
];
const commissionStages = commissionChapters.flatMap((chapter,ci)=>chapter.stages.map((s,si)=>({
  ...s,id:ci*4+si+1,chapter:ci+1,localId:si+1,reward:200,exp:700+ci*300+si*80,
  name:"C"+(ci+1)+"-"+(si+1)+" "+s.name,zh:"委托 "+(ci+1)+"-"+(si+1)+" "+s.zh,
  desc:s.mechanicEn,zhDesc:s.mechanicZh
})));

function currentCommissionStages(){ return commissionStages.slice(selectedCommissionChapter*4,selectedCommissionChapter*4+4); }
function currentCommissionStage(){ return commissionStages[selectedStage-1] || commissionStages[0]; }
function battleAreaLimit(){
  if(battleModeSource==="commission") return 4;
  if(battleModeSource==="daydream") return clamp((daydreamBattleConfig&&daydreamBattleConfig.areas)||2,1,3);
  return 3;
}


// V42 Dungeon Battle Flow - proper mode selection -> material detail -> team -> battle -> settlement
function dungeonHomeCardsLegacyV42(){
  return language === "en" ? [
    {key:"material", name:"Material Trials", icon:"◆", color:"#7cc7ff", desc:"Gold, Executor EXP, Weapon Ore, and Modules."},
    {key:"boss", name:"Boss Challenge", icon:"B", color:"#ff6b9b", desc:"Challenge powerful enemies. Coming soon."},
    {key:"explore", name:"Exploration", icon:"◇", color:"#7cffb2", desc:"Explore routes and collect one-time rewards."},
    {key:"patrol", name:"Patrol", icon:"P", color:"#ffe066", desc:"Dispatch operators for timed rewards."}
  ] : [
    {key:"material", name:"材料副本", icon:"◆", color:"#7cc7ff", desc:"金币 / 角色升级材料 / 武器强化材料。"},
    {key:"boss", name:"Boss挑战", icon:"B", color:"#ff6b9b", desc:"强敌挑战。开发中。"},
    {key:"explore", name:"探索地图", icon:"◇", color:"#7cffb2", desc:"宝箱 / 木箱 / 一次性奖励。开发中。"},
    {key:"patrol", name:"巡逻", icon:"P", color:"#ffe066", desc:"派遣执行官获得定时奖励。"}
  ];
}

function materialDungeonsV42(){
  return language === "en" ? [
    {key:"gold", name:"Gold Trial", short:"Gold", color:"#ffe066", desc:"Obtain Gold.", enemy:"Crystal Worker", base:{gold:2500, expBooks:0, weaponOre:0}},
    {key:"exp", name:"Executor EXP", short:"EXP", color:"#7cffb2", desc:"Earn materials used to level executors.", enemy:"Crystal Beast", base:{gold:650, expBooks:4, weaponOre:0}},
    {key:"weapon", name:"Weapon Upgrade", short:"Weapon", color:"#7cc7ff", desc:"Earn Weapon Ore used to upgrade weapons.", enemy:"Crystal Guard", base:{gold:650, expBooks:0, weaponOre:4}},
    {key:"module", name:"Module Archive", short:"Module", color:"#b98cff", desc:"Obtain permanent fixed-stat module sets.", enemy:"Module Sentinel", base:{gold:500, expBooks:0, weaponOre:0}},
    {key:"skill", name:"Skill Training", short:"Skill", color:"#ff9f7c", desc:"Earn Skill Books and dedicated skill materials.", enemy:"Training Construct", base:{gold:500, expBooks:0, weaponOre:0,skillBooks:2,skillNormal:2,skillSkill:1,skillUltimate:1}}
  ] : [
    {key:"gold", name:"金币试炼", short:"金币", color:"#ffe066", desc:"获得金币。", enemy:"晶体工人", base:{gold:2500, expBooks:0, weaponOre:0}},
    {key:"exp", name:"角色升级材料", short:"角色", color:"#7cffb2", desc:"获得角色升级材料。", enemy:"晶体兽", base:{gold:650, expBooks:4, weaponOre:0}},
    {key:"weapon", name:"武器强化材料", short:"武器", color:"#7cc7ff", desc:"获得武器强化材料。", enemy:"晶体守卫", base:{gold:650, expBooks:0, weaponOre:4}},
    {key:"module", name:"模块档案副本", short:"模块", color:"#b98cff", desc:"获取常驻固定数值模块套装。", enemy:"模块哨兵", base:{gold:500, expBooks:0, weaponOre:0}},
    {key:"skill", name:"技能训练副本", short:"技能", color:"#ff9f7c", desc:"获取技能书与三类专用技能材料。", enemy:"训练构造体", base:{gold:500, expBooks:0, weaponOre:0,skillBooks:2,skillNormal:2,skillSkill:1,skillUltimate:1}}
  ];
}

function roman(n){ return ["","Ⅰ","Ⅱ","Ⅲ","Ⅳ","Ⅴ","Ⅵ"][n] || String(n); }

function storyChapterComplete(chapter){
  if(chapter===1) return !!cleared["ch1_10"];
  if(chapter===2) return !!cleared.ch2_complete || !!cleared.ch2_11;
  return !!cleared["ch"+chapter+"_complete"] || !!cleared["ch"+chapter+"_10"];
}

function materialDifficultyRequirement(key,diff){
  if(diff<=1) return {ok:true,zh:"默认开放",en:"Available"};
  const chapter=clamp(Math.floor(diff)-1,1,5);
  return {
    ok:storyChapterComplete(chapter),
    zh:"通关第"+chapter+"章",
    en:"Clear Chapter "+chapter
  };
}
function materialDifficultyUnlocked(key,diff){return materialDifficultyRequirement(key,diff).ok;}
function syncSelectedMaterialDifficulty(){
  const d=materialDungeonsV42()[materialDungeonSelected]||materialDungeonsV42()[0];
  const min=d.key==="module"?2:1;
  materialDungeonDifficulties=Object.assign({gold:1,exp:1,weapon:1,module:2,skill:1},materialDungeonDifficulties||{});
  materialDungeonDifficulty=clamp(Math.floor(materialDungeonDifficulties[d.key]||min),min,6);
  if(!materialDifficultyUnlocked(d.key,materialDungeonDifficulty)){
    for(let g=materialDungeonDifficulty;g>=min;g--)if(materialDifficultyUnlocked(d.key,g)){materialDungeonDifficulty=g;break;}
  }
  materialDungeonDifficulties[d.key]=materialDungeonDifficulty;
}

function currentWeekKey(){
  const d = new Date();
  const oneJan = new Date(d.getFullYear(),0,1);
  const day = Math.floor((d - oneJan) / 86400000);
  const week = Math.ceil((day + oneJan.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + week;
}

function normalizeDungeonRuntime(){
  if(typeof dungeonStamina !== "number") dungeonStamina = Math.max(dungeonStamina || 0, 240);
  dungeonStamina = clamp(dungeonStamina, 0, 9999);
  if(typeof dungeonWeeklyCrystalLeft !== "number") dungeonWeeklyCrystalLeft = 3;
  const wk = currentWeekKey();
  if(dungeonCrystalWeekKey !== wk){
    dungeonCrystalWeekKey = wk;
    dungeonWeeklyCrystalLeft = 3;
  }

  if(typeof dungeonCandyDailyUsed !== "number") dungeonCandyDailyUsed = 0;
  if(typeof dungeonCandyDailyKey !== "string") dungeonCandyDailyKey = "";
  const dk = currentDateKey();
  if(dungeonCandyDailyKey !== dk){
    dungeonCandyDailyKey = dk;
    dungeonCandyDailyUsed = 0;
  }
  dungeonCandyDailyUsed = clamp(Math.floor(dungeonCandyDailyUsed || 0),0,6);

  dungeonRewardMultiplier = clamp(Math.floor(dungeonRewardMultiplier || 1), 1, 4);
  materialDungeonDifficulty = clamp(Math.floor(materialDungeonDifficulty || 1), 1, 6);
  materialDungeonSelected = clamp(Math.floor(materialDungeonSelected || 0), 0, 4);
  if(materialDungeonSelected===3 && !canUseModuleDungeon()) materialDungeonSelected=0;
  const validPanels=new Set(["home","list","material","boss","projectArea","patrol"]);
  if(!validPanels.has(dungeonPanelMode) || dungeonPanelMode==="list") dungeonPanelMode="home";
  if(dungeonPanelMode==="patrol" && (!window.PZPatrol || typeof window.PZPatrol.drawDetail!=="function")) dungeonPanelMode="home";
  syncSelectedMaterialDifficulty();
  if(materialDungeonSelected===3 && (!window.PZModules || !window.PZModules.SETS || !Array.isArray(window.PZModules.ITEMS))){
    materialDungeonSelected=0;
    syncSelectedMaterialDifficulty();
  }
}


function materialRewardPreviewV42(run){
  normalizeDungeonRuntime();
  const d = materialDungeonsV42()[run ? run.selected : materialDungeonSelected] || materialDungeonsV42()[0];
  const diff = run ? run.difficulty : materialDungeonDifficulty;
  const mult = run ? run.multiplier : dungeonRewardMultiplier;
  return {
    gold: Math.floor((d.base.gold + diff * 450) * mult),
    expBooks: Math.floor((d.base.expBooks + Math.max(0,diff-1)*2) * mult),
    weaponOre: Math.floor((d.base.weaponOre + Math.max(0,diff-1)*2) * mult),
    skillBooks: Math.floor(((d.base.skillBooks||0) + (d.key==="skill"?Math.max(0,diff-1):0)) * mult),
    skillNormal: Math.floor(((d.base.skillNormal||0) + (d.key==="skill"?Math.floor(Math.max(0,diff-1)/2):0)) * mult),
    skillSkill: Math.floor(((d.base.skillSkill||0) + (d.key==="skill"?Math.floor(Math.max(0,diff-1)/3):0)) * mult),
    skillUltimate: Math.floor(((d.base.skillUltimate||0) + (d.key==="skill"?Math.floor(Math.max(0,diff-1)/4):0)) * mult),
    crystal: dungeonWeeklyCrystalLeft > 0 ? 20 : 0,
    staminaCost: 20 * mult,
    expReward: 350 + diff * 100,
    type:d.key,
    name:d.name,
    enemy:d.enemy
  };
}

function startMaterialDungeonTeam(){
  normalizeDungeonRuntime();
  const preview = materialRewardPreviewV42();
  if(preview.type==="module" && !canUseModuleDungeon()){showFeatureLocked("chapter1");return;}
  const req=materialDifficultyRequirement(preview.type,materialDungeonDifficulty);
  if(!req.ok){showCenter(language==="en"?req.en:req.zh,75);return;}
  if(dungeonStamina < preview.staminaCost){
    openStaminaRecover(language==="en" ? "Not enough stamina." : "体力不足。");
    return;
  }
  materialDungeonRun = {
    selected: materialDungeonSelected,
    difficulty: materialDungeonDifficulty,
    multiplier: dungeonRewardMultiplier,
    moduleTarget: moduleDungeonTarget,
    preview,
    returnTab:"dungeon"
  };
  if(!materialDungeonRun.preview || !Number.isFinite(materialDungeonRun.preview.staminaCost)){
    materialDungeonRun=null;
    showCenter(language==="en" ? "Dungeon data was repaired. Please try again." : "副本数据已修复，请重新尝试。",90);
    return;
  }
  battleModeSource = "materialDungeon";
  clearTransientBattleState();
  gameMode = "team";
}

function spawnMaterialDungeonArea(){
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=false; commissionComplete=false;chapterObjectivePrompted=false;
  const run = materialDungeonRun || {selected:0,difficulty:1,multiplier:1};
  const diff = run.difficulty || 1;
  const kind = materialDungeonsV42()[run.selected] || materialDungeonsV42()[0];
  const lvScale = diff;

  function tunedEnemy(x,y,type,boss=false){
    const e = createEnemy(x,y,boss,type);
    const hpMul = 1 + diff * 0.28 + (run.multiplier-1)*0.10;
    e.hp = Math.floor(e.hp * hpMul);
    e.maxHp = e.hp;
    if(e.shield) e.shield = Math.floor(e.shield * (1 + diff * 0.18));
    return e;
  }

  if(kind.key==="gold"){
    if(area===1){ enemies.push(tunedEnemy(520,H/2+70,"normal")); enemies.push(tunedEnemy(720,H/2+145,"normal")); }
    else if(area===2){ enemies.push(tunedEnemy(470,H/2+50,"normal")); enemies.push(tunedEnemy(660,H/2+125,"berserker")); enemies.push(tunedEnemy(850,H/2+60,"normal")); }
    else { enemies.push(tunedEnemy(650,H/2+95,"elite")); enemies.push(tunedEnemy(840,H/2+145,"berserker")); }
  }else if(kind.key==="exp"){
    if(area===1){ enemies.push(tunedEnemy(540,H/2+80,"berserker")); enemies.push(tunedEnemy(735,H/2+120,"normal")); }
    else if(area===2){ enemies.push(tunedEnemy(475,H/2+70,"berserker")); enemies.push(tunedEnemy(700,H/2+120,"shield")); }
    else { enemies.push(tunedEnemy(690,H/2+90,"elite")); enemies.push(tunedEnemy(520,H/2+145,"berserker")); enemies.push(tunedEnemy(870,H/2+55,"normal")); }
  }else if(kind.key==="weapon"){
    if(area===1){ enemies.push(tunedEnemy(540,H/2+90,"shield")); enemies.push(tunedEnemy(740,H/2+130,"normal")); }
    else if(area===2){ enemies.push(tunedEnemy(450,H/2+60,"shield")); enemies.push(tunedEnemy(690,H/2+125,"ranged")); enemies.push(tunedEnemy(850,H/2+60,"normal")); }
    else { enemies.push(tunedEnemy(700,H/2+90,"shield")); enemies.push(tunedEnemy(500,H/2+145,"elite")); }
  }else if(kind.key==="module"){
    if(area===1){ enemies.push(tunedEnemy(520,H/2+80,"ranged")); enemies.push(tunedEnemy(750,H/2+125,"shield")); }
    else if(area===2){ enemies.push(tunedEnemy(460,H/2+65,"ranged")); enemies.push(tunedEnemy(680,H/2+125,"elite")); enemies.push(tunedEnemy(850,H/2+70,"shield")); }
    else { enemies.push(tunedEnemy(680,H/2+90,"elite")); enemies.push(tunedEnemy(500,H/2+145,"ranged")); enemies.push(tunedEnemy(870,H/2+70,"shield")); }
  }else{
    if(area===1){ enemies.push(tunedEnemy(520,H/2+80,"normal")); enemies.push(tunedEnemy(740,H/2+125,"ranged")); }
    else if(area===2){ enemies.push(tunedEnemy(460,H/2+65,"shield")); enemies.push(tunedEnemy(680,H/2+125,"ranged")); enemies.push(tunedEnemy(850,H/2+70,"normal")); }
    else { enemies.push(tunedEnemy(680,H/2+90,"elite")); enemies.push(tunedEnemy(500,H/2+145,"shield")); enemies.push(tunedEnemy(870,H/2+70,"ranged")); }
  }

  showCenter((language==="en"?"MATERIAL ":"材料副本 ") + roman(diff) + " / AREA 0" + area, 70);
}

function applyMaterialDungeonReward(){
  normalizeDungeonRuntime();
  const r = materialRewardPreviewV42(materialDungeonRun);
  dungeonStamina = clamp(dungeonStamina - r.staminaCost, 0, 9999);
  gold += r.gold;
  expBooks += r.expBooks;
  weaponOre += r.weaponOre;
  skillBooks += r.skillBooks||0;
  skillMaterials.normal += r.skillNormal||0;
  skillMaterials.skill += r.skillSkill||0;
  skillMaterials.ultimate += r.skillUltimate||0;
  if(r.type==="module"&&window.PZModules){
    r.moduleDrops=[];
    const count=Math.max(1,(materialDungeonRun&&materialDungeonRun.multiplier)||1);
    for(let n=0;n<count;n++){
      const id=window.PZModules.nextDrop(crystalModuleInventory,(materialDungeonRun&&materialDungeonRun.difficulty)||materialDungeonDifficulty,materialDungeonRun&&materialDungeonRun.moduleTarget);
      if(id){crystalModuleInventory.push(id);const d=window.PZModules.item(id);r.moduleDrops.push({id,name:language==="en"?d.nameEn:d.nameZh,grade:d.grade});}
    }
    if(r.moduleDrops.length){const set=window.PZModules.SETS[(materialDungeonRun&&materialDungeonRun.moduleTarget)||"survey"];r.moduleName=(set?(language==="en"?set.en:set.zh):r.moduleDrops[0].name)+" ×"+r.moduleDrops.length;r.moduleGrade=r.moduleDrops[0].grade;}
  }
  if(r.crystal > 0){
    r.crystal=grantFreeCrystals(r.crystal);
    dungeonWeeklyCrystalLeft = Math.max(0, dungeonWeeklyCrystalLeft - 1);
  }
  totalGoldEarned += r.gold;
  addPlayerExp(r.expReward);
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(true);
  return r;
}

function drawDungeonTopBarV42(){
  normalizeDungeonRuntime();
  ctx.save();
  const bar=ctx.createLinearGradient(W-410,34,W-70,76);
  bar.addColorStop(0,"rgba(12,19,34,.96)"); bar.addColorStop(1,"rgba(5,8,16,.96)");
  ctx.fillStyle=bar;
  ctx.fillRect(W-410,34,340,42);
  ctx.strokeStyle="rgba(124,199,255,.36)";
  ctx.strokeRect(W-410,34,340,42);
  ctx.fillStyle="#fff";
  ctx.font="bold 15px " + FONT_UI;
  ctx.textAlign="left";
  drawStaminaIcon(W-395,42,25);
  ctx.fillText((language==="en"?"Stamina ":"体力 ")+Math.floor(dungeonStamina)+"/240",W-366,61);
  ctx.fillStyle="#7cc7ff";
  ctx.fillText((language==="en"?"Weekly Crystal ":"每周水晶 ")+dungeonWeeklyCrystalLeft+"/3",W-235,61);
  ctx.restore();
}

function drawDungeonInlinePanelLegacyV42(){
  normalizeDungeonRuntime();
  drawDungeonTopBarV42();

  ctx.save();
  const panel=ctx.createLinearGradient(70,145,1050,535);
  panel.addColorStop(0,"rgba(14,23,42,.97)"); panel.addColorStop(.55,"rgba(9,14,27,.97)"); panel.addColorStop(1,"rgba(5,8,18,.98)");
  ctx.fillStyle=panel;
  ctx.fillRect(70,145,980,390);
  ctx.strokeStyle="rgba(124,199,255,.46)";
  ctx.lineWidth=2;
  ctx.strokeRect(70,145,980,390);
  ctx.fillStyle="rgba(124,199,255,.75)"; ctx.fillRect(70,145,980,3);

  if(dungeonPanelMode==="material") drawMaterialDungeonDetailV42();
  else drawDungeonHomeV42();

  ctx.restore();
}

function drawDungeonHomeV42(){
  const cards = dungeonHomeCards();
  uiSectionTitle(language==="en"?"Dungeon":"副本", language==="en"?"Choose a dungeon mode":"选择副本模式",95,195);

  for(let i=0;i<cards.length;i++){
    const c=cards[i];
    const col=i%2, row=Math.floor(i/2);
    const x=125+col*455, y=255+row*125, w=400, h=95;
    const hover=uiCard(x,y,w,h,c.color,false);
    ctx.fillStyle=c.color;
    ctx.font="bold 32px Arial";
    ctx.textAlign="center";
    ctx.fillText(c.icon,x+42,y+58);
    ctx.textAlign="left";
    ctx.fillStyle="#fff";
    ctx.font="bold 22px " + FONT_UI;
    ctx.fillText(c.name,x+86,y+36);
    ctx.fillStyle=hover?"rgba(255,255,255,.74)":"rgba(255,255,255,.62)";
    ctx.font="14px " + FONT_UI;
    ctx.fillText(c.desc,x+86,y+65);
  }
}


function moduleStatSummaryV43(d){
  if(!d)return "";
  const labels=language==="en"?{hp:"HP",atk:"ATK",def:"DEF",speedPct:"Speed"}:{hp:"生命",atk:"攻击",def:"防御",speedPct:"速度"};
  return Object.entries(d.stats||{}).map(([k,v])=>(labels[k]||k)+" +"+(k.endsWith("Pct")?Math.round(v*1000)/10+"%":v)).join("  ·  ");
}

function drawModuleArchiveDungeonV43(){
  const sets=window.PZModules&&window.PZModules.SETS||{};
  const base=Object.keys(sets).map(id=>({id,setId:id,nameZh:sets[id].zh,nameEn:sets[id].en}));
  if(!base.length)return;
  const grade=window.PZModules.gradeForDifficulty(materialDungeonDifficulty);
  const pool=window.PZModules.ITEMS.filter(d=>d.setId===moduleDungeonTarget&&d.grade===grade);
  const selected=pool[0]||window.PZModules.ITEMS.find(d=>d.setId===base[0].id&&d.grade===grade);
  if(!selected){
    materialDungeonSelected=0;
    moduleArchiveScroll=0;
    drawMaterialDungeonDetailV42();
    return;
  }
  const rowH=52, viewX=95, viewY=238, viewW=360, viewH=228;
  const maxScroll=Math.max(0,base.length*rowH-viewH);
  if(moduleArchiveWheelDelta){moduleArchiveScroll=clamp(moduleArchiveScroll+moduleArchiveWheelDelta*.55,0,maxScroll);moduleArchiveWheelDelta=0;}

  ctx.fillStyle="#fff";ctx.font="bold 26px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Module Archive":"模块档案",95,190);
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="13px "+FONT_UI;ctx.fillText(language==="en"?"Select a permanent series; any of its four parts can drop":"选择常驻模块系列；通关后随机获得该系列四个部位之一",97,214);
  drawBtn(language==="en"?"Material List":"材料列表","",900,165,120,36,false,"#fff");

  ctx.fillStyle="rgba(3,7,15,.78)";ctx.fillRect(viewX,viewY,viewW,viewH);ctx.strokeStyle="rgba(124,199,255,.28)";ctx.strokeRect(viewX,viewY,viewW,viewH);
  ctx.save();ctx.beginPath();ctx.rect(viewX,viewY,viewW,viewH);ctx.clip();
  for(let i=0;i<base.length;i++){
    const b=base[i], y=viewY+i*rowH-moduleArchiveScroll, active=b.id===moduleDungeonTarget, set=window.PZModules.SETS[b.setId];
    if(y+46<viewY||y>viewY+viewH)continue;
    ctx.fillStyle=active?"rgba(185,140,255,.20)":"rgba(255,255,255,.045)";ctx.fillRect(viewX+7,y+4,viewW-22,44);
    ctx.fillStyle=active?(set&&set.color||"#b98cff"):"rgba(255,255,255,.15)";ctx.fillRect(viewX+7,y+4,4,44);
    ctx.strokeStyle=active?"rgba(185,140,255,.72)":"rgba(255,255,255,.08)";ctx.strokeRect(viewX+7,y+4,viewW-22,44);
    ctx.fillStyle="#fff";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?b.nameEn:b.nameZh,viewX+22,y+23);
    const ownedCount=crystalModuleInventory.filter(id=>{const d=window.PZModules.item(id);return d&&d.setId===b.id&&d.grade===grade;}).length;
    ctx.fillStyle=ownedCount?"#7cffb2":"rgba(255,255,255,.48)";ctx.font="10px "+FONT_UI;ctx.fillText((language==="en"?"GRADE ":"等级 ")+grade+"  ·  "+(language==="en"?"OWNED ×":"持有 ×")+ownedCount,viewX+22,y+40);
  }
  ctx.restore();
  if(maxScroll>0){const thumb=Math.max(30,viewH*viewH/(base.length*rowH)),ty=viewY+(viewH-thumb)*(moduleArchiveScroll/maxScroll);ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(viewX+viewW-9,viewY,3,viewH);ctx.fillStyle="#b98cff";ctx.fillRect(viewX+viewW-9,ty,3,thumb);}

  const dx=482,dy=238,dw=523,dh=228,set=window.PZModules.SETS[selected.setId];
  const panel=ctx.createLinearGradient(dx,dy,dx+dw,dy+dh);panel.addColorStop(0,"rgba(27,22,48,.96)");panel.addColorStop(1,"rgba(8,13,25,.96)");ctx.fillStyle=panel;ctx.fillRect(dx,dy,dw,dh);ctx.strokeStyle=set.color;ctx.strokeRect(dx,dy,dw,dh);
  ctx.fillStyle=set.color;ctx.font="bold 12px "+FONT_UI;ctx.fillText("MODULE ARCHIVE / GRADE "+grade,dx+24,dy+28);
  ctx.fillStyle="#fff";ctx.font="bold 22px "+FONT_UI;ctx.fillText(language==="en"?set.en:set.zh,dx+24,dy+61);
  ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"SERIES DROP POOL · FOUR FIXED PARTS":"系列掉落池 · 四个固定部位",dx+24,dy+86);
  for(let i=0;i<pool.length;i++){
    const d=pool[i],px=dx+24+(i%2)*245,py=dy+113+Math.floor(i/2)*46;
    ctx.fillStyle="rgba(255,255,255,.055)";ctx.fillRect(px,py-18,228,38);ctx.strokeStyle="rgba(255,255,255,.11)";ctx.strokeRect(px,py-18,228,38);
    ctx.fillStyle=set.color;ctx.font="bold 11px "+FONT_UI;ctx.fillText(language==="en"?window.PZModules.SLOT_TEXT[d.slot][1]:window.PZModules.SLOT_TEXT[d.slot][0],px+10,py-1);
    ctx.fillStyle="#cbd5e1";ctx.font="9px "+FONT_UI;ctx.fillText(moduleStatSummaryV43(d),px+68,py-1);
    ctx.fillStyle="#ff9c9c";ctx.fillText(language==="en"?d.drawbackEn:d.drawbackZh,px+68,py+13);
  }
  ctx.fillStyle="rgba(255,255,255,.53)";ctx.font="11px "+FONT_UI;ctx.fillText(language==="en"?"Repeatable · one random part per clear · no random affixes":"可无限刷取 · 每次随机掉落一个部位 · 无随机词条",dx+24,dy+211);

  ctx.fillStyle="rgba(255,255,255,.62)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"DROP GRADE":"掉落等级",95,489);
  for(let g=2;g<=6;g++){const x=185+(g-2)*58,sel=g===grade,unlocked=materialDifficultyUnlocked("module",g);ctx.fillStyle=sel?"rgba(185,140,255,.28)":"rgba(31,39,56,.94)";ctx.fillRect(x,474,48,34);ctx.strokeStyle=sel?"#b98cff":"rgba(255,255,255,.16)";ctx.strokeRect(x,474,48,34);ctx.fillStyle=!unlocked?"#596273":sel?"#d9c6ff":"#fff";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="center";ctx.fillText(unlocked?String(g):"◆",x+24,497);}
  const r=materialRewardPreviewV42();ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="11px "+FONT_UI;ctx.fillText(language==="en"?"RUNS":"刷取倍率",500,497);
  drawBtn("－","",585,474,42,34,false,"#fff");ctx.fillStyle="#fff";ctx.font="bold 15px "+FONT_UI;ctx.textAlign="center";ctx.fillText("×"+dungeonRewardMultiplier,660,497);drawBtn("＋","",693,474,42,34,false,"#fff");
  ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="11px "+FONT_UI;ctx.fillText((language==="en"?"Cost ":"消耗 ")+r.staminaCost,754,497);
  const moduleReq=materialDifficultyRequirement("module",grade),moduleCanStart=moduleReq.ok&&dungeonStamina>=r.staminaCost;
  if(!moduleReq.ok){ctx.fillStyle="#ff9c9c";ctx.font="10px "+FONT_UI;ctx.textAlign="right";ctx.fillText(language==="en"?moduleReq.en:moduleReq.zh,1005,493);}
  drawBtn(moduleReq.ok?(language==="en"?"Start Run":"开始刷取"):(language==="en"?"Locked":"未解锁"),language==="en"?"Team":"编队",830,505,180,38,moduleCanStart,moduleCanStart?"#b98cff":"#777");
}

function drawMaterialDungeonDetailV42(){
  const list=materialDungeonsV42();
  const selected=list[materialDungeonSelected] || list[0];
  const r=materialRewardPreviewV42();

  if(selected.key==="module" && window.PZModules){drawModuleArchiveDungeonV43();return;}

  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Material Dungeon":"材料副本",95,190);
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Select material stage, difficulty, and multiplier":"选择材料关卡、难度和倍率",97,214);

  drawBtn(language==="en"?"Back":"返回","",930,165,90,36,false,"#fff");

  // stage type cards
  for(let i=0;i<list.length;i++){
    const d=list[i], x=95+i*170, y=245, w=156, h=76;
    const sel=materialDungeonSelected===i,stageLocked=d.key==="module"&&!canUseModuleDungeon();
    ctx.fillStyle=stageLocked?"rgba(18,22,33,.82)":sel?"rgba(255,224,102,.22)":"rgba(31,39,56,.94)";
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=sel?"#ffe066":"rgba(255,255,255,.14)";
    ctx.lineWidth=sel?2:1;
    ctx.strokeRect(x,y,w,h);
    ctx.fillStyle=stageLocked?"#687286":d.color;
    ctx.font="bold 14px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(d.name,x+15,y+33);
    ctx.fillStyle="rgba(255,255,255,.52)";
    ctx.font="10px " + FONT_UI;
    ctx.fillText(stageLocked?tr("通关第1章后解锁","Clear Chapter 1 to unlock"):fitTextToWidth(d.desc,w-26,10,false),x+15,y+57);
    const savedDiff=materialDungeonDifficulties[d.key]||(d.key==="module"?2:1);
    ctx.textAlign="right";ctx.fillStyle=d.color;ctx.font="bold 11px "+FONT_UI;ctx.fillText((d.key==="module"?"G":"D")+savedDiff,x+w-12,y+22);
  }

  // difficulty
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Difficulty":"难度",95,352);
  for(let i=1;i<=6;i++){
    const x=95+(i-1)*58, y=368, w=48, h=45;
    const sel=materialDungeonDifficulty===i,unlocked=materialDifficultyUnlocked(selected.key,i);
    ctx.fillStyle=sel?"rgba(255,128,64,.28)":"rgba(31,39,56,.94)";
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=sel?"#ff9955":"rgba(255,255,255,.16)";
    ctx.strokeRect(x,y,w,h);
    ctx.fillStyle=!unlocked?"#596273":sel?"#ff9955":"#fff";
    ctx.font="bold 22px Arial";
    ctx.textAlign="center";
    ctx.fillText(unlocked?roman(i):"◆",x+w/2,y+30);
  }

  // detail panel
  ctx.fillStyle="rgba(21,28,43,.96)";
  ctx.fillRect(470,345,535,150);
  ctx.strokeStyle="rgba(255,224,102,.30)";
  ctx.strokeRect(470,345,535,150);

  ctx.fillStyle=selected.color;
  ctx.font="bold 22px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(selected.name,495,378);
  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Recommended Lv.":"推荐等级 Lv.")+(10+materialDungeonDifficulty*10),495,408);
  ctx.fillText((language==="en"?"Enemy: ":"登场怪物：")+selected.enemy,495,433);
  const currentReq=materialDifficultyRequirement(selected.key,materialDungeonDifficulty);
  if(!currentReq.ok){ctx.fillStyle="#ff9c9c";ctx.font="bold 12px "+FONT_UI;ctx.fillText((language==="en"?"Unlock: ":"解锁条件：")+(language==="en"?currentReq.en:currentReq.zh),700,408);}

  ctx.fillStyle="#ffe066";
  ctx.font="bold 15px " + FONT_UI;
  let rewardLine = [];
  if(r.gold) rewardLine.push((language==="en"?"Gold ×":"金币 ×")+r.gold);
  if(r.expBooks) rewardLine.push((language==="en"?"Char Mat ×":"角色材料 ×")+r.expBooks);
  if(r.weaponOre) rewardLine.push((language==="en"?"Weapon Mat ×":"武器材料 ×")+r.weaponOre);
  if(r.skillBooks) rewardLine.push((language==="en"?"Skill Book ×":"技能书 ×")+r.skillBooks);
  if(r.skillNormal||r.skillSkill||r.skillUltimate) rewardLine.push((language==="en"?"Skill Parts ×":"技能材料 ×")+((r.skillNormal||0)+(r.skillSkill||0)+(r.skillUltimate||0)));
  if(r.type==="module") rewardLine.push(language==="en"?"Fixed Module ×1":"固定模块 ×1");
  ctx.fillText(rewardLine.join(" / "),495,464);

  ctx.fillStyle=r.crystal>0?"#7cc7ff":"rgba(255,255,255,.40)";
  ctx.fillText(r.crystal>0 ? ((language==="en"?"Weekly Crystal +":"每周水晶 +")+r.crystal+" ("+dungeonWeeklyCrystalLeft+"/3)") : (language==="en"?"Weekly Crystal claimed":"每周水晶已领取完"),495,488);

  // multiplier and start
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Multiplier":"倍率",95,456);
  drawBtn("－","",95,470,48,38,false,"#fff");
  ctx.fillStyle="#fff";
  ctx.font="bold 22px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText("×"+dungeonRewardMultiplier,185,497);
  drawBtn("＋","",230,470,48,38,false,"#fff");

  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText((language==="en"?"Cost: ":"消耗：")+r.staminaCost+" / 240",300,495);

  const canStart=currentReq.ok&&dungeonStamina>=r.staminaCost;
  drawBtn(currentReq.ok?(language==="en"?"Start":"开始"):(language==="en"?"Locked":"未解锁"),(language==="en"?"Team":"编队"),830,505,180,44,canStart,canStart?"#ffe066":"#888");
}

function updateDungeonInlineClicksLegacyV42(){
  normalizeDungeonRuntime();
  if(dungeonPanelMode==="material"){
    if(inRect(930,165,90,36)){
      if(materialDungeonSelected===3){materialDungeonSelected=0;moduleArchiveScroll=0;}
      else dungeonPanelMode="home";
      clicked=false;
      return true;
    }
    for(let i=0;i<materialDungeonsV42().length;i++){
      if(inRect(95+i*170,245,156,76)){
        if(i===3&&!canUseModuleDungeon()){showFeatureLocked("chapter1");clicked=false;return true;}
        materialDungeonSelected=i;
        clicked=false;
        return true;
      }
    }
    for(let i=1;i<=6;i++){
      if(inRect(95+(i-1)*58,368,48,45)){
        materialDungeonDifficulty=i;
        clicked=false;
        return true;
      }
    }
    if(inRect(95,470,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier-1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(230,470,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier+1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(830,505,180,44)){
      startMaterialDungeonTeam();
      clicked=false;
      return true;
    }
    return false;
  }

  const cards=dungeonHomeCards();
  for(let i=0;i<cards.length;i++){
    const col=i%2, row=Math.floor(i/2);
    const x=125+col*455, y=255+row*125, w=400, h=95;
    if(inRect(x,y,w,h)){
      if(cards[i].key==="material"){
        dungeonPanelMode="material";
      }else{
        showCenter(language==="en"?"Coming Soon":"开发中",70);
      }
      clicked=false;
      return true;
    }
  }
  return false;
}



// V43 Boss Challenge: Crystal Dragon Kros

function bossChallengeList(){
  return [
    {
      key:"kros",
      name: language==="en" ? "Crystal Dragon: Kros" : "晶体恶龙：克罗斯",
      shortName: language==="en" ? "Kros" : "克罗斯",
      recLv:20,
      unlocked:true
    }
  ];
}

function currentBossChallenge(){
  const list = bossChallengeList();
  bossSelectedIndex = clamp(Math.floor(bossSelectedIndex || 0), 0, Math.max(0, list.length - 1));
  return list[bossSelectedIndex] || list[0];
}

function switchBossChallenge(dir){
  const list = bossChallengeList();
  if(!list.length) return;
  bossSelectedIndex = (bossSelectedIndex + dir + list.length) % list.length;
}

function bossKrosData(){
  const b = currentBossChallenge();
  return {
    key:b.key,
    name:b.name,
    shortName:b.shortName || (language==="en" ? "Kros" : "克罗斯"),
    recLv:b.recLv || 20,
    staminaBase:25
  };
}

function bossKrosWeekKey(){
  return currentWeekKey();
}

function bossKrosWeeklyAvailable(){
  return bossKrosWeeklyKey !== bossKrosWeekKey();
}

function bossKrosRewardPreview(run=null){
  const mult = clamp(Math.floor(run ? run.multiplier : bossMultiplier),1,4);
  return {
    dragonClaw: 1 * mult,
    gold: 20000 * mult,
    expReward: 500 * mult,
    crystal: bossKrosWeeklyAvailable() ? 50 : 0,
    staminaCost: 25 * mult
  };
}

function dungeonHomeCards(){
  return language === "en" ? [
    {key:"material", name:"Material Trials", icon:"◆", color:"#7cc7ff", desc:"Gold, Executor EXP, Weapon Ore, and Modules."},
    {key:"boss", name:"Boss Challenge", icon:"B", color:"#ff6b9b", desc:"Challenge powerful enemies. Coming soon."},
    {key:"explore", name:"Project Area", icon:"◇", color:"#7cffb2", desc:"Exploration map / one-time rewards."},
    {key:"patrol", name:"Patrol", icon:"P", color:"#ffe066", desc:"Dispatch operators for timed rewards."}
  ] : [
    {key:"material", name:"材料副本", icon:"◆", color:"#7cc7ff", desc:"金币 / 角色升级材料 / 武器强化材料。"},
    {key:"boss", name:"Boss挑战", icon:"B", color:"#ff6b9b", desc:"强敌挑战。开发中。"},
    {key:"explore", name:"Project Area", icon:"◇", color:"#7cffb2", desc:"探索地图 / 首通奖励。"},
    {key:"patrol", name:"巡逻", icon:"P", color:"#ffe066", desc:"派遣执行官获得定时奖励。"}
  ];
}


function projectAreaData(){
  return {
    key:"project_area",
    name:"Project Area",
    recLv:20,
    areas:3
  };
}

function ensureProjectAreaRun(){
  if(!projectAreaRun){
    projectAreaRun = {
      chests:0,
      crates:0,
      terminals:0,
      areasCleared:0,
      gold:0,
      expBooks:0,
      weaponOre:0,
      expReward:0
    };
  }
  return projectAreaRun;
}

function drawProjectAreaDetailLegacyV45(){
  const d=projectAreaData();
  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText("Project Area",95,190);

  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Combat exploration / multi-area map":"战斗式探索 / 多区域地图",97,214);
  drawBtn(language==="en"?"Back":"返回","",930,165,90,36,false,"#fff");

  ctx.fillStyle="rgba(124,255,178,.10)";
  ctx.fillRect(95,245,390,250);
  ctx.strokeStyle="rgba(124,255,178,.60)";
  ctx.lineWidth=2;
  ctx.strokeRect(95,245,390,250);

  ctx.fillStyle="#7cffb2";
  ctx.font="bold 28px " + FONT_UI;
  ctx.fillText(d.name,120,292);

  ctx.fillStyle="rgba(255,255,255,.74)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Recommended Lv.":"推荐等级 Lv.")+d.recLv,120,330);
  ctx.fillText(language==="en"?"Area Count: 3 full-screen areas":"区域数量：3个完整Area",120,360);
  ctx.fillText(language==="en"?"Move freely, fight enemies, find rewards.":"自由移动、战斗、寻找奖励。",120,390);
  ctx.fillText(language==="en"?"Side paths include chests / crates / terminals.":"其他方向包含宝箱 / 木箱 / 终端。",120,420);

  ctx.fillStyle="#7cffb2";
  ctx.font="bold 17px " + FONT_UI;
  ctx.fillText(language==="en"?"Available · Area-based combat exploration":"已开放 · Area制战斗探索",120,474);

  ctx.fillStyle="rgba(255,255,255,.05)";
  ctx.fillRect(520,245,485,250);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(520,245,485,250);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(language==="en"?"Rules":"规则",545,282);

  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText(language==="en"?"Each Area is one full battle screen.":"每个Area是一整个战斗屏幕。",545,318);
  ctx.fillText(language==="en"?"Clear enemies to open the next Area.":"清理敌人后开启下一个Area。",545,348);
  ctx.fillText(language==="en"?"Press F near objects to interact.":"靠近物件按 F 互动。",545,378);
  ctx.fillText(language==="en"?"Final Area completion gives settlement rewards.":"完成最终Area后结算奖励。",545,408);

  ctx.fillStyle="rgba(255,255,255,.50)";
  ctx.font="13px " + FONT_UI;
  ctx.fillText(language==="en"?"V1 template for future exploration maps.":"V1：未来探索地图模板。",545,438);

  drawBtn(language==="en"?"Start Exploration":"开始探索",language==="en"?"Team":"编队",805,445,185,48,true,"#7cffb2");
}

function startProjectAreaTeamLegacyV45(){
  projectAreaRun = {
    chests:0,
    crates:0,
    terminals:0,
    areasCleared:0,
    gold:0,
    expBooks:0,
    weaponOre:0,
    expReward:0
  };
  projectAreaObjects = [];
  battleModeSource = "projectArea";
  clearTransientBattleState();
  gameMode = "team";
}

function spawnProjectAreaArea(){
  ensureProjectAreaRun();
  enemies=[];
  projectiles=[];
  lockTarget=null;
  areaCleared=false;
  commissionComplete=false;
  projectAreaObjects=[];

  function addObj(type,x,y,label,reward){
    projectAreaObjects.push({type,x,y,label,done:false,reward:reward||{}});
  }

  if(area===1){
    enemies.push(createEnemy(560,H/2+85,false,"normal"));
    enemies.push(createEnemy(760,H/2+145,false,"normal"));
    addObj("chest",185,H/2-70,language==="en"?"Supply Chest":"补给箱",{gold:900,expBooks:1});
    addObj("crate",350,H/2+175,language==="en"?"Crate":"木箱",{gold:300});
    addObj("terminal",900,H/2-80,language==="en"?"Broken Terminal":"损坏终端",{weaponOre:1});
  }else if(area===2){
    enemies.push(createEnemy(475,H/2+55,false,"ranged"));
    enemies.push(createEnemy(680,H/2+130,false,"shield"));
    enemies.push(createEnemy(850,H/2+60,false,"normal"));
    addObj("chest",250,H/2+170,language==="en"?"Hidden Chest":"隐藏宝箱",{gold:1100,weaponOre:1});
    addObj("crate",1020,H/2-85,language==="en"?"Energy Crate":"能源箱",{expBooks:1});
    addObj("terminal",600,H/2-115,language==="en"?"Area Log":"区域记录",{gold:500});
  }else{
    enemies.push(createEnemy(510,H/2+120,false,"berserker"));
    enemies.push(createEnemy(760,H/2+80,false,"elite"));
    enemies.push(createEnemy(900,H/2+150,false,"ranged"));
    addObj("chest",165,H/2+160,language==="en"?"Final Chest":"终点宝箱",{gold:1500,weaponOre:2});
    addObj("crate",425,H/2-100,language==="en"?"Crate":"木箱",{gold:400});
    addObj("terminal",990,H/2-70,language==="en"?"Project Record":"Project记录",{expBooks:2});
  }

  showCenter("Project Area / AREA 0"+area,75);
  showActionPrompt(language==="en"?"Explore freely. Press F near objects.":"自由探索。靠近物件按F互动。",95);
}

function projectAreaInteract(){
  if(battleModeSource!=="projectArea" || !projectAreaObjects) return false;
  let best=null, bd=9999;
  for(const o of projectAreaObjects){
    if(o.done) continue;
    const d=dist(player.x,player.y,o.x,o.y);
    if(d<55 && d<bd){ best=o; bd=d; }
  }
  if(!best){
    showActionPrompt(language==="en"?"No object nearby":"附近没有可互动目标",35);
    return true;
  }

  best.done=true;
  const run=ensureProjectAreaRun();
  const r=best.reward||{};
  if(best.type==="chest") run.chests++;
  if(best.type==="crate") run.crates++;
  if(best.type==="terminal") run.terminals++;
  run.gold += r.gold||0;
  run.expBooks += r.expBooks||0;
  run.weaponOre += r.weaponOre||0;
  run.expReward += r.expReward||0;
  if(best.type==="chest") run.crystals=(run.crystals||0)+10;

  const got=[];
  if(r.gold) got.push((language==="en"?"Gold ":"金币 ")+r.gold);
  if(r.expBooks) got.push((language==="en"?"EXP Book ":"经验书 ")+r.expBooks);
  if(r.weaponOre) got.push((language==="en"?"Weapon Ore ":"武器矿石 ")+r.weaponOre);
  if(r.expReward) got.push("EXP "+r.expReward);
  if(best.type==="chest") got.push((language==="en"?"Crystal ":"水晶 ")+10);

  addText(best.x,best.y-42,best.label,"#7cffb2",true);
  addParticles(best.x,best.y,"#7cffb2",10,4);
  sfx(best.type==="terminal"?"ui":"reward");
  showActionPrompt((language==="en"?"Investigated: ":"已调查：")+best.label+(got.length?" / "+got.join(" / "):""),95);
  return true;
}

function drawProjectAreaObjects(){
  if(battleModeSource!=="projectArea" || !projectAreaObjects) return;
  for(const o of projectAreaObjects){
    ctx.save();
    ctx.globalAlpha=o.done?.35:1;
    const color=o.type==="chest"?"#ffe066":o.type==="crate"?"#c59b5f":"#7cc7ff";
    ctx.fillStyle=color;
    ctx.strokeStyle=o.done?"rgba(255,255,255,.22)":color;
    ctx.lineWidth=2;

    if(o.type==="chest"){
      ctx.fillRect(o.x-22,o.y-15,44,30);
      ctx.strokeRect(o.x-22,o.y-15,44,30);
      ctx.fillStyle="#061016";
      ctx.font="bold 14px " + FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(o.done?"✓":"BOX",o.x,o.y+5);
    }else if(o.type==="crate"){
      ctx.fillRect(o.x-20,o.y-20,40,40);
      ctx.strokeRect(o.x-20,o.y-20,40,40);
      ctx.beginPath();
      ctx.moveTo(o.x-20,o.y-20); ctx.lineTo(o.x+20,o.y+20);
      ctx.moveTo(o.x+20,o.y-20); ctx.lineTo(o.x-20,o.y+20);
      ctx.stroke();
    }else{
      ctx.beginPath();
      ctx.arc(o.x,o.y,22,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle="#061016";
      ctx.font="bold 14px " + FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(o.done?"✓":"F",o.x,o.y+5);
    }

    if(!o.done && dist(player.x,player.y,o.x,o.y)<65){
      ctx.fillStyle="#fff";
      ctx.font="bold 13px " + FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(language==="en"?"Press F":"按 F",o.x,o.y-34);
    }

    ctx.fillStyle="rgba(255,255,255,.70)";
    ctx.font="11px " + FONT_UI;
    ctx.textAlign="center";
    ctx.fillText(o.label,o.x,o.y+38);
    ctx.restore();
  }
}

function applyProjectAreaReward(){
  const run=ensureProjectAreaRun();
  const completeBonus = area>=3 ? 1 : 0;
  const reward = {
    gold: run.gold + 2800 + run.areasCleared*700,
    expReward: run.expReward + 450 + run.areasCleared*120,
    expBooks: run.expBooks + 3,
    weaponOre: run.weaponOre + 2,
    crystal: (completeBonus ? 40 : 0) + (run.crystals||0),
    baseCrystal: completeBonus ? 40 : 0,
    chestCrystal: run.crystals||0,
    chests: run.chests,
    crates: run.crates,
    terminals: run.terminals,
    areasCleared: run.areasCleared
  };

  gold += reward.gold;
  totalGoldEarned += reward.gold;
  expBooks += reward.expBooks;
  weaponOre += reward.weaponOre;
  if(reward.crystal>0){
    const chestCrystal=Math.max(0,reward.chestCrystal||0);
    if(chestCrystal){crystals+=chestCrystal;totalCrystalsEarned+=chestCrystal;}
    reward.crystal=grantFreeCrystals(reward.baseCrystal||0)+chestCrystal;
  }
  addPlayerExp(reward.expReward);
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(false);
  return reward;
}

function drawProjectAreaSettlementLegacyV45(){
  const r = settlement && settlement.projectAreaReward ? settlement.projectAreaReward : {gold:0,expReward:0,expBooks:0,weaponOre:0,crystal:0,chests:0,crates:0,terminals:0,areasCleared:0};

  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#0b1f18");
  bg.addColorStop(.58,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(0,0,0,.50)";
  ctx.fillRect(W/2-330,88,660,500);
  ctx.strokeStyle="rgba(124,255,178,.75)";
  ctx.strokeRect(W/2-330,88,660,500);

  ctx.textAlign="center";
  ctx.fillStyle="#7cffb2";
  ctx.font="bold 40px " + FONT_UI;
  ctx.fillText("Project Area",W/2,150);

  ctx.fillStyle="#fff";
  ctx.font="bold 25px " + FONT_UI;
  ctx.fillText(language==="en"?"Exploration Complete":"探索完成",W/2,198);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 48px " + FONT_UI;
  ctx.fillText("AREA "+r.areasCleared+"/3",W/2,265);

  ctx.textAlign="left";
  ctx.font="bold 18px " + FONT_UI;
  let y=330;
  ctx.fillStyle="rgba(255,255,255,.80)";
  ctx.fillText("Chests "+r.chests+"   Crates "+r.crates+"   Terminals "+r.terminals,W/2-225,y);
  y+=42;
  ctx.fillStyle="#ffe066"; ctx.fillText((language==="en"?"Gold +":"金币 +")+r.gold,W/2-225,y); y+=32;
  ctx.fillStyle="#ffffff"; ctx.fillText("EXP +"+r.expReward,W/2-225,y); y+=32;
  ctx.fillStyle="#7cffb2"; ctx.fillText((language==="en"?"EXP Books +":"经验书 +")+r.expBooks,W/2-225,y); y+=32;
  ctx.fillStyle="#7cc7ff"; ctx.fillText((language==="en"?"Weapon Ore +":"武器矿石 +")+r.weaponOre,W/2-225,y); y+=32;
  if(r.crystal>0){
    ctx.fillStyle="#c35cff";
    ctx.fillText((language==="en"?"Completion Crystal +":"完成水晶 +")+r.crystal,W/2-225,y);
  }

  drawBtn(language==="en"?"Back to Dungeon":"返回副本","CLICK",W/2-125,520,250,52,true,"#fff");
}

function drawDungeonInlinePanel(){
  normalizeDungeonRuntime();
  drawDungeonTopBarV42();

  ctx.save();
  const panel=ctx.createLinearGradient(70,145,1050,535);
  panel.addColorStop(0,"rgba(14,23,42,.97)"); panel.addColorStop(.55,"rgba(9,14,27,.97)"); panel.addColorStop(1,"rgba(5,8,18,.98)");
  ctx.fillStyle=panel;
  ctx.fillRect(70,145,980,390);
  ctx.strokeStyle="rgba(124,199,255,.46)";
  ctx.lineWidth=2;
  ctx.strokeRect(70,145,980,390);
  ctx.fillStyle="rgba(124,199,255,.75)"; ctx.fillRect(70,145,980,3);

  if(dungeonPanelMode==="material") drawMaterialDungeonDetailV42();
  else if(dungeonPanelMode==="boss") drawBossKrosDetail();
  else if(dungeonPanelMode==="projectArea") drawProjectAreaDetail();
  else if(dungeonPanelMode==="patrol" && window.PZPatrol){
    try{window.PZPatrol.drawDetail();}
    catch(err){
      console.error("[DungeonPatrolDraw]",err);
      dungeonPanelMode="home";
      drawDungeonHomeV42();
    }
  }
  else drawDungeonHomeV42();

  ctx.restore();
}


function drawBossKrosDetail(){
  const b = bossKrosData();
  const r = bossKrosRewardPreview();
  const unlocked = playerLevel >= b.recLv;

  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Boss Challenge":"Boss挑战",95,190);
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Weekly Crystal / Breakthrough Material":"每周水晶 / 突破材料",97,214);
  drawBtn(language==="en"?"Back":"返回","",930,165,90,36,false,"#fff");

  ctx.fillStyle=unlocked?"rgba(72,32,55,.82)":"rgba(31,39,56,.94)";
  ctx.fillRect(95,245,370,250);
  ctx.strokeStyle=unlocked?"rgba(255,107,155,.65)":"rgba(255,255,255,.16)";
  ctx.lineWidth=2;
  ctx.strokeRect(95,245,370,250);

  drawBtn("<","",108,260,42,38,true,"#fff");
  drawBtn(">","",424,260,42,38,true,"#fff");
  ctx.fillStyle="#ff6b9b";
  ctx.font="bold 25px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(b.name,287,292);
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="12px " + FONT_UI;
  ctx.fillText((bossSelectedIndex+1)+" / "+bossChallengeList().length,287,318);
  ctx.textAlign="left";

  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Recommended Lv.":"推荐等级 Lv.") + b.recLv,120,328);
  ctx.fillText(language==="en"?"Life Bars: 3":"生命管数：3",120,356);
  ctx.fillText(language==="en"?"Phase 1: Circle blast / dragon bullets":"阶段1：范围圆圈 / 龙弹",120,384);
  ctx.fillText(language==="en"?"Phase 2: 50% shield / bleed / poison zone":"阶段2：50%护盾 / 流血 / 毒区",120,412);
  ctx.fillText(language==="en"?"Phase 3: full-map blast / stronger damage":"阶段3：全图爆炸 / 伤害提升",120,440);

  ctx.fillStyle="#7cffb2";
  ctx.font="bold 17px " + FONT_UI;
  ctx.fillText(language==="en"?"Available · Recommended Lv.20":"已开放 · 推荐Lv.20",120,474);

  ctx.fillStyle="rgba(21,28,43,.96)";
  ctx.fillRect(500,245,505,250);
  ctx.strokeStyle="rgba(255,107,155,.34)";
  ctx.strokeRect(500,245,505,250);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(language==="en"?"Reward Preview":"奖励预览",525,282);

  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Dragon Claw ×":"龙爪 ×")+r.dragonClaw,525,316);
  ctx.fillText((language==="en"?"Gold ×":"金币 ×")+r.gold,525,344);
  ctx.fillText("EXP ×"+r.expReward,525,372);

  ctx.fillStyle=r.crystal>0?"#7cc7ff":"rgba(255,255,255,.42)";
  ctx.fillText(r.crystal>0 ? ((language==="en"?"Weekly Crystal ×":"每周水晶 ×")+r.crystal) : (language==="en"?"Weekly Crystal claimed":"本周水晶已领取"),525,400);

  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Multiplier":"倍率",525,438);
  drawBtn("－","",525,452,48,38,false,"#fff");
  ctx.fillStyle="#fff";
  ctx.font="bold 22px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText("×"+bossMultiplier,615,479);
  drawBtn("＋","",660,452,48,38,false,"#fff");

  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="13px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText((language==="en"?"Cost: ":"消耗：")+r.staminaCost,725,477);

  drawBtn(language==="en"?"Start Challenge":"开始挑战",language==="en"?"Team":"编队",820,445,170,48,unlocked && dungeonStamina>=r.staminaCost,unlocked?"#ffe066":"#888");
}

function updateDungeonInlineClicks(){
  normalizeDungeonRuntime();

  if(dungeonPanelMode==="projectArea"){
    if(inRect(930,165,90,36)){
      dungeonPanelMode="home";
      clicked=false;
      return true;
    }
    if(inRect(108,260,42,38)){
      projectAreaMapIndex=(projectAreaMapIndex+projectAreaMapList().length-1)%projectAreaMapList().length;
      clicked=false;
      return true;
    }
    if(inRect(424,260,42,38)){
      projectAreaMapIndex=(projectAreaMapIndex+1)%projectAreaMapList().length;
      clicked=false;
      return true;
    }
    if(inRect(805,445,185,48)){
      startProjectAreaTeam();
      clicked=false;
      return true;
    }
    return false;
  }

  if(dungeonPanelMode==="patrol" && window.PZPatrol){
    try{return !!window.PZPatrol.handleDungeonClick();}
    catch(err){
      console.error("[DungeonPatrolClick]",err);
      dungeonPanelMode="home";
      clicked=false;
      showCenter(language==="en" ? "Patrol UI recovered." : "巡逻界面已恢复。",75);
      return true;
    }
  }

  if(dungeonPanelMode==="boss"){
    if(inRect(930,165,90,36)){
      dungeonPanelMode="home";
      clicked=false;
      return true;
    }
    if(inRect(108,260,42,38)){
      switchBossChallenge(-1);
      clicked=false;
      return true;
    }
    if(inRect(424,260,42,38)){
      switchBossChallenge(1);
      clicked=false;
      return true;
    }
    if(inRect(525,452,48,38)){
      bossMultiplier=clamp(bossMultiplier-1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(660,452,48,38)){
      bossMultiplier=clamp(bossMultiplier+1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(820,445,170,48)){
      const currentBoss = currentBossChallenge();
      if(currentBoss.key==="kros"){
        startBossKrosTeam();
      }else{
        showCenter(language==="en"?"Coming Soon":"开发中",70);
      }
      clicked=false;
      return true;
    }
    return false;
  }

  if(dungeonPanelMode==="material"){
    if(inRect(900,165,120,36)){
      if(materialDungeonSelected===3){materialDungeonSelected=0;moduleArchiveScroll=0;}
      else dungeonPanelMode="home";
      clicked=false;
      return true;
    }
    if(materialDungeonSelected===3 && window.PZModules){
      const base=Object.keys(window.PZModules.SETS||{}),rowH=52,viewY=238,viewH=228;
      if(inRect(95,viewY,360,viewH)){
        const idx=Math.floor((mouseY-viewY+moduleArchiveScroll)/rowH);
        if(base[idx]){moduleDungeonTarget=base[idx];saveGame();}
        clicked=false;return true;
      }
      for(let g=2;g<=6;g++){
        if(inRect(185+(g-2)*58,474,48,34)){
          const req=materialDifficultyRequirement("module",g);
          if(req.ok){materialDungeonDifficulty=g;materialDungeonDifficulties.module=g;saveGame();}
          else showCenter(language==="en"?req.en:req.zh,70);
          clicked=false;return true;
        }
      }
      if(inRect(585,474,42,34)){dungeonRewardMultiplier=clamp(dungeonRewardMultiplier-1,1,4);clicked=false;return true;}
      if(inRect(693,474,42,34)){dungeonRewardMultiplier=clamp(dungeonRewardMultiplier+1,1,4);clicked=false;return true;}
      if(inRect(830,505,180,38)){startMaterialDungeonTeam();clicked=false;return true;}
      return false;
    }
    for(let i=0;i<materialDungeonsV42().length;i++){
      if(inRect(95+i*170,245,156,76)){
        if(i===3&&!canUseModuleDungeon()){showFeatureLocked("chapter1");clicked=false;return true;}
        materialDungeonSelected=i;
        syncSelectedMaterialDifficulty();
        clicked=false;
        return true;
      }
    }
    for(let i=1;i<=6;i++){
      if(inRect(95+(i-1)*58,368,48,45)){
        const key=materialDungeonsV42()[materialDungeonSelected].key,req=materialDifficultyRequirement(key,i);
        if(req.ok){materialDungeonDifficulty=i;materialDungeonDifficulties[key]=i;saveGame();}
        else showCenter(language==="en"?req.en:req.zh,70);
        clicked=false;
        return true;
      }
    }
    if(inRect(95,470,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier-1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(230,470,48,38)){
      dungeonRewardMultiplier=clamp(dungeonRewardMultiplier+1,1,4);
      clicked=false;
      return true;
    }
    if(inRect(830,505,180,44)){
      startMaterialDungeonTeam();
      clicked=false;
      return true;
    }
    return false;
  }

  const cards=dungeonHomeCards();
  for(let i=0;i<cards.length;i++){
    const col=i%2, row=Math.floor(i/2);
    const x=125+col*455, y=255+row*125, w=400, h=95;
    if(inRect(x,y,w,h)){
      if(cards[i].key==="material"){
        dungeonPanelMode="material";
      }else if(cards[i].key==="boss"){
        dungeonPanelMode="boss";
      }else if(cards[i].key==="explore"){
        dungeonPanelMode="projectArea";
      }else if(cards[i].key==="patrol"){
        dungeonPanelMode="patrol";
      }else{
        showCenter(language==="en"?"Coming Soon":"开发中",70);
      }
      clicked=false;
      return true;
    }
  }
  return false;
}


function startBossKrosTeam(){
  normalizeDungeonRuntime();
  const b=bossKrosData();
  const preview=bossKrosRewardPreview();
  if(dungeonStamina < preview.staminaCost){
    openStaminaRecover(language==="en" ? "Not enough stamina." : "体力不足。");
    return;
  }
  bossKrosRun = {multiplier:bossMultiplier, preview};
  battleModeSource = "bossKros";
  clearTransientBattleState();
  gameMode = "team";
}

function createKrosEnemy(){
  const e=createEnemy(W-250,H/2+105,true,"boss");
  e.bossKros=true;
  e.krosBarsLeft=3;
  e.krosMaxBars=3;
  e.phase=1;
  e.lv=20;
  e.r=56;
  e.maxHp=3600;
  e.hp=e.maxHp;
  e.maxShield=0;
  e.shield=0;
  e.attackCd=80;
  e.shotCd=60;
  e.krosPattern=0;
  return e;
}

function spawnBossKrosArea(){
  enemies=[];
  projectiles=[];
  bossHazards=[];
  lockTarget=null;
  areaCleared=false;
  commissionComplete=false;
  area=3;
  const k=createKrosEnemy();
  enemies.push(k);
  showCenter(language==="en"?"BOSS: KROS":"Boss：克罗斯",90);
  showActionPrompt(language==="en"?"Crystal Dragon has appeared":"晶体恶龙出现",90);
}

function supportsStageExploration(){
  return battleModeSource!=="bossKros" && battleModeSource!=="materialDungeon" && battleModeSource!=="projectArea" && battleModeSource!=="commission" && battleModeSource!=="daydream";
}

function spawnDaydreamBattleArea(){
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=false; commissionComplete=false;
  const cfg=daydreamBattleConfig||{};
  const final=area>=battleAreaLimit();
  const pressure=clamp(Math.floor((cfg.difficulty||40)/18),1,5);
  if(cfg.boss&&final){
    enemies.push(createEnemy(735,H/2+90,true,"boss"));
    enemies.push(createEnemy(510,H/2+140,false,"shield"));
    if(pressure>=4) enemies.push(createEnemy(900,H/2+65,false,"ranged"));
  }else if(area===1){
    enemies.push(createEnemy(560,H/2+90,false,pressure>=3?"shield":"normal"));
    enemies.push(createEnemy(780,H/2+135,false,pressure>=2?"ranged":"normal"));
  }else{
    enemies.push(createEnemy(480,H/2+120,false,"shield"));
    enemies.push(createEnemy(690,H/2+70,false,pressure>=3?"berserker":"elite"));
    enemies.push(createEnemy(875,H/2+125,false,"ranged"));
  }
  for(const e of enemies){
    const pollutionScale=1+clamp((cfg.pollution||0)/250,0,.4);
    const projectScale=1+Math.max(0,Number(cfg.boss&&e.boss?cfg.bossScale:cfg.enemyScale)||0);
    e.hp=Math.floor(e.hp*pollutionScale*projectScale); e.maxHp=e.hp;
    e.shield=Math.floor(e.shield*pollutionScale*projectScale); e.maxShield=e.shield;
    if((cfg.combatBuff||0)>0){e.hp=Math.floor(e.hp*.88);e.maxHp=e.hp;e.shield=Math.floor(e.shield*.88);e.maxShield=e.shield;}
  }
  const areaText=language==="en"?(final?"FINAL RECONSTRUCTION":"RECONSTRUCTION "+String(area).padStart(2,"0")):(final?"最终重现":"重现区域 "+String(area).padStart(2,"0"));
  showCenter(areaText+" / "+(cfg.name||"DAYDREAM"),70);
  showActionPrompt(language==="en"?"Defeat the reconstructed enemies to stabilize this node.":"击败重现中的敌人，使当前节点恢复稳定。",140);
}

function stageExploreKey(kind,index=0){
  return selectedTab+":"+selectedStage+":"+area+":"+battleRoute+":"+kind+":"+index;
}

function spawnStageExploreContent(){
  battleExploreObjects=[];
  if(!supportsStageExploration()) return;
  const seed=selectedStage*31+area*11+(battleRoute==="upper"?3:battleRoute==="lower"?7:0);
  const laneY=battleRoute==="upper"?190:battleRoute==="lower"?H-115:H/2+145;
  const addObject=(type,x,y,index,reward={},text="",required=false,label="")=>{
    const key=stageExploreKey(type,index);
    const names={chest:["Area Chest","区域宝箱"],crate:["Wooden Crate","木箱"],reading:["Field Record","现场记录"],npc:["Survivor","幸存者"]};
    battleExploreObjects.push({key,type,x,y,label:label||(language==="en"?names[type][0]:names[type][1]),done:!!battleExploreOpened[key],hp:type==="crate"?2:0,reward,text,required});
  };
  const records=language==="en"?[
    "Record: the crystal readings rise whenever the street lights flicker.",
    "A torn patrol note marks this route as temporarily passable.",
    "Someone wrote: supplies were moved before the district was sealed."
  ]:[
    "记录：街灯闪烁时，附近的晶体读数会明显升高。",
    "一张残缺的巡逻记录将这条路线标记为暂时可通行。",
    "纸页上写着：区域封锁前，补给已经被转移。"
  ];
  const npcLines=language==="en"?[
    "I am waiting for the patrol. The lower road is quieter.",
    "I only saw shadows pass through here. Stay alert."
  ]:[
    "我在等巡逻队。下面那条路暂时安静一些。",
    "我只看到几道影子从这里经过，继续走要小心。"
  ];
  if(selectedMainChapter===1 && !battleSideArea){
    if(selectedStage===2){
      const labels=language==="en"?["Collapsed Barricade","Crystal Blockade","Sealed Passage"]:["坍塌路障","晶体封锁障碍","封闭通道"];
      addObject("crate",770,laneY-8,60+area,{gold:120+area*30},"",true,labels[area-1]);
      battleExploreObjects[battleExploreObjects.length-1].hp=2+area;
    }else if(selectedStage===3){
      const labels=language==="en"?["Crystal Reading","Abandoned Terminal","Anomaly Coordinates"]:["晶体读数","废弃终端","异常坐标"];
      const texts=language==="en"?["The crystal pulse repeats at a fixed interval.","The terminal logged activity after the district was sealed.","The three readings form a route toward the central district."]:["晶体脉冲正在以固定间隔重复。","终端记录显示，封锁之后这里仍有活动。","三处读数连成了一条通往中央区的路线。"];
      addObject("reading",790,laneY-55,80+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===4){
      if(area<3){
        const labels=language==="en"?["Distress Signal","Fresh Footprints"]:["求救信号","新鲜足迹"];
        const texts=language==="en"?["A weak distress signal points toward the inner street.","The footprints are uneven. Someone injured passed through here recently."]:["微弱的求救信号指向内街。","脚印深浅不一，刚刚有行动不便的人经过这里。"];
        addObject("reading",820,laneY-50,90+area,{},texts[area-1],true,labels[area-1]);
      }else{
        addObject("npc",850,laneY-45,93,{},language==="en"?"She is conscious but needs help leaving the encirclement.":"她意识清醒，但需要协助离开包围。",true,language==="en"?"Reach Xiaolai":"找到小赖");
      }
    }else if(selectedStage===6){
      addObject("reading",835,laneY-55,100+area,{},language==="en"?"Route secured. The squad can move Xiaolai forward.":"路线已确认，小队可以继续护送小赖前进。",true,language==="en"?"Secure Route":"确认安全路线");
    }else if(selectedStage===8){
      const labels=language==="en"?["Settlement Resident","Remaining Supplies","Unstable Rift Exit"]:["聚居地居民","剩余物资","不稳定的裂隙出口"];
      const texts=language==="en"?["The residents have survived here for six years.","Food and medicine are nearly exhausted.","The exit changes direction each time it opens."]:["居民已经在这里生活了整整六年。","食物与药品都已接近耗尽。","出口每次开启时都会改变方向。"];
      addObject(area===1?"npc":"reading",760,laneY-45,120+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===9){
      const labels=language==="en"?["Check Outer Supplies","Check Medical Crates","Confirm Final Inventory"]:["检查外围补给","检查医疗箱","确认最终物资"];
      const texts=language==="en"?["The outer supply line is intact for now.","Several medical crates were damaged. The remaining stock must be protected.","The survivors' remaining supplies are accounted for. The assault has been repelled."]:["外围补给线暂时完好。","数个医疗箱受损，剩余物资必须守住。","幸存者的剩余物资已经清点完毕，袭击暂时被击退。"];
      addObject("reading",820,laneY-50,140+area,{},texts[area-1],true,labels[area-1]);
    }
  }
  if(selectedMainChapter===2 && !battleSideArea){
    if(selectedStage===3){
      const labels=language==="en"?["Abandoned Camera","Patrol Interval","Maintenance Blind Spot"]:["废弃监视器","巡逻间隔记录","维护通道盲区"];
      const texts=language==="en"?["The camera can no longer transmit, leaving a narrow blind route.","The patrol intervals overlap for eleven seconds.","The maintenance wall hides a route into Project 4."]:["监视器已经无法传输，前方留下了一条狭窄盲区。","两组巡逻路线会产生十一秒的交错间隔。","维护墙后的通道可以避开警戒进入 Project 4。"];
      addObject("reading",790,laneY-50,300+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===4){
      const labels=language==="en"?["Outer Rift Anchor","Distorted Anchor","Final Rift Anchor"]:["裂隙外围锚点","扭曲锚点","最终裂隙锚点"];
      const texts=language==="en"?["The shrinking rift steadies for a moment.","The anchor is pulling debris inward. Calibration slows it.","All three anchors align. The entrance is open for only a short time."]:["持续收缩的裂隙暂时稳定下来。","锚点正在将碎片向内拉扯，校准后速度有所减缓。","三个锚点完成同步，入口只会短暂维持。"];
      addObject("reading",805,laneY-50,320+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===5){
      const labels=language==="en"?["Residents Leaving","Residents Staying","Those Still Unsure"]:["选择离开的居民","选择留下的居民","仍在犹豫的人"];
      const texts=language==="en"?["They have packed only medicine, water, and identification records.","They consider the settlement their only remaining home.","Fear of the outside and fear of the closing rift hold them in place."]:["他们只带上药品、饮水与能够证明身份的记录。","这里已经成为他们仅剩的家，他们选择留下。","对外界的恐惧与对裂隙闭合的恐惧让他们无法立刻决定。"];
      addObject("npc",770,laneY-45,340+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===6){
      const labels=language==="en"?["First Evacuation Group","Injured Survivors","Outer Layer Checkpoint"]:["第一批撤离者","行动不便的幸存者","外层通道检查点"];
      addObject("reading",820,laneY-50,360+area,{},language==="en"?"All survivors in this group have passed the route.":"本段幸存者已经全部通过，可以继续前进。",true,labels[area-1]);
    }else if(selectedStage===7){
      const labels=language==="en"?["Lai's Scarf","Uneven Footprints","Residual Rift Echo"]:["小赖的围巾","深浅不一的脚印","残留裂隙回声"];
      const texts=language==="en"?["The scarf caught on broken stone near the rear group.","The footprints turn away from the evacuation route.","A faint voice repeats beyond a path that no longer exists."]:["围巾挂在后方队伍经过的碎石上。","脚印深浅不一，并在这里偏离撤离路线。","已经消失的道路另一侧，仍在重复一段微弱声音。"];
      addObject("reading",790,laneY-50,380+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===8){
      const labels=language==="en"?["Fox Resonance I","Fox Resonance II","Exit Resonance"]:["狐灵共鸣点Ⅰ","狐灵共鸣点Ⅱ","出口共鸣点"];
      addObject("reading",820,laneY-50,400+area,{},language==="en"?"The fox spirit confirms another segment of the exit route.":"狐灵确认了通往出口的又一段方向。",true,labels[area-1]);
    }else if(selectedStage===10){
      const labels=language==="en"?["Open the Passage","Protect the Rear Group","Final Exit Check"]:["打开通道","保护后方队伍","最终出口确认"];
      addObject("reading",830,laneY-50,420+area,{},language==="en"?"The evacuation route is clear. Move the survivors forward.":"撤离路线已经清出，幸存者可以继续前进。",true,labels[area-1]);
    }
  }
  if(selectedMainChapter===0 && !battleSideArea){
    if(selectedStage===2){
      const labels=language==="en"?["Emergency Beacon","Evacuation Route","West Gate Signal"]:["应急信标","撤离路线","西区出口信号"];
      const texts=language==="en"?["The beacon confirms that the rear street is no longer safe.","The evacuation route has shifted toward the west gate.","The gate signal is unstable, but the exit is still open."]:["信标确认后街已经无法继续停留。","撤离路线已经变更至西区出口。","出口信号不稳定，但通道仍然开放。"];
      addObject("reading",820,laneY-48,200+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===4){
      const labels=language==="en"?["Broken Communicator","Kane's Footprint","Distorted Echo"]:["损坏的通讯器","凯恩的脚印","扭曲回声"];
      const texts=language==="en"?["The communicator repeats a message that was never transmitted.","The footprint stops at a wall, then continues on its other side.","Kane's voice can be heard from two directions at once."]:["通讯器正在重复一段从未发送过的讯息。","脚印在墙前消失，却从墙的另一侧继续出现。","凯恩的声音同时从两个方向传来。"];
      addObject("reading",780,laneY-52,220+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===7){
      const labels=language==="en"?["Unstable Anchor","Reversed Street Sign","Dream Boundary"]:["不稳定锚点","倒置路牌","白日梦边界"];
      const texts=language==="en"?["The anchor reacts to both Hermit and Kane, but at different frequencies.","The sign points toward a road that does not exist in Hermit's view.","The boundary steadies after the surrounding threats are cleared."]:["锚点同时回应隐者和凯恩，却显示出不同频率。","路牌指向一条只存在于凯恩视野中的道路。","清除周围威胁后，白日梦边界暂时稳定。"];
      addObject("reading",800,laneY-50,240+area,{},texts[area-1],true,labels[area-1]);
    }else if(selectedStage===9){
      const labels=language==="en"?["Pulse Sample","Hatching Crystal","Core Resonance"]:["脉冲样本","孵化结晶","核心共鸣"];
      const texts=language==="en"?["The crystal pulse accelerates whenever a creature approaches.","A silhouette forms inside the crystal, then dissolves when the pulse is interrupted.","All nearby crystals resonate with a deeper core ahead."]:["每当怪物靠近，结晶脉冲都会加速。","结晶内部正在形成轮廓，脉冲被打断后轮廓随之消散。","附近所有结晶都在回应前方更深处的核心。"];
      addObject("reading",810,laneY-50,260+area,{},texts[area-1],true,labels[area-1]);
    }
  }
  if(selectedMainChapter===1 && battleSideArea){
    if(selectedStage===3) addObject("reading",700,laneY-45,30,{},language==="en"?"A side archive confirms the district was active after evacuation.":"支路档案证实，撤离之后城区内仍有活动。",false,language==="en"?"Side Archive":"支路档案");
    else if(selectedStage===4) addObject("chest",250,laneY,30,{expBooks:1,gold:180},"",false,language==="en"?"Emergency Supplies":"应急补给");
    else if(selectedStage===8) addObject("npc",780,laneY-35,30,{},language==="en"?"We ration every meal. Please tell the outside world we are still here.":"每一餐都要严格分配。请告诉外面的人，我们还活着。",false,language==="en"?"Rift Resident":"裂隙居民");
    else if(selectedStage===9) addObject("chest",250,laneY,30,{gold:260,expBooks:1},"",false,language==="en"?"Recovered Supplies":"夺回的物资");
  }
  if(!battleSideArea){
    if(seed%3===0) addObject("chest",220+(seed%3)*90,laneY,0,{gold:220+selectedStage*35,expBooks:seed%4===0?1:0});
    else if(seed%3===1) addObject("crate",260+(seed%4)*75,laneY,0,{gold:90+area*35});
    if(seed%5===0) addObject("reading",830,clamp(laneY-70,160,H-85),0,{},records[seed%records.length]);
  }else{
    const layout=seed%5;
    if(layout===0 || layout===3) addObject("chest",250,laneY,0,{gold:320+selectedStage*40,weaponOre:seed%4===0?1:0});
    if(layout===1 || layout===3 || layout===4){
      addObject("crate",300,laneY,0,{gold:100+area*40});
      if(layout===4) addObject("crate",430,laneY+45,1,{gold:80+selectedStage*20});
    }
    if(layout===2 || layout===4) addObject("reading",720,laneY,0,{},records[seed%records.length]);
    if(layout===1 && seed%2===0) addObject("npc",820,laneY-35,0,{},npcLines[seed%npcLines.length]);
  }
}

function pushBattleReward(label,amount,color){
  if(!amount) return;
  battleRewardNotices.unshift({text:label+" +"+amount,color:color||"#ffe066",timer:180});
  battleRewardNotices=battleRewardNotices.slice(0,5);
}

function battleExploreInteract(){
  if(!supportsStageExploration()) return false;
  let target=null,nearest=72;
  for(const o of battleExploreObjects){
    if(o.done || o.type==="crate") continue;
    const d=dist(player.x,player.y,o.x,o.y);
    if(d<nearest){ target=o; nearest=d; }
  }
  if(!target) return false;
  target.done=true;
  battleExploreOpened[target.key]=true;
  const reward=target.reward||{};
  if(reward.gold){ gold+=reward.gold; totalGoldEarned+=reward.gold; pushBattleReward(language==="en"?"Gold":"金币",reward.gold,"#ffe066"); }
  if(reward.expBooks){ expBooks+=reward.expBooks; pushBattleReward(language==="en"?"EXP Book":"经验书",reward.expBooks,"#7cc7ff"); }
  if(reward.weaponOre){ weaponOre+=reward.weaponOre; pushBattleReward(language==="en"?"Refined Alloy":"精炼合金",reward.weaponOre,"#c35cff"); }
  if(target.type==="chest") showActionPrompt(language==="en"?"Chest opened":"宝箱已开启",75);
  else if(target.type==="reading") showActionPrompt(target.text,180);
  else showActionPrompt(target.label+"："+target.text,150);
  if(target.required){
    chapterObjectivePrompted=false;
    showCenter(language==="en"?"OBJECTIVE COMPLETE":"目标完成",55);
  }
  sfx(target.type==="chest"?"reward":"ui");
  saveGame(); autoCloudSaveNow(true);
  return true;
}

function hasPendingChapterAreaObjective(){
  return battleExploreObjects.some(o=>o.required&&!o.done);
}

function damageNearbyBattleCrates(x,y,range){
  for(const o of battleExploreObjects){
    if(o.done || o.type!=="crate" || !withinDist(x,y,o.x,o.y,range)) continue;
    o.hp--;
    addParticles(o.x,o.y,"#c59b5f",7,4);
    addText(o.x,o.y-30,language==="en"?"CRATE":"木箱","#ffe0a8");
    if(o.hp<=0){
      o.done=true; battleExploreOpened[o.key]=true;
      const reward=o.reward||{};
      if(reward.gold){ gold+=reward.gold; totalGoldEarned+=reward.gold; pushBattleReward(language==="en"?"Gold":"金币",reward.gold,"#ffe066"); }
      sfx("reward"); saveGame(); autoCloudSaveNow(true);
    }
  }
}

function enterNextBattleArea(route){
  if(!areaCleared || area>=battleAreaLimit() || battleExitDelay>0) return;
  if(battleModeSource==="projectArea" && typeof ensureProjectAreaRun==="function") ensureProjectAreaRun().areasCleared=Math.max(ensureProjectAreaRun().areasCleared,area);
  area++;
  battleRoute="center";
  battleSideArea="";
  player.x=95; player.y=H/2+115;
  particles=[]; slashes=[]; texts=[];
  spawnArea();
}

function enterSideBattleArea(route){
  if(!areaCleared || battleExitDelay>0 || battleSideArea) return;
  battleSideArea=route;
  battleRoute=route;
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=false;
  const seed=selectedStage*31+area*11+(route==="upper"?3:7);
  if(seed%3===0) enemies.push(createEnemy(W/2+170,H/2+70,false,seed%2?"normal":"ranged"));
  if(seed%7===0) enemies.push(createEnemy(W/2-80,H/2+110,false,"normal"));
  if(!enemies.length) areaCleared=true;
  player.x=W/2; player.y=route==="upper"?H-70:145;
  spawnStageExploreContent();
  showCenter(language==="en"?(route==="upper"?"UPPER SIDE AREA":"LOWER SIDE AREA"):(route==="upper"?"上方支线区域":"下方支线区域"),70);
}

function returnToMainBattleArea(){
  const from=battleSideArea;
  if(!from) return;
  battleSideArea=""; battleRoute="center";
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=true; battleExitDelay=20;
  player.x=W/2; player.y=from==="upper"?145:H-70;
  spawnStageExploreContent();
  showCenter(language==="en"?"RETURNED TO MAIN AREA":"已返回主区域",55);
}

function spawnArea(){
  if(battleModeSource==="showcase"){
    enemies=[];projectiles=[];lockTarget=null;areaCleared=false;commissionComplete=false;
    const dummy=createEnemy(735,H/2+92,false,"elite");
    dummy.trainingDummy=true;dummy.hp=dummy.maxHp=999999999;dummy.shield=dummy.maxShield=0;
    dummy.attackCd=999999;dummy.windup=0;dummy.lv=60;
    enemies.push(dummy);
    return;
  }
  if(battleModeSource==="bossKros"){ spawnBossKrosArea(); return; }
  if(battleModeSource==="materialDungeon"){ spawnMaterialDungeonArea(); return; }
  if(battleModeSource==="daydream"){ spawnDaydreamBattleArea(); return; }
  enemies=[]; projectiles=[]; lockTarget=null; areaCleared=false; commissionComplete=false;
  if(battleModeSource==="daydream"&&daydreamBattleConfig&&daydreamBattleConfig.boss){
    enemies.push(createEnemy(700,H/2+90,true,"boss"));
    enemies.push(createEnemy(500,H/2+145,false,"shield"));
    showCenter((language==="en"?"FINAL NODE · ":"终点节点 · ")+daydreamBattleConfig.name,75);
    return;
  }
  const commissionStage = battleModeSource==="commission" ? currentCommissionStage() : null;
  const t = commissionStage ? commissionStage.type : (missionTypes[selectedStage-1] || "annihilation");
  if(t==="evacuation"){
    if(area===1) enemies.push(createEnemy(680,H/2+105,false,"normal"));
    else if(area===2){enemies.push(createEnemy(610,H/2+105,false,"normal"));enemies.push(createEnemy(835,H/2+65,false,"ranged"));}
    else enemies.push(createEnemy(760,H/2+100,false,"berserker"));
  } else if(t==="search"){
    // Environmental investigation: the player advances by finding the required trace in each Area.
  } else if(t==="duel"){
    enemies.push(createEnemy(area===3?720:650,H/2+95,false,area===3?"elite":area===2?"shield":"normal"));
  } else if(t==="stabilize"){
    if(area===1) enemies.push(createEnemy(680,H/2+105,false,"normal"));
    else if(area===2){enemies.push(createEnemy(550,H/2+115,false,"shield"));enemies.push(createEnemy(820,H/2+70,false,"ranged"));}
    else{enemies.push(createEnemy(620,H/2+110,false,"elite"));enemies.push(createEnemy(850,H/2+75,false,"berserker"));}
  } else if(t==="endurance"){
    enemies.push(createEnemy(540,H/2+95,false,area===1?"normal":"berserker"));
    enemies.push(createEnemy(770,H/2+125,false,area===3?"elite":"normal"));
    if(area>=2) enemies.push(createEnemy(900,H/2+60,false,"ranged"));
  } else if(t==="crystalInvestigation"){
    if(area===1) enemies.push(createEnemy(690,H/2+100,false,"normal"));
    else if(area===2){enemies.push(createEnemy(560,H/2+110,false,"shield"));enemies.push(createEnemy(810,H/2+70,false,"normal"));}
    else{enemies.push(createEnemy(620,H/2+110,false,"elite"));enemies.push(createEnemy(860,H/2+70,false,"ranged"));}
  } else if(t==="breakthrough"){
    if(area===1){enemies.push(createEnemy(590,H/2+80,false,"normal"));enemies.push(createEnemy(760,H/2+135,false,"shield"));}
    else if(area===2){enemies.push(createEnemy(500,H/2+70,false,"shield"));enemies.push(createEnemy(720,H/2+130,false,"ranged"));}
    else{enemies.push(createEnemy(500,H/2+120,false,"normal"));enemies.push(createEnemy(700,H/2+75,false,"elite"));enemies.push(createEnemy(860,H/2+135,false,"ranged"));}
  } else if(t==="investigation"){
    if(area===1) enemies.push(createEnemy(610,H/2+95,false,"normal"));
    else if(area===2){enemies.push(createEnemy(540,H/2+110,false,"shield"));enemies.push(createEnemy(790,H/2+75,false,"normal"));}
    else{enemies.push(createEnemy(620,H/2+110,false,"elite"));enemies.push(createEnemy(835,H/2+70,false,"ranged"));}
  } else if(t==="rescue"){
    if(area===1){enemies.push(createEnemy(620,H/2+95,false,"normal"));enemies.push(createEnemy(790,H/2+135,false,"normal"));}
    else if(area===2){enemies.push(createEnemy(520,H/2+80,false,"shield"));enemies.push(createEnemy(760,H/2+125,false,"berserker"));}
    else{enemies.push(createEnemy(560,H/2+125,false,"normal"));enemies.push(createEnemy(730,H/2+75,false,"elite"));enemies.push(createEnemy(900,H/2+125,false,"ranged"));}
  } else if(t==="escort"){
    if(area===1){enemies.push(createEnemy(620,H/2+105,false,"normal"));enemies.push(createEnemy(810,H/2+70,false,"ranged"));}
    else if(area===2){enemies.push(createEnemy(520,H/2+100,false,"berserker"));enemies.push(createEnemy(720,H/2+70,false,"shield"));}
    else{enemies.push(createEnemy(500,H/2+120,false,"shield"));enemies.push(createEnemy(700,H/2+75,false,"elite"));enemies.push(createEnemy(880,H/2+130,false,"ranged"));}
  } else if(t==="survey"){
    // No enemies: progression comes from required settlement interactions.
  } else if(t==="defense"){
    if(area===1){enemies.push(createEnemy(540,H/2+90,false,"normal"));enemies.push(createEnemy(720,H/2+130,false,"berserker"));enemies.push(createEnemy(880,H/2+80,false,"normal"));}
    else if(area===2){enemies.push(createEnemy(500,H/2+120,false,"shield"));enemies.push(createEnemy(700,H/2+70,false,"ranged"));enemies.push(createEnemy(880,H/2+125,false,"ranged"));}
    else{enemies.push(createEnemy(470,H/2+100,false,"shield"));enemies.push(createEnemy(650,H/2+130,false,"elite"));enemies.push(createEnemy(820,H/2+75,false,"berserker"));enemies.push(createEnemy(930,H/2+135,false,"ranged"));}
  } else if(t==="chapterBoss"){
    if(area===1){ enemies.push(createEnemy(620,H/2+90,false,"shield")); enemies.push(createEnemy(760,H/2+135,false,"ranged")); }
    else if(area===2){ enemies.push(createEnemy(480,H/2+80,false,"berserker")); enemies.push(createEnemy(670,H/2+110,false,"shield")); enemies.push(createEnemy(850,H/2+70,false,"ranged")); }
    else if(area>=battleAreaLimit()){
      const boss=createEnemy(700,H/2+90,true,"boss");
      if(battleModeSource==="main" && selectedMainChapter===0 && selectedStage===10){
        boss.crystalColossus=true;
        boss.colossusBarsLeft=2;
        boss.maxColossusBars=2;
        boss.phase=1;
        boss.rage=false;
      }
      enemies.push(boss);
      enemies.push(createEnemy(500,H/2+150,false,"shield"));
    }
    else { enemies.push(createEnemy(480,H/2+80,false,"elite")); enemies.push(createEnemy(690,H/2+120,false,"ranged")); enemies.push(createEnemy(850,H/2+70,false,"berserker")); }
  } else if(t==="survival"){
    enemies.push(createEnemy(520,H/2+70,false,"normal"));
    enemies.push(createEnemy(740,H/2+120,false,area>=2?"berserker":"normal"));
    if(area>=2) enemies.push(createEnemy(860,H/2+50,false,"ranged"));
  } else if(t==="shield"){
    enemies.push(createEnemy(540,H/2+90,false,"shield"));
    enemies.push(createEnemy(740,H/2+130,false,area>=2?"shield":"normal"));
    if(area>=battleAreaLimit()) enemies.push(createEnemy(860,H/2+60,false,"elite"));
  } else if(t==="ranged"){
    enemies.push(createEnemy(520,H/2+80,false,"ranged"));
    enemies.push(createEnemy(760,H/2+140,false,"ranged"));
    if(area>=2) enemies.push(createEnemy(650,H/2+40,false,"shield"));
  } else if(t==="mixed" || t==="elite" || t==="bossPrep"){
    enemies.push(createEnemy(430,H/2+40,false,area===1?"normal":"shield"));
    enemies.push(createEnemy(650,H/2+110,false,area>=2?"berserker":"elite"));
    enemies.push(createEnemy(810,H/2+30,false,area>=battleAreaLimit()?"ranged":"normal"));
    if(t==="bossPrep" && area>=battleAreaLimit()) enemies.push(createEnemy(720,H/2+160,false,"shield"));
  } else {
    if(area===1){ enemies.push(createEnemy(520,H/2+70,false,"normal")); enemies.push(createEnemy(700,H/2+145,false,"normal")); }
    else if(area===2){ enemies.push(createEnemy(430,H/2+40,false,"normal")); enemies.push(createEnemy(650,H/2+110,false,"berserker")); enemies.push(createEnemy(810,H/2+30,false,"normal")); }
    else { enemies.push(createEnemy(700,H/2+90,false,"elite")); enemies.push(createEnemy(500,H/2+145,false,"normal")); }
  }
  if(commissionStage && area>=2) enemies.push(createEnemy(930,H/2+155,false,area>=3?"ranged":"normal"));
  spawnStageExploreContent();
  const phaseLabel=battleModeSource==="commission"
    ? (language==="en"?(area===battleAreaLimit()?"FINAL WAVE":"WAVE "+String(area).padStart(2,"0")):(area===battleAreaLimit()?"最终波次":"波次 "+String(area).padStart(2,"0")))
    : (language==="en"?(area===battleAreaLimit()?"FINAL AREA":"AREA "+String(area).padStart(2,"0")):(area===battleAreaLimit()?"最终区域":"区域 "+String(area).padStart(2,"0")));
  showCenter(phaseLabel+" / "+missionLabel(),65);
  triggerAreaDialogue();
}

function krosPhaseFromBars(e){
  if(!e || !e.bossKros) return 1;
  if(e.krosBarsLeft>=3) return 1;
  if(e.krosBarsLeft===2) return 2;
  return 3;
}

function addBossHazard(x,y,r,delay=58,type="circle"){
  bossHazards.push({x,y,r,delay,life:delay+38,max:delay+38,type,hitDone:false,tick:0});
}

function updateBossHazards(){
  if(!bossHazards) bossHazards=[];
  for(const h of bossHazards){
    h.life -= frameScale;
    h.delay -= frameScale;
    if(h.delay <= 0 && !h.hitDone && h.type!=="poison"){
      h.hitDone=true;
      if(withinDist(player.x,player.y,h.x,h.y,h.r) && player.inv<=0){
        const dmg = h.type==="full" ? 24 : 16;
        if(damageCurrentRoleHp(dmg, h.type==="full"?"BLAST":"HIT", "#ff5555")) return;
        doShake(10);
        flash=Math.max(flash,8);
      }
      addSlash(h.x,h.y,h.r,"#ff6b9b",24,"break");
      if(h.type==="poison"){}
    }
    if(h.type==="poison" && h.delay<=0){
      h.tick-=frameScale;
      if(withinDist(player.x,player.y,h.x,h.y,h.r)){
        playerPoisonTimer=Math.max(playerPoisonTimer,120);
      }
      if(h.tick<=0){
        h.tick=18;
      }
    }
  }
  bossHazards=bossHazards.filter(h=>h.life>0);
  playerPoisonTimer=Math.max(0,playerPoisonTimer-frameScale);
  playerBleedTimer=Math.max(0,playerBleedTimer-frameScale);
  playerPoisonTick-=frameScale;
  playerBleedTick-=frameScale;
  if(playerPoisonTimer>0 && playerPoisonTick<=0){
    playerPoisonTick=30;
    const dmg=battleModeSource==="bossKros" ? 3 : 2;
    if(damageCurrentRoleHp(dmg, "POISON", "#a66bff")) return;
  }
  if(playerBleedTimer>0 && playerBleedTick<=0){
    playerBleedTick=35;
    if(damageCurrentRoleHp(3, "BLEED", "#ff6b6b")) return;
  }
}

function drawBossHazards(){
  if(!bossHazards) return;
  for(const h of bossHazards){
    ctx.save();
    const armed=h.delay<=0;
    ctx.globalAlpha=armed ? .20 : .12 + .12*Math.sin((h.max-h.life)/5);
    ctx.fillStyle=h.type==="poison" ? "#8f45ff" : h.type==="full" ? "#ff3355" : "#ff6b9b";
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=armed ? .55 : .85;
    ctx.strokeStyle=h.type==="poison" ? "#b58cff" : "#ff6b9b";
    ctx.lineWidth=armed ? 3 : 5;
    ctx.beginPath();
    ctx.arc(h.x,h.y,h.r,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
}


function startKrosPhaseTransition(e){
  if(!e || !e.bossKros) return;
  krosPhaseTransitionPhase = e.phase || 1;
  krosPhaseTransitionText = krosPhaseTransitionPhase === 2
    ? (language==="en" ? "PHASE 2" : "第二阶段")
    : (language==="en" ? "FINAL PHASE" : "最终阶段");
  krosPhaseTransitionTimer = 120;

  e.phaseTransitionTimer = 120;
  e.windup = 0;
  e.attackCd = Math.max(e.attackCd || 0, 135);
  e.krosPattern = 130;
  e.vx = 0;
  e.vy = 0;

  // clean immediate pressure so transition has breathing room
  if(Array.isArray(projectiles)) projectiles = projectiles.filter(p => !p.krosBullet);
  if(Array.isArray(bossHazards)) bossHazards = bossHazards.filter(h => h.type === "poison");

  showCenter(krosPhaseTransitionText, 110);
  showActionPrompt(
    krosPhaseTransitionPhase === 2
      ? (language==="en" ? "Kros grows crystal armor." : "克罗斯生成晶体护甲")
      : (language==="en" ? "Kros enters rampage." : "克罗斯进入暴走"),
    105
  );

  doShake(krosPhaseTransitionPhase === 3 ? 34 : 28);
  doHitStop(12);
  flash = Math.max(flash, 22);
  slowMo = Math.max(slowMo, 28);
  sfx("break");
}

function updateKrosPhaseTransition(e){
  if(krosPhaseTransitionTimer > 0){
    krosPhaseTransitionTimer = Math.max(0, krosPhaseTransitionTimer - frameScale);
  }
  if(e && e.phaseTransitionTimer > 0){
    e.phaseTransitionTimer = Math.max(0, e.phaseTransitionTimer - frameScale);
    e.vx *= 0.65;
    e.vy *= 0.65;
    return true;
  }
  return false;
}

function drawKrosPhaseTransitionOverlay(){
  if(krosPhaseTransitionTimer <= 0) return;
  const t = krosPhaseTransitionTimer;
  const a = clamp(t / 120, 0, 1);
  ctx.save();

  ctx.globalAlpha = Math.min(.55, .18 + a*.32);
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,W,H);

  ctx.globalAlpha = clamp(a*1.2, 0, 1);
  ctx.textAlign = "center";
  ctx.shadowBlur = 28;
  ctx.shadowColor = krosPhaseTransitionPhase === 3 ? "#ff3355" : "#c35cff";
  ctx.fillStyle = krosPhaseTransitionPhase === 3 ? "#ff4d6d" : "#c35cff";
  ctx.font = "bold 56px " + FONT_UI;
  ctx.fillText(krosPhaseTransitionText || "PHASE", W/2, H*.36);

  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px " + FONT_UI;
  const sub = krosPhaseTransitionPhase === 3
    ? (language==="en" ? "Crystal Dragon Rampage" : "晶体恶龙暴走")
    : (language==="en" ? "Crystal Armor Online" : "晶体护甲展开");
  ctx.fillText(sub, W/2, H*.36 + 42);

  ctx.globalAlpha = .55 * a;
  ctx.strokeStyle = krosPhaseTransitionPhase === 3 ? "#ff3355" : "#ff6b9b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(W/2, H*.50, 130 + (1-a)*70, 0, Math.PI*2);
  ctx.stroke();

  ctx.restore();
}

function updateBossKrosBattleLogic(){
  if(battleModeSource!=="bossKros") return;
  const e=enemies.find(v=>v.alive && v.bossKros);
  if(!e) return;
  e.phase=krosPhaseFromBars(e);

  if(updateKrosPhaseTransition(e)) return;

  e.krosPattern=(e.krosPattern||0)-frameScale;
  if(e.krosPattern<=0){
    if(e.phase===1){
      if(Math.random()<.55){
        addBossHazard(player.x,player.y,115,56,"circle");
        showActionPrompt(language==="en"?"Kros: Crystal Impact":"克罗斯：晶体冲击",45);
      }else{
        for(let i=0;i<3;i++){
          const dx=player.x-e.x, dy=player.y-e.y, l=Math.hypot(dx,dy)||1;
          projectiles.push({x:e.x-30,y:e.y-20+i*22,vx:dx/l*(3.2+i*.25),vy:dy/l*(3.2+i*.25),life:115,krosBullet:true});
        }
        showActionPrompt(language==="en"?"Kros: Dragon Bullets":"克罗斯：龙弹",45);
      }
      e.krosPattern=115;
    }else if(e.phase===2){
      if(Math.random()<.55){
        addBossHazard(player.x,player.y,95,42,"circle");
      }else{
        for(let i=0;i<2;i++){
          const tx=clamp(player.x+Math.random()*120-60,120,W-120);
          const ty=clamp(player.y+Math.random()*90-45,145,H-70);
          addBossHazard(tx,ty,54,35,"poison");
        }
        showActionPrompt(language==="en"?"Poison Crystal Zone":"晶体毒区",45);
      }
      e.krosPattern=95;
    }else{
      addBossHazard(W/2,H/2+80,520,70,"full");
      showActionPrompt(language==="en"?"Full-field Crystal Blast":"全图晶体爆破",70);
      e.krosPattern=150;
    }
  }
}

function drawBossKrosTopBar(){
  if(battleModeSource!=="bossKros") return;
  const e=enemies.find(v=>v.alive && v.bossKros);
  if(!e) return;
  const b=bossKrosData();
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.58)";
  ctx.fillRect(260,18,600,66);
  ctx.strokeStyle="rgba(255,107,155,.55)";
  ctx.strokeRect(260,18,600,66);

  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText(b.name,560,42);

  ctx.textAlign="left";
  const total=3;
  for(let i=0;i<total;i++){
    ctx.fillStyle=i < e.krosBarsLeft ? "#ff6b9b" : "rgba(255,255,255,.20)";
    ctx.font="bold 18px Arial";
    ctx.fillText("◆",282+i*22,68);
  }

  const x=360,y=58,w=460,h=12;
  ctx.fillStyle="rgba(255,255,255,.14)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle=e.phase===3?"#ff3355":e.phase===2?"#c35cff":"#ff6b9b";
  ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h);
  ctx.strokeStyle="rgba(255,255,255,.25)";
  ctx.strokeRect(x,y,w,h);

  if(e.maxShield>0 && e.shield>0){
    ctx.fillStyle="rgba(124,199,255,.25)";
    ctx.fillRect(x,y+16,w,h*.65);
    ctx.fillStyle="#7cc7ff";
    ctx.fillRect(x,y+16,w*clamp(e.shield/e.maxShield,0,1),h*.65);
  }

  ctx.fillStyle="rgba(255,255,255,.68)";
  ctx.font="12px " + FONT_UI;
  ctx.textAlign="right";
  ctx.fillText("Phase "+e.phase,832,42);
  ctx.restore();
}

function drawCrystalColossusTopBar(){
  const e=enemies.find(v=>v.alive && v.crystalColossus);
  if(!e) return;
  ctx.save();
  ctx.fillStyle="rgba(5,8,18,.72)";
  ctx.fillRect(260,18,600,66);
  ctx.strokeStyle="rgba(154,215,255,.68)";
  ctx.strokeRect(260,18,600,66);
  ctx.textAlign="center";
  ctx.fillStyle="#fff";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText(language==="en"?"CRYSTAL COLOSSUS":"结晶巨人",560,42);
  ctx.textAlign="left";
  for(let i=0;i<2;i++){
    ctx.fillStyle=i<e.colossusBarsLeft?"#9ad7ff":"rgba(255,255,255,.20)";
    ctx.font="bold 18px Arial";
    ctx.fillText("◆",282+i*22,68);
  }
  const x=360,y=58,w=460,h=12;
  ctx.fillStyle="rgba(255,255,255,.14)";
  ctx.fillRect(x,y,w,h);
  ctx.fillStyle=e.phase>=2?"#c7a6ff":"#9ad7ff";
  ctx.fillRect(x,y,w*clamp(e.hp/e.maxHp,0,1),h);
  ctx.strokeStyle="rgba(255,255,255,.25)";
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.font="12px " + FONT_UI;
  ctx.textAlign="right";
  ctx.fillText((language==="en"?"Phase ":"阶段 ")+e.phase,832,42);
  ctx.restore();
}

function applyBossKrosReward(){
  normalizeDungeonRuntime();
  const r=bossKrosRewardPreview(bossKrosRun);
  dungeonStamina=clamp(dungeonStamina-r.staminaCost,0,9999);
  dragonClaw += r.dragonClaw;
  gold += r.gold;
  totalGoldEarned += r.gold;
  addPlayerExp(r.expReward);
  if(r.crystal>0){
    r.crystal=grantFreeCrystals(r.crystal);
    bossKrosWeeklyKey = bossKrosWeekKey();
  }
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(true);
  return r;
}

function openStaminaRecover(msg=""){
  normalizeDungeonRuntime();
  staminaRecoverOpen = true;
  staminaRecoverMsg = msg || "";
  clicked = false;
}

function closeStaminaRecover(){
  staminaRecoverOpen = false;
  staminaRecoverMsg = "";
  clicked = false;
}

function useDungeonCandy(){
  normalizeDungeonRuntime();
  if(dungeonCandy <= 0){
    staminaRecoverMsg = language==="en" ? "No Candy left." : "糖果不足。";
    return;
  }
  if(dungeonCandyDailyUsed >= 6){
    staminaRecoverMsg = language==="en" ? "Daily Candy limit reached. (6/6)" : "今日糖果食用次数已达上限（6/6）。";
    return;
  }
  dungeonCandy = Math.max(0, dungeonCandy - 1);
  dungeonCandyDailyUsed = clamp(dungeonCandyDailyUsed + 1,0,6);
  dungeonStamina = Math.min(9999, dungeonStamina + 40);
  staminaRecoverMsg = language==="en" ? ("Stamina +40  Candy used "+dungeonCandyDailyUsed+"/6") : ("体力 +40  今日糖果 "+dungeonCandyDailyUsed+"/6");
  sfx("reward");
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(false);
}


function useDungeonStimulant(){
  normalizeDungeonRuntime();
  if(dungeonStimulant <= 0){
    staminaRecoverMsg = language==="en" ? "No Stimulant left." : "兴奋剂不足。";
    return;
  }
  dungeonStimulant = Math.max(0, dungeonStimulant - 1);
  dungeonStamina = Math.min(9999, dungeonStamina + 240);
  staminaRecoverMsg = language==="en" ? "Stamina +240" : "体力 +240";
  sfx("reward");
  saveGame();
  autoCloudSaveNow && autoCloudSaveNow(false);
  clicked = false;
  mouseDown = false;
}

function updateStaminaRecoverOverlay(){
  if(!staminaRecoverOpen) return false;
  if(clicked){
    const x=W/2-290, y=150;
    if(inRect(x+526,y+10,42,42) || inRect(x+185,y+360,200,44)){
      closeStaminaRecover();
      return true;
    }
    if(inRect(x+360,y+167,150,42)){
      useDungeonCandy();
      clicked=false;
      return true;
    }
    if(inRect(x+360,y+267,150,42)){
      useDungeonStimulant();
      clicked=false;
      return true;
    }
  }
  if(justPressed("escape")) closeStaminaRecover();
  clicked=false;
  return true;
}

function drawStaminaRecoverOverlay(){
  if(!staminaRecoverOpen) return;
  normalizeDungeonRuntime();

  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.62)";
  ctx.fillRect(0,0,W,H);

  const x=W/2-290, y=150, w=580, h=430;
  ctx.fillStyle="rgba(8,13,26,.96)";
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(124,199,255,.55)";
  ctx.lineWidth=2;
  ctx.strokeRect(x,y,w,h);

  ctx.fillStyle="#fff";
  ctx.font="bold 28px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"Recover Stamina":"恢复体力",x+32,y+48);

  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  drawStaminaIcon(x+30,y+62,25);
  ctx.fillText(language==="en"?"Current Stamina":"当前体力",x+61,y+82);

  ctx.fillStyle="#7cc7ff";
  ctx.font="bold 32px " + FONT_UI;
  ctx.fillText(Math.floor(dungeonStamina)+" / 240",x+32,y+122);

  ctx.fillStyle="rgba(255,255,255,.08)";
  ctx.fillRect(x+32,y+150,w-64,76);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(x+32,y+150,w-64,76);
  ctx.fillStyle="#ffbf66";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText(language==="en"?"Candy":"糖果",x+58,y+182);
  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText((language==="en"?"Owned: ":"拥有：")+dungeonCandy+" / 2400    +40    "+(language==="en"?"Daily: ":"今日：")+dungeonCandyDailyUsed+"/6",x+58,y+207);
  drawBtn(language==="en"?"Use":"使用","",x+360,y+167,150,42,dungeonCandy>0 && dungeonCandyDailyUsed<6,"#ffbf66");

  ctx.fillStyle="rgba(255,255,255,.08)";
  ctx.fillRect(x+32,y+250,w-64,76);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(x+32,y+250,w-64,76);
  ctx.fillStyle="#7cc7ff";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText(language==="en"?"Stimulant":"兴奋剂",x+58,y+282);
  ctx.fillStyle="rgba(255,255,255,.70)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText((language==="en"?"Owned: ":"拥有：")+dungeonStimulant+" / 4    +240",x+58,y+307);
  drawBtn(language==="en"?"Use":"使用","",x+360,y+267,150,42,dungeonStimulant>0,"#7cc7ff");

  if(staminaRecoverMsg){
    ctx.fillStyle="#ffe066";
    ctx.font="bold 15px " + FONT_UI;
    ctx.textAlign="center";
    ctx.fillText(staminaRecoverMsg,W/2,y+348);
  }

  drawBtn(language==="en"?"Close":"关闭","ESC",x+185,y+360,200,44,false,"#fff");

  ctx.fillStyle="rgba(255,255,255,.65)";
  ctx.font="bold 22px Arial";
  ctx.textAlign="center";
  ctx.fillText("×",x+w-33,y+38);
  ctx.restore();
}

function drawCurrencyIcon(kind,x,y,size=24){
  const isGold=kind==="gold";
  const img=isGold?goldCurrencyImg:crystalCurrencyImg;
  const ready=isGold?goldCurrencyReady:crystalCurrencyReady;
  if(ready&&img.naturalWidth){
    const ratio=img.naturalWidth/Math.max(1,img.naturalHeight);
    const dw=ratio>=1?size:size*ratio,dh=ratio>=1?size/ratio:size;
    ctx.drawImage(img,x+(size-dw)/2,y+(size-dh)/2,dw,dh);
    return;
  }
  ctx.save();ctx.fillStyle=isGold?"#ffe066":"#7cc7ff";ctx.translate(x+size/2,y+size/2);
  if(isGold){ctx.beginPath();ctx.arc(0,0,size*.34,0,Math.PI*2);ctx.fill();}
  else{ctx.rotate(Math.PI/4);ctx.fillRect(-size*.25,-size*.25,size*.5,size*.5);}
  ctx.restore();
}

function drawStaminaIcon(x,y,size=24){
  if(staminaCurrencyReady&&staminaCurrencyImg.naturalWidth){
    const ratio=staminaCurrencyImg.naturalWidth/Math.max(1,staminaCurrencyImg.naturalHeight);
    const dw=ratio>=1?size:size*ratio,dh=ratio>=1?size/ratio:size;
    ctx.drawImage(staminaCurrencyImg,x+(size-dw)/2,y+(size-dh)/2,dw,dh);
    return;
  }
  ctx.save();ctx.fillStyle="#ffbf66";ctx.font="bold "+size+"px Arial";ctx.textAlign="center";ctx.fillText("⚡",x+size/2,y+size*.82);ctx.restore();
}

function drawCompactResourceBar(x,y,w=500,showHints=false){
  normalizeDungeonRuntime();
  ctx.save();
  ctx.fillStyle="rgba(4,8,18,.90)";
  ctx.fillRect(x,y,w,46);
  ctx.strokeStyle="rgba(170,195,225,.34)";
  ctx.strokeRect(x,y,w,46);

  ctx.textAlign="left";
  ctx.font="bold 15px " + FONT_UI;

  drawCurrencyIcon("crystal",x+14,y+9,28);
  ctx.fillStyle="#7cc7ff";
  ctx.fillText(tr("水晶","Crystal"), x+47, y+29);
  ctx.fillStyle="#ffffff";
  ctx.fillText(String(crystals), x+103, y+29);

  drawCurrencyIcon("gold",x+194,y+9,28);
  ctx.fillStyle="#ffe066";
  ctx.fillText(tr("金币","Gold"), x+226, y+29);
  ctx.fillStyle="#ffffff";
  ctx.fillText(String(gold), x+273, y+29);

  drawStaminaIcon(x+362,y+7,31);
  ctx.fillStyle="#ffffff";
  ctx.fillText(Math.floor(dungeonStamina)+"/240", x+392, y+29);

  // Pure visual plus button. Existing click target already covers the stamina area.
  const px = x + w - 30;
  const py = y + 23;
  const hover = dist(mouseX, mouseY, px, py) < 15;
  ctx.fillStyle = hover ? "rgba(255,224,102,.28)" : "rgba(255,255,255,.10)";
  ctx.beginPath();
  ctx.arc(px, py, 14, 0, Math.PI*2);
  ctx.fill();
  ctx.strokeStyle = hover ? "#ffe066" : "rgba(255,255,255,.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = hover ? "#ffe066" : "#fff";
  ctx.font = "bold 22px Arial";
  ctx.textAlign = "center";
  ctx.fillText("+", px, py+7);

  if(showHints){
    let hint="",hx=x;
    if(inRect(x,y,180,46)){hint=language==="en"?"Limited resource exchange":"限量资源兑换";hx=x+10;}
    else if(inRect(x+180,y,172,46)){hint=language==="en"?"Character & weapon upgrades":"角色与武器养成";hx=x+181;}
    else if(inRect(x+352,y,w-352,46)){hint=language==="en"?"Dungeon entry resource":"副本入场资源";hx=x+322;}
    if(hint){
      ctx.beginPath();ctx.roundRect(hx,y+51,172,25,7);ctx.fillStyle="rgba(3,7,16,.96)";ctx.fill();
      ctx.strokeStyle="rgba(124,199,255,.32)";ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,.82)";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="center";ctx.fillText(hint,hx+86,y+68);
    }
  }

  ctx.restore();
}

function currentOperationStages(){
  if(selectedTab==="combat") return currentCommissionStages();
  return stages;
}

function currentStageData(){
  const list = currentOperationStages();
  return list.find(st=>st.id===selectedStage) || list[0];
}

function stageDisplayName(st){
  if(!st) return "";
  return st.displayName || (language==="en" ? (st.name || st.zh || "") : (st.zh || st.name || ""));
}

function stageDisplayDesc(st){
  if(!st) return "";
  return st.displayDesc || (language==="en" ? (st.desc || st.zhDesc || "") : (st.zhDesc || st.desc || ""));
}

function operationNodePos(i){
  return {x:215 + i*225, y:330};
}

function drawChapterSelectPage(){
  const chapterCards = language==="en" ? [
    {no:"00", title:"Arrival", sub:"11 stages", color:"#d4a85f", open:true},
    {no:"01", title:"Project 4", sub:"Ravenhado · 10 stages", color:"#7d91a8", open:chapter0Complete()},
    {no:"02", title:"Choice", sub:"Ravenhado · 11 stages", color:"#8b647d", open:chapter1Complete()},
    {no:"03", title:"Distant City", sub:"Coming soon", color:"#587f82"},
    {no:"04", title:"Zero Boundary", sub:"Coming soon", color:"#6b657f"}
  ] : [
    {no:"00", title:"初入", sub:"11个关卡", color:"#d4a85f", open:true},
    {no:"01", title:"Project 4", sub:"雷文哈多篇 · 10关", color:"#7d91a8", open:chapter0Complete()},
    {no:"02", title:"抉择", sub:"雷文哈多篇 · 11关", color:"#8b647d", open:chapter1Complete()},
    {no:"03", title:"远方之城", sub:"尚未开放", color:"#587f82"},
    {no:"04", title:"零点边界", sub:"尚未开放", color:"#6b657f"}
  ];

  ctx.save();
  ctx.fillStyle="rgba(0,0,0,.28)";
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle="#fff";
  ctx.font="bold 28px "+FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(language==="en"?"MAIN STORY":"主线故事",58,68);
  ctx.fillStyle="rgba(255,255,255,.48)";
  ctx.font="13px "+FONT_UI;
  ctx.fillText(language==="en"?"Select a chapter card to enter its stage map":"选择章节卡牌，进入对应的关卡地图",60,94);
  ctx.strokeStyle="rgba(255,255,255,.16)";
  ctx.beginPath(); ctx.moveTo(58,112); ctx.lineTo(W-58,112); ctx.stroke();

  for(let i=0;i<chapterCards.length;i++){
    const card=chapterCards[i];
    const x=i===0?72:306+(i-1)*184;
    const y=i===0?154:184;
    const w=i===0?220:164;
    const h=i===0?345:305;
    const hover=inRect(x,y,w,h);
    const grad=ctx.createLinearGradient(x,y,x,y+h);
    grad.addColorStop(0,card.open?(hover?"rgba(114,82,37,.98)":"rgba(83,61,31,.96)"):"rgba(31,34,45,.92)");
    grad.addColorStop(.58,"rgba(12,15,23,.96)");
    grad.addColorStop(1,"rgba(4,6,11,.98)");
    ctx.fillStyle=grad;
    ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=card.open?(hover?"#ffe066":"rgba(212,168,95,.72)"):hover?"rgba(255,255,255,.34)":"rgba(255,255,255,.14)";
    ctx.lineWidth=card.open&&hover?3:1.5;
    ctx.strokeRect(x,y,w,h);

    ctx.save();
    ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    ctx.globalAlpha=card.open?.28:.12;
    ctx.strokeStyle=card.color;
    ctx.lineWidth=2;
    for(let k=-2;k<8;k++){
      ctx.beginPath();
      ctx.moveTo(x-20,y+80+k*42);
      ctx.lineTo(x+w+35,y+15+k*54);
      ctx.stroke();
    }
    ctx.globalAlpha=card.open?.22:.09;
    ctx.fillStyle=card.color;
    ctx.beginPath();
    ctx.arc(x+w*.72,y+h*.36,card.open?92:70,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle=card.open?"#ffe066":"rgba(255,255,255,.36)";
    ctx.font="bold "+(i===0?46:34)+"px Arial";
    ctx.textAlign="left";
    ctx.fillText(card.no,x+18,y+55);
    ctx.fillStyle=card.open?"#fff":"rgba(255,255,255,.58)";
    ctx.font="bold "+(i===0?24:19)+"px "+FONT_UI;
    ctx.fillText(card.title,x+18,y+h-72);
    ctx.fillStyle=card.open?"rgba(255,255,255,.62)":"rgba(255,255,255,.32)";
    ctx.font="13px "+FONT_UI;
    ctx.fillText(card.sub,x+18,y+h-42);
    if(card.open){
      ctx.fillStyle=hover?"#ffe066":"rgba(255,224,102,.78)";
      ctx.font="bold 13px "+FONT_UI;
      ctx.textAlign="right";
      ctx.fillText(language==="en"?"ENTER  ›":"进入  ›",x+w-16,y+h-18);
    }else{
      ctx.fillStyle="rgba(255,255,255,.25)";
      ctx.font="bold 15px Arial";
      ctx.textAlign="right";
      ctx.fillText("LOCK",x+w-14,y+28);
    }
  }
  ctx.restore();

  uiPanel(30,585,1060,58,"rgba(255,255,255,.12)","rgba(0,0,0,.42)");
  drawBtn(ui("main"),"",90,595,135,38,true,"#ffe066");
  drawBtn(ui("operation"),"",240,595,135,38,false,"#fff");
  drawBtn(language==="en"?"Dungeon":"副本",canUseDungeon()?"":"LOCK",390,595,135,38,false,!canUseDungeon()?"#777":"#7cc7ff");
  drawBtn("Side Story",canUseSideStory()?"":"LOCK",540,595,135,38,false,!canUseSideStory()?"#777":"#fff");
  drawBtn(language==="en"?"Daydream":"白日梦",canUseDaydream()?"":"LOCK",690,595,135,38,false,canUseDaydream()?"#fff":"#555");
  drawBtn(ui("backLobby"),"CLICK",890,595,170,38,false,"#fff");
}

function drawOperation(){
  if(selectedTab==="daydream"&&!canUseDaydream()){
    selectedTab="main";mainChapterView="chapters";operationDetailVisible=false;
  }
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#11172d");
  bg.addColorStop(.55,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  if(selectedTab==="daydream" && window.PZDaydream && typeof window.PZDaydream.isFullscreen==="function" && window.PZDaydream.isFullscreen()){
    window.PZDaydream.archiveInline=false;
    window.PZDaydream.drawPage();
    return;
  }

  if(selectedTab==="main" && mainChapterView==="chapters"){
    drawChapterSelectPage();
    drawStaminaRecoverOverlay();
    return;
  }

  uiPanel(30,30,1060,90,"rgba(255,255,255,.13)","rgba(255,255,255,.055)");
  ctx.fillStyle="#fff";
  ctx.font="bold 34px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(selectedTab==="daydream" ? (language==="en"?"Daydream Reconstruction":"白日梦重现") : (selectedTab==="sideStory" ? "Side Story" : (selectedTab==="dungeon" ? (language==="en"?"Dungeons":"副本") : (selectedTab==="combat" ? (language==="en"?"Commissions":"委托作战") : mainChapterTitle()))),58,78);
  ctx.font="14px " + FONT_UI;
  ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.fillText(selectedTab==="daydream" ? (language==="en"?"Explore branching routes, investigate anomalies, and survive each layer.":"参考节点路线式肉鸽结构，改造成PZ剧情调查模式。") : (selectedTab==="sideStory" ? (language==="en"?"Coming soon.":"开发中。") : (selectedTab==="dungeon" ? (language==="en"?"Materials / Bosses / Exploration / Patrol":"材料副本 / Boss / Project Area / 巡逻。") : (selectedTab==="combat" ? (language==="en"?"4 chapters · 4 timed waves per stage · First-clear reward: 200 Crystals":"4个章节 · 每关4波限时战斗 · 首通200水晶") : tx("operationSubtitle")+crystals))),60,102);

  // map background art
  ctx.save();
  ctx.globalAlpha=.32;
  if(selectedTab==="combat"){
    ctx.fillStyle="#101724"; ctx.fillRect(70,170,980,300);
    ctx.fillStyle="#23304a"; for(let i=0;i<12;i++)ctx.fillRect(110+i*72,325-(i%3)*22,34,130);
    ctx.fillStyle="#624b2f"; for(let i=0;i<10;i++)ctx.fillRect(130+i*86,420-(i%2)*35,55,8);
    ctx.fillStyle="#7cc7ff"; ctx.globalAlpha=.20; for(let i=0;i<8;i++)ctx.fillRect(120+i*112,210,42,260);
  }else{
    ctx.fillStyle="#102016"; ctx.fillRect(70,170,250,300);
    ctx.fillStyle="#252017"; ctx.fillRect(320,170,250,300);
    ctx.fillStyle="#151520"; ctx.fillRect(570,170,250,300);
    ctx.fillStyle="#1e1e2b"; ctx.fillRect(820,170,230,300);
    ctx.globalAlpha=.55;
    ctx.fillStyle="#2f5f3a"; for(let i=0;i<22;i++){ctx.beginPath();ctx.arc(100+i*22,395-(i%4)*18,18,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#6b5a34"; for(let i=0;i<8;i++)ctx.fillRect(350+i*28,365-(i%3)*20,18,90);
    ctx.fillStyle="#3d3d55"; for(let i=0;i<8;i++)ctx.fillRect(620+i*26,340-(i%2)*25,22,125);
    ctx.fillStyle="#4a4a60"; for(let i=0;i<6;i++)ctx.fillRect(860+i*28,320-(i%2)*35,24,155);
  }
  ctx.restore();

  if(selectedTab==="dungeon"){
    drawDungeonInlinePanel();
  }else if(selectedTab==="sideStory" && window.PZSideStory){
    window.PZSideStory.draw();
  }else if(selectedTab==="daydream" && window.PZDaydream){
    window.PZDaydream.archiveInline=true;
    window.PZDaydream.drawPage();
  }else{
  const list = currentOperationStages();

  if(selectedTab==="combat"){
    const chapter=commissionChapters[selectedCommissionChapter];
    drawBtn("<","",52,305,52,52,true,chapter.color);
    drawBtn(">","",1016,305,52,52,true,chapter.color);
    ctx.fillStyle=chapter.color; ctx.font="bold 20px "+FONT_UI; ctx.textAlign="center";
    ctx.fillText((language==="en"?"CHAPTER ":"委托章节 ")+chapter.no+" · "+(language==="en"?chapter.en:chapter.zh),W/2,192);
    ctx.fillStyle="rgba(255,255,255,.58)"; ctx.font="13px "+FONT_UI;
    ctx.fillText(language==="en"?"Select a node. Each stage has a unique combat rule.":"选择关卡；每关拥有独立战斗机制。",W/2,216);
  }

  ctx.strokeStyle="rgba(255,255,255,.22)";
  ctx.lineWidth=5;
  ctx.beginPath();
  for(let i=0;i<list.length;i++){
    const p = selectedTab==="combat" ? operationNodePos(i) : nodePos(i);
    if(i===0)ctx.moveTo(p.x,p.y);
    else ctx.lineTo(p.x,p.y);
  }
  ctx.stroke();

  for(let i=0;i<list.length;i++){
    const st=list[i];
    const p=selectedTab==="combat" ? operationNodePos(i) : nodePos(i);
    const locked=selectedTab==="combat" ? false : (i>0&&!isMainStageCleared(i));
    const done=selectedTab==="combat" ? !!cleared["c"+st.id] : isMainStageCleared(st.id);
    const sel=operationDetailVisible && selectedStage===st.id;
    const hover=dist(mouseX,mouseY,p.x,p.y)<28&&!locked;
    const isStoryNode=selectedTab==="main"&&!!st.storyOnly;
    ctx.globalAlpha=locked?.42:1;
    ctx.fillStyle=sel?"rgba(255,224,102,.28)":hover?"rgba(255,255,255,.14)":"rgba(255,255,255,.08)";
    ctx.beginPath();
    ctx.arc(p.x,p.y,st.boss?32:25,0,Math.PI*2);
    ctx.fill();
    ctx.strokeStyle=sel?"#ffe066":done?"#7cc7ff":locked?"#777":isStoryNode?"#b98cff":"#fff";
    ctx.lineWidth=sel?4:2;
    ctx.stroke();
    ctx.fillStyle=st.boss?"#ff6b9b":done?"#7cc7ff":locked?"#888":isStoryNode?"#b98cff":"#fff";
    ctx.font=st.boss?"bold 18px Arial":"bold 16px Arial";
    ctx.textAlign="center";
    ctx.fillText(st.boss?"B":isStoryNode?"◆":String(selectedTab==="combat"?st.localId:st.id).padStart(2,"0"),p.x,p.y+6);
    ctx.font="12px " + FONT_UI;
    ctx.fillStyle="rgba(255,255,255,.70)";
    ctx.fillText(selectedTab==="combat" ? (language==="en"?"Commission":"委托") : stageDisplayName(st),p.x,p.y+48);
    ctx.globalAlpha=1;
  }

  }

  // bottom mode tabs
  uiPanel(30,585,1060,58,"rgba(255,255,255,.12)","rgba(0,0,0,.42)");
  drawBtn(ui("main"),"",90,595,135,38,selectedTab==="main",selectedTab==="main"?"#ffe066":"#fff");
  drawBtn(ui("operation"),"",240,595,135,38,selectedTab==="combat",selectedTab==="combat"?"#ffe066":"#fff");
  drawBtn(language==="en"?"Dungeon":"副本",canUseDungeon()?"":"LOCK",390,595,135,38,selectedTab==="dungeon",!canUseDungeon()?"#777":(selectedTab==="dungeon"?"#ffe066":"#7cc7ff"));
  drawBtn("Side Story",canUseSideStory()?"":"LOCK",540,595,135,38,selectedTab==="sideStory",!canUseSideStory()?"#777":(selectedTab==="sideStory"?"#c35cff":"#fff"));
  drawBtn(language==="en"?"Daydream":"白日梦",canUseDaydream()?"":"LOCK",690,595,135,38,selectedTab==="daydream",canUseDaydream()?(selectedTab==="daydream"?"#9b7cff":"#fff"):"#555");
  drawNewDiamond(817,600,contentDot("daydream",canUseDaydream()));
  drawBtn(ui("backLobby"),"CLICK",890,595,170,38,false,"#fff");

  // detail panel
  if(selectedTab!=="dungeon" && selectedTab!=="sideStory" && selectedTab!=="daydream" && operationDetailVisible){
    const st=currentStageData();
    const locked=selectedTab==="combat" ? false : (selectedStage>1&&!isMainStageCleared(selectedStage-1));
    const done=selectedTab==="combat" ? !!cleared["c"+st.id] : isMainStageCleared(st.id);

    ctx.save();
    ctx.globalAlpha=.97;
    ctx.fillStyle="rgba(9,11,20,.82)";
    ctx.fillRect(W-360,145,300,390);
    ctx.strokeStyle="rgba(255,255,255,.16)";
    ctx.strokeRect(W-360,145,300,390);
    ctx.restore();

    ctx.fillStyle=locked?"#888":st.boss?"#ff6b9b":"#ffe066";
    ctx.font="bold 26px " + FONT_UI;
    ctx.textAlign="left";
    const code = selectedTab==="combat" ? ("C"+st.chapter+"-"+st.localId) : stageCode(st.id);
    ctx.fillText(code,W-330,190);
    ctx.fillStyle="#fff";
    ctx.font="bold 22px " + FONT_UI;
    ctx.fillText(stageDisplayName(st),W-330,226);
    ctx.save();ctx.beginPath();ctx.rect(W-334,238,260,68);ctx.clip();
    drawUIText(stageDisplayDesc(st),W-330,252,250,{size:13,bold:false,color:"rgba(255,255,255,.68)",maxLines:4,lineH:17});
    ctx.restore();
    ctx.fillStyle="rgba(255,255,255,.68)";
    ctx.font="15px " + FONT_UI;
    ctx.fillText(tx("typeLabel")+(selectedTab==="combat" ? (language==="en"?st.mechanicEn:st.mechanicZh) : missionLabel()),W-330,315);
    ctx.fillText(tx("statusLabel")+(done?tx("ownedStatus"):locked?ui("locked"):tx("availableStatus")),W-330,350);
    if(selectedTab==="combat") ctx.fillText("Lv."+st.lv+"  ·  "+(language==="en"?"Limit ":"限时 ")+st.time+"s",W-330,382);
    if(selectedTab==="combat"){
      ctx.fillStyle="rgba(20,28,43,.96)"; ctx.fillRect(W-338,402,255,66);
      ctx.strokeStyle="rgba(255,224,102,.42)"; ctx.strokeRect(W-338,402,255,66);
      ctx.fillStyle="#ffe066"; ctx.font="bold 16px "+FONT_UI; ctx.fillText(language==="en"?"FIRST CLEAR REWARD":"首通奖励",W-320,426);
      ctx.fillStyle="#7cc7ff"; ctx.font="bold 20px "+FONT_UI; ctx.fillText("◆ 200 "+tx("crystalWord")+"  ·  "+st.exp+" EXP",W-320,454);
    }
    drawBtn(locked?ui("locked"):ui("startAction"),locked?"LOCK":"CLICK",W-338,486,255,52,!locked,locked?"#888":"#ffe066");
  }else if(selectedTab!=="dungeon"){
    // V49.13: removed obsolete stage-detail hint text.
  }
  drawStaminaRecoverOverlay();
}
function drawStory(){
  const st=stages[selectedStage-1], line=currentStory[storyIndex]||[mt("storyFallbackSpeaker"),mt("storyFallbackText")], speaker=formatStoryText(line[0]), text=formatStoryText(line[1]);
  const bg=ctx.createLinearGradient(0,0,0,H); bg.addColorStop(0,"#11172d"); bg.addColorStop(.55,"#070912"); bg.addColorStop(1,"#03040a"); ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,.70)"; ctx.font="14px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(stageCode(selectedStage)+" "+stageDisplayName(st),90,78);
  ctx.fillStyle="rgba(0,0,0,.72)"; ctx.fillRect(65,H-190,W-130,150); ctx.strokeStyle="rgba(255,255,255,.16)"; ctx.strokeRect(65,H-190,W-130,150); ctx.fillStyle="#ffe066"; ctx.font="bold 24px " + FONT_UI; ctx.fillText(speaker,95,H-146); ctx.fillStyle="#fff"; ctx.font="22px " + FONT_UI; wrapText(text,95,H-102,W-230,32); drawBtn(tr("下一句","Next"),"CLICK",W-390,H-82,165,48,true,"#ffe066"); drawBtn(tr("跳过剧情","Skip Story"),"ESC",W-205,H-82,165,48);
}
function wrapText(text,x,y,maxWidth,lineHeight){ let line=""; for(const ch of text){ const test=line+ch; if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y); line=ch; y+=lineHeight;} else line=test; } ctx.fillText(line,x,y); }


function drawBossKrosSettlement(){
  const r = settlement && settlement.bossReward ? settlement.bossReward : {gold:0,dragonClaw:0,crystal:0,expReward:0};
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#221323");
  bg.addColorStop(.55,"#090b14");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(0,0,0,.55)";
  ctx.fillRect(W/2-340,82,680,500);
  ctx.strokeStyle="rgba(255,107,155,.80)";
  ctx.strokeRect(W/2-340,82,680,500);

  ctx.textAlign="center";
  ctx.fillStyle="#ff6b9b";
  ctx.font="bold 40px " + FONT_UI;
  ctx.fillText(language==="en"?"Boss Defeated":"Boss击败",W/2,150);

  ctx.fillStyle="#fff";
  ctx.font="bold 25px " + FONT_UI;
  ctx.fillText(bossKrosData().name,W/2,200);

  ctx.font="bold 54px " + FONT_UI;
  ctx.fillStyle="#ffe066";
  ctx.fillText("CRYSTAL BREAK",W/2,270);

  ctx.textAlign="left";
  ctx.font="bold 20px " + FONT_UI;
  let y=335;
  ctx.fillStyle="#ff6b9b"; ctx.fillText((language==="en"?"Dragon Claw +":"龙爪 +")+r.dragonClaw,W/2-190,y); y+=36;
  ctx.fillStyle="#ffe066"; ctx.fillText((language==="en"?"Gold +":"金币 +")+r.gold,W/2-190,y); y+=36;
  ctx.fillStyle="#fff"; ctx.fillText("EXP +"+r.expReward,W/2-190,y); y+=36;
  ctx.fillStyle=r.crystal>0?"#7cc7ff":"rgba(255,255,255,.42)";
  ctx.fillText(r.crystal>0 ? ((language==="en"?"Weekly Crystal +":"每周水晶 +")+r.crystal) : (language==="en"?"Weekly Crystal already claimed":"本周水晶已领取"),W/2-190,y);

  ctx.fillStyle="rgba(255,255,255,.65)";
  ctx.font="15px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(language==="en"?"Click to return to Boss Challenge":"点击返回Boss挑战",W/2,484);
  drawBtn(language==="en"?"Continue":"继续","CLICK",W/2-120,515,240,52,true,"#fff");
}

function drawMaterialSettlement(){
  const r = settlement && settlement.matReward ? settlement.matReward : {gold:0,expBooks:0,weaponOre:0,skillBooks:0,skillNormal:0,skillSkill:0,skillUltimate:0,crystal:0,expReward:0,name:"Material"};
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#11172d");
  bg.addColorStop(.55,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(0,0,0,.50)";
  ctx.fillRect(W/2-330,88,660,490);
  ctx.strokeStyle="rgba(124,199,255,.80)";
  ctx.strokeRect(W/2-330,88,660,490);

  ctx.textAlign="center";
  ctx.fillStyle="#7cc7ff";
  ctx.font="bold 40px " + FONT_UI;
  ctx.fillText(language==="en"?"Trial Complete":"副本完成",W/2,155);

  ctx.fillStyle="#fff";
  ctx.font="bold 24px " + FONT_UI;
  ctx.fillText(r.name || (language==="en"?"Material Dungeon":"材料副本"),W/2,202);

  ctx.font="bold 54px " + FONT_UI;
  ctx.fillStyle="#ffe066";
  ctx.fillText("★★★",W/2,275);

  ctx.textAlign="left";
  ctx.font="bold 20px " + FONT_UI;
  let y=335;
  ctx.fillStyle="#ffe066"; if(r.gold){ ctx.fillText((language==="en"?"Gold +":"金币 +")+r.gold,W/2-190,y); y+=34; }
  ctx.fillStyle="#7cffb2"; if(r.expBooks){ ctx.fillText((language==="en"?"Executor EXP +":"角色升级材料 +")+r.expBooks,W/2-190,y); y+=34; }
  ctx.fillStyle="#7cc7ff"; if(r.weaponOre){ ctx.fillText((language==="en"?"Weapon Ore +":"武器强化材料 +")+r.weaponOre,W/2-190,y); y+=34; }
  ctx.fillStyle="#ffcf7c"; if(r.skillBooks){ ctx.fillText((language==="en"?"Skill Books +":"技能书 +")+r.skillBooks,W/2-190,y); y+=34; }
  ctx.fillStyle="#ff9f7c"; if(r.skillNormal||r.skillSkill||r.skillUltimate){ ctx.fillText((language==="en"?"Skill Materials +":"技能材料 +")+((r.skillNormal||0)+(r.skillSkill||0)+(r.skillUltimate||0)),W/2-190,y); y+=34; }
  ctx.fillStyle="#b98cff"; if(r.moduleName){ ctx.fillText((language==="en"?"Module: ":"获得模块：")+r.moduleName+"  G"+(r.moduleGrade||""),W/2-190,y); y+=34; }
  ctx.fillStyle="#c35cff"; if(r.crystal){ ctx.fillText((language==="en"?"Weekly Crystal +":"每周水晶 +")+r.crystal,W/2-190,y); y+=34; }
  ctx.fillStyle="#fff"; ctx.fillText("EXP +"+(r.expReward||0),W/2-190,y);

  ctx.fillStyle="rgba(255,255,255,.65)";
  ctx.font="15px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(language==="en"?"Click to return to Material Dungeon":"点击返回材料副本",W/2,472);

  drawBtn(language==="en"?"Continue":"继续","CLICK",W/2-120,505,240,52,true,"#fff");
}

function drawSettlement(){
  if(settlement && settlement.mode==="projectArea"){ drawProjectAreaSettlement(); return; }
  if(settlement && settlement.mode==="bossKros"){ drawBossKrosSettlement(); return; }
  if(settlement && settlement.mode==="material"){ drawMaterialSettlement(); return; }
  const isCommission = settlement.mode === "commission";
  const st = isCommission ? (commissionStages[settlement.stage-1] || commissionStages[0]) : stages[settlement.stage-1];

  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#11172d");
  bg.addColorStop(.55,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(0,0,0,.48)";
  ctx.fillRect(W/2-320,95,640,470);
  ctx.strokeStyle="rgba(255,224,102,.80)";
  ctx.strokeRect(W/2-320,95,640,470);

  ctx.textAlign="center";
  ctx.fillStyle="#ffe066";
  ctx.font="bold 42px " + FONT_UI;
  ctx.fillText(ui("settlement"),W/2,160);

  ctx.fillStyle="#fff";
  ctx.font="bold 24px " + FONT_UI;
  const code = isCommission ? ("C-"+String(settlement.stage).padStart(2,"0")) : (tx("stageCodePrefix")+String(settlement.stage).padStart(2,"0"));
  ctx.fillText(code+" "+stageDisplayName(st),W/2,205);

  ctx.font="bold 54px " + FONT_UI;
  ctx.fillStyle="#ffe066";
  ctx.fillText("★★★",W/2,280);

  ctx.fillStyle="#7cc7ff";
  ctx.font="bold 24px " + FONT_UI;
  ctx.fillText(tx("crystalGainPrefix")+settlement.reward,W/2,382);

  ctx.fillStyle="#ffe066";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText("EXP +"+(settlement.expReward||0),W/2,415);

  ctx.font="16px " + FONT_UI;
  ctx.fillStyle="rgba(255,255,255,.75)";
  ctx.fillText(isCommission ? (language==="en" ? "Commission reward has been added." : "委托奖励已加入背包。") : tx("settlementRewardLine"),W/2,445);

  drawBtn(ui("backLobby"),"CLICK",W/2-120,495,240,52,true,"#fff");
}

function drawLisaPortrait(x,y,w,h,lock=false){
  // Lisa follows the same abstract PZ silhouette language as the existing
  // executors, but has a readable support-caster profile and Lavender focus.
  ctx.save();
  ctx.translate(x+w/2,y+h*.58);
  ctx.globalAlpha=lock?.42:1;
  ctx.fillStyle="rgba(0,0,0,.34)";
  ctx.beginPath();ctx.ellipse(0,h*.35,w*.43,h*.095,0,0,Math.PI*2);ctx.fill();

  const robe=ctx.createLinearGradient(-w*.18,-h*.18,w*.2,h*.3);
  robe.addColorStop(0,"#d8c9ff");robe.addColorStop(.52,"#9a7bdd");robe.addColorStop(1,"#463c73");
  ctx.shadowBlur=lock?0:22;ctx.shadowColor="#bda7ff";ctx.fillStyle=robe;
  ctx.beginPath();
  ctx.moveTo(-w*.12,-h*.16);ctx.quadraticCurveTo(-w*.29,h*.06,-w*.25,h*.32);
  ctx.lineTo(w*.25,h*.32);ctx.quadraticCurveTo(w*.30,h*.05,w*.12,-h*.16);ctx.closePath();ctx.fill();

  ctx.shadowBlur=0;ctx.fillStyle="#f1eaff";
  ctx.beginPath();ctx.arc(0,-h*.34,w*.145,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#72599f";
  ctx.beginPath();ctx.arc(0,-h*.39,w*.155,Math.PI,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.arc(-w*.15,-h*.35,w*.075,0,Math.PI*2);ctx.arc(w*.15,-h*.35,w*.075,0,Math.PI*2);ctx.fill();

  // Wind ribbon and the vertical catalyst silhouette communicate her ranged
  // rectangular attack without introducing a different art style.
  ctx.strokeStyle="#78f0c3";ctx.lineWidth=Math.max(3,w*.026);ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(-w*.22,h*.08);ctx.bezierCurveTo(-w*.48,-h*.03,-w*.41,-h*.30,-w*.18,-h*.24);ctx.stroke();
  ctx.strokeStyle="#e9dcff";ctx.lineWidth=Math.max(4,w*.045);
  ctx.beginPath();ctx.moveTo(w*.23,h*.20);ctx.lineTo(w*.32,-h*.26);ctx.stroke();
  ctx.fillStyle="#78f0c3";ctx.beginPath();ctx.arc(w*.32,-h*.29,w*.07,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="rgba(120,240,195,.30)";ctx.lineWidth=2;ctx.strokeRect(-w*.34,-h*.13,w*.68,h*.47);
  ctx.restore();
}

function drawPortrait(x,y,w,h,r,lock=false){
  if(r===roles[5]){ drawLisaPortrait(x,y,w,h,lock); return; }
  ctx.save();
  ctx.translate(x+w/2,y+h*0.58);
  ctx.globalAlpha=lock?.45:1;
  ctx.shadowBlur=lock?0:24;
  ctx.shadowColor=r.color;
  ctx.fillStyle="rgba(0,0,0,.32)";
  ctx.beginPath();
  ctx.ellipse(0,h*.34,w*.42,h*.10,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=r.color;
  ctx.beginPath();
  ctx.ellipse(0,0,w*.22,h*.34,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=r.sub;
  ctx.beginPath();
  ctx.arc(0,-h*.35,w*.17,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle=r.sub;
  ctx.lineWidth=Math.max(4,w*.06);
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(w*.18,-h*.05);
  ctx.lineTo(w*.48,-h*.35);
  ctx.stroke();

  ctx.globalAlpha=.18;
  ctx.strokeStyle=r.color;
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.arc(0,0,w*.36,0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
}


let operatorPageMode = "list";

function executorRank(i){
  return (i===PROTAGONIST_ROLE || i===3) ? "S" : "A";
}
function executorElement(i){
  if(i===PROTAGONIST_ROLE) return language==="en" ? "Gray" : "灰白";
  const zh=["物理","风","暗","冰","","风"];
  const en=["Physical","Wind","Dark","Ice","","Wind"];
  return (language==="en"?en:zh)[i] || "";
}
function executorOrder(){
  const order=[PROTAGONIST_ROLE,0,1,2,3,5];
  return order.filter(i=>roles[i]);
}
function executorListIndexToRole(listIdx){
  return executorOrder()[listIdx] ?? 0;
}
function executorRoleToListIndex(roleIdx){
  const idx=executorOrder().indexOf(roleIdx);
  return idx<0?0:idx;
}
function executorAutoLabel(i){
  return isProtagonist(i) ? (language==="en"?"AUTO":"自动") : "";
}

function fitTextToWidth(text, maxWidth, fontPx=12, bold=true){
  let t=String(text ?? "");
  const fontBase=(bold?"bold ":"")+fontPx+"px "+FONT_UI;
  ctx.font=fontBase;
  if(ctx.measureText(t).width<=maxWidth) return t;
  const ell="…";
  while(t.length>0 && ctx.measureText(t+ell).width>maxWidth) t=t.slice(0,-1);
  return t.length?t+ell:ell;
}
function drawUIText(text,x,y,w,opt={}){
  const size=opt.size||12;
  const bold=opt.bold!==false;
  const color=opt.color||"#fff";
  const align=opt.align||"left";
  const maxLines=opt.maxLines||1;
  const lineH=opt.lineH||Math.round(size*1.35);
  let raw=String(text ?? "");
  ctx.save();
  ctx.fillStyle=color;
  ctx.font=(bold?"bold ":"")+size+"px "+FONT_UI;
  ctx.textAlign=align;
  const words=raw.split(/(\s+)/);
  const lines=[];
  let current="";
  if(maxLines===1){
    lines.push(fitTextToWidth(raw,w,size,bold));
  }else{
    for(const word of words){
      const test=current+word;
      if(ctx.measureText(test).width<=w || current==="") current=test;
      else{ lines.push(current.trim()); current=word.trim(); }
      if(lines.length>=maxLines) break;
    }
    if(lines.length<maxLines && current) lines.push(current.trim());
    if(lines.length>=maxLines){
      lines[maxLines-1]=fitTextToWidth(lines[maxLines-1],w,size,bold);
    }
  }
  for(let i=0;i<Math.min(maxLines,lines.length);i++){
    const tx=align==="center"?x+w/2:align==="right"?x+w:x;
    ctx.fillText(lines[i],tx,y+i*lineH);
  }
  ctx.restore();
}
function shortUIText(text){
  const map={
    "主线同步":"主线同步",
    "Story Sync":"Sync",
    "专属武装":"专属武装",
    "Fixed Weapon":"Bound",
    "已装备":"已装配",
    "Equipped":"Equipped",
    "装备":"装配",
    "Equip":"Equip",
    "强化":"精炼",
    "Upgrade":"Refine",
    "精炼合金":"精炼合金",
    "技能点":"技能数据",
    "突破":"晋升",
    "Breakthrough":"Promote"
  };
  return map[text]||text;
}

function drawInsetLabel(text,x,y,w,h,color="#ffffff",fill="rgba(255,255,255,.08)",stroke="rgba(255,255,255,.13)",fontSize=14,bold=true,align="left"){
  ctx.save();
  ctx.fillStyle=fill;
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=stroke;
  ctx.strokeRect(x,y,w,h);
  ctx.fillStyle=color;
  ctx.font=(bold?"bold ":"")+fontSize+"px "+FONT_UI;
  ctx.textAlign=align;
  const safe=fitTextToWidth(shortUIText(text),Math.max(8,w-18),fontSize,bold);
  const tx = align==="center" ? x+w/2 : align==="right" ? x+w-10 : x+10;
  ctx.fillText(safe,tx,y+h/2+fontSize*.36);
  ctx.restore();
}

function setupHiDPICanvas(){
  try{
    const dpr=Math.min(window.devicePixelRatio||1,2);
    if(!canvas || !ctx) return;
    // Keep game logic coordinates unchanged; only request higher backing store when possible.
    // Most drawing uses fixed W/H coordinates, so we do not scale ctx here.
    ctx.imageSmoothingEnabled=true;
    ctx.imageSmoothingQuality="high";
  }catch(e){}
}

function drawProtagonistArtBox(x,y,w,h,large=false){
  if(!drawHermitPortrait(x,y,w,h,"full")) drawPortrait(x,y,w,h,roles[4],false);
}
function drawExecutorArt(i,x,y,w,h,large=false){
  if(i===PROTAGONIST_ROLE && drawHermitPortrait(x,y,w,h,large?"full":"card")){
    if(!owned[i]){ctx.save();ctx.fillStyle="rgba(0,0,0,.62)";ctx.fillRect(x,y,w,h);ctx.restore();}
    return;
  }
  drawPortrait(x,y,w,h,roles[i],!owned[i]);
}
function operatorLevelText(i){
  return "Lv."+roleDisplayLevel(i)+(isProtagonist(i) ? " SYNC" : "");
}
function roleModuleTotals(i){
  if(battleModeSource==="showcase"){
    const recommended=[
      {hp:260,atk:92,def:42,hpPct:.05,atkPct:.08,defPct:.04,speedPct:.02,sets:{vanguard:4}},
      {hp:180,atk:76,def:28,hpPct:.03,atkPct:.06,defPct:.02,speedPct:.08,sets:{resonance:4}},
      {hp:220,atk:108,def:34,hpPct:.04,atkPct:.10,defPct:.03,speedPct:.02,sets:{night:4}},
      {hp:320,atk:68,def:48,hpPct:.08,atkPct:.05,defPct:.05,speedPct:.01,sets:{frost:4}},
      {hp:240,atk:96,def:38,hpPct:.04,atkPct:.09,defPct:.03,speedPct:.04,sets:{zero:4}}
    ];
    return Object.assign({hp:0,atk:0,def:0,hpPct:0,atkPct:0,defPct:0,speedPct:0,sets:{}},recommended[i]||recommended[0]);
  }
  return window.PZModules?window.PZModules.totals(i,charData):{hp:0,atk:0,def:0,hpPct:0,atkPct:0,defPct:0,speedPct:0,sets:{}};
}
function operatorStatAtk(i){
  const cd=charData[i] || {level:1, weaponLevel:1};
  const lv=roleDisplayLevel(i);
  const base=100 + lv*(isProtagonist(i)?7:8) + roleWeaponLevelDisplay(i)*5,m=roleModuleTotals(i);
  const identityScale=i===2?1.20:i===1?.88:i===5?.90:1;
  return Math.floor((base+(m.atk||0))*(1+(m.atkPct||0))*identityScale);
}
function operatorStatHp(i){
  const lv=roleDisplayLevel(i);
  const base=(isProtagonist(i)?1450:1200) + lv*(isProtagonist(i)?78:65),m=roleModuleTotals(i);
  const identityScale=i===1?.84:i===2?.98:i===5?.90:1;
  return Math.floor((base+(m.hp||0))*(1+(m.hpPct||0))*identityScale);
}
function operatorStatDef(i){
  const lv=roleDisplayLevel(i);
  const base=(isProtagonist(i)?120:90) + lv*(isProtagonist(i)?7:5),m=roleModuleTotals(i);
  const identityScale=i===2?.62:i===1?.86:1;
  return Math.floor((base+(m.def||0))*(1+(m.defPct||0))*identityScale);
}

function drawOperators(){
  if(operatorPageMode==="detail"){
    drawOperatorDetailPage();
  }else{
    drawOperatorListPage();
  }
}

function drawOperatorListPage(){
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#121833");
  bg.addColorStop(.55,"#080a12");
  bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(28,26,1064,82);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(28,26,1064,82);

  ctx.fillStyle="#fff";
  ctx.font="bold 34px "+FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(ui("operators"),58,72);
  ctx.font="14px "+FONT_UI;
  ctx.fillStyle="rgba(255,255,255,.60)";
  ctx.fillText(mt("operatorListHint"),60,99);

  ctx.textAlign="right";
  ctx.fillStyle="#ffe066";
  ctx.font="bold 15px "+FONT_UI;
  ctx.fillText(tx("goldCostPrefix")+gold+"    "+tx("expBookWord")+" "+expBooks+"    "+tx("weaponOreWord")+" "+weaponOre,W-58,72);

  const order=executorOrder();
  const cardW=200, cardH=430, gap=12, startX=42, y=150;
  const visibleW=W-startX*2;
  const totalW=order.length*(cardW+gap)-gap;
  const maxScroll=Math.max(0,totalW-visibleW);
  operatorListScrollX=clamp(operatorListScrollX,0,maxScroll);
  ctx.save();
  ctx.beginPath();ctx.rect(startX-3,y-5,visibleW+6,cardH+12);ctx.clip();
  for(let idx=0; idx<order.length; idx++){
    const i=order[idx], r=roles[i], cd=charData[i], x=startX+idx*(cardW+gap)-operatorListScrollX;
    if(x+cardW<startX-6 || x>startX+visibleW+6) continue;
    const active=selectedOperator===i;
    const lock=!owned[i];
    const hover=inRect(x,y,cardW,cardH);

    ctx.fillStyle=active?"rgba(255,224,102,.15)":hover?"rgba(255,255,255,.10)":"rgba(255,255,255,.055)";
    ctx.fillRect(x,y,cardW,cardH);
    ctx.strokeStyle=active?"#ffe066":hover?"rgba(255,255,255,.36)":"rgba(255,255,255,.14)";
    ctx.lineWidth=active?3:1;
    ctx.strokeRect(x,y,cardW,cardH);

    const artY=y+16, artH=330;
    drawExecutorArt(i,x+8,artY,cardW-16,artH,false);

    ctx.fillStyle="rgba(0,0,0,.54)";
    ctx.fillRect(x+8,y+344,cardW-16,76);
    ctx.strokeStyle="rgba(255,255,255,.12)";
    ctx.strokeRect(x+8,y+344,cardW-16,76);

    drawInsetLabel(executorRank(i),x+18,y+356,36,26,executorRank(i)==="S"?"#ffe066":"#7cc7ff","rgba(0,0,0,.40)","rgba(255,255,255,.16)",14,true,"center");
    drawInsetLabel(operatorLevelText(i),x+62,y+356,108,26,"#fff","rgba(255,255,255,.08)","rgba(255,255,255,.12)",12,true,"center");
    if(lock) drawInsetLabel(language==="en"?"LOCK":"未拥有",x+18,y+388,70,24,"#aaa","rgba(0,0,0,.45)","rgba(255,255,255,.10)",12,true,"center");
    else drawInsetLabel(executorElement(i),x+18,y+388,70,24,"#dfe8ff","rgba(124,199,255,.10)","rgba(124,199,255,.20)",12,true,"center");

    ctx.textAlign="right";
    ctx.fillStyle="#fff";
    ctx.font="bold 20px "+FONT_UI;
    ctx.fillText(roleName(i),x+cardW-18,y+405);

  }
  ctx.restore();

  if(maxScroll>0){
    const trackY=586;
    ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(startX,trackY,visibleW,4);
    const knobW=Math.max(120,visibleW*(visibleW/totalW));
    const knobX=startX+(visibleW-knobW)*(operatorListScrollX/maxScroll);
    ctx.fillStyle="#7cc7ff";ctx.fillRect(knobX,trackY,knobW,4);
    ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="12px "+FONT_UI;ctx.textAlign="right";
    ctx.fillText(language==="en"?"Mouse wheel · Browse executors":"鼠标滚轮 · 浏览执行官",W-42,606);
  }

  drawBtn(ui("backLobby"),"ESC",60,592,190,46,true,"#ffffff");
}


function drawOperatorUIParticles(x,y,w,h,seed=0,mode="default"){
  ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
  const count = mode==="flora" ? 14 : mode==="protagonist" ? 12 : 10;
  for(let i=0;i<count;i++){
    const t=menuPulse*.18+i*73+seed*31;
    const px=x+((i*97+t*.42)%w);
    const py=y+((i*61+Math.sin(t*.018)*28+t*.18)%h);
    ctx.globalAlpha=.08+(Math.sin(t*.035)+1)*.055;
    ctx.fillStyle=mode==="protagonist"?(i%3===0?"#fff":i%3===1?"#bfc5cc":"#7cc7ff"):(i%2===0?"#7cc7ff":"#d8e1ec");
    ctx.beginPath();
    if(mode==="flora" && i%3===0){
      const s=2+(i%4); ctx.moveTo(px,py-s); ctx.lineTo(px+s,py); ctx.lineTo(px,py+s); ctx.lineTo(px-s,py); ctx.closePath();
    }else ctx.arc(px,py,2+(i%4),0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1; ctx.restore();
}
function drawOperatorLeftStatsPanel(i,x,y,w,h){
  ctx.fillStyle="rgba(17,25,40,.82)"; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(124,199,255,.22)"; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#fff"; ctx.font="bold 20px "+FONT_UI; ctx.textAlign="left";
  ctx.fillText(language==="en"?"Attributes":"属性数据",x+20,y+38);
  ctx.fillStyle="rgba(124,199,255,.28)"; ctx.fillRect(x+20,y+52,w-40,2);
  const rows=[
    [language==="en"?"HP":"生命值",operatorStatHp(i)],
    [language==="en"?"ATK":"攻击力",operatorStatAtk(i)],
    [language==="en"?"DEF":"防御力",operatorStatDef(i)],
    [language==="en"?"Break":"破盾值",isProtagonist(i)?210:(i===3?175:150)],
    [language==="en"?"Element":"元素属性",executorElement(i)],
    [language==="en"?"Role":"定位",roleStyle(i)]
  ];
  for(let n=0;n<rows.length;n++){
    const yy=y+84+n*58;
    ctx.fillStyle="rgba(255,255,255,.055)"; ctx.fillRect(x+16,yy,w-32,42);
    ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.strokeRect(x+16,yy,w-32,42);
    ctx.fillStyle="#a8b6cc"; ctx.font="bold 13px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(rows[n][0],x+30,yy+27);
    ctx.fillStyle=n<4?"#ffe066":"#fff"; ctx.font="bold 16px "+FONT_UI; ctx.textAlign="right"; ctx.fillText(String(rows[n][1]),x+w-30,yy+27);
  }
}
function drawOperatorCenterPortraitPanel(i,x,y,w,h){
  const mode=isProtagonist(i)?"protagonist":i===3?"flora":"default";
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,"rgba(14,26,43,.88)"); g.addColorStop(.55,"rgba(9,13,24,.72)"); g.addColorStop(1,"rgba(4,6,12,.95)");
  ctx.fillStyle=g; ctx.fillRect(x,y,w,h); ctx.strokeStyle="rgba(255,255,255,.12)"; ctx.strokeRect(x,y,w,h);
  drawOperatorUIParticles(x,y,w,h,i,mode);
  const glow=ctx.createLinearGradient(x+w*.2,y,x+w*.8,y);
  glow.addColorStop(0,"rgba(124,199,255,0)"); glow.addColorStop(.5,isProtagonist(i)?"rgba(255,255,255,.12)":"rgba(124,199,255,.13)"); glow.addColorStop(1,"rgba(124,199,255,0)");
  ctx.fillStyle=glow; ctx.fillRect(x,y,w,h);
  drawExecutorArt(i,x+w*.08,y+8,w*.84,h*.96,true);
  ctx.fillStyle="rgba(0,0,0,.36)"; ctx.beginPath(); ctx.ellipse(x+w*.52,y+h*.88,w*.26,h*.055,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(0,0,0,.50)"; ctx.fillRect(x+24,y+h-88,w-48,58);
  ctx.strokeStyle="rgba(255,255,255,.12)"; ctx.strokeRect(x+24,y+h-88,w-48,58);
  drawInsetLabel(executorRank(i),x+40,y+h-72,42,30,executorRank(i)==="S"?"#ffe066":"#7cc7ff","rgba(0,0,0,.42)","rgba(255,255,255,.16)",15,true,"center");
  ctx.fillStyle="#fff"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(roleName(i),x+96,y+h-49);
  ctx.fillStyle="#a8b6cc"; ctx.font="bold 13px "+FONT_UI; ctx.fillText(roleStyle(i),x+96,y+h-30);
}
function drawOperatorRightGrowthPanel(i,x,y,w,h){
  ctx.fillStyle="rgba(17,25,40,.82)"; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(124,199,255,.22)"; ctx.strokeRect(x,y,w,h);
  drawBtn(language==="en"?"Stats":"属性","",x+10,y+20,52,36,operatorTab==="level","#ffe066");
  drawBtn(language==="en"?"Skill":"技能","",x+68,y+20,52,36,operatorTab==="skill","#ffe066");
  drawBtn(language==="en"?"Weapon":"武器","",x+126,y+20,52,36,operatorTab==="weapon","#ffe066");
  drawBtn(language==="en"?"Module":"模块","",x+184,y+20,52,36,operatorTab==="module","#b98cff");
  drawBtn(language==="en"?"File":"档案","",x+242,y+20,52,36,operatorTab==="break","#ffe066");
  if(!owned[i]){ ctx.fillStyle="#aaa"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(mt("notOwned"),x+w/2,y+h/2); return; }
  if(operatorTab==="level") drawOperatorStatsTab(i,x,y,w,h);
  else if(operatorTab==="skill") drawOperatorSkillTab(i,x,y,w,h);
  else if(operatorTab==="weapon") drawOperatorWeaponTab(i,x,y,w,h);
  else if(operatorTab==="module") drawOperatorModuleTab(i,x,y,w,h);
  else drawOperatorBreakTab(i,x,y,w,h);
}

function drawOperatorDetailPage(){
  const i=selectedOperator;
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,"#0e1a2b"); bg.addColorStop(.55,"#080d18"); bg.addColorStop(1,"#03040a");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  drawOperatorUIParticles(0,0,W,H,99,isProtagonist(i)?"protagonist":i===3?"flora":"default");
  ctx.fillStyle="rgba(17,25,40,.74)"; ctx.fillRect(28,22,1064,70);
  ctx.strokeStyle="rgba(255,255,255,.12)"; ctx.strokeRect(28,22,1064,70);
  drawBtn("←","",46,36,54,42,true,"#fff");
  ctx.textAlign="left"; ctx.fillStyle="#fff"; ctx.font="bold 30px "+FONT_UI; ctx.fillText(roleName(i),118,68);
  drawInsetLabel(executorRank(i),310,40,42,30,executorRank(i)==="S"?"#ffe066":"#7cc7ff","rgba(0,0,0,.34)","rgba(255,255,255,.18)",15,true,"center");
  drawInsetLabel(operatorLevelText(i),362,40,130,30,"#fff","rgba(255,255,255,.07)","rgba(255,255,255,.12)",13,true,"center");
  ctx.textAlign="right"; ctx.fillStyle="#ffe066"; ctx.font="bold 14px "+FONT_UI;
  ctx.fillText(tx("goldCostPrefix")+gold+"    "+tx("expBookWord")+" "+expBooks+"    "+tx("weaponOreWord")+" "+weaponOre,W-58,66);
  const top=112, panelH=506;
  if(operatorTab==="module"&&moduleWarehouseSlot) drawOperatorModuleWarehouse(i,38,top,258,panelH);
  else drawOperatorLeftStatsPanel(i,38,top,258,panelH);
  drawOperatorCenterPortraitPanel(i,314,top,448,panelH);
  drawOperatorRightGrowthPanel(i,780,top,302,panelH);
  drawBtn(language==="en"?"Back":"返回","ESC",60,592,190,46,true,"#ffffff");
}


function drawStatCompare(label, nowValue, nextValue, x, y, w){
  ctx.fillStyle="rgba(255,255,255,.055)";
  ctx.fillRect(x,y,w,30);
  ctx.strokeStyle="rgba(255,255,255,.10)";
  ctx.strokeRect(x,y,w,30);
  ctx.fillStyle="#a8b6cc";
  ctx.font="bold 11px "+FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(label,x+10,y+20);
  ctx.fillStyle="#ffffff";
  ctx.textAlign="right";
  ctx.fillText(String(nowValue),x+w-112,y+20);
  ctx.fillStyle="#7cc7ff";
  ctx.fillText("→ "+String(nextValue),x+w-18,y+20);
}
function breakthroughPreviewBonus(i){
  const st=roleBreakStage(i);
  if(st===0) return {hp:180,atk:24,def:14};
  if(st===1) return {hp:230,atk:30,def:18};
  if(st===2) return {hp:300,atk:40,def:24};
  if(st===3) return {hp:380,atk:50,def:30};
  return {hp:0,atk:0,def:0};
}
function roleUpgradeCost(i){
  const lv=Math.max(1,roleDisplayLevel(i));
  if(isProtagonist(i)) return {books:0,gold:0};
  const tier=Math.floor((lv-1)/10);
  return {books:Math.min(12,1+Math.floor((lv-1)/5)),gold:Math.floor(220+lv*68+lv*lv*2.8+tier*420)};
}
function drawOperatorStatsTab(i,x=780,y=112,w=302,h=506){
  const auto=isProtagonist(i), lv=roleDisplayLevel(i), cap=roleLevelCap(i), bx=x+22, by=y+82;
  drawInsetLabel((language==="en"?"LEVEL ":"等级 Lv.")+lv+" / "+cap,bx,by,258,32,"#fff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",14,true,"center");
  ctx.fillStyle="rgba(255,255,255,.12)"; ctx.fillRect(bx,by+50,258,10);
  ctx.fillStyle=auto?"#7cc7ff":"#ffe066"; ctx.fillRect(bx,by+50,258*(lv/cap),10);
  ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.strokeRect(bx,by+50,258,10);
  if(auto){
    drawInsetLabel((language==="en"?"Story Lv. ":"主线等级 Lv.")+protagonistLevel()+" / "+protagonistStoryLevelCap(),bx,by+84,258,32,"#fff","rgba(255,255,255,.07)","rgba(255,255,255,.13)",12,true,"center");
    drawInsetLabel(protagonistSyncStatusText(),bx,by+128,258,34,"#ffe066","rgba(255,224,102,.08)","rgba(255,224,102,.20)",12,true,"center");
    drawBtn(language==="en"?"Story Sync":"主线同步","",bx+18,y+h-78,222,46,false,"#777");
  }else{
    const bonus=canBreakthrough(i)?breakthroughPreviewBonus(i):{hp:60,atk:12,def:6};
    drawStatCompare(language==="en"?"HP":"生命",operatorStatHp(i),operatorStatHp(i)+bonus.hp,bx,by+84,258);
    drawStatCompare(language==="en"?"ATK":"攻击",operatorStatAtk(i),operatorStatAtk(i)+bonus.atk,bx,by+122,258);
    drawStatCompare(language==="en"?"DEF":"防御",operatorStatDef(i),operatorStatDef(i)+bonus.def,bx,by+160,258);
    if(canBreakthrough(i)){
      drawInsetLabel(language==="en"?"Breakthrough Bonus Preview":"突破收益预览",bx,by+198,258,28,"#ffe066","rgba(255,224,102,.08)","rgba(255,224,102,.20)",11,true,"center");
    }
    let btn=language==="en"?"Upgrade":"升级", enabled=true;
    if(lv>=60){ btn="MAX"; enabled=false; }
    else if(canBreakthrough(i)) btn=language==="en"?"Level Breakthrough":"等级突破";
    const upCost=roleUpgradeCost(i);
    drawInsetLabel(canBreakthrough(i)?((language==="en"?"Cap ":"等级上限 ")+cap+" → "+BREAK_LEVEL_CAPS[roleBreakStage(i)+1]):((language==="en"?"EXP Books ":"经验书 ")+upCost.books+"  ·  "+(language==="en"?"Gold ":"金币 ")+upCost.gold),bx,by+232,258,34,"#bfe8ff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",11,true,"center");
    drawBtn(btn,"CLICK",bx+18,y+h-78,222,46,enabled,"#ffe066");
  }
}


function skillDisplayName(key){
  if(key==="normal") return language==="en" ? "Normal Attack" : "普攻";
  if(key==="skill") return language==="en" ? "E Skill" : "E技能";
  return language==="en" ? "Q Ultimate" : "Q大招";
}
function skillShortName(key){ return key==="normal" ? (language==="en"?"NA":"普攻") : key==="skill" ? "E" : "Q"; }
function selectedSkillLevel(i){ return roleSkillAutoValue(i, selectedSkillKey); }
function skillDamageMultiplier(key, lv){
  const base = key==="normal" ? 100 : key==="skill" ? 170 : 260;
  const growth = key==="normal" ? 8 : key==="skill" ? 13 : 20;
  return base + (lv-1)*growth;
}
function skillBreakValue(key, lv){
  const base = key==="normal" ? 12 : key==="skill" ? 28 : 55;
  const growth = key==="normal" ? 2 : key==="skill" ? 4 : 7;
  return base + (lv-1)*growth;
}
function skillMechanicText(i,key,lv){
  if(i===0){
    if(key==="normal") return language==="en" ? "Applies Physical Pain. A third hit triggers instant shield break or +15% damage." : "附加物理疼痛；第三段命中可立即破盾，或在无盾时增伤15%。";
    if(key==="skill") return language==="en" ? "Grants the whole squad +18% damage and can trigger Physical Pain." : "全队伤害提高18%，技能命中可触发物理疼痛。";
    return language==="en" ? "Places the Mark of Kane. Enemies entering it explode; Kane gains +5% damage." : "留下凯之印；敌人进入时爆破，期间凯恩自身伤害提高5%。";
  }
  if(i===3){
    if(key==="normal") return language==="en" ? "Ice projectile. Group clearing." : "冰属性普攻，偏向清理群怪。";
    if(key==="skill") return language==="en" ? "Circular ice AoE. Freeze at key levels." : "圆形冰伤，强化冻结。";
    return language==="en" ? "Large ice field. Control and AoE burst." : "冰域控场，造成群伤。";
  }
  if(i===1){
    if(key==="normal") return language==="en" ? "Creates a 3s wind field that pulls enemies inward. Low direct damage." : "生成持续3秒的风场，将敌人向中心聚集；直接伤害较低。";
    if(key==="skill") return language==="en" ? "Pulls nearby enemies and applies Weathering. Wind damage gains +10%." : "聚集自身周围敌人并施加风化；风属性对风化目标增伤10%。";
    return language==="en" ? "Pulls every enemy toward the center, then detonates the entire field." : "将全屏敌人聚向中心，随后引爆整片战场。";
  }
  if(i===2){
    if(key==="normal") return language==="en" ? "Extremely heavy strike with a fixed 2s recovery." : "极高伤害重击，固定需要2秒恢复。";
    if(key==="skill") return language==="en" ? "A devastating map-wide blast. Costs 85 Energy and has a long cooldown." : "造成一次极高伤害的全屏爆炸；消耗85能量且冷却很长。";
    return language==="en" ? "Enters Ruin State: +20% damage for 8s, but immediately loses 20% max HP." : "进入毁灭状态8秒：伤害提高20%，并立即消耗20%最大生命。";
  }
  if(isProtagonist(i)){
    if(key==="normal") return language==="en" ? "Three-hit slash with fading monochrome trails." : "三段斩击，附带向外消散的黑白线条。";
    if(key==="skill") return language==="en" ? "Ranged bind: immobilizes for 3s and deals 50 damage each second." : "远程缚锁：定身3秒，每秒造成50点伤害。";
    return language==="en" ? "A 3s map-wide monochrome domain that repeatedly strikes all enemies." : "展开3秒全图黑白领域，持续往返攻击所有敌人。";
  }
  if(key==="normal") return language==="en" ? "Basic attack chain." : "基础攻击连段。";
  if(key==="skill") return language==="en" ? "Tactical skill with stronger break." : "战术技能，拥有更高破盾值。";
  return language==="en" ? "Ultimate skill with high burst." : "高爆发大招。";
}
function skillNextChangeText(key, lv){
  if(lv>=10) return language==="en" ? "MAX" : "已满级";
  const next=lv+1;
  let extra="";
  if(next===4) extra = language==="en" ? "Mechanic strengthened" : "机制强化";
  else if(next===7) extra = language==="en" ? "Extra effect unlocked" : "解锁追加效果";
  else if(next===10) extra = language==="en" ? "Final enhancement" : "最终强化";
  return (language==="en"?"DMG ":"伤害 ")+skillDamageMultiplier(key,lv)+"% → "+skillDamageMultiplier(key,next)+"%   "+
         (language==="en"?"Break ":"破盾 ")+skillBreakValue(key,lv)+" → "+skillBreakValue(key,next)+(extra?"   "+extra:"");
}

function performBreakthrough(i){
  if(!canBreakthrough(i)) return false;
  const stage=roleBreakStage(i);
  const cost=BREAK_COSTS[stage];
  if((weaponOre||0)<cost.mat || gold<cost.gold){
    showCenter(language==="en"?"Not enough materials":"等级突破材料不足",70);
    return false;
  }
  weaponOre-=cost.mat;
  gold-=cost.gold;
  charData[i].breakStage=stage+1;
  showCenter((language==="en"?"Level cap raised to Lv.":"等级上限提升至 Lv.")+roleLevelCap(i),90);
  if(typeof sfx==="function") sfx("reward");
  saveGame(); autoCloudSaveNow(true);
  return true;
}
function upgradeSelectedSkill(i){
  if(isProtagonist(i)) return;
  const cd=charData[i];
  if(!cd || !owned[i]) return;
  if((cd[selectedSkillKey]||1)>=10){ showCenter(language==="en"?"Skill already MAX":"已达上限",70); return; }
  const cost=skillUpgradeCost(selectedSkillKey,cd[selectedSkillKey]||1);
  if(skillBooks<cost.books || (skillMaterials[selectedSkillKey]||0)<cost.material || gold<cost.gold){
    showCenter(language==="en"?"Not enough skill materials":"技能升级材料不足",70); return;
  }
  skillBooks-=cost.books; skillMaterials[selectedSkillKey]-=cost.material; gold-=cost.gold; cd[selectedSkillKey]++;
  showCenter((language==="en"?"Upgraded ":"已升级 ")+skillDisplayName(selectedSkillKey),70);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}

function skillMaterialName(key){
  if(key==="normal") return language==="en"?"Attack Drill":"攻击训练记录";
  if(key==="skill") return language==="en"?"Skill Core":"技能核心";
  return language==="en"?"Ultimate Record":"终结技档案";
}
function skillUpgradeCost(key,lv){
  const tier=Math.floor(Math.max(0,lv-1)/3);
  const typeAdd=key==="ultimate"?2:key==="skill"?1:0;
  return {books:1+Math.floor(Math.max(0,lv-1)/2)+(key==="ultimate"?1:0),material:1+tier+typeAdd,gold:Math.floor(450+lv*320+tier*650+typeAdd*280)};
}

function drawOperatorSkillTab(i,x=780,y=112,w=302,h=506){
  const auto=isProtagonist(i), bx=x+22, by=y+74;
  const skills=[["normal",skillDisplayName("normal")],["skill",skillDisplayName("skill")],["ultimate",skillDisplayName("ultimate")]];
  for(let n=0;n<skills.length;n++){
    const key=skills[n][0], yy=by+n*52, active=selectedSkillKey===key, lv=roleSkillAutoValue(i,key);
    ctx.fillStyle=active?"rgba(124,199,255,.16)":"rgba(255,255,255,.055)";
    ctx.fillRect(bx,yy,258,42);
    ctx.strokeStyle=active?"rgba(124,199,255,.75)":"rgba(255,255,255,.12)";
    ctx.lineWidth=active?2:1; ctx.strokeRect(bx,yy,258,42);
    drawInsetLabel(skillShortName(key),bx+10,yy+8,42,26,active?"#7cc7ff":"#a8b6cc","rgba(0,0,0,.26)","rgba(255,255,255,.10)",12,true,"center");
    ctx.fillStyle="#fff"; ctx.font="bold 13px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(skills[n][1],bx+62,yy+27);
    ctx.fillStyle=auto?"#7cc7ff":"#ffe066"; ctx.textAlign="right"; ctx.fillText("Lv."+lv+(auto?" AUTO":""),bx+246,yy+27);
  }
  const lv=selectedSkillLevel(i), next=Math.min(10,lv+1), dy=by+178;
  drawInsetLabel(skillDisplayName(selectedSkillKey),bx,dy,258,32,"#fff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",14,true,"center");
  drawInsetLabel((language==="en"?"Current Lv.":"当前 Lv.")+lv+(lv<10?("  →  Lv."+next):"  MAX"),bx,dy+44,258,30,"#ffe066","rgba(255,224,102,.08)","rgba(255,224,102,.20)",12,true,"center");
  drawInsetLabel(skillMechanicText(i,selectedSkillKey,lv),bx,dy+84,258,44,"#d8e1ec","rgba(255,255,255,.055)","rgba(255,255,255,.10)",11,true,"center");
  drawInsetLabel(skillNextChangeText(selectedSkillKey,lv),bx,dy+138,258,50,"#bfe8ff","rgba(124,199,255,.065)","rgba(124,199,255,.16)",10,true,"center");
  if(auto){
    drawInsetLabel((language==="en"?"Skill Sync Lv.":"技能同步 Lv.")+protagonistSkillLevel()+" / 10",bx,dy+202,258,34,"#ffe066","rgba(255,224,102,.08)","rgba(255,224,102,.20)",12,true,"center");
    drawBtn(language==="en"?"Story Sync":"主线同步","",bx+18,y+h-78,222,46,false,"#777");
  }else{
    const cost=skillUpgradeCost(selectedSkillKey,lv);
    const materialOwned=skillMaterials[selectedSkillKey]||0;
    const costText=(language==="en"?"Book ":"技能书 ")+skillBooks+"/"+cost.books+" · "+skillMaterialName(selectedSkillKey)+" "+materialOwned+"/"+cost.material+" · "+gold+"/"+cost.gold+"G";
    drawInsetLabel(costText,bx,dy+202,258,34,"#fff","rgba(255,255,255,.07)","rgba(255,255,255,.13)",9,true,"center");
    const can=skillBooks>=cost.books && materialOwned>=cost.material && gold>=cost.gold && lv<10;
    drawBtn(lv>=10?(language==="en"?"MAX":"已满级"):(language==="en"?"Upgrade to Lv."+next:"精炼至 Lv."+next),"CLICK",bx+18,y+h-78,222,46,can,"#ffffff");
  }
}


function weaponNextAttackBonus(i){ return (roleWeaponLevelDisplay(i)+1)*5; }
function weaponCurrentAttackBonus(i){ return roleWeaponLevelDisplay(i)*5; }
function weaponUpgradeCost(i){const cd=charData[i]||{},lv=Math.max(1,cd.weaponLevel||1);if(isProtagonist(i))return {ore:0,gold:0};const tier=Math.floor((lv-1)/10);return {ore:Math.min(10,1+Math.floor((lv-1)/6)),gold:Math.floor(180+lv*62+lv*lv*2.35+tier*360)};}
function weaponCostGold(i){ return weaponUpgradeCost(i).gold; }
function weaponMaxLevel(i){ return 60; }
function weaponCanUpgrade(i){ if(isProtagonist(i)) return false; const cd=charData[i]||{}; return owned[i] && (cd.weaponLevel||1)<weaponMaxLevel(i); }
function weaponTraitText(i){
  if(isProtagonist(i)) return language==="en" ? "Exclusive weapon / Story sync / Cannot be changed" : "专属武器 / 主线同步 / 不可更换";
  if(i===3) return language==="en" ? "Ice damage bonus / AoE control support" : "冰属性伤害加成 / 群体控场辅助";
  if(i===0) return language==="en" ? "Balanced blade / Stable single-target damage" : "均衡剑刃 / 稳定单体输出";
  if(i===1) return language==="en" ? "Wind codex / Support efficiency" : "风语法典 / 支援效率";
  if(i===2) return language==="en" ? "Dark blades / Shield break pressure" : "终夜双刃 / 破盾压制";
  return language==="en" ? "Standard weapon" : "标准武器";
}
function drawWeaponStatRow(label, nowValue, nextValue, x, y, w, highlight=true){
  ctx.fillStyle="rgba(255,255,255,.055)"; ctx.fillRect(x,y,w,32);
  ctx.strokeStyle="rgba(255,255,255,.10)"; ctx.strokeRect(x,y,w,32);
  ctx.fillStyle="#a8b6cc"; ctx.font="bold 11px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(label,x+10,y+21);
  ctx.fillStyle="#fff"; ctx.textAlign="right"; ctx.fillText(String(nowValue),x+w-115,y+21);
  ctx.fillStyle=highlight?"#7cc7ff":"#a8b6cc"; ctx.fillText("→ "+String(nextValue),x+w-18,y+21);
}
function upgradeWeaponSelected(i){
  if(isProtagonist(i)) return;
  const cd=charData[i]; if(!cd || !owned[i]) return;
  const cost=weaponUpgradeCost(i),costGold=cost.gold;
  if((weaponOre||0)<cost.ore || gold<costGold){ showCenter(language==="en"?"Not enough weapon materials":"精炼材料不足",70); return; }
  if((cd.weaponLevel||1)>=60){ showCenter(language==="en"?"Weapon already MAX":"已达上限",70); return; }
  weaponOre-=cost.ore; gold-=costGold; cd.weaponLevel=(cd.weaponLevel||1)+1;
  showCenter(language==="en"?"Weapon upgraded":"精炼完成",70);
  sfx("reward"); saveGame(); autoCloudSaveNow(true);
}


const WEAPON_MASTER=[
  {id:"training_sword",nameZh:"训练剑",nameEn:"Training Sword",rarity:"B",type:"sword",baseAtk:60,crit:0,passiveZh:"训练用单手剑",passiveEn:"Training sword"},
  {id:"sun_blade",nameZh:"烈阳之刃",nameEn:"Solar Blade",rarity:"S",type:"sword",baseAtk:120,crit:8,passiveZh:"普攻伤害提升12%。",passiveEn:"Normal DMG +12%"},
  {id:"wind_codex",nameZh:"风语法典",nameEn:"Wind Codex",rarity:"A",type:"codex",baseAtk:95,crit:4,passiveZh:"支援效率提升",passiveEn:"Support efficiency"},
  {id:"frost_book",nameZh:"冰霜之书",nameEn:"Frost Book",rarity:"S",type:"codex",baseAtk:118,crit:6,passiveZh:"冰伤+10%",passiveEn:"Ice DMG +10%"},
  {id:"endnight_blades",nameZh:"终夜双刃",nameEn:"Endnight Blades",rarity:"A",type:"dual",baseAtk:105,crit:6,passiveZh:"破盾效率提升",passiveEn:"Break efficiency"},
  {id:"shadow_blades",nameZh:"裂影双刃",nameEn:"Shadow Blades",rarity:"S",type:"dual",baseAtk:128,crit:9,passiveZh:"连击伤害提升",passiveEn:"Combo damage up"},
  {id:"frostmoon_spear",nameZh:"霜月长枪",nameEn:"Frostmoon Spear",rarity:"A",type:"spear",baseAtk:100,crit:4,passiveZh:"技能伤害提升。",passiveEn:"Skill damage increased."},
  {id:"starlight_spear",nameZh:"流光长枪",nameEn:"Starlight Spear",rarity:"S",type:"spear",baseAtk:125,crit:7,passiveZh:"命中回复少量能量",passiveEn:"Gain energy on hit"}
  ,{id:"lavender",nameZh:"拉文德",nameEn:"Lavender",rarity:"S",type:"codex",baseAtk:112,crit:5,passiveZh:"丽莎的专属法器；风化持续时间提高。",passiveEn:"Lisa's signature catalyst; extends Weathering."}
];

function roleWeaponType(i){
  if(isProtagonist(i)) return "core";
  if(i===0) return "sword";
  if(i===1) return "spear";
  if(i===2) return "dual";
  if(i===3) return "codex";
  if(i===5) return "codex";
  return "sword";
}
function weaponTypeLabel(type){
  const zh={sword:"单手剑",codex:"法器",dual:"双刃",spear:"长枪",core:"专武"};
  const en={sword:"Sword",codex:"Codex",dual:"Dual Blades",spear:"Spear",core:"Exclusive"};
  return (language==="en"?en:zh)[type]||type;
}
function weaponData(id){ return WEAPON_MASTER.find(w=>w.id===id)||WEAPON_MASTER[0]; }
function weaponNameById(id){
  const w=weaponData(id);
  return language==="en"?w.nameEn:w.nameZh;
}
function defaultWeaponIdForRole(i){
  if(i===0) return "sun_blade";
  if(i===1) return "frostmoon_spear";
  if(i===2) return "endnight_blades";
  if(i===3) return "frost_book";
  if(i===5) return "wind_codex";
  return "training_sword";
}
function ensureWeaponBag(){
  if(!window.weaponInventory) window.weaponInventory=null;
  if(!Array.isArray(weaponInventory)){
    weaponInventory=WEAPON_MASTER.map(w=>({id:w.id,level:1,owned:w.id!=="lavender"}));
  }
  if(!Array.isArray(ownedWeapons)) ownedWeapons=[];
  for(const w of WEAPON_MASTER){
    if(!weaponInventory.some(x=>x.id===w.id)) weaponInventory.push({id:w.id,level:1,owned:w.id!=="lavender"});
  }
  for(let i=0;i<charData.length;i++){
    if(!charData[i]) continue;
    if(!charData[i].equippedWeaponId) charData[i].equippedWeaponId=defaultWeaponIdForRole(i);
  }
}
function roleEquippedWeaponId(i){
  ensureWeaponBag();
  if(isProtagonist(i)) return "gray_core_blade";
  return (charData[i]&&charData[i].equippedWeaponId)||defaultWeaponIdForRole(i);
}
function roleEquippedWeaponLevel(i){
  if(isProtagonist(i)) return protagonistWeaponLevel();
  ensureWeaponBag();
  const item=weaponInventory.find(w=>w.id===roleEquippedWeaponId(i));
  return item?item.level:1;
}
function compatibleWeaponsForRole(i){
  ensureWeaponBag();
  const type=roleWeaponType(i);
  return weaponInventory.filter(item=>item.owned && weaponData(item.id).type===type);
}
function equipWeaponToRole(i,id){
  if(isProtagonist(i)) return false;
  const w=weaponData(id);
  if(!w || w.type!==roleWeaponType(i)) return false;
  charData[i].equippedWeaponId=id;
  selectedWeaponId=id;
  showCenter(language==="en"?"Weapon equipped":"装配完成",70);
  saveGame();
  return true;
}
function weaponBagAtkBonusById(id){
  const w=weaponData(id);
  const item=(weaponInventory||[]).find(x=>x.id===id);
  const lv=item?item.level:1;
  return w.baseAtk + lv*5;
}
function currentWeaponAtkBonus(i){
  if(isProtagonist(i)) return weaponCurrentAttackBonus(i);
  return weaponBagAtkBonusById(roleEquippedWeaponId(i));
}

function moduleWarehouseOptions(role,slot){
  if(!window.PZModules||!slot)return [];
  crystalModuleInventory=window.PZModules.normalize(charData,crystalModuleInventory);
  const ownedCount={},usedOther={};
  crystalModuleInventory.forEach(id=>ownedCount[id]=(ownedCount[id]||0)+1);
  charData.forEach((c,idx)=>{if(idx===role||!c.crystalModuleSlots)return;Object.values(c.crystalModuleSlots).forEach(id=>{if(id)usedOther[id]=(usedOther[id]||0)+1;});});
  const list=[...new Set(crystalModuleInventory)].map(id=>({id,d:window.PZModules.item(id),owned:ownedCount[id]||0,used:usedOther[id]||0})).filter(v=>v.d&&v.d.slot===slot&&(moduleWarehouseSetFilter==="all"||v.d.setId===moduleWarehouseSetFilter)&&(v.owned>v.used||charData[role].crystalModuleSlots[slot]===v.id));
  return list.sort(moduleWarehouseSortMode==="set"?((a,b)=>a.d.setId.localeCompare(b.d.setId)||b.d.grade-a.d.grade):((a,b)=>b.d.grade-a.d.grade||a.d.setId.localeCompare(b.d.setId)));
}
function equipRoleModule(role,slot,id){
  if(!window.PZModules||!charData[role])return false;
  if(id===null){charData[role].crystalModuleSlots[slot]=null;showCenter(language==="en"?"Module removed":"模块已卸下",55);saveGame();return true;}
  const option=moduleWarehouseOptions(role,slot).find(v=>v.id===id);
  if(!option||option.owned<=option.used){showCenter(language==="en"?"No available copy":"没有可用的模块副本",65);return false;}
  charData[role].crystalModuleSlots[slot]=id;
  showCenter(language==="en"?"Module installed":"模块已装配",55);sfx("ui");saveGame();return true;
}
function drawOperatorModuleWarehouse(i,x,y,w,h){
  const slot=moduleWarehouseSlot,options=moduleWarehouseOptions(i,slot),current=charData[i].crystalModuleSlots[slot];
  ctx.fillStyle="rgba(11,16,31,.96)";ctx.fillRect(x,y,w,h);ctx.strokeStyle="rgba(185,140,255,.42)";ctx.strokeRect(x,y,w,h);
  ctx.fillStyle="#fff";ctx.font="bold 18px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"Module Storage":"模块仓库",x+18,y+30);
  ctx.fillStyle="#b98cff";ctx.font="bold 11px "+FONT_UI;ctx.fillText(language==="en"?window.PZModules.SLOT_TEXT[slot][1]:window.PZModules.SLOT_TEXT[slot][0],x+18,y+52);
  ctx.fillStyle="rgba(255,255,255,.46)";ctx.font="9px "+FONT_UI;ctx.fillText(language==="en"?"Click a module to equip":"点击模块即可装备",x+90,y+52);
  const filterSet=window.PZModules.SETS[moduleWarehouseSetFilter];
  drawBtn(moduleWarehouseSetFilter==="all"?(language==="en"?"All Sets":"全部系列"):(language==="en"?filterSet.en:filterSet.zh),"",x+14,y+62,112,26,true,"#b98cff");
  drawBtn(moduleWarehouseSortMode==="grade"?(language==="en"?"Grade ↓":"等级 ↓"):(language==="en"?"Set Sort":"系列排序"),"",x+132,y+62,112,26,true,"#7cc7ff");
  const vx=x+14,vy=y+96,vw=w-28,vh=h-183,rowH=62,max=Math.max(0,options.length*rowH-vh);
  if(moduleWarehouseWheelDelta){moduleWarehouseScroll=clamp(moduleWarehouseScroll+moduleWarehouseWheelDelta*.5,0,max);moduleWarehouseWheelDelta=0;}
  ctx.save();ctx.beginPath();ctx.rect(vx,vy,vw,vh);ctx.clip();
  if(!options.length){ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="12px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?"No module for this slot":"该部位暂无模块",x+w/2,vy+70);}
  for(let n=0;n<options.length;n++){
    const o=options[n],d=o.d,yy=vy+n*rowH-moduleWarehouseScroll,active=current===o.id,set=window.PZModules.SETS[d.setId];
    if(yy+56<vy||yy>vy+vh)continue;
    ctx.fillStyle=active?"rgba(185,140,255,.20)":"rgba(255,255,255,.05)";ctx.fillRect(vx+2,yy+3,vw-8,54);ctx.strokeStyle=active?set.color:"rgba(255,255,255,.10)";ctx.strokeRect(vx+2,yy+3,vw-8,54);
    ctx.fillStyle=set.color;ctx.fillRect(vx+2,yy+3,4,54);
    ctx.fillStyle="#fff";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="left";ctx.fillText((language==="en"?"G":"等级")+d.grade+" · "+(language==="en"?set.en:set.zh),vx+14,yy+20);
    ctx.fillStyle="#7cffb2";ctx.font="9px "+FONT_UI;ctx.fillText(moduleStatSummaryV43(d),vx+14,yy+36);
    ctx.fillStyle="#ff9c9c";ctx.fillText(language==="en"?d.drawbackEn:d.drawbackZh,vx+14,yy+50);
    ctx.textAlign="right";ctx.fillStyle=active?"#ffe066":"#a8b6cc";ctx.fillText(active?(language==="en"?"EQUIPPED":"已装备"):"×"+(o.owned-o.used),vx+vw-16,yy+20);
  }
  ctx.restore();
  if(max>0){const th=Math.max(28,vh*vh/(options.length*rowH)),ty=vy+(vh-th)*(moduleWarehouseScroll/max);ctx.fillStyle="rgba(255,255,255,.10)";ctx.fillRect(x+w-10,vy,3,vh);ctx.fillStyle="#b98cff";ctx.fillRect(x+w-10,ty,3,th);}
  drawBtn(language==="en"?"Unequip":"卸下","",x+14,y+h-73,105,34,!!current,"#ff9c9c");
  drawBtn(language==="en"?"Close":"关闭","ESC",x+w-119,y+h-73,105,34,true,"#fff");
}

function cycleRoleModule(role,slot){
  if(!window.PZModules)return;
  crystalModuleInventory=window.PZModules.normalize(charData,crystalModuleInventory);
  const c=charData[role],ownedCount={},usedCount={};
  crystalModuleInventory.forEach(id=>ownedCount[id]=(ownedCount[id]||0)+1);
  charData.forEach((other,idx)=>{if(idx!==role&&other.crystalModuleSlots)Object.values(other.crystalModuleSlots).forEach(id=>{if(id)usedCount[id]=(usedCount[id]||0)+1;});});
  const candidates=[...new Set(crystalModuleInventory)].filter(id=>{const d=window.PZModules.item(id);return d&&d.slot===slot&&(ownedCount[id]||0)>(usedCount[id]||0);});
  if(!candidates.length&&!c.crystalModuleSlots[slot]){showCenter(language==="en"?"No module for this slot. Clear Module Archive first.":"该部位暂无模块，请先通关模块档案副本。",70);return;}
  const current=c.crystalModuleSlots[slot],choices=[null].concat(candidates),next=choices[(choices.indexOf(current)+1)%choices.length];
  c.crystalModuleSlots[slot]=next;showCenter(next?(language==="en"?"Module installed":"模块已装配"):(language==="en"?"Module removed":"模块已卸下"),55);sfx("ui");saveGame();
}
function drawOperatorModuleTab(i,x=780,y=112,w=302,h=506){
  if(!window.PZModules)return;
  crystalModuleInventory=window.PZModules.normalize(charData,crystalModuleInventory);
  const bx=x+22,by=y+82,c=charData[i],tot=roleModuleTotals(i);
  for(let n=0;n<4;n++){
    const slot=window.PZModules.SLOTS[n],id=c.crystalModuleSlots[slot],d=window.PZModules.item(id),yy=by+n*66;
    ctx.fillStyle=d?"rgba(185,140,255,.13)":"rgba(255,255,255,.045)";ctx.fillRect(bx,yy,258,54);
    ctx.strokeStyle=d?window.PZModules.SETS[d.setId].color:"rgba(255,255,255,.13)";ctx.strokeRect(bx,yy,258,54);
    ctx.fillStyle="#fff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?window.PZModules.SLOT_TEXT[slot][1]:window.PZModules.SLOT_TEXT[slot][0],bx+12,yy+20);
    ctx.fillStyle=d?"#d9c6ff":"rgba(255,255,255,.38)";ctx.font="10px "+FONT_UI;ctx.fillText(d?((language==="en"?"G":"等级")+d.grade+" · "+(language==="en"?d.nameEn:d.nameZh)):(language==="en"?"Open storage":"打开模块仓库"),bx+12,yy+39);
    if(d){ctx.textAlign="right";ctx.fillStyle="#ffb0b0";ctx.fillText(language==="en"?d.drawbackEn:d.drawbackZh,bx+246,yy+39);}
  }
  const setLine=Object.keys(tot.sets).map(id=>(language==="en"?window.PZModules.SETS[id].en:window.PZModules.SETS[id].zh)+" "+tot.sets[id]+"/4").join(" · ")||(language==="en"?"No active module set":"暂无模块套装");
  drawInsetLabel(setLine,bx,by+274,258,34,"#b98cff","rgba(185,140,255,.07)","rgba(185,140,255,.18)",10,true,"center");
  const activeText=(tot.activeSetTiers||[]).map(t=>{const set=window.PZModules.SETS[t.setId],tier=set.tiers[t.pieces];return language==="en"?tier.en:tier.zh;}).join("  /  ")||tr("凑齐同系列2件可激活套装效果","Equip 2 matching modules to activate a set effect");
  drawInsetLabel(activeText,bx,by+318,258,44,"#ffe066","rgba(255,224,102,.055)","rgba(255,224,102,.14)",9,true,"center");
  drawInsetLabel((language==="en"?"HP ":"生命 ")+(tot.hp>=0?"+":"")+tot.hp+"   "+(language==="en"?"ATK ":"攻击 ")+(tot.atk>=0?"+":"")+tot.atk+"   "+(language==="en"?"DEF ":"防御 ")+(tot.def>=0?"+":"")+tot.def,bx,by+370,258,30,"#7cffb2","rgba(124,255,178,.06)","rgba(124,255,178,.15)",9,true,"center");
}

function drawOperatorWeaponTab(i,x=780,y=112,w=302,h=506){
  ensureWeaponBag();
  const auto=isProtagonist(i), bx=x+22, by=y+68;

  if(auto){
    drawInsetLabel(language==="en"?"EXCLUSIVE WEAPON":"专属武器",bx,by,258,32,"#bfe8ff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",13,true,"center");
    drawInsetLabel(language==="en"?"Gray Core Blade":"灰白核心刃",bx,by+44,258,36,"#fff","rgba(255,255,255,.08)","rgba(255,255,255,.14)",14,true,"center");
    drawInsetLabel((language==="en"?"Weapon Sync Lv.":"武器同步 Lv.")+protagonistWeaponLevel()+" / 60",bx,by+92,258,34,"#ffe066","rgba(255,224,102,.08)","rgba(255,224,102,.20)",12,true,"center");
    drawInsetLabel(language==="en"?"Fixed / Cannot be changed / Story Sync":"固定 / 不可更换 / 主线同步",bx,by+140,258,44,"#d8e1ec","rgba(255,255,255,.055)","rgba(255,255,255,.10)",11,true,"center");
    drawBtn(language==="en"?"Fixed Weapon":"专属武装","",bx+18,y+h-78,222,46,false,"#777");
    return;
  }

  const equipped=roleEquippedWeaponId(i);
  if(!selectedWeaponId || weaponData(selectedWeaponId).type!==roleWeaponType(i)) selectedWeaponId=equipped;
  const current=weaponData(equipped);
  const selected=weaponData(selectedWeaponId);
  const selectedItem=weaponInventory.find(w=>w.id===selectedWeaponId)||{level:1};

  const weaponAccent=ctx.createLinearGradient(bx,by,bx+258,by);weaponAccent.addColorStop(0,"rgba(255,224,102,.22)");weaponAccent.addColorStop(1,"rgba(124,199,255,.04)");ctx.fillStyle=weaponAccent;ctx.fillRect(bx,by,258,110);ctx.fillStyle="#ffe066";ctx.fillRect(bx,by,4,110);ctx.strokeStyle="rgba(255,255,255,.14)";ctx.strokeRect(bx,by,258,110);
  drawInsetLabel(current.rarity,bx+14,by+14,38,32,current.rarity==="S"?"#ffe066":"#7cc7ff","rgba(0,0,0,.32)","rgba(255,255,255,.16)",14,true,"center");
  ctx.fillStyle="rgba(255,255,255,.52)";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"CURRENT WEAPON":"当前武器",bx+64,by+25);
  ctx.fillStyle="#fff";ctx.font="bold 17px "+FONT_UI;ctx.fillText(weaponNameById(equipped),bx+64,by+49);
  ctx.fillStyle="#ffe066";ctx.font="bold 12px "+FONT_UI;ctx.fillText("Lv."+roleEquippedWeaponLevel(i)+" / 60",bx+64,by+70);
  ctx.fillStyle="rgba(255,255,255,.12)";ctx.fillRect(bx+64,by+80,176,7);ctx.fillStyle="#ffe066";ctx.fillRect(bx+64,by+80,176*roleEquippedWeaponLevel(i)/60,7);
  ctx.fillStyle="#a8b6cc";ctx.font="10px "+FONT_UI;ctx.fillText((language==="en"?"Type: ":"类型：")+weaponTypeLabel(roleWeaponType(i)),bx+64,by+102);

  const list=compatibleWeaponsForRole(i);
  for(let n=0;n<Math.min(3,list.length);n++){
    const item=list[n], wd=weaponData(item.id), yy=by+122+n*48, active=selectedWeaponId===item.id, eq=equipped===item.id;
    ctx.fillStyle=active?"rgba(124,199,255,.16)":"rgba(255,255,255,.055)";
    ctx.fillRect(bx,yy,258,40);
    ctx.strokeStyle=active?"rgba(124,199,255,.70)":"rgba(255,255,255,.11)";
    ctx.strokeRect(bx,yy,258,40);
    drawInsetLabel(wd.rarity,bx+8,yy+7,34,24,wd.rarity==="S"?"#ffe066":"#7cc7ff","rgba(0,0,0,.28)","rgba(255,255,255,.12)",12,true,"center");
    ctx.fillStyle="#fff"; ctx.font="bold 12px "+FONT_UI; ctx.textAlign="left"; ctx.fillText(language==="en"?wd.nameEn:wd.nameZh,bx+52,yy+25);
    ctx.fillStyle=eq?"#ffe066":"#a8b6cc"; ctx.textAlign="right"; ctx.fillText(eq?(language==="en"?"EQUIPPED":"已装备"):"Lv."+item.level,bx+246,yy+25);
  }

  drawInsetLabel(language==="en"?"EQUIP PREVIEW":"装备预览",bx,by+280,258,28,"#bfe8ff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",12,true,"center");
  drawWeaponStatRow(language==="en"?"ATK":"攻击",currentWeaponAtkBonus(i),weaponBagAtkBonusById(selectedWeaponId),bx,by+318,258,true);
  drawInsetLabel(language==="en"?selected.passiveEn:selected.passiveZh,bx,by+358,258,42,"#d8e1ec","rgba(255,255,255,.055)","rgba(255,255,255,.10)",11,true,"center");

  const isEq=selectedWeaponId===equipped;
  drawBtn(isEq?(language==="en"?"Equipped":"已装备"):(language==="en"?"Equip":"装备"),"CLICK",bx+18,y+h-78,106,46,!isEq,"#7cc7ff");
  const weaponCost=weaponUpgradeCost(i);
  drawBtn(language==="en"?"Upgrade":"强化",weaponCost.ore+"◇ "+weaponCost.gold+"G",bx+134,y+h-78,106,46,isEq,"#ffe066");
}

function drawOperatorBreakTab(i,x=780,y=112,w=302,h=506){
  const bx=x+22, by=y+88;
  drawInsetLabel(language==="en"?"PROFILE":"档案",bx,by,258,36,"#bfe8ff","rgba(124,199,255,.08)","rgba(124,199,255,.18)",14,true,"center");
  const lines=isProtagonist(i)
    ? [language==="en"?"Identity: Traveler":"身份：旅者", language==="en"?"Weapon: Gray Core Blade":"武器：灰白核心刃", language==="en"?"Growth: Story Sync":"成长：主线同步", protagonistSyncStatusText()]
    : [(language==="en"?"Executor: ":"执行官：")+roleName(i), (language==="en"?"Element: ":"元素：")+executorElement(i), (language==="en"?"Weapon: ":"武器：")+weaponName(i), (language==="en"?"Role: ":"定位：")+roleStyle(i)];
  for(let n=0;n<lines.length;n++) drawInsetLabel(lines[n],bx,by+62+n*50,258,34,"#fff","rgba(255,255,255,.065)","rgba(255,255,255,.11)",12,true,"left");
  drawBtn(language==="en"?"Coming Soon":"后续开放","",bx+18,y+h-78,222,46,false,"#777");
}

function drawFloraImageBox(x,y,w,h,alpha=1){
  ctx.save();
  ctx.globalAlpha = alpha;
  drawPortrait(x+20,y+10,w-40,h-20,roles[3],!owned[3]);
  ctx.restore();
}

function drawArmoryWeaponIcon(type,x,y,scale=1,color="#dbe8ff"){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.shadowColor=color;ctx.shadowBlur=10;ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=7;
  if(type==="codex"){
    ctx.beginPath();ctx.arc(0,0,30,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(25,-5,20,10);}
  }else{
    const dual=type==="dual";
    const spear=type==="spear";
    const drawBlade=(off,rot)=>{ctx.save();ctx.translate(0,off);ctx.rotate(rot);ctx.beginPath();ctx.moveTo(-54,5);ctx.lineTo(44,-8);ctx.lineTo(62,0);ctx.lineTo(44,8);ctx.lineTo(-54,-5);ctx.closePath();ctx.fill();ctx.fillStyle="#111722";ctx.fillRect(-66,-8,14,16);ctx.restore();};
    if(dual){drawBlade(-12,-.08);drawBlade(12,.08);}
    else if(spear){ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-64,18);ctx.lineTo(50,-15);ctx.stroke();ctx.beginPath();ctx.moveTo(46,-25);ctx.lineTo(70,-20);ctx.lineTo(54,1);ctx.closePath();ctx.fill();}
    else drawBlade(0,-.10);
  }
  ctx.restore();
}

function drawShopWeaponArmory(){
  ensureWeaponBag();
  if(shopSubTab==="limited"){
    const x=70,y=240,w=980,h=230;
    ctx.fillStyle="rgba(8,12,20,.88)";ctx.fillRect(x,y,w,h);
    ctx.strokeStyle="rgba(124,199,255,.32)";ctx.strokeRect(x,y,w,h);
    ctx.fillStyle="#7cc7ff";ctx.fillRect(x,y,6,h);
    ctx.fillStyle="rgba(124,199,255,.07)";ctx.beginPath();ctx.arc(x+670,y+105,190,0,Math.PI*2);ctx.fill();
    drawArmoryWeaponIcon("codex",x+680,y+108,1.65,"#88d8ff");
    ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,.46)";ctx.font="bold 11px "+FONT_UI;ctx.fillText(language==="en"?"LIMITED ARMORY / FEATURED":"限定武器库 / 本期精选",x+34,y+35);
    ctx.fillStyle="#fff";ctx.font="bold 38px "+FONT_UI;ctx.fillText(mt("everwinterName"),x+34,y+84);
    ctx.fillStyle="#88d8ff";ctx.font="bold 15px "+FONT_UI;ctx.fillText(mt("floraSignatureWeapon"),x+36,y+116);
    ctx.fillStyle="rgba(255,255,255,.66)";ctx.font="14px "+FONT_UI;ctx.fillText(mt("everwinterDesc"),x+36,y+148);
    ctx.fillStyle=ownedWeapons.flora?"#7cc7ff":"#ffe066";ctx.font="bold 20px "+FONT_UI;ctx.fillText(ownedWeapons.flora?ui("claimed"):"◆ 888",x+36,y+194);
    drawBtn(ownedWeapons.flora?(language==="en"?"Owned":"已拥有"):(language==="en"?"Acquire":"领取武器"),"",x+w-205,y+h-60,175,42,!ownedWeapons.flora,"#ffe066");
    return;
  }

  if(!WEAPON_MASTER.some(v=>v.id===shopWeaponSelectedId)) shopWeaponSelectedId=WEAPON_MASTER[0].id;
  const selected=weaponData(shopWeaponSelectedId),ownedItem=(weaponInventory||[]).find(v=>v.id===selected.id&&v.owned);
  const x=70,y=240,w=980;
  ctx.fillStyle="rgba(8,12,20,.84)";ctx.fillRect(x,y,w,112);
  ctx.strokeStyle="rgba(255,255,255,.16)";ctx.strokeRect(x,y,w,112);
  ctx.fillStyle=selected.rarity==="S"?"#ffe066":"#7cc7ff";ctx.fillRect(x,y,6,112);
  drawArmoryWeaponIcon(selected.type,x+170,y+57,.72,selected.rarity==="S"?"#ffe066":"#7cc7ff");
  ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,.46)";ctx.font="bold 10px "+FONT_UI;ctx.fillText(language==="en"?"PERMANENT ARMORY":"常驻武器库",x+270,y+27);
  ctx.fillStyle="#fff";ctx.font="bold 25px "+FONT_UI;ctx.fillText(language==="en"?selected.nameEn:selected.nameZh,x+270,y+58);
  ctx.fillStyle="rgba(255,255,255,.64)";ctx.font="12px "+FONT_UI;ctx.fillText(weaponTypeLabel(selected.type)+"  ·  ATK "+selected.baseAtk+"  ·  CRIT "+selected.crit+"%",x+270,y+82);
  ctx.fillStyle="#a8b6cc";ctx.fillText(language==="en"?selected.passiveEn:selected.passiveZh,x+270,y+101);
  drawInsetLabel(selected.rarity,x+w-176,y+22,44,30,selected.rarity==="S"?"#ffe066":"#7cc7ff","rgba(255,255,255,.05)","rgba(255,255,255,.16)",14,true,"center");
  drawInsetLabel(ownedItem?(language==="en"?"OWNED":"已拥有"):(language==="en"?"LOCKED":"未获得"),x+w-122,y+22,92,30,ownedItem?"#7cc7ff":"#888","rgba(255,255,255,.05)","rgba(255,255,255,.16)",11,true,"center");

  for(let n=0;n<WEAPON_MASTER.length;n++){
    const wd=WEAPON_MASTER[n],col=n%4,row=Math.floor(n/4),cx=x+col*245,cy=366+row*68,cw=230,ch=58,active=wd.id===shopWeaponSelectedId;
    const owned=(weaponInventory||[]).some(v=>v.id===wd.id&&v.owned);
    ctx.fillStyle=active?"rgba(124,199,255,.14)":"rgba(255,255,255,.055)";ctx.fillRect(cx,cy,cw,ch);
    ctx.strokeStyle=active?"#7cc7ff":"rgba(255,255,255,.13)";ctx.lineWidth=active?2:1;ctx.strokeRect(cx,cy,cw,ch);
    ctx.fillStyle=wd.rarity==="S"?"#ffe066":"#7cc7ff";ctx.fillRect(cx,cy,4,ch);
    drawArmoryWeaponIcon(wd.type,cx+39,cy+29,.28,wd.rarity==="S"?"#ffe066":"#7cc7ff");
    ctx.textAlign="left";ctx.fillStyle="#fff";ctx.font="bold 11px "+FONT_UI;ctx.fillText(language==="en"?wd.nameEn:wd.nameZh,cx+73,cy+22);
    ctx.fillStyle="rgba(255,255,255,.50)";ctx.font="9px "+FONT_UI;ctx.fillText(weaponTypeLabel(wd.type)+" · ATK "+wd.baseAtk,cx+73,cy+39);
    ctx.textAlign="right";ctx.fillStyle=owned?"#7cc7ff":"#777";ctx.fillText(owned?(language==="en"?"OWNED":"已拥有"):(language==="en"?"LOCK":"未获得"),cx+cw-10,cy+50);
  }
}

function drawShopPackArt(pack,x,y,w,h){
  const g=ctx.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,"rgba(255,255,255,.10)");
  g.addColorStop(.58,"rgba(12,18,32,.92)");
  g.addColorStop(1,"rgba(0,0,0,.72)");
  ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
  ctx.fillStyle=pack.accent;ctx.globalAlpha=.16;ctx.beginPath();ctx.moveTo(x+w*.42,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+w*.12,y+h);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
  ctx.save();ctx.translate(x+w*.67,y+h*.42);ctx.rotate(-.12);
  ctx.fillStyle="rgba(225,235,248,.92)";ctx.fillRect(-42,-25,84,50);ctx.strokeStyle="rgba(255,255,255,.78)";ctx.lineWidth=2;ctx.strokeRect(-42,-25,84,50);
  ctx.fillStyle="rgba(25,31,43,.76)";ctx.fillRect(-35,-17,70,34);ctx.fillStyle=pack.accent;ctx.fillRect(-35,8,70,9);
  ctx.strokeStyle=pack.accent;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-21,-25);ctx.lineTo(-13,-37);ctx.lineTo(16,-37);ctx.lineTo(24,-25);ctx.stroke();ctx.restore();
  for(let i=0;i<3;i++){ctx.save();ctx.translate(x+w*.82+i*15,y+h*.25+i*5);ctx.rotate(Math.PI/4);ctx.fillStyle=pack.accent;ctx.globalAlpha=.9-i*.18;ctx.fillRect(-8,-8,16,16);ctx.restore();}
  ctx.globalAlpha=1;
}

function drawShop(){
  normalizeMonthlyCardRuntime();
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#171326");
  bg.addColorStop(.55,"#090812");
  bg.addColorStop(1,"#05040b");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(255,255,255,.06)";
  ctx.fillRect(30,30,1060,82);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(30,30,1060,82);
  ctx.fillStyle="#fff"; ctx.font="bold 34px " + FONT_UI; ctx.textAlign="left";
  ctx.fillText(ui("shop"),58,78);
  ctx.font="14px " + FONT_UI; ctx.fillStyle="rgba(255,255,255,.62)";
  ctx.fillText(tx("shopSubtitle"),60,101);
  drawCurrencyIcon("crystal",W-215,49,32);
  ctx.textAlign="right"; ctx.fillStyle="#7cc7ff"; ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(mt("crystalColon")+crystals,W-60,78);

  const tabs=[
    ["recommend",mt("monthlyRecommendedTab")],
    ["recruit",ui("shopRecruit")],
    ["weapon",ui("weaponDepot")],
    ["skin",ui("skin")],
    ["crystal",language==="en"?"Crystals":"水晶"],
    ["monthly",ui("monthly")],
    ["packs",ui("packs")],
    ["support",ui("developerSupport")]
  ];
  for(let i=0;i<tabs.length;i++){
    drawBtn(tabs[i][1],"",40+i*132,135,122,42,shopTab===tabs[i][0],shopTab===tabs[i][0]?"#ffe066":"#fff");
  }

  if(shopTab==="recruit" || shopTab==="weapon"){
    drawBtn(shopTab==="recruit"?ui("limitedRecruit"):ui("limitedWeapon"),"",70,190,150,38,shopSubTab==="limited","#ffe066");
    drawBtn(shopTab==="recruit"?ui("permanentRecruit"):ui("permanentWeapon"),"",235,190,150,38,shopSubTab==="permanent","#fff");
  }


  if(shopTab==="recommend"){
    const recs=language==="en"?[
      ["Flora Direct Recruit","Limited Executor · fixed-price access","RECRUIT"],
      ["Monthly Supply","Daily Crystal support for 30 days","MONTHLY"],
      ["Growth Packs","Fixed resources with clear limits","PACKS"],
      ["Permanent Recruit","Permanent roster · no random draw","ROSTER"]
    ]:[
      ["芙洛拉直购","限定执行官 · 明码直购","招募"],
      ["月度补给","连续30日的每日水晶补给","月卡"],
      ["成长礼包","固定资源与明确限购次数","礼包"],
      ["常驻招募","常驻执行官 · 无随机抽取","常驻"]
    ];
    ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(55,205,235,300);ctx.strokeStyle="rgba(255,255,255,.12)";ctx.strokeRect(55,205,235,300);
    for(let i=0;i<recs.length;i++){
      const y=230+i*66,active=i===shopRecommendIndex;
      ctx.fillStyle=active?"rgba(255,224,102,.15)":"rgba(255,255,255,.045)";ctx.fillRect(70,y,205,54);
      ctx.fillStyle=active?"#ffe066":"rgba(255,255,255,.18)";ctx.fillRect(70,y,4,54);
      ctx.fillStyle=active?"#fff":"rgba(255,255,255,.68)";ctx.font="bold 14px "+FONT_UI;ctx.textAlign="left";ctx.fillText(recs[i][0],86,y+23);
      ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="10px "+FONT_UI;ctx.fillText(recs[i][2],86,y+42);
    }
    const sel=recs[shopRecommendIndex];
    const g=ctx.createLinearGradient(310,205,1040,505);g.addColorStop(0,"rgba(19,30,52,.98)");g.addColorStop(1,shopRecommendIndex===0?"rgba(25,66,82,.82)":"rgba(48,39,73,.86)");ctx.fillStyle=g;ctx.fillRect(310,205,730,300);
    ctx.strokeStyle="rgba(124,199,255,.28)";ctx.strokeRect(310,205,730,300);ctx.fillStyle="#7cc7ff";ctx.fillRect(310,205,7,300);
    ctx.fillStyle="rgba(255,255,255,.42)";ctx.font="bold 11px "+FONT_UI;ctx.fillText("PROJECT ZERO / MONTHLY SELECTION",350,245);
    ctx.fillStyle="#fff";ctx.font="bold 34px "+FONT_UI;ctx.fillText(sel[0],350,300);
    ctx.fillStyle="rgba(255,255,255,.68)";ctx.font="16px "+FONT_UI;ctx.fillText(sel[1],350,338);
    if(shopRecommendIndex===0) drawFloraImageBox(650,214,165,275,.95);
    else {ctx.save();ctx.translate(750,355);ctx.rotate(Math.PI/4);ctx.fillStyle="rgba(124,199,255,.16)";ctx.fillRect(-78,-78,156,156);ctx.strokeStyle="rgba(124,199,255,.55)";ctx.strokeRect(-78,-78,156,156);ctx.restore();ctx.fillStyle="#bfe8ff";ctx.font="bold 54px Arial";ctx.textAlign="center";ctx.fillText(shopRecommendIndex===1?"◆":shopRecommendIndex===2?"▣":"◇",750,375);ctx.textAlign="left";}
    drawBtn(language==="en"?"OPEN":"前往","",830,447,175,42,true,"#ffe066");
  }

  if(shopTab==="recruit"){
    if(shopSubTab==="limited"){
      ctx.fillStyle="rgba(136,216,255,.12)"; ctx.fillRect(70,250,420,230);
      ctx.strokeStyle="rgba(136,216,255,.55)"; ctx.strokeRect(70,250,420,230);
      drawFloraImageBox(88,258,135,210, owned[3]?1:.55);
      ctx.fillStyle="#88d8ff"; ctx.font="bold 30px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(tx("floraDisplayFull"),245,292);
      ctx.fillStyle="rgba(255,255,255,.75)"; ctx.font="16px " + FONT_UI;
      ctx.fillText(mt("floraShopRank"),245,324);
      ctx.fillText(mt("floraShopFeature"),245,352);
      ctx.fillStyle=owned[3]?"#7cc7ff":"#ffe066"; ctx.font="bold 22px " + FONT_UI;
      ctx.fillText(owned[3]?ui("claimed"):"4100 "+ui("crystal"),245,415);
    }else{
      const items=[{i:0,price:1800},{i:1,price:2200},{i:2,price:2400}];
      for(let n=0;n<items.length;n++){
        const it=items[n],x=70+n*315,y=250,r=roles[it.i];
        ctx.fillStyle="rgba(255,255,255,.07)"; ctx.fillRect(x,y,285,185);
        ctx.strokeStyle="rgba(255,255,255,.14)"; ctx.strokeRect(x,y,285,185);
        drawPortrait(x+18,y+25,85,120,r,!owned[it.i]);
        ctx.fillStyle=r.color; ctx.font="bold 24px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(roleName(it.i),x+125,y+48);
        ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="14px " + FONT_UI; ctx.fillText("A / "+roleStyle(it.i),x+125,y+78);
        ctx.fillStyle=owned[it.i]?"#7cc7ff":"#ffe066"; ctx.font="bold 18px " + FONT_UI; ctx.fillText(owned[it.i]?ui("claimed"):it.price+" "+ui("crystal"),x+125,y+130);
      }
      ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"LIMITED RESOURCE EXCHANGE":"限量资源兑换",70,438);
      for(let i=0;i<CRYSTAL_EXCHANGE_ITEMS.length;i++){
        const item=CRYSTAL_EXCHANGE_ITEMS[i],x=70+i*240,y=445,bought=Math.max(0,Number(crystalExchangePurchases[item.id])||0),sold=bought>=item.max;
        ctx.fillStyle=sold?"rgba(255,255,255,.025)":"rgba(124,199,255,.065)";ctx.fillRect(x,y,215,58);
        ctx.strokeStyle=sold?"rgba(255,255,255,.08)":"rgba(124,199,255,.24)";ctx.strokeRect(x,y,215,58);
        ctx.fillStyle=sold?"#777":"#fff";ctx.font="bold 12px "+FONT_UI;ctx.fillText(language==="en"?item.en:item.zh,x+12,y+21);
        if(!sold)drawCurrencyIcon("crystal",x+10,y+27,16);
        ctx.fillStyle=sold?"#666":"#7cc7ff";ctx.font="10px "+FONT_UI;ctx.fillText((sold?"":item.cost+"  ·  ")+(language==="en"?item.descEn:item.descZh),x+(sold?12:30),y+41);
        ctx.textAlign="right";ctx.fillStyle=sold?"#666":"#ffe066";ctx.fillText((item.max-bought)+"/"+item.max,x+203,y+20);ctx.textAlign="left";
      }
    }
  }

  if(shopTab==="weapon"){
    drawShopWeaponArmory();
  }

  if(shopTab==="skin"){
    ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(70,240,720,180);
    ctx.strokeStyle="rgba(255,255,255,.14)"; ctx.strokeRect(70,240,720,180);
    ctx.fillStyle="#fff"; ctx.font="bold 28px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(ui("skin")+" · "+ui("comingSoon"),100,300);
    ctx.font="16px " + FONT_UI; ctx.fillStyle="rgba(255,255,255,.68)";
    ctx.fillText(mt("skinDesc"),100,338);
  }

  if(shopTab==="crystal"){
    ctx.fillStyle="rgba(255,255,255,.50)";ctx.font="12px "+FONT_UI;ctx.textAlign="left";
    ctx.fillText(language==="en"?"DISPLAY ONLY · BILLING IS NOT CONNECTED":"仅供界面展示 · 测试版本未接入支付",70,204);
    for(let i=0;i<CRYSTAL_TOPUP_TIERS.length;i++){
      const tier=CRYSTAL_TOPUP_TIERS[i],r=crystalTopupCardRect(i),x=r.x,y=r.y,w=r.w,h=r.h,hover=inRect(x,y,w,h);
      ctx.save();ctx.translate(0,hover?-4:0);
      const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,hover?"rgba(38,63,88,.98)":"rgba(25,36,55,.97)");g.addColorStop(.68,"rgba(12,19,32,.98)");g.addColorStop(1,"rgba(5,9,17,.99)");
      ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=hover?"#7cc7ff":"rgba(170,205,232,.30)";ctx.lineWidth=hover?2:1.2;ctx.stroke();
      ctx.fillStyle=hover?"#7cc7ff":"rgba(124,199,255,.65)";ctx.fillRect(x,y,4,h);
      ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="bold 24px "+FONT_UI;ctx.fillText(String(tier.crystals),x+w/2,y+34);
      ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="bold 9px "+FONT_UI;ctx.fillText(language==="en"?"CRYSTALS":"水晶",x+w/2,y+50);

      const img=crystalTopupTierImgs[i];
      if(i===0){
        drawCurrencyIcon("crystal",x+w/2-46,y+82,92);
      }else if(img&&img.complete&&img.naturalWidth){
        ctx.save();ctx.beginPath();ctx.rect(x+7,y+56,w-14,177);ctx.clip();ctx.globalAlpha=hover?1:.90;ctx.drawImage(img,x+7,y+54,w-14,184);ctx.restore();
      }else{
        drawCurrencyIcon("crystal",x+w/2-42,y+90,84);
      }

      ctx.fillStyle="rgba(255,255,255,.055)";ctx.fillRect(x+10,y+h-79,w-20,43);
      ctx.fillStyle="#fff";ctx.font="bold 20px Arial";ctx.fillText(tier.price,x+w/2,y+h-50);
      ctx.fillStyle=hover?"#ffe066":"rgba(255,224,102,.90)";ctx.fillRect(x+1,y+h-34,w-2,33);
      ctx.fillStyle="#15171c";ctx.font="bold 12px "+FONT_UI;ctx.fillText(language==="en"?"FIRST PURCHASE ×2":"首购双倍",x+w/2,y+h-12);
      ctx.restore();
    }
  }

  if(shopTab==="monthly"){
    ctx.fillStyle="rgba(195,92,255,.10)"; ctx.fillRect(80,240,420,210); ctx.strokeStyle="rgba(195,92,255,.45)"; ctx.strokeRect(80,240,420,210);
    ctx.fillStyle="#c35cff"; ctx.font="bold 30px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(mt("adventurePass"),110,295);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="16px " + FONT_UI; ctx.fillText(mt("adventurePassDesc"),110,335);
    ctx.fillText("$4.99",110,370);
    normalizeMonthlyCardRuntime();
    ctx.fillStyle=canClaimMonthlyCard()?"#7cffb2":"rgba(255,255,255,.52)";
    ctx.font="bold 14px " + FONT_UI;
    ctx.fillText(canClaimMonthlyCard() ? (language==="en"?"Available today":"今日可领取") : (monthlyOwned ? (language==="en"?"Claimed today":"今日已领取") : (language==="en"?"Not active":"未开启")),110,405);
    drawBtn(canClaimMonthlyCard()?mt("dailyClaim"):(monthlyOwned?(language==="en"?"Claimed":"已领取"):mt("dailyClaim")),"",540,290,260,92,canClaimMonthlyCard(),"#ffe066");
  }

  if(shopTab==="packs"){
    const cats=language==="en"?["All Packs","Starter","Limited","Standard","Monthly"]:["全部礼包","启程礼包","限时礼包","标准礼包","月度礼包"];
    const packs=visibleShopPacks();
    ctx.fillStyle="rgba(6,10,20,.70)";ctx.fillRect(45,195,210,310);ctx.strokeStyle="rgba(255,255,255,.14)";ctx.strokeRect(45,195,210,310);
    ctx.fillStyle="rgba(255,255,255,.40)";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"PACK CATEGORIES":"礼包分类",60,211);
    for(let i=0;i<cats.length;i++){
      const y=223+i*54,active=i===shopPackCategory;
      ctx.fillStyle=active?"rgba(255,224,102,.14)":"rgba(255,255,255,.035)";ctx.fillRect(60,y,180,42);
      ctx.fillStyle=active?"#ffe066":"rgba(255,255,255,.16)";ctx.fillRect(60,y,4,42);
      ctx.fillStyle=active?"#fff":"rgba(255,255,255,.70)";ctx.font="bold 13px "+FONT_UI;ctx.textAlign="left";ctx.fillText(cats[i],76,y+26);
      ctx.textAlign="right";ctx.fillStyle="rgba(255,255,255,.34)";ctx.fillText(i===0?SHOP_PACKS.length:SHOP_PACKS.filter(v=>v.cat===i).length,226,y+26);
    }
    ctx.textAlign="left";
    if(!packs.length){ctx.fillStyle="rgba(255,255,255,.45)";ctx.font="bold 16px "+FONT_UI;ctx.fillText(language==="en"?"No packs in this category.":"该分类暂无礼包。",300,280);}
    for(let i=0;i<Math.min(6,packs.length);i++){
      const col=i%3,row=Math.floor(i/3),x=270+col*250,y=215+row*142,w=226,h=122,hover=inRect(x,y,w,h);
      const pack=packs[i];drawShopPackArt(pack,x,y,w,72);
      ctx.fillStyle="rgba(7,10,18,.96)";ctx.fillRect(x,y+72,w,50);ctx.strokeStyle=hover?pack.accent:"rgba(255,255,255,.16)";ctx.lineWidth=hover?2:1;ctx.strokeRect(x,y,w,h);
      ctx.fillStyle=pack.accent;ctx.fillRect(x,y,5,h);
      ctx.fillStyle="#fff";ctx.font="bold 14px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?pack.en:pack.zh,x+14,y+91);
      ctx.fillStyle="rgba(255,255,255,.58)";ctx.font="9px "+FONT_UI;ctx.fillText(language==="en"?pack.descEn:pack.descZh,x+14,y+108);
      ctx.textAlign="right";ctx.fillStyle="#ffe066";ctx.font="bold 9px "+FONT_UI;ctx.fillText(language==="en"?pack.limitEn:pack.limitZh,x+w-12,y+17);ctx.textAlign="left";
      if(pack.price){ctx.textAlign="right";ctx.fillStyle="#fff";ctx.font="bold 12px Arial";ctx.fillText(pack.price,x+w-12,y+91);ctx.textAlign="left";}
    }
  }

  if(shopTab==="support"){
    ctx.fillStyle="rgba(255,255,255,.08)"; ctx.fillRect(70,240,760,210); ctx.strokeStyle="rgba(255,255,255,.18)"; ctx.strokeRect(70,240,760,210);
    ctx.fillStyle="#fff"; ctx.font="bold 28px " + FONT_UI; ctx.textAlign="left"; ctx.fillText(ui("developerSupport"),100,295);
    ctx.fillStyle="rgba(255,255,255,.72)"; ctx.font="16px " + FONT_UI;
    ctx.fillText(mt("supportDesc"),100,335);
  }

  ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(60,510,900,36);
  ctx.fillStyle="#ffe066"; ctx.font="14px " + FONT_UI; ctx.textAlign="left";
  ctx.fillText(localizeText(shopMsg),78,534);

  drawBtn(ui("backLobby"),"ESC",60,560,220,52);
}

function drawGiftPack(x,y,w,h,title,desc,price,bought){
  const hover=inRect(x,y,w,h);
  ctx.fillStyle=bought?"rgba(120,120,120,.08)":hover?"rgba(255,224,102,.16)":"rgba(255,255,255,.075)";
  ctx.fillRect(x,y,w,h);
  ctx.strokeStyle=hover?"rgba(255,224,102,.85)":"rgba(255,255,255,.14)";
  ctx.strokeRect(x,y,w,h);

  ctx.fillStyle=bought?"#888":"#ffe066";
  ctx.font="bold 24px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(title,x+22,y+42);

  ctx.fillStyle="rgba(255,255,255,.72)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(desc,x+22,y+82);

  ctx.fillStyle=bought?"#888":"#ffffff";
  ctx.font="bold 20px " + FONT_UI;
  ctx.fillText(bought?mt("bought"):price,x+22,y+130);

  ctx.textAlign="right";
  ctx.font="bold 15px " + FONT_UI;
  ctx.fillStyle=bought?"#888":"#fff";
  ctx.fillText(bought?"SOLD":"BUY",x+w-22,y+132);
}
function drawGrid(){ ctx.strokeStyle="rgba(255,255,255,.035)"; for(let x=0;x<W;x+=80){ctx.beginPath();ctx.moveTo(x,100);ctx.lineTo(x,H);ctx.stroke();} for(let y=100;y<H;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();} }
function drawEnemy(e){ if(!e.alive)return; ctx.save(); ctx.translate(e.x,e.y); if((e.freeze||0)>0){ctx.globalAlpha=.92;} if(e.windup>0){ctx.strokeStyle="#ff3333";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,e.boss?110:82,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ff3333";ctx.font="bold 18px " + FONT_UI;ctx.textAlign="center";ctx.fillText("R!",0,-e.r-42);} ctx.fillStyle=e.hit>0?"#fff":e.boss?"#5b2d42":"#33384f"; ctx.beginPath();ctx.arc(0,0,e.r,0,Math.PI*2);ctx.fill(); const hw=e.boss?105:62; ctx.fillStyle="#fff";ctx.font="bold 10px " + FONT_UI;ctx.textAlign="right";ctx.fillText("Lv."+((e.lv!==undefined)?e.lv:"?"),-hw/2-6,-e.r-18); ctx.fillStyle="#ff4d4d";ctx.fillRect(-hw/2,-e.r-24,hw,6);ctx.fillStyle="#ffe066";ctx.fillRect(-hw/2,-e.r-24,hw*(e.hp/e.maxHp),6);
  if((e.freeze||0)>0){ ctx.strokeStyle="#88d8ff"; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,e.r+13,0,Math.PI*2); ctx.stroke(); ctx.fillStyle="#88d8ff"; ctx.font="bold 11px " + FONT_UI; ctx.textAlign="center"; ctx.fillText("FROZEN",0,-e.r-45); }
  else if((e.chill||0)>0){ ctx.strokeStyle="rgba(136,216,255,.55)"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(0,0,e.r+10,0,Math.PI*2); ctx.stroke(); }
  if(e.maxShield>0){
    ctx.fillStyle="rgba(124,199,255,.20)";
    ctx.fillRect(-hw/2,-e.r-34,hw,5);
    ctx.fillStyle="#7cc7ff";
    ctx.fillRect(-hw/2,-e.r-34,hw*(e.shield/e.maxShield),5);
  }
  ctx.fillStyle=e.type==="shield"?"#7cc7ff":e.type==="ranged"?"#ff8888":e.type==="berserker"?"#ff5555":e.boss?"#ff6b9b":"rgba(255,255,255,.65)";
  ctx.font="bold 11px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(e.boss?"BOSS":e.type.toUpperCase(),0,e.r+18); if(lockTarget===e){ctx.strokeStyle="#ffe066";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+10,0,Math.PI*2);ctx.stroke();} ctx.restore(); }
function drawPlayer(){
  const r=roles[player.role];
  ctx.save();
  ctx.translate(player.x,player.y);

  if(player.guardTimer>0||player.parryReady>0){
    ctx.strokeStyle=player.parryReady>0?"#fff":"#7cc7ff";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.arc(0,0,player.r+16,0,Math.PI*2);
    ctx.stroke();
  }

  ctx.globalAlpha=player.inv>0?.62:1;

  // Unified executor battle model:
  // Protagonist now uses the same body / weapon template as Kane, Ailo, Nox.
  // Only color changes.
  ctx.shadowBlur=14;
  ctx.shadowColor=r.color;

  ctx.fillStyle="rgba(0,0,0,.26)";
  ctx.beginPath();
  ctx.ellipse(0,player.r+13,player.r*1.1,player.r*.25,0,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle=r.color;
  ctx.beginPath();
  ctx.arc(0,0,player.r,0,Math.PI*2);
  ctx.fill();

  ctx.shadowBlur=0;
  ctx.fillStyle=r.sub;
  ctx.beginPath();
  ctx.moveTo(player.facing*33,0);
  ctx.lineTo(player.facing*10,-11);
  ctx.lineTo(player.facing*10,11);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha=1;
  ctx.fillStyle="#fff";
  ctx.font="bold 12px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(roleName(player.role),0,-30);
  ctx.restore();
}

function drawProtagonistCombatEffects(){
  for(const bind of protagonistBindings){
    const e=bind.target;
    if(!e||!e.alive) continue;
    const a=Math.max(0,Math.min(1,bind.life/bind.max));
    ctx.save();
    ctx.translate(e.x,e.y);
    ctx.globalAlpha=.32+.58*a;
    const colors=["#ffffff","#8f9299","#0b0c10"];
    for(let i=0;i<3;i++){
      ctx.save();
      ctx.rotate(bind.angle*(i%2? -1:1)+i*Math.PI/3);
      ctx.strokeStyle=colors[i];
      ctx.shadowBlur=i===2?5:12;
      ctx.shadowColor=i===2?"#ffffff":colors[i];
      ctx.lineWidth=i===0?4:3;
      ctx.beginPath();
      ctx.ellipse(0,0,e.r+20+i*7,e.r*.62+9+i*5,i*.35,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    for(let i=0;i<6;i++){
      const ang=bind.angle*.7+i*Math.PI/3;
      ctx.strokeStyle=colors[i%3];
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang)*(e.r+10),Math.sin(ang)*(e.r+10));
      ctx.lineTo(Math.cos(ang)*(e.r+42),Math.sin(ang)*(e.r+42));
      ctx.stroke();
    }
    ctx.restore();
  }

  for(const s of protagonistSweeps){
    const a=Math.max(0,s.life/s.max);
    ctx.save();
    ctx.globalAlpha=.18+.82*a;
    ctx.strokeStyle=s.color;
    ctx.shadowBlur=18;
    ctx.shadowColor=s.color==="#17191f"?"#ffffff":s.color;
    ctx.lineCap="round";
    ctx.lineWidth=5+11*a;
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();
    ctx.globalAlpha=.72*a;
    ctx.strokeStyle=s.color==="#17191f"?"#777a82":"#ffffff";
    ctx.lineWidth=2.5;
    ctx.beginPath();ctx.moveTo(s.x1,s.y1);ctx.lineTo(s.x2,s.y2);ctx.stroke();
    ctx.restore();
  }

  if(protagonistDomain.active){
    const remain=Math.max(0,protagonistDomain.life/60);
    ctx.save();
    ctx.fillStyle="rgba(8,9,13,.18)";ctx.fillRect(0,100,W,H-100);
    ctx.textAlign="right";ctx.font="bold 13px "+FONT_UI;ctx.fillStyle="#ffffff";
    ctx.fillText((language==="en"?"MONOCHROME DOMAIN ":"黑白领域 ")+remain.toFixed(1)+"s",W-34,126);
    ctx.restore();
  }
}

function drawKaneCombatEffects(){
  for(const sigil of kaneSigils){
    const a=clamp(sigil.life/sigil.max,0,1),pulse=.86+Math.sin(menuPulse*.18)*.08;
    ctx.save();ctx.translate(sigil.x,sigil.y);ctx.globalAlpha=.28+.55*a;
    ctx.strokeStyle="#ff5757";ctx.shadowBlur=18;ctx.shadowColor="#ff5757";ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,0,sigil.r*pulse,0,Math.PI*2);ctx.stroke();
    ctx.rotate(-.18);ctx.strokeStyle="#ffe066";ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(-78,-34);ctx.lineTo(0,58);ctx.lineTo(82,-38);ctx.moveTo(-48,5);ctx.lineTo(50,5);ctx.stroke();
    ctx.globalAlpha=.10*a;ctx.fillStyle="#ff5757";ctx.beginPath();ctx.arc(0,0,sigil.r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  for(const e of enemies){
    if(!e.alive||(e.physicalPain||0)<=0) continue;
    ctx.save();ctx.globalAlpha=.7+.2*Math.sin(menuPulse*.2);ctx.strokeStyle="#ff8a66";ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(e.x,e.y,e.r+9,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffb07a";ctx.font="bold 9px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?"PAIN":"疼痛",e.x,e.y-e.r-15);ctx.restore();
  }
  if(teamDamageAmpTimer>0){
    ctx.save();ctx.fillStyle="rgba(255,87,87,.16)";ctx.strokeStyle="rgba(255,190,92,.55)";ctx.beginPath();ctx.roundRect(W-260,108,225,28,8);ctx.fill();ctx.stroke();
    ctx.fillStyle="#ffe066";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="center";ctx.fillText((language==="en"?"SQUAD DMG +18% · ":"全队增伤18% · ")+(teamDamageAmpTimer/60).toFixed(1)+"s",W-148,127);ctx.restore();
  }
}

function drawNoxAiloCombatEffects(){
  for(const f of windFields){
    const a=clamp(f.life/f.max,0,1),phase=(f.max-f.life)*.045;
    ctx.save();ctx.translate(f.x,f.y);ctx.globalAlpha=.16+.32*a;
    ctx.fillStyle="#74ffb7";ctx.beginPath();ctx.arc(0,0,f.r,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.70*a;ctx.strokeStyle=f.type==="skill"?"#ffffff":"#74ffb7";ctx.lineWidth=f.type==="skill"?4:2.5;
    for(let i=0;i<3;i++){
      ctx.beginPath();ctx.arc(0,0,f.r*(.40+i*.19),phase+i*1.8,phase+i*1.8+Math.PI*1.25);ctx.stroke();
    }
    ctx.restore();
  }
  for(const e of enemies){
    if(!e.alive||(e.weathering||0)<=0) continue;
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(menuPulse*.025);ctx.globalAlpha=.72;
    ctx.strokeStyle="#74ffb7";ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.beginPath();ctx.arc(0,0,e.r+12,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#9affcf";ctx.font="bold 9px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?"WEATHERED":"风化",0,-e.r-18);ctx.restore();
  }
  if(ailoUltimateBurst.active){
    const p=1-clamp(ailoUltimateBurst.life/ailoUltimateBurst.max,0,1);
    ctx.save();ctx.translate(player.x,player.y);ctx.globalAlpha=.25+.35*p;ctx.strokeStyle="#74ffb7";ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,0,Math.max(45,500*(1-p)),0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(noxDamageAmpTimer>0){
    ctx.save();ctx.beginPath();ctx.roundRect(W-260,140,225,28,8);ctx.fillStyle="rgba(180,124,255,.16)";ctx.fill();ctx.strokeStyle="rgba(217,186,255,.62)";ctx.stroke();
    ctx.fillStyle="#d9baff";ctx.font="bold 10px "+FONT_UI;ctx.textAlign="center";ctx.fillText((language==="en"?"RUIN +20% · ATTACK COST 5% HP · ":"毁灭+20% · 攻击消耗5%生命 · ")+(noxDamageAmpTimer/60).toFixed(1)+"s",W-148,159);ctx.restore();
  }
}

function drawEffects(){
  drawFrostFields();
  drawBossHazards();
  drawProtagonistCombatEffects();
  drawKaneCombatEffects();
  drawNoxAiloCombatEffects();
  for(const s of slashes){
    ctx.save();
    const a=s.life/s.max;
    ctx.globalAlpha=a;
    if(s.type==="bladeTrail" || s.type==="heavyTrail" || s.type==="skillTrail" || s.type==="breakTrail"){
      ctx.strokeStyle=s.color;
      ctx.lineCap="round";
      ctx.lineWidth=Math.max(1,(s.width||10)*a);
      ctx.shadowBlur=s.type==="heavyTrail"?18:10;
      ctx.shadowColor=s.color;
      ctx.beginPath();
      ctx.moveTo(s.x1,s.y1);
      ctx.lineTo(s.x2,s.y2);
      ctx.stroke();
      ctx.globalAlpha=a*.55;
      ctx.strokeStyle="#ffffff";
      ctx.lineWidth=Math.max(1,(s.width||10)*.35*a);
      ctx.beginPath();
      ctx.moveTo(s.x1,s.y1);
      ctx.lineTo(s.x2,s.y2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    ctx.translate(s.x,s.y);
    ctx.rotate(s.rot||0);
    ctx.strokeStyle=s.color;
    ctx.lineWidth=s.type==="ultimate"?10:s.type==="frostField"?6:s.type==="ice"?5:s.type==="parry"?8:s.type==="break"?7:5;
    ctx.beginPath();
    ctx.arc(0,0,s.r*(s.type==="ice"||s.type==="frostField"||s.type==="ultimate" ? 1 : a),0,Math.PI*2);
    ctx.stroke();
    if(s.type==="ice" || s.type==="frostField" || s.type==="ultimate"){
      ctx.globalAlpha=a*.14;
      ctx.fillStyle="#88d8ff";
      ctx.beginPath();
      ctx.arc(0,0,s.r,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  for(const p of particles){
    ctx.save();
    ctx.globalAlpha=p.life/p.max;
    ctx.fillStyle=p.color;
    ctx.strokeStyle=p.color;
    if(p.spark){
      ctx.lineWidth=Math.max(1,p.size);
      ctx.shadowBlur=10;
      ctx.shadowColor=p.color;
      ctx.beginPath();
      ctx.moveTo(p.x-Math.cos(p.angle)*(p.len||10)*.35, p.y-Math.sin(p.angle)*(p.len||10)*.35);
      ctx.lineTo(p.x+Math.cos(p.angle)*(p.len||10), p.y+Math.sin(p.angle)*(p.len||10));
      ctx.stroke();
    }else{
      ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  for(const p of projectiles){
    ctx.save();
    ctx.fillStyle="#ff7777";
    ctx.shadowBlur=12;
    ctx.shadowColor="#ff3333";
    ctx.beginPath();
    ctx.arc(p.x,p.y,7,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
  for(const t of texts){ctx.save();ctx.globalAlpha=t.life/t.max;ctx.fillStyle=t.color;ctx.font=t.big?"bold 30px Arial":"bold 22px Arial";ctx.textAlign="center";ctx.fillText(t.text,t.x,t.y);ctx.restore();}
}


function drawMobileControls(){
  // PC build: mobile virtual controls disabled.
}

function drawAchievementNotice(){
  if(achievementNoticeTimer<=0 || !achievementNotice) return;
  achievementNoticeTimer -= frameScale;
  ctx.save();
  ctx.globalAlpha = Math.min(1, achievementNoticeTimer/30);
  ctx.fillStyle="rgba(0,0,0,.52)";
  ctx.fillRect(W/2-230,90,460,48);
  ctx.strokeStyle="rgba(255,224,102,.55)";
  ctx.strokeRect(W/2-230,90,460,48);
  ctx.fillStyle="#ffe066";
  ctx.font="bold 17px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(achievementNotice,W/2,120);
  ctx.restore();
}

function drawDaydreamBattleUI(){
  syncPlayerHpFromRole();ensureBattleRoleResources();const y=H-112;
  ctx.save();ctx.fillStyle="rgba(5,8,17,.88)";ctx.fillRect(18,y,W-36,94);ctx.strokeStyle="rgba(155,124,255,.42)";ctx.strokeRect(18,y,W-36,94);
  for(let i=0;i<team.length;i++){
    const role=team[i],x=34+i*112,active=role===player.role,max=roleMaxHpForBattle(role);
    const hp=clamp(Number(battleRoleHp[role])||0,0,max),energy=clamp(Number(battleRoleEnergy[role])||0,0,100),ultValue=clamp(Number(battleRoleUlt[role])||0,0,ULT_MAX);
    const down=hp<=0;
    ctx.fillStyle=down?"rgba(35,38,48,.72)":active?"rgba(155,124,255,.24)":"rgba(255,255,255,.05)";ctx.fillRect(x,y+12,102,70);ctx.strokeStyle=down?"rgba(255,85,95,.46)":active?"#ffe066":"rgba(255,255,255,.18)";ctx.strokeRect(x,y+12,102,70);
    ctx.fillStyle=roles[role].color||"#7cc7ff";ctx.beginPath();ctx.arc(x+22,y+36,15,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="bold 11px "+FONT_UI;ctx.textAlign="left";ctx.fillText(roleName(role),x+43,y+27);
    drawBar(x+43,y+34,49,5,hp/max,"#ff4d5f");drawBar(x+43,y+43,49,4,energy/100,"#55d8ff");drawBar(x+43,y+51,49,4,ultValue/ULT_MAX,"#b47cff");
    ctx.fillStyle=down?"#ff7886":"rgba(255,255,255,.58)";ctx.font="8px Arial";ctx.fillText(down?(language==="en"?"DOWN":"无法战斗"):(Math.floor(hp)+" HP"),x+43,y+66);
  }
  ctx.fillStyle="rgba(255,255,255,.55)";ctx.font="11px "+FONT_UI;ctx.fillText((language==="en"?"Reconstruction Area ":"重现区域 ")+area+"/"+battleAreaLimit(),390,y+28);drawBar(390,y+39,300,10,player.hp/playerMaxHp(),"#ff4d5f");drawBar(390,y+56,300,10,player.energy/100,"#42d7ff");drawBar(390,y+73,300,10,player.ult/ULT_MAX,"#c35cff");
  ctx.textAlign="right";ctx.fillStyle="#ffe066";ctx.font="bold 24px "+FONT_UI;ctx.fillText("COMBO "+combo,W-38,y+35);ctx.fillStyle="#fff";ctx.font="bold 30px Arial";ctx.fillText(combatRank,W-38,y+72);ctx.restore();
}

function abandonCurrentBattle(){
  battlePaused=false;
  if(battleModeSource==="showcase"){
    const previous=showcasePreviousState;
    battleModeSource="main";
    clearTransientBattleState();
    if(previous){team=normalizeBattleTeam(previous.team);selectedStage=previous.selectedStage;}
    showcasePreviousState=null;
    gameMode="operators";
    operatorPageMode="detail";
    player.role=selectedOperator;
    return;
  }
  if(battleModeSource==="daydream"){
    if(window.PZDaydream&&typeof window.PZDaydream.abandonRun==="function")window.PZDaydream.abandonRun();
    selectedTab="daydream";battleModeSource="main";daydreamBattleConfig=null;
  }
  if(battleModeSource==="bossKros"){
    selectedTab="dungeon";
    dungeonPanelMode="boss";
  }
  clearTransientBattleState();resetBattleSourceToMain();gameMode="operation";
}

function restartCurrentBattle(){
  battlePaused=false;
  startBattle();
}

function updateBattlePauseMenu(){
  if(justPressed("escape")){battlePaused=false;clicked=false;return;}
  if(clicked){
    const x=W/2-170,y=H/2-78;
    if(inRect(x,y,340,54)){battlePaused=false;clicked=false;return;}
    if(inRect(x,y+68,340,54)){clicked=false;restartCurrentBattle();return;}
    if(inRect(x,y+136,340,54)){clicked=false;abandonCurrentBattle();return;}
  }
  clicked=false;
}

function drawBattlePauseButton(){
  const hover=inRect(W-72,18,50,44);
  ctx.save();ctx.fillStyle=hover?"rgba(255,224,102,.20)":"rgba(7,9,18,.82)";ctx.fillRect(W-72,18,50,44);
  ctx.strokeStyle=hover?"#ffe066":"rgba(255,255,255,.34)";ctx.lineWidth=2;ctx.strokeRect(W-72,18,50,44);
  ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.textAlign="center";ctx.fillText("Ⅱ",W-47,47);ctx.restore();
}

function drawBattlePauseMenu(){
  if(!battlePaused)return;
  ctx.save();ctx.fillStyle="rgba(0,0,0,.76)";ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(12,16,30,.98)";ctx.fillRect(W/2-230,H/2-160,460,330);
  ctx.strokeStyle="rgba(255,224,102,.65)";ctx.lineWidth=2;ctx.strokeRect(W/2-230,H/2-160,460,330);
  ctx.fillStyle="#fff";ctx.font="bold 30px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?"MISSION PAUSED":"任务暂停",W/2,H/2-112);
  const labels=battleModeSource==="showcase"
    ? (language==="en"?["Continue","Reset Template","Exit Showcase"]:["继续展示","重置模板","退出展示"])
    : (language==="en"?["Continue","Restart Mission","Abandon Mission"]:["继续任务","重新开始","放弃任务"]);
  const x=W/2-170,y=H/2-78;
  for(let i=0;i<3;i++){const yy=y+i*68,hover=inRect(x,yy,340,54);ctx.fillStyle=hover?(i===2?"rgba(255,85,95,.22)":"rgba(255,224,102,.18)"):"rgba(255,255,255,.07)";ctx.fillRect(x,yy,340,54);ctx.strokeStyle=hover?(i===2?"#ff6675":"#ffe066"):"rgba(255,255,255,.20)";ctx.strokeRect(x,yy,340,54);ctx.fillStyle=i===2?"#ff8b96":"#fff";ctx.font="bold 19px "+FONT_UI;ctx.fillText(labels[i],W/2,yy+34);}
  ctx.fillStyle="rgba(255,255,255,.48)";ctx.font="12px "+FONT_UI;ctx.fillText(language==="en"?"Esc: Continue":"Esc：继续任务",W/2,H/2+145);ctx.restore();
}

function drawBattleUI(){
  if(battleModeSource==="daydream"){drawDaydreamBattleUI();return;}
  syncPlayerHpFromRole();
  const r=roles[player.role];
  const objectiveText=chapter1AreaObjectiveText();
  const dodgeStatus=(player.perfectDodgeTimer||0)>0||(player.perfectBuff||0)>0;
  ctx.save();
  ctx.textBaseline="alphabetic";
  const chapter2Timed=battleModeSource==="main"&&selectedMainChapter===2&&selectedStage===10;
  const basePanelH=(battleModeSource==="commission"||chapter2Timed)?166:118;
  const objectiveY=(battleModeSource==="commission"||chapter2Timed)?190:(dodgeStatus?164:148);
  const panelH=basePanelH+(objectiveText?(dodgeStatus&&basePanelH===118?48:34):0);
  ctx.fillStyle="rgba(7,9,18,.56)";
  ctx.fillRect(16,14,350,panelH);
  ctx.strokeStyle="rgba(255,255,255,.14)";
  ctx.strokeRect(16,14,350,panelH);

  ctx.textAlign="left";
  ctx.fillStyle="#fff";
  fitText(roleName(player.role)+"  Lv."+roleDisplayLevel(player.role), 225, 21, "bold", 14);
  ctx.fillText(roleName(player.role)+"  Lv."+roleDisplayLevel(player.role),30,42);

  ctx.fillStyle="rgba(255,255,255,.66)";
  ctx.font="13px " + FONT_UI;
  const battleCode=battleModeSource==="showcase"?"SHOWCASE":battleModeSource==="commission"?("C"+currentCommissionStage().chapter+"-"+currentCommissionStage().localId):(battleModeSource==="daydream"?"DAYDREAM":stageCode(selectedStage));
  const meta = battleModeSource==="showcase"
    ? (language==="en"?"Official recommended max build · Infinite training target":"官方推荐满配 · 无限生命训练目标")
    : battleCode+"  |  "+(battleModeSource==="commission"?(language==="en"?"Wave ":"波次 "):(battleModeSource==="daydream"?(language==="en"?"Reconstruction ":"重现区域 "):tx("areaLabel")))+area+"/"+battleAreaLimit()+"  |  "+tx("crystalWord")+": "+crystals;
  fitText(meta, 300, 13, "", 10);
  ctx.fillText(meta,30,64);

  if(battleModeSource==="showcase"){
    ctx.fillStyle="rgba(7,9,18,.72)";ctx.fillRect(390,16,300,54);
    ctx.strokeStyle="rgba(255,224,102,.36)";ctx.strokeRect(390,16,300,54);
    ctx.fillStyle="rgba(255,255,255,.50)";ctx.font="10px "+FONT_UI;ctx.textAlign="left";
    ctx.fillText(language==="en"?"RECOMMENDED BUILD":"官方推荐配置",404,37);
    ctx.fillStyle="#ffe066";ctx.font="bold 12px "+FONT_UI;
    ctx.fillText(showcaseRecommendation(player.role),404,57);
    ctx.textAlign="center";ctx.font="bold 13px "+FONT_UI;
    ctx.fillText(language==="en"?"TRAINING TARGET · ∞ HP":"训练目标 · 无限生命",735,108);
  }

  drawBar(30,78,280,12,player.hp/playerMaxHp(),"#ff4d4d");
  ctx.fillStyle="rgba(255,255,255,.76)";
  ctx.font="10px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText(Math.floor(player.hp)+"/"+playerMaxHp(),30,75);
  drawBar(30,96,280,12,player.energy/100,"#42d7ff");
  drawBar(30,114,280,12,player.ult/ULT_MAX,"#c35cff");
  if(dodgeStatus){
    ctx.fillStyle="rgba(124,199,255,.22)";
    ctx.fillRect(30,130,280,14);
    ctx.fillStyle="#7cc7ff";
    ctx.font="bold 11px " + FONT_UI;
    ctx.textAlign="left";
    ctx.fillText((language==="en"?"Perfect Dodge":"极限闪避")+"  +20%",36,141);
  }
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="10px " + FONT_UI;
  ctx.fillText("HP",318,88);
  ctx.fillText("EN",318,106);
  ctx.fillText("ULT",318,124);

  if(objectiveText) drawChapter1AreaObjective(30,objectiveY,310);

  if(battleModeSource==="commission"){
    for(let i=0;i<4;i++){
      const done=i<area-1, active=i===area-1;
      ctx.beginPath(); ctx.arc(42+i*34,151,10,0,Math.PI*2);
      ctx.fillStyle=done?"#6d1824":active?"#ff334f":"rgba(255,51,79,.18)"; ctx.fill();
      ctx.strokeStyle=active?"#fff":"rgba(255,100,120,.55)"; ctx.lineWidth=active?3:1.5; ctx.stroke();
    }
    const sec=Math.max(0,Math.ceil(commissionTimeLeft));
    ctx.fillStyle=sec<=20?"#ff4d5f":"#ffe066"; ctx.font="bold 20px "+FONT_UI; ctx.textAlign="right";
    ctx.fillText(String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0"),340,158);
  }
  if(chapter2Timed){
    const sec=Math.max(0,Math.ceil(chapter2EvacTimeLeft));
    ctx.fillStyle=sec<=30?"#ff4d5f":"#ffe066";ctx.font="bold 12px "+FONT_UI;ctx.textAlign="left";ctx.fillText(language==="en"?"RIFT CLOSURE":"裂隙闭合倒计时",30,151);
    ctx.font="bold 20px "+FONT_UI;ctx.textAlign="right";ctx.fillText(String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0"),340,158);
  }

  ctx.textAlign="right";
  ctx.fillStyle="#ffe066";
  ctx.font="bold 31px " + FONT_UI;
  ctx.fillText(combo>0 ? "COMBO " + combo : "COMBO 0", W-20, 43);
  ctx.font="bold 42px " + FONT_UI;
  ctx.fillStyle=combatRank==="SSS"?"#ffe066":combatRank==="SS"?"#c35cff":combatRank==="S"?"#7cc7ff":"#ffffff";
  ctx.fillText(combatRank,W-20,92);
  ctx.restore();
}
function drawBar(x,y,w,h,v,c){ctx.fillStyle="rgba(255,255,255,.15)";ctx.fillRect(x,y,w,h);ctx.fillStyle=c;ctx.fillRect(x,y,w*clamp(v,0,1),h);}

function chapter1AreaObjectiveText(){
  if(battleModeSource!=="main" || (selectedMainChapter!==1&&selectedMainChapter!==2) || battleSideArea) return "";
  const pending=hasPendingChapterAreaObjective();
  const done=language==="en"?"Objective complete — proceed right":"区域目标完成——向右前进";
  if(!pending && areaCleared) return done;
  const zh2={3:"避开警戒，靠近三个盲点按 F 调查",4:"清除威胁并按 F 校准裂隙锚点",5:"与居民交谈，记录他们自己的选择",6:"护送幸存者并确认每段撤离标记",7:"调查小赖留下的三处痕迹",8:"击退追击者并确认狐灵共鸣点",10:"清出道路并确认幸存者通过"};
  const en2={3:"Avoid security and press F at all three blind spots",4:"Clear threats and press F to calibrate each rift anchor",5:"Speak with residents and record their choices",6:"Escort survivors and confirm each evacuation marker",7:"Inspect the three traces left by Lai",8:"Repel the pursuit and confirm each fox resonance point",10:"Open the route and confirm the survivors have passed"};
  if(selectedMainChapter===2) return (language==="en"?en2:zh2)[selectedStage]||"";
  const zh={
    2:"清理敌人并破坏封锁障碍",
    3:"清理敌人，靠近调查点按 F",
    4:area<3?"追踪求救信号，确认小赖的位置":"击退敌人并找到小赖",
    6:"清理路线并按 F 确认护送标记",
    8:"调查裂隙聚居地，不要遗漏关键线索",
    9:"击退晶体人并确认幸存者物资"
  };
  const en={
    2:"Clear enemies and destroy the blockade",
    3:"Clear enemies, then press F at the investigation point",
    4:area<3?"Trace the distress signal and locate Xiaolai":"Repel enemies and reach Xiaolai",
    6:"Clear the route and press F at the escort marker",
    8:"Survey the rift settlement and inspect every key clue",
    9:"Repel the Crystalborn and check the survivors' supplies"
  };
  return (language==="en"?en:zh)[selectedStage]||"";
}

function drawChapter1AreaObjective(x=30,y=148,maxW=310){
  const text=chapter1AreaObjectiveText();
  if(!text) return;
  ctx.save();
  ctx.textAlign="left";ctx.translate(x,y);
  ctx.rotate(Math.PI/4);ctx.fillStyle="#ffe066";ctx.fillRect(-4,-4,8,8);ctx.rotate(-Math.PI/4);
  const prefix=language==="en"?"OBJECTIVE · ":"目标 · ";
  ctx.fillStyle="rgba(255,255,255,.88)";fitText(prefix+text,maxW-18,12,"bold",9);ctx.fillText(prefix+text,16,5);
  ctx.restore();
}
function drawUltimateOverlay(){ if(!ult.active)return; const r=roles[ult.role],t=ult.timer; ctx.save(); ctx.globalAlpha=t<16?t/16*.72:t>78?(1-(t-78)/18)*.72:.72; ctx.fillStyle="#000";ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;ctx.fillStyle="#fff";ctx.font="bold 38px " + FONT_UI;ctx.textAlign="left";ctx.fillText("ULTIMATE",W*.48,H*.40);ctx.font="bold 24px " + FONT_UI;ctx.fillStyle=r.sub;ctx.fillText(roleLine(ult.role),W*.48,H*.48); if(t>42){const b=Math.min(1,(t-42)/18);ctx.strokeStyle=r.color;ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(W*.18,H*.72);ctx.lineTo(W*(.18+.72*b),H*(.72-.50*b));ctx.stroke();} ctx.restore();}

function drawBattleBackground(){
  const name = stageBackgroundName(selectedStage) || mt("stageFallback");
  ctx.save();
  ctx.globalAlpha=.9;
  if(selectedStage<=4){
    ctx.fillStyle="rgba(30,80,45,.18)";
    for(let i=0;i<18;i++){ctx.beginPath();ctx.arc(80+i*70,160+(i%5)*85,36,0,Math.PI*2);ctx.fill();}
  } else if(selectedStage<=7){
    ctx.fillStyle="rgba(110,95,50,.16)";
    for(let i=0;i<12;i++)ctx.fillRect(80+i*85,170+(i%4)*70,44,90);
  } else {
    ctx.fillStyle="rgba(120,120,150,.15)";
    for(let i=0;i<13;i++)ctx.fillRect(60+i*80,130+(i%3)*60,42,150);
  }
  ctx.fillStyle="rgba(255,255,255,.10)";
  ctx.font="bold 38px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(name,W/2,H/2);
  ctx.restore();
}

function drawBattleExploreObjects(){
  if(!supportsStageExploration()) return;
  for(const o of battleExploreObjects){
    ctx.save();
    ctx.globalAlpha=o.done?.35:1;
    if(o.required&&!o.done){ctx.shadowColor="#ffe066";ctx.shadowBlur=18;}
    if(o.type==="chest"){
      ctx.fillStyle="#6b4a21"; ctx.fillRect(o.x-31,o.y-20,62,40);
      ctx.fillStyle="#ffe066"; ctx.fillRect(o.x-31,o.y-6,62,8); ctx.fillRect(o.x-5,o.y-20,10,40);
      ctx.strokeStyle="#fff0a8"; ctx.lineWidth=2; ctx.strokeRect(o.x-31,o.y-20,62,40);
    }else if(o.type==="crate"){
      ctx.fillStyle="#76502d"; ctx.fillRect(o.x-30,o.y-28,60,56);
      ctx.strokeStyle="#c59b5f"; ctx.lineWidth=4; ctx.strokeRect(o.x-30,o.y-28,60,56);
      ctx.beginPath(); ctx.moveTo(o.x-27,o.y-25); ctx.lineTo(o.x+27,o.y+25); ctx.moveTo(o.x+27,o.y-25); ctx.lineTo(o.x-27,o.y+25); ctx.stroke();
    }else if(o.type==="npc"){
      ctx.fillStyle="#7cc7ff"; ctx.beginPath(); ctx.arc(o.x,o.y-18,14,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#304b72"; ctx.fillRect(o.x-16,o.y-4,32,44);
    }else if(o.type==="reading"){
      ctx.fillStyle="#d9d2b6"; ctx.fillRect(o.x-25,o.y-30,50,60);
      ctx.fillStyle="#586174"; for(let i=0;i<4;i++) ctx.fillRect(o.x-17,o.y-18+i*11,34,3);
    }else{
      ctx.fillStyle="#182b43"; ctx.fillRect(o.x-28,o.y-36,56,72);
      ctx.strokeStyle="#7cc7ff"; ctx.lineWidth=3; ctx.strokeRect(o.x-28,o.y-36,56,72);
      ctx.fillStyle="#7cc7ff"; ctx.fillRect(o.x-17,o.y-23,34,20);
    }
    ctx.globalAlpha=1;
    ctx.textAlign="center"; ctx.font="bold 13px "+FONT_UI; ctx.fillStyle="#fff";
    ctx.fillStyle=o.required&&!o.done?"#ffe066":"#fff";
    ctx.fillText(o.done?(language==="en"?"Checked":"已互动"):o.label,o.x,o.y+58);
    if(!o.done && dist(player.x,player.y,o.x,o.y)<72){
      ctx.fillStyle="#ffe066"; ctx.font="bold 16px "+FONT_UI;
      ctx.fillText(o.type==="crate"?(language==="en"?"ATTACK":"攻击破坏"):(language==="en"?"F  INTERACT":"F  互动"),o.x,o.y-52);
    }
    ctx.restore();
  }
}

function drawBattleAreaExits(){
  if(!supportsStageExploration()) return;
  ctx.save();
  ctx.fillStyle="#ffe066";
  ctx.fillStyle="#fff"; ctx.font="bold 19px "+FONT_UI;
  if(battleSideArea){
    ctx.fillStyle="#7cc7ff";
    if(battleSideArea==="upper") ctx.fillRect(W/2-120,H-28,240,12);
    else ctx.fillRect(W/2-120,104,240,12);
    ctx.fillStyle="#fff"; ctx.textAlign="center";
    const returnText=language==="en"?"RETURN TO MAIN AREA":"返回主区域";
    ctx.fillText(returnText+(battleSideArea==="upper"?" ↓":" ↑"),W/2,battleSideArea==="upper"?H-42:142);
  }else if(areaCleared){
    ctx.fillStyle="#ffe066";
    if(area<battleAreaLimit()) ctx.fillRect(W-42,110,22,H-160);
    ctx.fillRect(W/2-120,104,240,12);
    ctx.fillRect(W/2-120,H-28,240,12);
    ctx.fillStyle="#fff";
    if(area<battleAreaLimit()){
      const nextText=battleModeSource==="commission"?(language==="en"?"NEXT WAVE →":"下一波 →"):(language==="en"?"NEXT AREA →":"下一区域 →");
      ctx.textAlign="right"; ctx.fillText(nextText,W-58,H/2);
    }
    ctx.textAlign="center"; ctx.fillText((language==="en"?"SIDE AREA":"支线区域")+" ↑",W/2,142);
    ctx.fillText((language==="en"?"SIDE AREA":"支线区域")+" ↓",W/2,H-42);
  }
  ctx.restore();
}

function drawBattleRewardNotices(){
  if(!battleRewardNotices.length) return;
  ctx.save();
  ctx.textAlign="left";
  let y=170;
  for(const n of battleRewardNotices){
    const alpha=clamp(n.timer/25,0,1);
    ctx.globalAlpha=alpha;
    ctx.fillStyle="rgba(5,8,16,.78)"; ctx.fillRect(20,y-25,245,34);
    ctx.strokeStyle=n.color; ctx.strokeRect(20,y-25,245,34);
    ctx.fillStyle=n.color; ctx.font="bold 17px "+FONT_UI; ctx.fillText(n.text,34,y-2);
    y+=42;
  }
  ctx.restore();
}

function drawBattle(){ const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake*.7; ctx.save();ctx.translate(sx,sy); const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#15172a");bg.addColorStop(1,"#090a10");ctx.fillStyle=bg;ctx.fillRect(-50,-50,W+100,H+100); drawBattleBackground();
  drawGrid(); drawProjectAreaObjects(); drawBattleExploreObjects(); drawEffects(); const objs=enemies.filter(e=>e.alive).map(e=>({t:"e",y:e.y,e})); objs.push({t:"p",y:player.y}); objs.sort((a,b)=>a.y-b.y); for(const o of objs)o.t==="e"?drawEnemy(o.e):drawPlayer(); drawBattleAreaExits(); if(areaCleared&&area<battleAreaLimit()&&!supportsStageExploration()){ctx.fillStyle="#ffe066";ctx.fillRect(W-42,110,22,H-160);ctx.fillStyle="#fff";ctx.font="bold 22px " + FONT_UI;ctx.textAlign="right";ctx.fillText(battleModeSource==="commission"?(language==="en"?"NEXT WAVE →":"下一波 →"):(language==="en"?"NEXT AREA →":"下一区域 →"),W-58,H/2);} if(flash>0){ctx.globalAlpha=flash/35;ctx.fillStyle="#fff";ctx.fillRect(-50,-50,W+100,H+100);ctx.globalAlpha=1;} ctx.restore(); drawUltimateOverlay(); drawKrosPhaseTransitionOverlay(); drawBossKrosTopBar(); drawCrystalColossusTopBar(); drawBattleUI(); drawBattleRewardNotices(); if(centerTimer>0){ctx.fillStyle="#fff";ctx.font="bold 46px " + FONT_UI;ctx.textAlign="center";ctx.fillText(centerText,W/2,H*.43);}
  if(actionPromptTimer>0){
    ctx.save();
    ctx.fillStyle="#ffe066";
    ctx.font="bold 28px " + FONT_UI;
    ctx.textAlign="center";
    ctx.shadowBlur=18;
    ctx.shadowColor="#ffe066";
    ctx.fillText(actionPrompt,W/2,H*.58);
    ctx.restore();
  }
  drawBattlePauseButton();
  drawBattlePauseMenu();
}

function bootEaseInOut(x){
  x = clamp(x, 0, 1);
  return x < .5 ? 2*x*x : 1 - Math.pow(-2*x+2,2)/2;
}

function drawGlitchText(text, x, y, size, mainColor="#ffffff"){
  const glitch = Math.floor(performance.now()/55) % 7 === 0;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold " + size + "px " + FONT_UI;
  if(glitch){
    ctx.globalAlpha=.75;
    ctx.fillStyle="#7cc7ff";
    ctx.fillText(text, x-5, y+2);
    ctx.fillStyle="#ff4d7a";
    ctx.fillText(text, x+5, y-2);
    ctx.globalAlpha=1;
  }
  ctx.fillStyle=mainColor;
  ctx.fillText(text, x, y);
  if(glitch){
    ctx.globalAlpha=.35;
    ctx.fillStyle="#ffffff";
    for(let i=0;i<5;i++){
      const yy = y - 55 + Math.random()*95;
      ctx.fillRect(x-210+Math.random()*60, yy, 420*Math.random(), 2);
    }
  }
  ctx.restore();
}


function playBootGlitchSfx(){
  if(audioMuted) return;
  unlockAudio();
  if(!audioCtx) return;
  try{
    const now = audioCtx.currentTime;

    // short digital noise burst
    const n = Math.floor(audioCtx.sampleRate * 0.16);
    const buffer = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<n;i++){
      const fade = 1 - i/n;
      data[i] = (Math.random()*2-1) * fade;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const ng = audioCtx.createGain();
    ng.gain.setValueAtTime(effectiveSfxGain(0.055), now);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    src.connect(ng);
    ng.connect(audioCtx.destination);
    src.start(now);

    // quick falling electronic tone
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
    g.gain.setValueAtTime(effectiveSfxGain(0.045), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }catch(e){}
}

function drawBootSequence(){
  const t = (performance.now() - bootStartTime) / 1000;
  ctx.fillStyle = "#000";
  ctx.fillRect(0,0,W,H);

  // subtle noise
  ctx.save();
  ctx.globalAlpha = .05;
  ctx.fillStyle = "#ffffff";
  for(let i=0;i<80;i++){
    ctx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
  }
  ctx.restore();

  ctx.textAlign = "center";

  // 0 - 4s: studio logo fade in / hold / fade out
  if(t < 4){
    let a = 0;
    if(t < 1.7) a = bootEaseInOut(t/1.7);
    else if(t < 2.8) a = 1;
    else a = 1 - bootEaseInOut((t-2.8)/1.2);

    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "#ffffff";
    ctx.font = "34px " + FONT_UI;
    ctx.letterSpacing = "2px";
    ctx.fillText("SALT FISH STUDIO", W/2, H/2);
    ctx.restore();
    return;
  }

  // 4 - 8s: warning
  if(t < 8){
    const a = t < 4.7 ? bootEaseInOut((t-4)/.7) : (t > 7.35 ? 1-bootEaseInOut((t-7.35)/.65) : 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px " + FONT_UI;
    ctx.fillText("WARNING", W/2, H/2-92);
    ctx.font = "18px " + FONT_UI;
    ctx.fillStyle = "rgba(255,255,255,.82)";
    ctx.fillText("This game contains flashing lights and visual effects.", W/2, H/2-25);
    ctx.fillText("Player discretion is advised.", W/2, H/2+12);
    ctx.font = "13px " + FONT_UI;
    ctx.fillStyle = "rgba(255,255,255,.38)";
    // V40.1: warning skip hint hidden
    ctx.restore();
    return;
  }

  // 8 - 12s: Project Zero logo with light glitch
  if(t < 12){
    if(!bootGlitchPlayed && t > 8.15){
      bootGlitchPlayed = true;
      playBootGlitchSfx();
    }
    const a = t < 8.8 ? bootEaseInOut((t-8)/.8) : 1;
    ctx.save();
    ctx.globalAlpha = a;
    drawGlitchText("PROJECT ZERO", W/2, H/2-10, 64, "#ffffff");
    ctx.font = "14px " + FONT_UI;
    ctx.fillStyle = "rgba(124,199,255,.72)";
    ctx.fillText("ANOMALY RESPONSE SYSTEM", W/2, H/2+34);
    const pulse = .45 + .35 * Math.sin(performance.now()/380);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = "rgba(255,255,255,.72)";
    ctx.font = "18px " + FONT_UI;
    ctx.fillText(tr("点击开始","Tap To Start"), W/2, H/2+118);
    ctx.restore();
    bootSkipReady = true;
    return;
  }

  gameMode = bootNextMode || "login";
  if(gameMode === "login" && audioUnlocked) requestLoginBgmPlay();
}




function projectAreaMapList(){
  return [
    {key:"project_area", name:"Project Area", recLv:20, unlocked:true, desc:language==="en"?"Initial abnormal exploration sector.":"初始异常探索区域。"},
    {key:"industrial_zone", name:"Industrial Zone", recLv:30, unlocked:!!projectAreaCleared, desc:language==="en"?"Complete Project Area once to unlock.":"完成 Project Area 一次后开放。"},
    {key:"old_laboratory", name:"Old Laboratory", recLv:40, unlocked:!!projectAreaCleared, desc:language==="en"?"Research-sector placeholder for later expansion.":"研究区域占位，后续扩展。"}
  ];
}
function currentProjectAreaMap(){
  const list=projectAreaMapList();
  projectAreaMapIndex=clamp(projectAreaMapIndex,0,list.length-1);
  return list[projectAreaMapIndex];
}

function drawProjectAreaDetail(){
  const m=currentProjectAreaMap();
  ctx.fillStyle="#fff";
  ctx.font="bold 26px " + FONT_UI;
  ctx.textAlign="left";
  ctx.fillText("Project Area",95,190);
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="14px " + FONT_UI;
  ctx.fillText(language==="en"?"Exploration only / no battle":"纯探索 / 不进入战斗",97,214);
  drawBtn(language==="en"?"Back":"返回","",930,165,90,36,false,"#fff");

  ctx.fillStyle=m.unlocked?"rgba(124,255,178,.10)":"rgba(255,255,255,.045)";
  ctx.fillRect(95,245,390,250);
  ctx.strokeStyle=m.unlocked?"rgba(124,255,178,.60)":"rgba(255,255,255,.18)";
  ctx.lineWidth=2;
  ctx.strokeRect(95,245,390,250);

  drawBtn("<","",108,260,42,38,true,"#fff");
  drawBtn(">","",424,260,42,38,true,"#fff");

  ctx.fillStyle=m.unlocked?"#7cffb2":"rgba(255,255,255,.45)";
  ctx.font="bold 28px " + FONT_UI;
  ctx.textAlign="center";
  ctx.fillText(m.name,290,292);
  ctx.fillStyle="rgba(255,255,255,.55)";
  ctx.font="12px " + FONT_UI;
  ctx.fillText((projectAreaMapIndex+1)+" / "+projectAreaMapList().length,290,318);
  ctx.textAlign="left";

  ctx.fillStyle="rgba(255,255,255,.74)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText((language==="en"?"Recommended Lv.":"推荐等级 Lv.")+m.recLv,120,330);
  ctx.fillText(language==="en"?"Mode: Exploration":"模式：探索",120,360);
  ctx.fillText(language==="en"?"No enemies / no battle system":"无敌人 / 不使用战斗系统",120,390);
  ctx.fillText(projectAreaCleared ? (language==="en"?"Cleared: replay has no rewards.":"已完成：重复游玩无奖励。") : (language==="en"?"First clear gives rewards.":"首次完成可获得奖励。"),120,420);
  ctx.fillStyle=m.unlocked?"rgba(255,255,255,.62)":"#ff6b9b";
  ctx.font="13px " + FONT_UI;
  ctx.fillText(m.desc,120,454);

  ctx.fillStyle="rgba(255,255,255,.05)";
  ctx.fillRect(520,245,485,250);
  ctx.strokeStyle="rgba(255,255,255,.13)";
  ctx.strokeRect(520,245,485,250);
  ctx.fillStyle="#ffe066";
  ctx.font="bold 18px " + FONT_UI;
  ctx.fillText(language==="en"?"Controls":"操作",545,282);
  ctx.fillStyle="rgba(255,255,255,.78)";
  ctx.font="15px " + FONT_UI;
  ctx.fillText("WASD / Arrow Keys",545,318);
  ctx.fillText(language==="en"?"F: interact":"F：互动",545,348);
  ctx.fillText("ESC: "+(language==="en"?"return":"返回"),545,378);

  drawBtn(m.unlocked ? (language==="en"?"Start Exploration":"开始探索") : (language==="en"?"Locked":"未开放"),"",805,445,185,48,m.unlocked,"#7cffb2");
}


function drawProjectAreaSettlement(){
  const r = settlement && settlement.projectAreaReward ? settlement.projectAreaReward : {gold:0,expReward:0,expBooks:0,weaponOre:0,crystal:0,chests:0,crates:0,terminals:0,areasCleared:0};
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#0b1f18"); bg.addColorStop(.58,"#080a12"); bg.addColorStop(1,"#05060b");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(0,0,0,.50)"; ctx.fillRect(W/2-330,88,660,500);
  ctx.strokeStyle="rgba(124,255,178,.75)"; ctx.strokeRect(W/2-330,88,660,500);
  ctx.textAlign="center";
  ctx.fillStyle="#7cffb2"; ctx.font="bold 40px "+FONT_UI; ctx.fillText("Project Area",W/2,150);
  ctx.fillStyle="#fff"; ctx.font="bold 25px "+FONT_UI; ctx.fillText(language==="en"?"Exploration Complete":"探索完成",W/2,198);
  ctx.fillStyle="#ffe066"; ctx.font="bold 48px "+FONT_UI; ctx.fillText("AREA "+r.areasCleared+"/3",W/2,265);
  ctx.textAlign="left"; ctx.font="bold 18px "+FONT_UI;
  let y=330;
  ctx.fillStyle="rgba(255,255,255,.80)";
  ctx.fillText("Chests "+r.chests+"   Crates "+r.crates+"   Terminals "+r.terminals+"   Files "+(r.files||0),W/2-225,y); y+=42;
  ctx.fillStyle="#ffe066"; ctx.fillText((language==="en"?"Gold +":"金币 +")+r.gold,W/2-225,y); y+=32;
  ctx.fillStyle="#ffffff"; ctx.fillText("EXP +"+r.expReward,W/2-225,y); y+=32;
  ctx.fillStyle="#7cffb2"; ctx.fillText((language==="en"?"EXP Books +":"经验书 +")+r.expBooks,W/2-225,y); y+=32;
  ctx.fillStyle="#7cc7ff"; ctx.fillText((language==="en"?"Weapon Ore +":"武器矿石 +")+r.weaponOre,W/2-225,y); y+=32;
  ctx.fillStyle="#c35cff"; ctx.fillText(r.repeat ? (language==="en"?"Replay complete · No reward":"重复完成 · 无奖励") : ((language==="en"?"Crystal +":"水晶 +")+r.crystal),W/2-225,y);
  drawBtn(language==="en"?"Back to Dungeon":"返回副本","CLICK",W/2-125,520,250,52,true,"#fff");
}


function paMakeObject(type,x,y,w,h,label,reward={},text=''){
  return {type,x,y,w,h,label,reward,text,done:false,solid:true};
}
function paMakeBlock(type,x,y,w,h){
  return {type,x,y,w,h,solid:true};
}
function paRect(e){ return {x:e.x-e.w/2,y:e.y-e.h/2,w:e.w,h:e.h}; }
function paCircleRectHit(cx,cy,r,e){
  const rect=paRect(e);
  const px=clamp(cx,rect.x,rect.x+rect.w);
  const py=clamp(cy,rect.y,rect.y+rect.h);
  return dist(cx,cy,px,py) < r;
}
function paNearObject(o,range=70){
  const rect=paRect(o);
  const px=clamp(paState.player.x,rect.x,rect.x+rect.w);
  const py=clamp(paState.player.y,rect.y,rect.y+rect.h);
  return dist(paState.player.x,paState.player.y,px,py) <= range;
}

function paBaseAreaData(areaId){
  const already = !!projectAreaCleared;
  const z = already ? {} : null;
  if(areaId===1){
    return {
      spawn:{x:115,y:H/2+105},
      exit:{x:1045,y:H/2+105,w:38,h:150},
      blocks:[
        paMakeBlock("wall",260,175,230,46),
        paMakeBlock("machine",510,315,150,95),
        paMakeBlock("pipe",295,530,260,32),
        paMakeBlock("machine",765,455,180,90),
        paMakeBlock("wall",850,180,240,46)
      ],
      objects:[
        paMakeObject("chest",180,245,110,70,language==="en"?"Supply Chest":"补给箱",already?{}:{gold:900,expBooks:1}),
        paMakeObject("crate",435,520,90,90,language==="en"?"Crate":"木箱",already?{}:{gold:300}),
        paMakeObject("terminal",930,245,95,110,language==="en"?"Broken Terminal":"损坏终端",already?{}:{weaponOre:1},language==="en"?"The terminal shows repeated entries: Project Area remains unstable.":"终端显示重复记录：Project Area 仍不稳定。"),
        paMakeObject("file",620,520,84,62,language==="en"?"Old File":"旧文件",already?{}:{expReward:80},language==="en"?"A damaged report mentions an evacuation order that was never completed.":"一份损坏报告提到未完成的撤离命令。"),
        paMakeObject("resource",760,220,70,70,language==="en"?"Glowing Resource":"发光资源",already?{}:{weaponOre:1})
      ]
    };
  }
  if(areaId===2){
    return {
      spawn:{x:115,y:H/2+105},
      exit:{x:1045,y:H/2+105,w:38,h:150},
      blocks:[
        paMakeBlock("wall",250,165,220,44),
        paMakeBlock("machine",250,430,160,105),
        paMakeBlock("machine",595,290,180,90),
        paMakeBlock("pipe",600,535,280,32),
        paMakeBlock("wall",850,165,260,44)
      ],
      objects:[
        paMakeObject("chest",165,520,110,70,language==="en"?"Hidden Chest":"隐藏宝箱",already?{}:{gold:1100,weaponOre:1}),
        paMakeObject("crate",410,235,90,90,language==="en"?"Energy Crate":"能源箱",already?{}:{expBooks:1}),
        paMakeObject("terminal",940,245,95,110,language==="en"?"Area Log":"区域记录",already?{}:{gold:500},language==="en"?"A log says the same hallway appears in different places.":"记录显示，同一条走廊会出现在不同位置。"),
        paMakeObject("switch",640,500,82,82,language==="en"?"Control Switch":"控制开关",already?{}:{expReward:120},language==="en"?"The switch restores power to an abandoned sensor.":"开关恢复了一处废弃传感器的供电。"),
        paMakeObject("file",805,350,84,62,language==="en"?"Research Note":"研究笔记",already?{}:{expBooks:1},language==="en"?"The note describes a dream-like spatial fold.":"笔记描述了一种类似白日梦的空间折叠。"),
        Object.assign(paMakeObject("pushbox",500,430,64,64,language==="en"?"Power Crate":"动力箱",already?{}:{gold:700,expReward:100},language==="en"?"The crate powers the route gate.":"动力箱接通了路线门的供能。"),{required:true,targetX:760,targetY:430}),
        Object.assign(paMakeObject("pushTarget",760,430,88,88,language==="en"?"Power Pad":"供能踏板",{},""),{solid:false})
      ]
    };
  }
  return {
    spawn:{x:115,y:H/2+105},
    exit:{x:1045,y:H/2+105,w:38,h:150},
    blocks:[
      paMakeBlock("wall",280,165,280,48),
      paMakeBlock("machine",310,355,180,120),
      paMakeBlock("machine",650,315,190,105),
      paMakeBlock("pipe",340,535,300,32),
      paMakeBlock("machine",870,470,150,95)
    ],
    objects:[
      paMakeObject("chest",185,245,110,70,language==="en"?"Final Chest":"终点宝箱",already?{}:{gold:1500,weaponOre:2}),
      paMakeObject("crate",455,520,90,90,language==="en"?"Crate":"木箱",already?{}:{gold:400}),
      paMakeObject("terminal",940,245,95,110,language==="en"?"Project Record":"Project记录",already?{}:{expBooks:2},language==="en"?"Final record: the area rejects stable observation.":"最终记录：该区域拒绝稳定观测。"),
      paMakeObject("resource",690,500,70,70,language==="en"?"Anomaly Crystal":"异常结晶",already?{}:{weaponOre:2}),
      paMakeObject("switch",535,225,82,82,language==="en"?"Exit Control":"出口控制",already?{}:{expReward:180},language==="en"?"A low-frequency pulse opens the last gate.":"低频脉冲打开了最后的门。")
    ]
  };
}

function paAreaData(areaId,route="center"){
  const data=paBaseAreaData(areaId);
  const already=!!projectAreaCleared;
  const routeNames={
    upper:language==="en"?"Archive Route":"档案路线",
    center:language==="en"?"Main Route":"主路线",
    lower:language==="en"?"Supply Route":"补给路线"
  };
  const routeY={upper:185,center:H/2+105,lower:H-115};
  data.spawn={x:115,y:routeY[route]||routeY.center};
  const requiredReward=already?{}:(route==="upper"?{expReward:100,expBooks:1}:route==="lower"?{gold:650,weaponOre:1}:{expReward:130,gold:300});
  if(route==="upper"){
    data.objects.push(Object.assign(paMakeObject("npc",735,185,64,84,language==="en"?"Lost Surveyor":"迷路的调查员",requiredReward,language==="en"?"The surveyor marks a safe passage through the archive corridor.":"调查员在档案走廊中标记出一条安全通路。"),{required:true}));
    data.blocks.push(paMakeBlock("wall",480,235,250,34));
  }else if(route==="lower"){
    data.objects.push(Object.assign(paMakeObject("resource",730,H-120,72,72,language==="en"?"Route Beacon":"路线信标",requiredReward,language==="en"?"The supply beacon reveals a stable lower passage.":"补给信标显示下层通路已经稳定。"),{required:true}));
    data.blocks.push(paMakeBlock("pipe",505,H-165,250,30));
  }else{
    const controlX=areaId===2?875:735,controlY=areaId===2?520:H/2+105;
    data.objects.push(Object.assign(paMakeObject("switch",controlX,controlY,78,78,language==="en"?"Route Control":"路线控制器",requiredReward,language==="en"?"The control array aligns the central corridor.":"控制阵列重新校准了中央走廊。"),{required:true}));
  }
  data.route=route;
  data.routeName=routeNames[route]||routeNames.center;
  if(areaId<3){
    data.exits=[
      {x:1045,y:185,w:38,h:94,route:"upper",label:routeNames.upper,color:"#7cc7ff"},
      {x:1045,y:H/2+105,w:38,h:94,route:"center",label:routeNames.center,color:"#7cffb2"},
      {x:1045,y:H-115,w:38,h:94,route:"lower",label:routeNames.lower,color:"#ffe066"}
    ];
  }else data.exits=[{x:1045,y:H/2+105,w:38,h:150,route:"finish",label:language==="en"?"Extraction":"撤离点",color:"#c35cff"}];
  return data;
}

function paLoadArea(areaId,route="center"){
  const data=paAreaData(areaId,route);
  paState.area=areaId;
  paState.route=route;
  paState.routeName=data.routeName;
  paState.blocks=data.blocks;
  paState.objects=data.objects;
  paState.exits=data.exits;
  paState.exit=data.exits[0]||null;
  if(areaId>1) paState.routeHistory.push(route);
  paState.player.x=data.spawn.x;
  paState.player.y=data.spawn.y;
  paState.player.vx=0;
  paState.player.vy=0;
  showCenter("Project Area / Area "+areaId+" · "+data.routeName,70);
  showActionPrompt(language==="en"?"Complete the route objective, then choose an exit.":"完成路线目标，然后自行选择出口。",110);
}
function startProjectAreaTeam(){
  const map=currentProjectAreaMap();
  if(!map.unlocked){ showCenter(language==="en"?"Map locked":"地图未开放",70); return; }
  paState = {
    area:1,
    maxArea:3,
    player:{x:120,y:H/2+105,vx:0,vy:0,r:20},
    blocks:[],
    objects:[],
    exit:null,
    exits:[], route:"center", routeName:"", routeHistory:[],
    rewards:{gold:0,expBooks:0,weaponOre:0,expReward:0,crystal:0,chests:0,crates:0,terminals:0,files:0,resources:0,switches:0,npcs:0,areasCleared:0},
    repeat:!!projectAreaCleared
  };
  battleModeSource="main";
  projectAreaRun=null;
  projectAreaObjects=[];
  clearTransientBattleState();
  gameMode="projectArea";
  paLoadArea(1);
}
function paSolidList(){
  if(!paState) return [];
  return (paState.blocks||[]).concat((paState.objects||[]).filter(o=>o.solid && !o.done));
}
function paResolveCollision(oldX,oldY){
  const p=paState.player;
  for(const e of paSolidList()){
    if(paCircleRectHit(p.x,p.y,p.r+3,e)){
      p.x=oldX; p.y=oldY; p.vx=0; p.vy=0; return;
    }
  }
}

function paCollectObject(o){
  if(o.done) return;
  o.done=true;
  o.solid=false;
  const r=o.reward||{}, rw=paState.rewards;
  if(o.type==="chest") rw.chests++;
  if(o.type==="crate") rw.crates++;
  if(o.type==="terminal") rw.terminals++;
  if(o.type==="file") rw.files++;
  if(o.type==="resource") rw.resources++;
  if(o.type==="switch") rw.switches++;
  if(o.type==="npc") rw.npcs++;
  if(o.type==="pushbox") rw.switches++;

  if(!paState.repeat){
    rw.gold += r.gold||0;
    rw.expBooks += r.expBooks||0;
    rw.weaponOre += r.weaponOre||0;
    rw.expReward += r.expReward||0;
    if(o.type==="chest") rw.crystal += 10;
  }

  addText(o.x,o.y-50,o.label,"#7cffb2",true);
  addParticles(o.x,o.y,"#7cffb2",14,4);
  sfx((o.type==="terminal"||o.type==="file"||o.type==="switch")?"ui":"reward");

  const got=[];
  if(!paState.repeat){
    if(r.gold) got.push((language==="en"?"Gold ":"金币 ")+r.gold);
    if(r.expBooks) got.push((language==="en"?"EXP Book ":"经验书 ")+r.expBooks);
    if(r.weaponOre) got.push((language==="en"?"Weapon Ore ":"武器矿石 ")+r.weaponOre);
    if(r.expReward) got.push("EXP "+r.expReward);
    if(o.type==="chest") got.push((language==="en"?"Crystal ":"水晶 ")+10);
  }

  if(o.text){
    showActionPrompt(o.text,150);
  }else if(paState.repeat){
    showActionPrompt(language==="en"?"Already cleared. No reward.":"已完成过，本次无奖励。",90);
  }else{
    showActionPrompt((language==="en"?"Obtained: ":"获得：")+(got.length?got.join(" / "):o.label),90);
  }
}

function paTryInteract(){
  if(!paState) return;
  let best=null, bd=9999;
  for(const o of paState.objects){
    if(o.done) continue;
    const rect=paRect(o);
    const px=clamp(paState.player.x,rect.x,rect.x+rect.w);
    const py=clamp(paState.player.y,rect.y,rect.y+rect.h);
    const d=dist(paState.player.x,paState.player.y,px,py);
    if(d<80 && d<bd){best=o;bd=d;}
  }
  if(best && best.type==="pushbox"){
    const dx=best.targetX-best.x,dy=best.targetY-best.y,l=Math.hypot(dx,dy)||1;
    best.x+=dx/l*Math.min(58,l); best.y+=dy/l*Math.min(58,l);
    addParticles(best.x,best.y,"#ffe066",8,3); sfx("ui");
    if(dist(best.x,best.y,best.targetX,best.targetY)<24){best.x=best.targetX;best.y=best.targetY;paCollectObject(best);showActionPrompt(language==="en"?"Power crate connected. Route opened.":"动力箱已接通，路线开启。",100);}
    else showActionPrompt(language==="en"?"Push the crate onto the glowing pad.":"继续将动力箱推到发光踏板上。",70);
  }
  else if(best && best.type!=="pushTarget") paCollectObject(best);
  else showActionPrompt(language==="en"?"No object nearby.":"附近没有可互动目标。",45);
}

function paFinish(){
  const rw=paState.rewards;
  rw.areasCleared=paState.maxArea;
  let reward;
  if(paState.repeat){
    reward={gold:0,expReward:0,expBooks:0,weaponOre:0,crystal:0,chests:rw.chests,crates:rw.crates,terminals:rw.terminals,files:rw.files||0,resources:rw.resources||0,switches:rw.switches||0,areasCleared:rw.areasCleared,repeat:true};
    saveGame(); autoCloudSaveNow && autoCloudSaveNow(false);
  }else{
    reward={
      gold:rw.gold+3200,
      expReward:rw.expReward+650,
      expBooks:rw.expBooks+3,
      weaponOre:rw.weaponOre+2,
      crystal:40+(rw.crystal||0), baseCrystal:40, chestCrystal:rw.crystal||0,
      chests:rw.chests, crates:rw.crates, terminals:rw.terminals, files:rw.files||0, resources:rw.resources||0, switches:rw.switches||0, areasCleared:rw.areasCleared, repeat:false
    };
    gold += reward.gold; totalGoldEarned += reward.gold;
    expBooks += reward.expBooks; weaponOre += reward.weaponOre;
    const chestCrystal=Math.max(0,reward.chestCrystal||0);
    if(chestCrystal){crystals+=chestCrystal;totalCrystalsEarned+=chestCrystal;}
    reward.crystal=grantFreeCrystals(reward.baseCrystal||0)+chestCrystal;
    addPlayerExp(reward.expReward);
    projectAreaCleared=true;
    saveGame(); autoCloudSaveNow && autoCloudSaveNow(false);
  }
  settlement={stage:0,reward:reward.crystal,expReward:reward.expReward,stars:3,mode:"projectArea",projectAreaReward:reward};
  paState=null;
  gameMode="settlement";
}

function updateProjectArea(){
  menuPulse++;
  if(!paState){ startProjectAreaTeam(); return; }
  if(justPressed("escape")){
    selectedTab="dungeon"; dungeonPanelMode="projectArea"; gameMode="operation"; clicked=false; return;
  }
  if(justPressed("f")) paTryInteract();

  let dx=0,dy=0;
  if(keys.w || keys.arrowup) dy-=1;
  if(keys.s || keys.arrowdown) dy+=1;
  if(keys.a || keys.arrowleft) dx-=1;
  if(keys.d || keys.arrowright) dx+=1;
  const p=paState.player;
  const speed=4.7*frameScale;
  if(dx||dy){
    const l=Math.hypot(dx,dy)||1;
    p.vx=(dx/l)*speed; p.vy=(dy/l)*speed;
  }else{
    p.vx=0; p.vy=0;
  }
  const oldX=p.x, oldY=p.y;
  p.x=clamp(p.x+p.vx,45,W-45);
  p.y=clamp(p.y+p.vy,125,H-45);
  paResolveCollision(oldX,oldY);

  for(const ex of (paState.exits||[])){
    if(paCircleRectHit(p.x,p.y,p.r,ex)){
      const pending=paState.objects.some(o=>o.required&&!o.done);
      if(pending){
        showActionPrompt(language==="en"?"Route objective incomplete. Find the marked interaction.":"路线目标尚未完成，请找到标记的互动目标。",65);
        p.x-=34;
        break;
      }
      if(paState.area < paState.maxArea){
        paState.rewards.areasCleared=Math.max(paState.rewards.areasCleared,paState.area);
        paLoadArea(paState.area+1,ex.route);
      }else{
        paFinish();
        return;
      }
      break;
    }
  }

  updateEffects();
  if(centerTimer>0) centerTimer=Math.max(0,centerTimer-frameScale);
  if(actionPromptTimer>0) actionPromptTimer=Math.max(0,actionPromptTimer-frameScale);
  clicked=false;
}
function paDrawRectEntity(e){
  const r=paRect(e);
  if(e.type==="wall"){
    ctx.fillStyle="rgba(82,98,116,.92)";
    ctx.strokeStyle="rgba(210,230,245,.35)";
  }else if(e.type==="machine"){
    ctx.fillStyle="rgba(46,58,68,.96)";
    ctx.strokeStyle="rgba(124,199,255,.28)";
  }else if(e.type==="pipe"){
    ctx.fillStyle="rgba(80,118,128,.88)";
    ctx.strokeStyle="rgba(124,255,178,.28)";
  }else{
    ctx.fillStyle="rgba(130,125,115,.72)";
    ctx.strokeStyle="rgba(255,255,255,.16)";
  }
  ctx.lineWidth=3;
  ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeRect(r.x,r.y,r.w,r.h);
}

function paDrawObject(o){
  const r=paRect(o);
  ctx.save();
  ctx.globalAlpha=o.done?.26:1;
  if(o.type==="chest"){
    ctx.shadowBlur=o.done?0:22; ctx.shadowColor="#ffe066";
    ctx.fillStyle="#ffe066"; ctx.strokeStyle="#fff";
    ctx.fillRect(r.x,r.y,r.w,r.h); ctx.lineWidth=4; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle="rgba(0,0,0,.35)"; ctx.fillRect(r.x,r.y+r.h*.42,r.w,10);
    ctx.fillStyle="#111"; ctx.font="bold 18px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"OPEN":"CHEST",o.x,o.y+7);
  }else if(o.type==="crate"){
    ctx.shadowBlur=o.done?0:18; ctx.shadowColor="#b78750";
    ctx.fillStyle="#b78750"; ctx.strokeStyle="#fff";
    ctx.fillRect(r.x,r.y,r.w,r.h); ctx.lineWidth=4; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.beginPath(); ctx.moveTo(r.x,r.y); ctx.lineTo(r.x+r.w,r.y+r.h); ctx.moveTo(r.x+r.w,r.y); ctx.lineTo(r.x,r.y+r.h); ctx.stroke();
    ctx.fillStyle="#111"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"DONE":"CRATE",o.x,o.y+6);
  }else if(o.type==="terminal"){
    ctx.shadowBlur=o.done?0:22; ctx.shadowColor="#7cc7ff";
    ctx.fillStyle="#7cc7ff"; ctx.strokeStyle="#fff";
    ctx.fillRect(r.x,r.y,r.w,r.h); ctx.lineWidth=4; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle="rgba(0,0,0,.55)"; ctx.fillRect(r.x+15,r.y+16,r.w-30,32);
    ctx.fillStyle="#7cffb2"; ctx.font="bold 22px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"✓":"F",o.x,r.y+40);
    ctx.fillStyle="#111"; ctx.font="bold 14px "+FONT_UI; ctx.fillText(o.done?"DONE":"TERMINAL",o.x,r.y+76);
  }else if(o.type==="file"){
    ctx.shadowBlur=o.done?0:16; ctx.shadowColor="#ffffff";
    ctx.fillStyle="#e8edf2"; ctx.strokeStyle="#ffffff";
    ctx.fillRect(r.x,r.y,r.w,r.h); ctx.lineWidth=3; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle="#1b2630"; ctx.font="bold 14px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"READ":"FILE",o.x,o.y+5);
  }else if(o.type==="resource"){
    ctx.shadowBlur=o.done?0:24; ctx.shadowColor="#c35cff";
    ctx.fillStyle="#c35cff"; ctx.strokeStyle="#fff";
    ctx.beginPath(); ctx.arc(o.x,o.y,o.w/2,0,Math.PI*2); ctx.fill(); ctx.lineWidth=4; ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"✓":"ORE",o.x,o.y+5);
  }else if(o.type==="switch"){
    ctx.shadowBlur=o.done?0:20; ctx.shadowColor="#7cffb2";
    ctx.fillStyle="#7cffb2"; ctx.strokeStyle="#fff";
    ctx.fillRect(r.x,r.y,r.w,r.h); ctx.lineWidth=4; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle="#102018"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(o.done?"ON":"SWITCH",o.x,o.y+5);
  }else if(o.type==="npc"){
    ctx.shadowBlur=o.done?0:18; ctx.shadowColor="#7cc7ff";
    ctx.fillStyle="#eaf6ff"; ctx.beginPath(); ctx.arc(o.x,o.y-20,17,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#7cc7ff"; ctx.fillRect(o.x-19,o.y,38,42);
    ctx.strokeStyle="#fff"; ctx.lineWidth=3; ctx.strokeRect(o.x-19,o.y,38,42);
  }else if(o.type==="pushTarget"){
    ctx.shadowBlur=18;ctx.shadowColor="#ffe066";ctx.fillStyle="rgba(255,224,102,.16)";ctx.strokeStyle="#ffe066";ctx.lineWidth=4;
    ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle="#ffe066";ctx.font="bold 13px "+FONT_UI;ctx.textAlign="center";ctx.fillText(language==="en"?"POWER PAD":"供能踏板",o.x,o.y+5);
  }else if(o.type==="pushbox"){
    ctx.shadowBlur=o.done?0:18;ctx.shadowColor="#ffe066";ctx.fillStyle=o.done?"#59705d":"#9b7448";ctx.strokeStyle="#ffe066";ctx.lineWidth=4;
    ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.beginPath();ctx.moveTo(r.x,r.y);ctx.lineTo(r.x+r.w,r.y+r.h);ctx.moveTo(r.x+r.w,r.y);ctx.lineTo(r.x,r.y+r.h);ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="bold 13px "+FONT_UI;ctx.textAlign="center";ctx.fillText(o.done?"POWER ON":(language==="en"?"PUSH":"推动"),o.x,o.y+5);
  }
  if(!o.done && paNearObject(o,85)){
    ctx.shadowBlur=0; ctx.fillStyle="#fff"; ctx.font="bold 15px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(language==="en"?"Press F":"按 F",o.x,r.y-12);
  }
  ctx.restore();
}

function drawProjectArea(){
  if(!paState){ return; }
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,"#071016"); bg.addColorStop(.55,"#0a111b"); bg.addColorStop(1,"#04060b");
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  ctx.fillStyle="rgba(3,10,13,.72)";
  ctx.fillRect(35,95,W-70,H-130);
  ctx.strokeStyle="rgba(124,255,178,.22)";
  ctx.lineWidth=3; ctx.strokeRect(35,95,W-70,H-130);

  ctx.strokeStyle="rgba(124,199,255,.08)";
  ctx.lineWidth=1;
  for(let x=70;x<W-70;x+=64){ ctx.beginPath(); ctx.moveTo(x,118); ctx.lineTo(x,H-38); ctx.stroke(); }
  for(let y=125;y<H-35;y+=54){ ctx.beginPath(); ctx.moveTo(55,y); ctx.lineTo(W-55,y); ctx.stroke(); }

  for(const b of paState.blocks) paDrawRectEntity(b);
  for(const o of paState.objects) paDrawObject(o);

  for(const exit of (paState.exits||[])){
    const ex=paRect(exit), pending=paState.objects.some(o=>o.required&&!o.done);
    ctx.fillStyle=pending?"rgba(255,255,255,.07)":exit.color+"33";
    ctx.strokeStyle=pending?"rgba(255,255,255,.26)":exit.color; ctx.lineWidth=3;
    ctx.fillRect(ex.x,ex.y,ex.w,ex.h); ctx.strokeRect(ex.x,ex.y,ex.w,ex.h);
    ctx.fillStyle=pending?"rgba(255,255,255,.4)":exit.color; ctx.font="bold 20px "+FONT_UI; ctx.textAlign="right";
    ctx.fillText(exit.label+"  →",ex.x-12,exit.y+7);
  }

  const p=paState.player;
  ctx.save();
  ctx.shadowBlur=18; ctx.shadowColor="#7cffb2";
  ctx.fillStyle="#ffffff"; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#7cffb2"; ctx.lineWidth=3; ctx.stroke();
  ctx.restore();

  drawEffects();

  ctx.fillStyle="rgba(0,0,0,.55)";
  ctx.fillRect(42,36,440,48);
  ctx.strokeStyle="rgba(124,255,178,.24)";
  ctx.strokeRect(42,36,440,48);
  ctx.fillStyle="#fff"; ctx.font="bold 22px "+FONT_UI; ctx.textAlign="left";
  ctx.fillText("Project Area  /  "+paState.area+" / "+paState.maxArea+"  ·  "+paState.routeName+(paState.repeat ? "  /  CLEARED" : ""),60,67);

  const rw=paState.rewards;
  ctx.fillStyle="rgba(255,255,255,.58)";
  ctx.font="13px "+FONT_UI;
  const requiredDone=!paState.objects.some(o=>o.required&&!o.done);
  ctx.fillText((language==="en"?"Objective ":"路线目标 ")+(requiredDone?"✓":"…")+"   Chest "+rw.chests+"  File "+(rw.files||0)+"  NPC "+(rw.npcs||0),520,67);

  if(centerTimer>0){ ctx.fillStyle="#fff"; ctx.font="bold 42px "+FONT_UI; ctx.textAlign="center"; ctx.fillText(centerText,W/2,H*.36); }
  if(actionPromptTimer>0){
    ctx.save(); ctx.fillStyle="#ffe066"; ctx.font="bold 24px "+FONT_UI; ctx.textAlign="center"; ctx.shadowBlur=15; ctx.shadowColor="#ffe066"; ctx.fillText(actionPrompt,W/2,H*.82); ctx.restore();
  }
}


// External module bridge for game_patrol.js
Object.defineProperties(window, {
  ctx:{get:()=>ctx},
  W:{get:()=>W},
  H:{get:()=>H},
  FONT_UI:{get:()=>FONT_UI},
  language:{get:()=>language},
  projectAreaCleared:{get:()=>projectAreaCleared},
  dungeonPanelMode:{get:()=>dungeonPanelMode,set:v=>{dungeonPanelMode=v;}},
  clicked:{get:()=>clicked,set:v=>{clicked=v;}},
  mouseX:{get:()=>mouseX},
  mouseY:{get:()=>mouseY},
  gold:{get:()=>gold,set:v=>{gold=v;}},
  totalGoldEarned:{get:()=>totalGoldEarned,set:v=>{totalGoldEarned=v;}},
  expBooks:{get:()=>expBooks,set:v=>{expBooks=v;}},
  weaponOre:{get:()=>weaponOre,set:v=>{weaponOre=v;}},
  crystals:{get:()=>crystals,set:v=>{crystals=v;}},
  totalCrystalsEarned:{get:()=>totalCrystalsEarned,set:v=>{totalCrystalsEarned=v;}},
  owned:{get:()=>owned},
  roles:{get:()=>roles},
  playerLevel:{get:()=>playerLevel},
  dungeonStamina:{get:()=>dungeonStamina,set:v=>{dungeonStamina=v;}},
  dungeonCandyDailyUsed:{get:()=>dungeonCandyDailyUsed},
  dungeonCandyDailyKey:{get:()=>dungeonCandyDailyKey}
});
window.drawBtn = drawBtn;
window.uiPanel = uiPanel;
window.uiCard = uiCard;
window.uiSectionTitle = uiSectionTitle;
window.inRect = inRect;
window.showCenter = showCenter;
window.saveGame = saveGame;
window.safeSaveGame = safeSaveGame;
window.addPlayerExp = addPlayerExp;
window.autoCloudSaveNow = autoCloudSaveNow;
window.executorOrder = typeof executorOrder==="function" ? executorOrder : null;
window.roleDisplayLevel = typeof roleDisplayLevel==="function" ? roleDisplayLevel : null;
window.normalizeDungeonRuntime = normalizeDungeonRuntime;
window.openStaminaRecover = openStaminaRecover;
window.roleName = typeof roleName==="function" ? roleName : null;
window.PZMatch3Host = {
  get ctx(){ return ctx; }, get W(){ return W; }, get H(){ return H; }, get FONT_UI(){ return FONT_UI; },
  get language(){ return language; }, get gameMode(){ return gameMode; }, set gameMode(v){ gameMode=v; }, get eventTab(){return eventTab;}, set eventTab(v){eventTab=v;},
  get clicked(){ return clicked; }, set clicked(v){ clicked=v; }, get mouseX(){ return mouseX; }, get mouseY(){ return mouseY; },
  justPressed, inRect, drawBtn, wrapText, sfx, saveGame, safeSaveGame
};

function commercialModeLabel(mode){
  const labels={
    login:["登录","LOGIN"],nameInput:["建立档案","CREATE PROFILE"],lobby:["事务大厅","LOBBY"],operation:["作战","OPERATION"],
    operators:["执行官","OPERATORS"],shop:["商店","SHOP"],mail:["邮件","MAIL"],profile:["个人资料","PROFILE"],settings:["设置","SETTINGS"],
    event:["活动","EVENTS"],warehouse:["仓库","INVENTORY"],team:["队伍准备","SQUAD SETUP"],achievements:["成就","ACHIEVEMENTS"],
    actionRecord:["通行证","ACTION RECORD"],growthGuide:["战斗手册","BATTLE MANUAL"],projectArea:["探索","EXPLORATION"],
    match3:["消消消消乐！","X4 MATCH"],daydream:["白日梦重现","DAYDREAM RECONSTRUCTION"],battle:["行动中","IN OPERATION"],
    tutorialBattle:["基础训练","BASIC TRAINING"],defeat:["行动结算","MISSION REPORT"]
  };
  const pair=labels[mode]||["PROJECT ZERO",String(mode||"SYSTEM").toUpperCase()];
  return language==="en"?pair[1]:pair[0];
}

function trackCommercialScreenTransition(){
  if(commercialTransitionMode===gameMode)return;
  commercialTransitionMode=gameMode;
  commercialTransitionTimer=18;
}

function drawCommercialScreenTransition(){
  if(commercialTransitionTimer<=0||gameMode==="loading"||gameMode==="boot")return;
  const t=clamp(commercialTransitionTimer/18,0,1);
  ctx.save();
  ctx.fillStyle="rgba(2,4,10,"+(t*.28)+")";ctx.fillRect(0,0,W,H);
  const lineX=W*(1-t);
  const g=ctx.createLinearGradient(lineX-160,0,lineX+160,0);g.addColorStop(0,"rgba(124,199,255,0)");g.addColorStop(.5,"rgba(124,199,255,"+(t*.72)+")");g.addColorStop(1,"rgba(124,199,255,0)");
  ctx.fillStyle=g;ctx.fillRect(lineX-160,0,320,2);
  ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,"+(t*.70)+")";ctx.font="bold 11px "+FONT_UI;ctx.fillText("PROJECT ZERO  /  "+commercialModeLabel(gameMode),24,H-22);
  ctx.restore();
  commercialTransitionTimer=Math.max(0,commercialTransitionTimer-frameScale);
}

function draw(){
  if(gameMode==="boot"){ drawBootSequence(); return; }
  trackCommercialScreenTransition();
  ctx.clearRect(0,0,W,H);

  if(gameMode==="login") drawLogin();
  else if(gameMode==="loading") drawLoading();
  else if(gameMode==="battleResumePrompt") drawBattleResumePrompt();
  else if(gameMode==="tutorialLobbyLoading") drawTutorialLobbyLoading();
  else if(gameMode==="nameInput") drawNameInput();
  else if(gameMode==="prologue") drawPrologue();
  else if(gameMode==="tutorialBattle") drawTutorialBattle();
  else if(gameMode==="lobby") drawLobby();
  else if(gameMode==="operation") drawOperation();
  else if(gameMode==="story") drawStory();
  else if(gameMode==="settlement") drawSettlement();
  else if(gameMode==="operators") drawOperators();
  else if(gameMode==="shop") drawShop();
  else if(gameMode==="mail") drawMail();
  else if(gameMode==="profile") drawProfile();
  else if(gameMode==="settings") drawSettings();
  else if(gameMode==="event") drawEvent();
  else if(gameMode==="match3" && window.PZMatch3) window.PZMatch3.draw();
  else if(gameMode==="warehouse") drawWarehouse();
  else if(gameMode==="team") drawTeam();
  else if(gameMode==="defeat") drawDefeat();
  else if(gameMode==="achievements") drawAchievements();
  else if(gameMode==="actionRecord") drawActionRecord();
  else if(gameMode==="growthGuide") drawGrowthGuide();
  else if(gameMode==="projectArea") drawProjectArea();
  else drawBattle();

  drawMobileControls();
  drawAchievementNotice();
  if(window.PZStory && window.PZStory.active) window.PZStory.draw(ctx,W,H);
  drawCommercialScreenTransition();
  drawFeatureGuidePrompt();
}
function update(){
  if(updateFeatureGuidePrompt()){
    if(cloudMsgTimer>0){ cloudMsgTimer-=frameScale; if(cloudMsgTimer<=0) cloudMsg=''; }
    if(cloudSyncTimer>0){ cloudSyncTimer-=frameScale; if(cloudSyncTimer<=0) cloudSyncStatus=''; }
    prev={...keys};
    clicked=false;
    return;
  }
  if(window.PZStory && window.PZStory.active){
    window.PZStory.update({
      clicked,
      enter: justPressed("enter"),
      space: justPressed(" "),
      up: justPressed("w") || justPressed("arrowup"),
      down: justPressed("s") || justPressed("arrowdown"),
      mouseX,
      mouseY
    });
    if(cloudMsgTimer>0){ cloudMsgTimer-=frameScale; if(cloudMsgTimer<=0) cloudMsg=''; }
    if(cloudSyncTimer>0){ cloudSyncTimer-=frameScale; if(cloudSyncTimer<=0) cloudSyncStatus=''; }
    prev={...keys};
    clicked=false;
    return;
  }
  if(gameMode==="login") updateLogin();
  else if(gameMode==="loading") updateLoading();
  else if(gameMode==="battleResumePrompt") updateBattleResumePrompt();
  else if(gameMode==="tutorialLobbyLoading") updateTutorialLobbyLoading();
  else if(gameMode==="nameInput") updateNameInput();
  else if(gameMode==="prologue") updatePrologue();
  else if(gameMode==="tutorialBattle") updateTutorialBattle();
  else if(gameMode==="lobby") updateLobby();
  else if(gameMode==="operation") updateOperation();
  else if(gameMode==="story") updateStory();
  else if(gameMode==="settlement") updateSettlement();
  else if(gameMode==="operators") updateOperators();
  else if(gameMode==="shop") updateShop();
  else if(gameMode==="mail") updateMail();
  else if(gameMode==="profile") updateProfile();
  else if(gameMode==="settings") updateSettings();
  else if(gameMode==="event") updateEvent();
  else if(gameMode==="match3" && window.PZMatch3) window.PZMatch3.update();
  else if(gameMode==="warehouse") updateWarehouse();
  else if(gameMode==="team") updateTeam();
  else if(gameMode==="defeat") updateDefeat();
  else if(gameMode==="achievements") updateAchievements();
  else if(gameMode==="actionRecord") updateActionRecord();
  else if(gameMode==="growthGuide") updateGrowthGuide();
  else if(gameMode==="projectArea") updateProjectArea();
  else updateBattle();

    if(cloudMsgTimer>0){ cloudMsgTimer-=frameScale; if(cloudMsgTimer<=0) cloudMsg=''; }
  if(cloudSyncTimer>0){ cloudSyncTimer-=frameScale; if(cloudSyncTimer<=0) cloudSyncStatus=''; }
  if(cloudAutoSaveCooldown>0){
    cloudAutoSaveCooldown-=frameScale;
    if(cloudAutoSaveCooldown<=0 && cloudPendingSave) autoCloudSaveNow(false);
  }

  prev={...keys};
  clicked=false;
}

function languageAudit(){
  const issues = [];
  function comparePack(name, obj){
    if(!obj || !obj.zh || !obj.en) return;
    const zhKeys = Object.keys(obj.zh || {}).filter(k=>k!=="zh");
    const enKeys = Object.keys(obj.en || {}).filter(k=>k!=="zh");
    for(const k of zhKeys){ if(!enKeys.includes(k)) issues.push(name+" missing EN: "+k); }
    for(const k of enKeys){ if(!zhKeys.includes(k)) issues.push(name+" missing ZH: "+k); }
  }
  comparePack("UI", UI_TEXT);
  comparePack("MSG", MSG_TEXT);
  comparePack("CORE", LANG_CORE);
  if(issues.length) console.warn("[LanguageAudit]", issues);
  else console.log("[LanguageAudit] OK");
  console.log("[LanguageAudit] Mode:", currentLang(), "Strict resource mode active");
}

let lastRuntimeUiErrorAt=0;
function recoverFromRuntimeUiError(err,phase){
  const now=Date.now();
  if(now-lastRuntimeUiErrorAt>1000) console.error("[RuntimeUI:"+phase+"]",err);
  lastRuntimeUiErrorAt=now;
  clicked=false;
  mouseDown=false;
  mouseAttackConsumed=false;
  staminaRecoverOpen=false;
  moduleArchiveWheelDelta=0;
  teamRosterWheelDelta=0;
  warehouseWheelDelta=0;
  actionRecordWheelDelta=0;
  try{releaseMobileButtons();clearMobileMoveKeys();}catch(ignore){}
  if(gameMode==="operation" && selectedTab==="dungeon"){
    dungeonPanelMode="home";
    materialDungeonRun=null;
  }else if(gameMode!=="battle" && gameMode!=="tutorialBattle" && gameMode!=="projectArea"){
    gameMode="lobby";
  }
  showCenter(language==="en" ? "UI recovered. Please try again." : "界面已恢复，请重新尝试。",100);
}

function loop(){
  if(document.hidden){
    lastFrameTime = performance.now();
    requestAnimationFrame(loop);
    return;
  }
  const now = performance.now();
  const frameInterval = 1000 / (targetFPS || 60);
  if(lastLoopRenderTime && now - lastLoopRenderTime < frameInterval){
    requestAnimationFrame(loop);
    return;
  }
  lastLoopRenderTime = now;

  frameScale = clamp((now - lastFrameTime) / 16.6667, 0.25, 2.2);
  lastFrameTime = now;

  if(saveCooldown>0){
    saveCooldown -= frameScale;
    if(saveCooldown<=0) saveGame();
  }

  try{
    trimRuntimeCollections();
    stabilizePlayerStats();
    updateLoginBgm();
    update();
    draw();
    try{ drawPZCustomCursor(); }catch(e){}
  }catch(err){
    recoverFromRuntimeUiError(err,"frame");
    try{draw();}catch(recoveryErr){console.error("[RuntimeUI:recovery]",recoveryErr);}
  }finally{
    requestAnimationFrame(loop);
  }
}

// V41 Story Module Bridge
window.PZGameBridge = {
  startTutorialBattle(){
    startTutorialBattle();
  },
  finishPrologue(){
    finishPrologue();
  }
};

loadGame();
ensureStarterProtagonist();
bootAccountSession();
refreshLanguageRuntimeText();
resetPassivePageMessages();
languageAudit();
normalizeProfile();
fixRuntimeValues();
loop();

requestAnimationFrame(() => {
  const bootScreen = document.getElementById("bootScreen");
  if(bootScreen) bootScreen.classList.add("boot-complete");
});

function forceSaveOnExit(){
  try{
    prepareTutorialResumeSave();
    const saved = saveGame();
    if(saved && !guestMode && cloudUser && cloudInitialSyncDone && hasCreatedProfile){
      // Network writes are not guaranteed to finish after the page is closed.
      // Keep a tiny sync marker only; the save itself remains the single current
      // record and will be uploaded on the next live session.
      localStorage.setItem(cloudPendingSyncKey(), String(Date.now()));
    }
  }catch(e){}
  // Best-effort cloud push. A page that is actively unloading cannot
  // reliably wait for an async network request to finish, so this is
  // also triggered on visibilitychange (tab hidden / app backgrounded),
  // which fires while the page is still alive and gives the Firestore
  // write an actual chance to complete before the tab is closed.
  try{
    if(!guestMode && cloudUser && cloudInitialSyncDone && hasCreatedProfile) autoCloudSaveNow(true);
  }catch(e){}
}
addEventListener("beforeunload", forceSaveOnExit);
addEventListener("pagehide", forceSaveOnExit);
document.addEventListener("visibilitychange", function(){
  if(document.hidden) forceSaveOnExit();
});

try{ setupHiDPICanvas(); }catch(e){}
