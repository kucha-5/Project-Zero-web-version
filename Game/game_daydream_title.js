// Project Zero V49.13.1 - Daydream Archive Card Space Text Polish
// Independent title-scene override for Daydream home page.
// Direction: polished Daydream archive cards first, then Hizan mirror-lake cover. No CG image, no generated art.
(function(global){
  "use strict";

  function T(zh,en){ return global.language === "en" ? en : zh; }
  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function easeOutCubic(t){ return 1 - Math.pow(1 - clamp(t,0,1), 3); }
  function easeInOutSine(t){ return -(Math.cos(Math.PI * clamp(t,0,1)) - 1) / 2; }

  function roundedRect(ctx,x,y,w,h,r){
    r = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function uiFade(daydream, delay, dur){
    const t = daydream.entryPlaying ? (daydream.entryAnim || 0) : 1;
    return clamp((t - delay) / dur, 0, 1);
  }

  function drawPZTitleButton(ctx, x, y, w, h, label, strong, alpha){
    alpha = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.globalAlpha *= alpha;
    roundedRect(ctx,x,y,w,h,10);
    ctx.fillStyle = strong ? "rgba(245,238,224,.88)" : "rgba(245,238,224,.10)";
    ctx.fill();
    ctx.strokeStyle = strong ? "rgba(245,238,224,.92)" : "rgba(245,238,224,.38)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = strong ? "rgba(20,18,28,.95)" : "rgba(245,238,224,.86)";
    ctx.font = "bold " + (strong ? 20 : 15) + "px " + (global.FONT_UI || "Arial");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x+w/2, y+h/2+1);
    ctx.restore();
  }

  function drawSoftCloudBand(ctx, x0, y, w0, p, alpha, color){
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    for(let k=0;k<4;k++){
      ctx.beginPath();
      for(let x=x0-40; x<=x0+w0+40; x+=34){
        const yy = y + Math.sin(x*.009 + p*.08 + k*1.7)*7 + Math.sin(x*.021 - p*.045)*3;
        if(x===x0-40) ctx.moveTo(x,yy+k*11); else ctx.lineTo(x,yy+k*11);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCinematicSunRays(ctx, sunX, sunY, x0, y0, w0, h0, p, breathe){
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for(let i=0;i<18;i++){
      const ang = -Math.PI*.88 + i*(Math.PI*1.76/17) + Math.sin(p*.01+i)*.018;
      const len = 170 + (i%5)*26 + breathe*34;
      const w = 7 + (i%4)*3;
      const x1 = sunX + Math.cos(ang)*52;
      const y1 = sunY + Math.sin(ang)*34;
      const x2 = sunX + Math.cos(ang)*len;
      const y2 = sunY + Math.sin(ang)*len*.42;
      const g = ctx.createLinearGradient(x1,y1,x2,y2);
      g.addColorStop(0,"rgba(245,238,224,.18)");
      g.addColorStop(.36,"rgba(227,168,59,.07)");
      g.addColorStop(1,"rgba(245,238,224,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
    ctx.restore();
  }


  function drawFirstImpactBloom(ctx, x0, y0, w0, h0, sunX, sunY, enterT){
    // Short HDR-like exposure bloom when the Daydream page first opens.
    if(enterT >= 1) return;
    const flash = Math.max(0, Math.sin(Math.min(1, enterT*1.65) * Math.PI)) * Math.max(0, 1-enterT*.72);
    if(flash <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = flash * 0.42;
    const g = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 520);
    g.addColorStop(0, "rgba(245,238,224,.95)");
    g.addColorStop(.22, "rgba(227,168,59,.40)");
    g.addColorStop(.58, "rgba(239,209,132,.16)");
    g.addColorStop(1, "rgba(245,238,224,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x0,y0,w0,h0);
    ctx.restore();
  }

  function drawSunRoad(ctx, x0, lakeY, w0, h0, sunX, p, enterT, breathe){
    // A long, calm light path on the mirror lake. It gives impact without adding objects.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const a = 0.22 + breathe * 0.10 + (1-enterT)*0.08;
    const roadH = h0 - (lakeY - 82);
    const g = ctx.createRadialGradient(sunX, lakeY+22, 8, sunX, lakeY+126, 260 + breathe*34);
    g.addColorStop(0, "rgba(245,238,224,"+(0.50*a)+")");
    g.addColorStop(.18, "rgba(227,168,59,"+(0.66*a)+")");
    g.addColorStop(.43, "rgba(239,209,132,"+(0.34*a)+")");
    g.addColorStop(.72, "rgba(184,90,77,"+(0.15*a)+")");
    g.addColorStop(1, "rgba(245,238,224,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sunX-28, lakeY);
    ctx.bezierCurveTo(sunX-120, lakeY+82, sunX-145, lakeY+205, sunX-210, lakeY+roadH);
    ctx.lineTo(sunX+210, lakeY+roadH);
    ctx.bezierCurveTo(sunX+145, lakeY+205, sunX+120, lakeY+82, sunX+28, lakeY);
    ctx.closePath();
    ctx.fill();

    // Thin broken highlights across the path.
    ctx.globalAlpha = .18 + breathe*.08;
    for(let i=0;i<14;i++){
      const y = lakeY + 22 + i*16;
      const width = 44 + i*10;
      const drift = Math.sin(p*.09+i)*5;
      ctx.strokeStyle = i%2 ? "rgba(245,238,224,.55)" : "rgba(227,168,59,.42)";
      ctx.lineWidth = i<4 ? 1.5 : 0.9;
      ctx.beginPath();
      ctx.moveTo(sunX-width*.5+drift, y);
      ctx.lineTo(sunX+width*.5+drift, y+Math.sin(i+p*.06)*1.4);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHorizonBreath(ctx, x0, y0, w0, h0, p, lakeY){
    // Soft mist layer so horizon is air, not a hard line.
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for(let i=0;i<5;i++){
      const y = lakeY - 24 + i*12 + Math.sin(p*.018+i)*2;
      const g = ctx.createLinearGradient(x0,y-18,x0,y+18);
      g.addColorStop(0,"rgba(245,238,224,0)");
      g.addColorStop(.5, i%2 ? "rgba(103,182,184,.10)" : "rgba(245,238,224,.13)");
      g.addColorStop(1,"rgba(245,238,224,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, y-18, w0, 36);
    }
    ctx.restore();
  }

  function drawWindGustOnWater(ctx, x0, lakeY, w0, h0, p){
    const cycle = (p * 0.0065) % 1;
    const active = cycle < .42 ? Math.sin(cycle/.42*Math.PI) : 0;
    if(active <= 0.001) return;
    ctx.save();
    ctx.globalAlpha = active * .22;
    const yBase = lakeY + 34 + cycle * 150;
    for(let k=0;k<5;k++){
      ctx.beginPath();
      for(let x=x0-30; x<=x0+w0+30; x+=18){
        const y = yBase + k*9 + Math.sin(x*.022 + p*.14 + k)*2.2;
        if(x===x0-30) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.strokeStyle = k%2 ? "rgba(245,238,224,.38)" : "rgba(103,182,184,.32)";
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCinematicGrain(ctx, x0, y0, w0, h0, p){
    ctx.save();
    ctx.globalAlpha = .035;
    ctx.fillStyle = "rgba(245,238,224,.85)";
    for(let i=0;i<90;i++){
      const x = x0 + ((i*97 + Math.floor(p*17)*13) % w0);
      const y = y0 + ((i*53 + Math.floor(p*11)*19) % h0);
      ctx.fillRect(x,y,1,1);
    }
    ctx.restore();
  }

  function drawToriiShape(ctx){
    // A simple procedural torii model. Drawn around origin, standing on y=0.
    roundedRect(ctx,-118,-122,236,18,7); ctx.fill(); ctx.stroke();
    roundedRect(ctx,-96,-100,192,12,5); ctx.fill();
    roundedRect(ctx,-32,-90,64,16,4); ctx.fill();
    roundedRect(ctx,-74,-83,22,126,5); ctx.fill();
    roundedRect(ctx,52,-83,22,126,5); ctx.fill();
    roundedRect(ctx,-88,-45,176,16,4); ctx.fill();
    roundedRect(ctx,-78,38,30,10,5); ctx.fill();
    roundedRect(ctx,48,38,30,10,5); ctx.fill();
  }

  function drawHizanLakeScene(daydream){
    const ctx = global.ctx, W = global.W || 1120, H = global.H || 660, FONT_UI = global.FONT_UI || "Arial";
    const p = daydream.pulse || 0;
    const breathe = Math.sin(p * 0.045) * 0.5 + 0.5;
    const slow = Math.sin(p * 0.018);

    const x0=0, y0=0, w0=W, h0=H;
    const enterRaw = daydream.entryPlaying ? (daydream.entryAnim || 0) : 1;
    const enterT = daydream.entryEase ? daydream.entryEase(enterRaw) : easeOutCubic(enterRaw);

    ctx.save();

    // Living camera: tiny drift after entry, subtle enough that the title screen feels alive.
    // V49.9: ultra-subtle mouse-look parallax. The scene moves opposite the cursor
    // by only a few pixels, so it feels like the camera is slightly looking toward the mouse.
    const baseCamX = Math.sin(p*.013) * 2.2;
    const baseCamY = Math.cos(p*.010) * 1.6;

    const mx = Number.isFinite(global.mouseX) ? global.mouseX : W/2;
    const my = Number.isFinite(global.mouseY) ? global.mouseY : H/2;
    const inScene = mx >= x0 && mx <= x0+w0 && my >= y0 && my <= y0+h0;
    const nx = inScene ? clamp((mx - (x0+w0/2)) / (w0/2), -1, 1) : 0;
    const ny = inScene ? clamp((my - (y0+h0/2)) / (h0/2), -1, 1) : 0;

    const targetMouseCamX = -nx * 3.2;
    const targetMouseCamY = -ny * 1.8;
    const smooth = 0.050 * (global.frameScale || 1);
    daydream.titleMouseCamX = (daydream.titleMouseCamX || 0) + (targetMouseCamX - (daydream.titleMouseCamX || 0)) * smooth;
    daydream.titleMouseCamY = (daydream.titleMouseCamY || 0) + (targetMouseCamY - (daydream.titleMouseCamY || 0)) * smooth;

    const camX = baseCamX + daydream.titleMouseCamX;
    const camY = baseCamY + daydream.titleMouseCamY;
    const entryPush = daydream.entryPlaying ? (1-enterT) * 30 : 0;
    ctx.translate(camX, camY + entryPush);
    if(daydream.entryPlaying) ctx.globalAlpha = 0.18 + enterT * 0.82;

    roundedRect(ctx,x0,y0,w0,h0,18);
    ctx.clip();

    // Soft evening sky. Palette: 群青 / 京紫 / 浅葱 / 山吹 / 栀子 / 茜 / 胡粉 / 鼠.
    const sky = ctx.createLinearGradient(0,y0,0,y0+h0*0.66);
    sky.addColorStop(0.00,"#182a56");   // 群青色
    sky.addColorStop(0.22,"#33204e");   // 深紫 / 京紫
    sky.addColorStop(0.44,"#5b87a2");   // 群青 -> 浅葱 bridge
    sky.addColorStop(0.57,"#78c0bf");   // 浅葱色
    sky.addColorStop(0.70,"#efcf84");   // 栀子色
    sky.addColorStop(0.82,"#e5a63b");   // 山吹色
    sky.addColorStop(1.00,"#b8524c");   // 茜色
    ctx.fillStyle = sky;
    ctx.fillRect(x0,y0,w0,h0*0.67);

    // Slow moving cloud/haze bands, very transparent.
    drawSoftCloudBand(ctx, x0, y0+h0*.20, w0, p, .045, "rgba(245,238,224,.95)");
    drawSoftCloudBand(ctx, x0, y0+h0*.31, w0, -p*.7, .035, "rgba(116,190,190,.95)");
    drawSoftCloudBand(ctx, x0, y0+h0*.41, w0, p*.5, .030, "rgba(184,90,77,.95)");

    // Haze at horizon.
    const haze = ctx.createLinearGradient(0,y0+h0*.34,0,y0+h0*.62);
    haze.addColorStop(0,"rgba(245,238,224,0)");
    haze.addColorStop(.48,"rgba(245,238,224,.18)");
    haze.addColorStop(1,"rgba(245,238,224,.42)");
    ctx.fillStyle=haze;
    ctx.fillRect(x0,y0+h0*.28,w0,h0*.38);

    const sunX = x0 + w0*0.56;
    const sunY = y0 + h0*(0.415 + slow*.004);
    const sunBreath = 1 + breathe * 0.035;
    const sunGlow = ctx.createRadialGradient(sunX,sunY,16,sunX,sunY,230*sunBreath);
    sunGlow.addColorStop(0,"rgba(245,238,224,.96)"); // 胡粉色
    sunGlow.addColorStop(.15,"rgba(244,190,68,.62)"); // 山吹色
    sunGlow.addColorStop(.38,"rgba(239,209,132,.32)"); // 栀子色
    sunGlow.addColorStop(.66,"rgba(184,90,77,.16)"); // 茜色
    sunGlow.addColorStop(1,"rgba(184,90,77,0)");
    ctx.fillStyle=sunGlow;
    ctx.fillRect(x0,y0,w0,h0);
    ctx.beginPath();
    ctx.arc(sunX,sunY,48*sunBreath,0,Math.PI*2);
    ctx.fillStyle="rgba(245,238,224,.86)";
    ctx.fill();
    drawCinematicSunRays(ctx, sunX, sunY, x0, y0, w0, h0, p, breathe);
    drawFirstImpactBloom(ctx, x0, y0, w0, h0, sunX, sunY, enterT);

    const lakeY = y0 + h0*0.54;

    // Mirror lake: draws sky reflection with a faint inverted sunset gradient.
    const water = ctx.createLinearGradient(0,lakeY,0,y0+h0);
    water.addColorStop(0.00,"rgba(245,238,224,.42)");
    water.addColorStop(0.16,"#86c5c4");  // 浅葱 reflection
    water.addColorStop(0.36,"#d19d48");  // sunset warmth reflected
    water.addColorStop(0.52,"#64436e");  // 京紫 reflection
    water.addColorStop(0.78,"#2b3358");  // 群青 reflection
    water.addColorStop(1.00,"#6f6a67");  // 鼠色 lower shade
    ctx.fillStyle=water;
    ctx.fillRect(x0,lakeY,w0,y0+h0-lakeY);

    // Very thin mirror line at horizon.
    ctx.fillStyle="rgba(245,238,224,.48)";
    ctx.fillRect(x0,lakeY-1,w0,2);
    drawHorizonBreath(ctx, x0, y0, w0, h0, p, lakeY);

    // Sunset path on shallow water, stretched and breathing slightly.
    const refl = ctx.createRadialGradient(sunX,lakeY+62,10,sunX,lakeY+72,300 + breathe*18);
    refl.addColorStop(0,"rgba(245,238,224,.48)");
    refl.addColorStop(.18,"rgba(227,168,59,.30)");
    refl.addColorStop(.48,"rgba(239,209,132,.15)");
    refl.addColorStop(.74,"rgba(184,90,77,.07)");
    refl.addColorStop(1,"rgba(245,238,224,0)");
    ctx.fillStyle=refl;
    ctx.fillRect(x0,lakeY,w0,y0+h0-lakeY);
    drawSunRoad(ctx, x0, lakeY, w0, h0, sunX, p, enterT, breathe);

    // Micro ripples: only enough to avoid a dead still image.
    ctx.save();
    ctx.globalAlpha=.27;
    for(let i=0;i<28;i++){
      const yy = lakeY + 12 + i*12.4;
      const amp = 0.6 + i*0.08;
      ctx.beginPath();
      for(let x=x0; x<=x0+w0; x+=18){
        const y = yy + Math.sin(x*.014 + p*.20 + i*.53) * amp + Math.sin(x*.031 - p*.075) * amp*.32;
        if(x===x0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
      }
      ctx.strokeStyle = i<9 ? "rgba(245,238,224,.30)" : "rgba(103,182,184,.14)";
      ctx.lineWidth = i<9 ? 1.0 : .72;
      ctx.stroke();
    }
    ctx.restore();

    // A rare wind gust crosses the mirror lake. It adds impact without adding extra objects.
    drawWindGustOnWater(ctx, x0, lakeY, w0, h0, p);

    // Lone torii center.
    const tx = sunX;
    const baseY = lakeY + 38;
    ctx.save();
    ctx.translate(tx, baseY);
    ctx.fillStyle="rgba(64,61,68,.93)"; // 鼠色
    ctx.strokeStyle="rgba(245,238,224,.58)";
    ctx.lineWidth=1.25;
    ctx.shadowColor="rgba(245,238,224,.22)";
    ctx.shadowBlur=8;
    drawToriiShape(ctx);

    // Sunset rim light on left/top edges.
    ctx.globalCompositeOperation="screen";
    ctx.fillStyle="rgba(239,209,132,.16)";
    roundedRect(ctx,-118,-122,236,5,4); ctx.fill();
    roundedRect(ctx,-74,-83,7,126,3); ctx.fill();
    roundedRect(ctx,52,-83,7,126,3); ctx.fill();
    ctx.restore();

    // Torii reflection, distorted by water.
    ctx.save();
    ctx.translate(tx, lakeY+87);
    ctx.scale(1,-0.72);
    ctx.globalAlpha=.22 + breathe*.035;
    ctx.fillStyle="rgba(35,34,48,.86)";
    ctx.strokeStyle="rgba(245,238,224,.18)";
    ctx.lineWidth=1;
    drawToriiShape(ctx);
    ctx.restore();

    // Subtle broken reflection bands around the reflected torii.
    ctx.save();
    ctx.globalAlpha=.16;
    ctx.strokeStyle="rgba(245,238,224,.55)";
    for(let i=0;i<9;i++){
      const yy = lakeY + 82 + i*12;
      ctx.beginPath();
      ctx.moveTo(tx-120+i*7, yy + Math.sin(p*.18+i)*1.2);
      ctx.lineTo(tx+115-i*4, yy + Math.sin(p*.16+i*1.4)*1.2);
      ctx.stroke();
    }
    ctx.restore();

    // Breath ripple from torii base. It comes in pulses, not constant visible waves.
    ctx.save();
    const cycle = (p * 0.012) % 1;
    for(let i=0;i<2;i++){
      const t=(cycle+i*.48)%1;
      const fade = Math.pow(1-t, 1.7) * (t < .82 ? 1 : 0);
      ctx.globalAlpha=fade*.28;
      ctx.strokeStyle="rgba(245,238,224,.75)";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.ellipse(tx, lakeY+42, 30+t*235, 4+t*30, 0, 0, Math.PI*2);
      ctx.stroke();
    }
    ctx.restore();

    // Minimal particles / dust in sunset air.
    ctx.save();
    ctx.fillStyle="rgba(245,238,224,.55)";
    for(let i=0;i<46;i++){
      const driftX = Math.sin(p*.018+i*1.7)*10 + p*0.05;
      const px = x0 + ((i*83 + driftX) % w0);
      const py = y0 + 42 + ((i*47 + p*3.2) % (h0*.72));
      const r = 0.65 + (i%3)*0.28;
      ctx.globalAlpha = .10 + (i%5)*.022;
      ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // Overall edge vignette using 鼠色/京紫.
    const vig=ctx.createRadialGradient(x0+w0*.55,y0+h0*.48,170,x0+w0*.55,y0+h0*.48,710);
    vig.addColorStop(0,"rgba(0,0,0,0)");
    vig.addColorStop(.70,"rgba(36,24,48,.18)");
    vig.addColorStop(1,"rgba(22,22,26,.70)");
    ctx.fillStyle=vig; ctx.fillRect(x0,y0,w0,h0);

    // Very faint film grain makes the canvas scene less flat, still not a CG image.
    drawCinematicGrain(ctx, x0, y0, w0, h0, p);

    ctx.restore(); // clip / camera / entry

    // Scene frame.
    ctx.save();
    roundedRect(ctx,x0,y0,w0,h0,18);
    ctx.strokeStyle="rgba(245,238,224,.18)";
    ctx.lineWidth=1.2;
    ctx.stroke();
    ctx.restore();

    // Quiet archive UI overlays. Staged fade-in during entry.
    const aTitle = easeOutCubic(uiFade(daydream,.34,.22));
    const aPanel = easeOutCubic(uiFade(daydream,.48,.24));
    const aBtns = easeOutCubic(uiFade(daydream,.62,.24));

    ctx.save();
    ctx.globalAlpha=aTitle;
    const titleGlow=ctx.createLinearGradient(52,48,390,48);
    titleGlow.addColorStop(0,"rgba(227,168,59,.72)");
    titleGlow.addColorStop(.52,"rgba(103,182,184,.34)");
    titleGlow.addColorStop(1,"rgba(103,182,184,0)");
    ctx.fillStyle=titleGlow;ctx.fillRect(52,48,340,2);
    ctx.textAlign="left";
    ctx.fillStyle="rgba(245,238,224,.76)";
    ctx.font="bold 16px "+FONT_UI;
    ctx.fillText("DAYDREAM FILE  /  0001",64,68);
    ctx.fillStyle="rgba(245,238,224,.94)";
    ctx.font="bold 39px "+FONT_UI;
    ctx.fillText(daydream.title ? daydream.title() : T("白日梦重现","Daydream Reconstruction"),64,108);
    ctx.fillStyle="rgba(245,238,224,.70)";
    ctx.font="bold 28px "+FONT_UI;
    ctx.fillText(daydream.scenarioName ? daydream.scenarioName() : T("Project Zero：日斩","Project Zero: Hizan"),64,144);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha=aPanel;
    ctx.beginPath();
    ctx.moveTo(48,200);ctx.lineTo(326,200);ctx.lineTo(348,222);ctx.lineTo(348,424);ctx.lineTo(48,424);ctx.closePath();
    const recordBg=ctx.createLinearGradient(48,200,348,424);
    recordBg.addColorStop(0,"rgba(15,18,31,.72)");recordBg.addColorStop(1,"rgba(24,23,31,.28)");
    ctx.fillStyle=recordBg;ctx.fill();
    ctx.strokeStyle="rgba(245,238,224,.20)";ctx.stroke();
    ctx.fillStyle="rgba(227,168,59,.82)";ctx.fillRect(48,200,5,224);
    ctx.fillStyle="rgba(245,238,224,.82)";
    ctx.font="bold 17px "+FONT_UI;
    ctx.textAlign="left";
    ctx.fillText(T("调查记录","Investigation Record"),76,238);
    ctx.font="15px "+FONT_UI;
    ctx.fillStyle="rgba(245,238,224,.62)";
    ctx.fillText(T("梦魇图鉴","Nightmare Codex")+"："+(daydream.nightmareCount?daydream.nightmareCount():0)+" / "+(daydream.nightmareTotal?daydream.nightmareTotal():16),76,286);
    ctx.fillText(T("结局记录","Ending Archive")+"："+(daydream.endingCount?daydream.endingCount():0)+" / 5",76,326);
    ctx.fillText(T("最高线索","Best Clue")+"："+String((daydream.state&&daydream.state.bestClue)||0),76,366);
    ctx.fillStyle="rgba(103,182,184,.78)";
    ctx.font="13px "+FONT_UI;
    ctx.fillText(T("浅湖中心检测到鸟居残响。","Torii residual echo detected at lake center."),76,402);
    ctx.restore();

    drawPZTitleButton(ctx,48,550,168,48,T("梦魇图鉴","Codex"),false,aBtns);
    drawPZTitleButton(ctx,230,550,168,48,T("结局一览","Endings"),false,aBtns);
    drawPZTitleButton(ctx,W-280,528,240,72,daydream.run&&!daydream.run.completed?T("继续调查","RESUME"):T("开始调查","START"),true,aBtns);
    // Edge-mounted level ribbon: deliberately not a rectangular button.
    ctx.save();ctx.globalAlpha=aBtns*.96;
    const levelX=W-316,levelY=82,levelW=316,levelH=58;
    const levelHover=Number.isFinite(global.mouseX)&&Number.isFinite(global.mouseY)&&global.mouseX>=levelX&&global.mouseX<=levelX+levelW&&global.mouseY>=levelY&&global.mouseY<=levelY+levelH;
    const levelGrad=ctx.createLinearGradient(levelX,levelY,levelX+levelW,levelY);
    levelGrad.addColorStop(0,"rgba(77,56,118,0)");
    levelGrad.addColorStop(.24,levelHover?"rgba(128,87,190,.68)":"rgba(92,65,139,.52)");
    levelGrad.addColorStop(.68,levelHover?"rgba(88,119,188,.90)":"rgba(71,91,146,.74)");
    levelGrad.addColorStop(1,"rgba(32,39,72,.90)");
    ctx.beginPath();ctx.moveTo(levelX,levelY+levelH);ctx.lineTo(levelX+24,levelY);ctx.lineTo(levelX+levelW,levelY);ctx.lineTo(levelX+levelW,levelY+levelH);ctx.closePath();ctx.fillStyle=levelGrad;ctx.fill();
    ctx.strokeStyle=levelHover?"rgba(255,232,160,.76)":"rgba(206,219,255,.34)";ctx.lineWidth=levelHover?2:1;ctx.beginPath();ctx.moveTo(levelX+25,levelY);ctx.lineTo(levelX+levelW,levelY);ctx.stroke();
    ctx.textAlign="right";ctx.fillStyle="rgba(235,239,255,.70)";ctx.font="13px "+FONT_UI;ctx.fillText(T("白日梦等级","DAYDREAM LEVEL"),levelX+levelW-78,levelY+23);
    ctx.fillStyle="#fff";ctx.font="bold 29px Arial";ctx.fillText(String(daydream.reconstructionLevel?daydream.reconstructionLevel():1).padStart(2,"0"),levelX+levelW-24,levelY+40);
    ctx.restore();
    ctx.save();
    ctx.beginPath();ctx.arc(W-44,44,24,0,Math.PI*2);ctx.fillStyle="rgba(8,10,18,.66)";ctx.fill();ctx.strokeStyle="rgba(245,238,224,.58)";ctx.lineWidth=1.5;ctx.stroke();
    ctx.fillStyle="#fff";ctx.font="bold 22px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("×",W-44,43);ctx.restore();

    // Entry overlay: PZ / Hizan flavor, no generic scanline.
    if(daydream.entryPlaying){
      const t = enterT;
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.fillStyle="rgba(0,0,0,"+(0.78*Math.max(0,1-t*1.12)).toFixed(3)+")";
      ctx.fillRect(0,0,W,H);
      const a = Math.max(0,1-Math.abs(t-.33)/.36);
      ctx.globalAlpha=a;
      ctx.textAlign="center";
      ctx.fillStyle="rgba(245,238,224,.92)";
      ctx.font="bold 24px "+FONT_UI;
      ctx.fillText(T("白日梦残响已定位","Daydream echo locked"),W/2,H/2-30);
      ctx.fillStyle="rgba(227,168,59,.86)";
      ctx.font="bold 18px "+FONT_UI;
      ctx.fillText(T("Project Zero：日斩","Project Zero: Hizan"),W/2,H/2+4);
      ctx.globalAlpha=Math.max(0,1-t);
      ctx.strokeStyle="rgba(245,238,224,.24)";
      ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.arc(W/2,H/2+36,38+t*72,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
  }


  function drawArchiveTag(ctx, x, y, w, label, live, accent){
    roundedRect(ctx,x,y,w,22,7);
    ctx.fillStyle = live ? "rgba(20,18,28,.34)" : "rgba(20,18,28,.18)";
    ctx.fill();
    ctx.strokeStyle = live ? "rgba(245,238,224,.20)" : "rgba(245,238,224,.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = live ? (accent || "rgba(245,238,224,.72)") : "rgba(245,238,224,.32)";
    ctx.font="10.5px "+(global.FONT_UI || "Arial");
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText(label,x+w/2,y+12);
  }

  function drawScenarioCard(ctx, card, x, y, w, h, selected, alpha){
    const FONT_UI = global.FONT_UI || "Arial";
    const mx = Number.isFinite(global.mouseX) ? global.mouseX : -9999;
    const my = Number.isFinite(global.mouseY) ? global.mouseY : -9999;
    const hover = mx>=x && mx<=x+w && my>=y && my<=y+h;
    const live = card.status === "open";
    const pulse = Math.sin((global.PZDaydream && global.PZDaydream.pulse || 0)*.08) * .5 + .5;
    alpha = alpha == null ? 1 : alpha;

    ctx.save();
    ctx.globalAlpha *= alpha;

    // hover lift is intentionally tiny; UI should feel responsive, not bouncy.
    if(hover){ ctx.translate(0,-2); }

    // card body
    roundedRect(ctx,x,y,w,h,18);
    const body = ctx.createLinearGradient(x,y,x+w,y+h);
    if(live){
      body.addColorStop(0,"rgba(245,238,224,.128)");
      body.addColorStop(.48,"rgba(18,20,34,.42)");
      body.addColorStop(1,"rgba(227,168,59,.075)");
    }else{
      body.addColorStop(0,"rgba(245,238,224,.052)");
      body.addColorStop(.54,"rgba(22,20,32,.38)");
      body.addColorStop(1,"rgba(103,182,184,.035)");
    }
    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = live
      ? (hover ? "rgba(245,238,224,.62)" : "rgba(245,238,224,.34)")
      : (hover ? "rgba(245,238,224,.24)" : "rgba(245,238,224,.13)");
    ctx.lineWidth = hover ? 1.8 : 1.15;
    ctx.stroke();

    // left archive accent
    roundedRect(ctx,x+18,y+18,6,h-36,3);
    ctx.fillStyle = live ? card.accent : "rgba(245,238,224,.16)";
    ctx.fill();

    // large faded archive number
    ctx.textAlign="right";
    ctx.font="bold 54px "+FONT_UI;
    ctx.fillStyle = live ? "rgba(245,238,224,.055)" : "rgba(245,238,224,.035)";
    ctx.fillText(card.no || "--", x+w-34, y+68);

    // right glow / corruption area
    ctx.save();
    ctx.globalCompositeOperation="screen";
    const rg = ctx.createRadialGradient(x+w-156,y+h/2,14,x+w-156,y+h/2,166);
    rg.addColorStop(0, live ? (card.glow || "rgba(227,168,59,.40)") : "rgba(103,182,184,.09)");
    rg.addColorStop(.44, live ? "rgba(245,238,224,.035)" : "rgba(245,238,224,.012)");
    rg.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=rg;
    ctx.fillRect(x+w-340,y-40,380,h+80);
    ctx.restore();

    // title and metadata. Text uses the left half; chips use the empty right/bottom space.
    ctx.textAlign="left";
    ctx.textBaseline="alphabetic";
    ctx.fillStyle = live ? "rgba(245,238,224,.96)" : "rgba(245,238,224,.48)";
    ctx.font="bold 24px "+FONT_UI;
    ctx.fillText(T(card.zh,card.en),x+42,y+42);

    ctx.fillStyle = live ? "rgba(227,168,59,.82)" : "rgba(103,182,184,.36)";
    ctx.font="12px "+FONT_UI;
    ctx.fillText(T(card.subZh,card.subEn),x+44,y+66);

    ctx.fillStyle = live ? "rgba(245,238,224,.74)" : "rgba(245,238,224,.34)";
    ctx.font="12px "+FONT_UI;
    ctx.fillText(T(card.descZh,card.descEn),x+44,y+88);
    if(card.desc2Zh || card.desc2En){
      ctx.fillStyle = live ? "rgba(245,238,224,.58)" : "rgba(245,238,224,.28)";
      ctx.fillText(T(card.desc2Zh,card.desc2En),x+44,y+106);
    }

    // tags moved to the clear card space so they do not collide with description text.
    const tags = card.tags || [];
    const tagW = 104;
    const tagGap = 10;
    const tagStartX = x + w - 638;
    const tagY = y + h - 34;
    for(let i=0;i<tags.length;i++){
      drawArchiveTag(ctx,tagStartX+i*(tagW+tagGap),tagY,tagW,tags[i],live, live ? "rgba(245,238,224,.70)" : null);
    }

    // progress / damaged data bar
    const barX=x+w-258, barY=y+h-31, barW=148;
    roundedRect(ctx,barX,barY,barW,10,5);
    ctx.fillStyle="rgba(20,18,28,.44)";
    ctx.fill();
    if(live){
      const pr = clamp(card.progress || 0,0,1);
      roundedRect(ctx,barX,barY,barW*pr,10,5);
      const pg = ctx.createLinearGradient(barX,barY,barX+barW,barY);
      pg.addColorStop(0,"rgba(103,182,184,.72)");
      pg.addColorStop(1,"rgba(227,168,59,.82)");
      ctx.fillStyle=pg;
      ctx.fill();
    }else{
      ctx.globalAlpha *= .78;
      for(let i=0;i<9;i++){
        ctx.fillStyle = i%3===0 ? "rgba(245,238,224,.18)" : "rgba(103,182,184,.12)";
        ctx.fillRect(barX+i*17,barY,9,10);
      }
    }

    ctx.globalAlpha = alpha * (hover ? 1 : .94);
    ctx.textAlign="right";
    ctx.font="bold 12px "+FONT_UI;
    ctx.fillStyle = live ? (card.accent || "rgba(227,168,59,.86)") : "rgba(245,238,224,.38)";
    ctx.fillText(live ? T("可调查","OPEN") : T(card.lockZh || "观测中", card.lockEn || "OBSERVING"),x+w-28,y+32);

    // very soft hover line
    if(hover){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      ctx.strokeStyle = live ? "rgba(245,238,224,.20)" : "rgba(103,182,184,.12)";
      ctx.lineWidth=3;
      roundedRect(ctx,x+2,y+2,w-4,h-4,16);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  function drawDaydreamArchiveSelector(daydream){
    const ctx = global.ctx, W = global.W || 1120, H = global.H || 660, FONT_UI = global.FONT_UI || "Arial";
    const p = daydream.pulse || 0;
    ctx.save();
    const inline=false;

    // Archive background: not a plain menu, more like a sealed investigation terminal.
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#121f45");       // 群青
    bg.addColorStop(.32,"#2f174f");     // 京紫
    bg.addColorStop(.64,"#284e57");     // 浅葱暗部
    bg.addColorStop(1,"#07070d");
    ctx.fillStyle=bg;
    ctx.fillRect(0,0,W,H);

    // slow dream haze
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<7;i++){
      const y=78+i*68+Math.sin(p*.030+i)*7;
      const x=-220+((p*3.2+i*151)%1500);
      const g=ctx.createLinearGradient(x,y,x+520,y+34);
      g.addColorStop(0,"rgba(0,0,0,0)");
      g.addColorStop(.5,i%2?"rgba(103,182,184,.050)":"rgba(245,238,224,.040)");
      g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;
      ctx.fillRect(x,y,520,42);
    }
    ctx.restore();

    // Archive frame
    roundedRect(ctx,54,82,1012,498,18);
    ctx.fillStyle="rgba(7,8,16,.46)";
    ctx.fill();
    ctx.strokeStyle="rgba(245,238,224,.18)";
    ctx.lineWidth=1.3;
    ctx.stroke();

    // Header
    ctx.textAlign="left";
    ctx.fillStyle="rgba(245,238,224,.94)";
    ctx.font="bold 31px "+FONT_UI;
    ctx.fillText(T("白日梦档案","Daydream Archive"),86,137);

    ctx.fillStyle="rgba(245,238,224,.56)";
    ctx.font="13px "+FONT_UI;
    ctx.fillText(T("已定位的白日梦，可于此进入调查。","Located Daydream records can be investigated here."),88,164);

    if(!inline){
      ctx.beginPath(); ctx.arc(1028,118,22,0,Math.PI*2);
      ctx.fillStyle="rgba(245,238,224,.08)"; ctx.fill();
      ctx.strokeStyle="rgba(245,238,224,.34)"; ctx.stroke();
      ctx.fillStyle="rgba(245,238,224,.92)"; ctx.font="bold 22px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("×",1028,117); ctx.textBaseline="alphabetic";
    }

    // top metadata chips
    const openCount = 1;
    const totalCount = 3;
    const chips = [
      T("已定位："+openCount+" / "+totalCount,"Located: "+openCount+" / "+totalCount),
      T("状态：稳定","Status: Stable"),
      T("来源：Project Zero","Source: Project Zero")
    ];
    for(let i=0;i<chips.length;i++){
      const cx = 86 + i*164;
      roundedRect(ctx,cx,180,150,24,8);
      ctx.fillStyle="rgba(245,238,224,.065)";
      ctx.fill();
      ctx.strokeStyle="rgba(245,238,224,.13)";
      ctx.stroke();
      ctx.fillStyle="rgba(245,238,224,.58)";
      ctx.font="11px "+FONT_UI;
      ctx.textAlign="center";
      ctx.fillText(chips[i],cx+75,196);
    }

    const cards=[
      {
        id:"hizan", status:"open", no:"01", zh:"Project Zero：日斩", en:"Project Zero: Hizan",
        subZh:"镜湖 · 鸟居 · 夕阳", subEn:"Mirror Lake · Torii · Sunset",
        descZh:"所有进入者，",
        descEn:"Every entrant claims",
        desc2Zh:"都声称听见了水下的铃声。",
        desc2En:"they heard bells beneath the water.",
        accent:"rgba(227,168,59,.90)", glow:"rgba(227,168,59,.40)", progress:.34,
        tags:[T("梦魇图鉴 0 / 32","NM 0 / 32"),T("结局记录 0 / 5","END 0 / 5"),T("状态：可调查","OPEN")]
      },
      {
        id:"empty_1", status:"locked", no:"02", zh:"未知残响", en:"Unknown Echo",
        subZh:"观测中 · 坐标缺失", subEn:"Observing · Coordinates Missing",
        descZh:"已侦测到异常信号，",
        descEn:"An abnormal signal has been detected,",
        desc2Zh:"但尚未完成定位。", desc2En:"but its coordinates are not stable yet.",
        accent:"rgba(103,182,184,.46)", glow:"rgba(103,182,184,.20)", progress:0,
        tags:[T("持续观测中","OBSERVING"),T("坐标缺失","NO COORD"),T("未定位","UNLOCATED")], lockZh:"持续观测中", lockEn:"OBSERVING"
      },
      {
        id:"empty_2", status:"locked", no:"03", zh:"损坏档案", en:"Corrupted File",
        subZh:"数据损坏", subEn:"Corrupted Data",
        descZh:"档案已严重损坏，",
        descEn:"The file is severely damaged,",
        desc2Zh:"无法建立连接。", desc2En:"and no connection can be established.",
        accent:"rgba(78,42,132,.46)", glow:"rgba(78,42,132,.20)", progress:0,
        tags:[T("数据损坏","CORRUPT"),T("连接失败","LINK FAIL"),T("无法读取","UNREADABLE")], lockZh:"无法读取", lockEn:"UNREADABLE"
      }
    ];

    const startY=214;
    for(let i=0;i<cards.length;i++){
      drawScenarioCard(ctx,cards[i],86,startY+i*122,948,112,false,1);
    }

    // footer hint
    ctx.fillStyle="rgba(245,238,224,.40)";
    ctx.font="12px "+FONT_UI;
    ctx.textAlign="right";
    ctx.fillText("DAYDREAM ARCHIVE",1028,540);
    ctx.fillText("PROJECT ZERO DATABASE",1028,558);
    ctx.textAlign="left";
    ctx.restore();
  }

  function drawDaydreamArchiveInline(daydream){
    const ctx=global.ctx, FONT_UI=global.FONT_UI||"Arial";
    const p=daydream.pulse||0;
    ctx.save();
    const x=70,y=136,w=980,h=430;
    const bg=ctx.createLinearGradient(x,y,x+w,y+h);
    bg.addColorStop(0,"rgba(20,31,63,.97)"); bg.addColorStop(.52,"rgba(38,19,57,.94)"); bg.addColorStop(1,"rgba(7,10,19,.98)");
    roundedRect(ctx,x,y,w,h,16);ctx.fillStyle=bg;ctx.fill();ctx.strokeStyle="rgba(155,124,255,.38)";ctx.lineWidth=1.5;ctx.stroke();

    ctx.textAlign="left";ctx.fillStyle="rgba(245,238,224,.95)";ctx.font="bold 25px "+FONT_UI;ctx.fillText(T("白日梦档案","Daydream Archive"),96,177);
    ctx.fillStyle="rgba(245,238,224,.56)";ctx.font="12px "+FONT_UI;ctx.fillText(T("选择已定位档案，建立白日梦重现连接。","Select a located record to establish a reconstruction link."),98,199);
    ctx.textAlign="right";ctx.fillStyle="rgba(130,220,220,.75)";ctx.font="bold 12px "+FONT_UI;ctx.fillText(T("已定位 1 / 3","LOCATED 1 / 3"),1024,179);

    const cards=[
      {open:true,no:"01",title:T("Project Zero：日斩","Project Zero: Hizan"),sub:T("镜湖 · 鸟居 · 夕阳｜状态：可调查","Mirror Lake · Torii · Sunset | Available"),desc:T("所有进入者都声称听见了水下的铃声。","Every entrant claims they heard bells beneath the water."),accent:"#e3a83b"},
      {open:false,no:"02",title:T("未知残响","Unknown Echo"),sub:T("观测中 · 坐标缺失","Observing · Coordinates Missing"),desc:T("异常信号尚未完成定位。","The anomalous signal has not been located."),accent:"#67b6b8"},
      {open:false,no:"03",title:T("损坏档案","Corrupted File"),sub:T("数据损坏 · 无法连接","Corrupted Data · Link Failed"),desc:T("档案损坏，暂时无法读取。","The file is damaged and cannot be read."),accent:"#7657a8"}
    ];
    for(let i=0;i<cards.length;i++){
      const c=cards[i],cy=216+i*108,ch=92,hover=c.open&&global.inRect&&global.inRect(94,cy,932,ch);
      const g=ctx.createLinearGradient(94,cy,1026,cy+ch);g.addColorStop(0,c.open?(hover?"rgba(76,58,45,.96)":"rgba(47,43,52,.94)"):"rgba(21,24,35,.75)");g.addColorStop(1,"rgba(6,9,17,.92)");
      roundedRect(ctx,94,cy,932,ch,12);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=c.open?(hover?"#ffe8a0":"rgba(227,168,59,.72)"):"rgba(255,255,255,.13)";ctx.lineWidth=hover?2.5:1.2;ctx.stroke();
      ctx.fillStyle=c.open?c.accent:"rgba(255,255,255,.28)";ctx.fillRect(94,cy,5,ch);
      ctx.fillStyle=c.open?c.accent:"rgba(255,255,255,.32)";ctx.font="bold 24px Arial";ctx.textAlign="left";ctx.fillText(c.no,116,cy+35);
      ctx.fillStyle=c.open?"#fff":"rgba(255,255,255,.48)";ctx.font="bold 18px "+FONT_UI;ctx.fillText(c.title,174,cy+31);
      ctx.fillStyle="rgba(255,255,255,.54)";ctx.font="12px "+FONT_UI;ctx.fillText(c.sub,174,cy+53);
      ctx.fillStyle="rgba(255,255,255,.36)";ctx.font="11px "+FONT_UI;ctx.fillText(c.desc,174,cy+73);
      ctx.textAlign="right";ctx.font="bold 13px "+FONT_UI;ctx.fillStyle=c.open?(hover?"#ffe8a0":"#e3a83b"):"rgba(255,255,255,.24)";ctx.fillText(c.open?T("进入  ›","ENTER  ›"):T("未定位","LOCKED"),1002,cy+52);
    }
    ctx.restore();
  }

  function patch(){
    if(!global.PZDaydream) return false;
    const originalHandleClick = global.PZDaydream._hizanOriginalHandleClick || global.PZDaydream.handleClick;
    global.PZDaydream._hizanOriginalHandleClick = originalHandleClick;
    if(!global.PZDaydream.selectedDaydreamScenario) global.PZDaydream.selectedDaydreamScenario = null;

    global.PZDaydream.drawHome = function(){
      if(!this.state && this.init) this.init();
      this.pulse = (this.pulse || 0) + 0.025 * (global.frameScale || 1);
      if(this.selectedDaydreamScenario === "hizan") drawHizanLakeScene(this);
      else if(this.archiveInline) drawDaydreamArchiveInline(this);
      else drawDaydreamArchiveSelector(this);
    };

    global.PZDaydream.handleClick = function(){
      if(!this.state && this.init) this.init();
      if(this.page === "home"){
        if(this.entryPlaying){ global.clicked=false; return true; }
        if(!this.selectedDaydreamScenario){
          const hit=(x,y,w,h)=>global.inRect&&global.inRect(x,y,w,h);
          if(!this.archiveInline && global.clicked && hit(1000,90,56,56)){
            if(global.exitPZDaydreamFullscreen) global.exitPZDaydreamFullscreen();
            global.clicked=false;
            return true;
          }
          // Hizan scenario card
          if(global.clicked && (this.archiveInline?hit(94,216,932,92):hit(86,222,948,102))){
            this.selectedDaydreamScenario = "hizan";
            if(this.startEntryAnimation) this.startEntryAnimation();
            global.clicked=false;
            return true;
          }
          global.clicked=false;
          return true;
        }
        // Back to Daydream archive selector from Hizan cover
        if(global.clicked && global.inRect && global.inRect((global.W||1120)-72,16,56,56)){
          this.selectedDaydreamScenario = null;
          global.clicked=false;
          return true;
        }
        if(global.clicked && global.inRect && global.inRect((global.W||1120)-316,82,316,58)){
          this.page="level";
          global.clicked=false;
          return true;
        }
        if(global.clicked && global.inRect && global.inRect((global.W||1120)-280,528,240,72) && this.run && !this.run.completed){
          this.page="run";
          global.clicked=false;
          return true;
        }
      }
      return originalHandleClick ? originalHandleClick.call(this) : false;
    };

    global.PZDaydream.titleSceneVersion = "V49.11_DAYDREAM_ARCHIVE_UI_TEXT_POLISH";
    return true;
  }

  if(!patch()){
    const timer = setInterval(function(){ if(patch()) clearInterval(timer); }, 50);
    setTimeout(function(){ clearInterval(timer); }, 4000);
  }
})(window);
