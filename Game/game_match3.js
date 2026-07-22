(function(browser){
  "use strict";
  const host=browser.PZMatch3Host;
  const ROWS=8,COLS=8,TYPES=5,MAX_STAGE=20;
  const COLORS=["#7cc7ff","#ffe066","#ff6b9b","#9b7cff","#7cffb2"];
  const SYMBOLS=["◆","●","▲","✦","■"];
  const bx=264,by=86,cell=61;
  let board=[],selected=null,dragging=false,dragOrigin=null,moves=25,score=0,status="playing",message="",combo=0,bestCombo=0;
  let mode="campaign",stage=1,target=2200,popFx=[],boardKick=0,stageUnlocked=1;
  let idleFrames=0,hintPair=null,lastPower="";

  function progressKey(){const ns=browser.getProjectZeroSaveNamespace?browser.getProjectZeroSaveNamespace():"guest";return ns+"_match3_progress";}
  function saveProgress(){try{browser.localStorage.setItem(progressKey(),String(stageUnlocked));if(host&&typeof host.safeSaveGame==="function")host.safeSaveGame();}catch(e){}}
  function loadProgress(){try{stageUnlocked=Math.max(1,Math.min(MAX_STAGE,Number(browser.localStorage.getItem(progressKey()))||1));}catch(e){stageUnlocked=1;}}
  function stageTarget(n){return 1800+n*500+Math.floor(n/5)*300;}
  function stageMoves(n){return Math.max(18,27-Math.floor((n-1)/3));}
  function makeBoard(){
    board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      let choices=[0,1,2,3,4];
      if(c>=2&&board[r][c-1]===board[r][c-2])choices=choices.filter(v=>v!==board[r][c-1]);
      if(r>=2&&board[r-1][c]===board[r-2][c])choices=choices.filter(v=>v!==board[r-1][c]);
      board[r][c]=choices[Math.floor(Math.random()*choices.length)];
    }
    if(!hasPossibleMove()) makeBoard();
  }
  function findMatchGroups(){
    const groups=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;){let e=c+1;while(e<COLS&&board[r][e]===board[r][c])e++;if(e-c>=3)groups.push({axis:"row",color:board[r][c],cells:Array.from({length:e-c},(_,i)=>({r,c:c+i}))});c=e;}
    for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;){let e=r+1;while(e<ROWS&&board[e][c]===board[r][c])e++;if(e-r>=3)groups.push({axis:"col",color:board[r][c],cells:Array.from({length:e-r},(_,i)=>({r:r+i,c}))});r=e;}
    return groups;
  }
  function findMatches(){
    const hit=new Set();findMatchGroups().forEach(g=>g.cells.forEach(p=>hit.add(p.r+","+p.c)));return hit;
  }
  function poweredClear(groups){
    const hit=new Set(),labels=[];
    groups.forEach(g=>g.cells.forEach(p=>hit.add(p.r+","+p.c)));
    groups.forEach(g=>{
      const mid=g.cells[Math.floor(g.cells.length/2)];
      if(g.cells.length>=6){for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(board[r][c]===g.color)hit.add(r+","+c);labels.push("COLOR BURST");}
      else if(g.cells.length>=5){for(let c=0;c<COLS;c++)hit.add(mid.r+","+c);for(let r=0;r<ROWS;r++)hit.add(r+","+mid.c);labels.push("CROSS BREAK");}
      else if(g.cells.length===4){if(g.axis==="row")for(let c=0;c<COLS;c++)hit.add(mid.r+","+c);else for(let r=0;r<ROWS;r++)hit.add(r+","+mid.c);labels.push("LINE BREAK");}
    });
    return {hit,label:labels[0]||""};
  }
  function swap(a,b){const t=board[a.r][a.c];board[a.r][a.c]=board[b.r][b.c];board[b.r][b.c]=t;}
  function findPossibleMove(){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)for(const d of [[0,1],[1,0]]){
      const nr=r+d[0],nc=c+d[1];if(nr>=ROWS||nc>=COLS)continue;
      const a={r,c},b={r:nr,c:nc};swap(a,b);const ok=findMatches().size>0;swap(a,b);if(ok)return [a,b];
    }return null;
  }
  function hasPossibleMove(){return !!findPossibleMove();}
  function addPop(r,c,type,chain){popFx.push({x:bx+c*cell+cell/2,y:by+r*cell+cell/2,color:COLORS[type],life:24,max:24,chain});}
  function collapse(hit,chain){
    for(const key of hit){const [r,c]=key.split(",").map(Number);addPop(r,c,board[r][c],chain);board[r][c]=-1;}
    for(let c=0;c<COLS;c++){
      const keep=[];for(let r=ROWS-1;r>=0;r--)if(board[r][c]>=0)keep.push(board[r][c]);
      for(let r=ROWS-1,i=0;r>=0;r--,i++)board[r][c]=i<keep.length?keep[i]:Math.floor(Math.random()*TYPES);
    }
  }
  function resolve(){
    combo=0;lastPower="";let groups=findMatchGroups();
    while(groups.length){
      combo++;const power=poweredClear(groups);lastPower=power.label||lastPower;score+=power.hit.size*100*combo+(power.label?500*combo:0);collapse(power.hit,combo);host.sfx(combo>1||power.label?"matchCombo":"matchPop");groups=findMatchGroups();
    }
    bestCombo=Math.max(bestCombo,combo);
    boardKick=Math.min(10,2+combo*2);
    message=(lastPower?(host.language==="en"?lastPower:lastPower==="COLOR BURST"?"同色爆破":lastPower==="CROSS BREAK"?"十字消除":"整行消除")+" · ":"")+(combo>1?"X"+combo+" MATCH":"");
    if(mode==="campaign" && score>=target){
      status="clear";message=stage>=MAX_STAGE?(host.language==="en"?"ALL 20 STAGES CLEAR!":"20关全部通关！"):(host.language==="en"?"STAGE CLEAR!":"关卡通关！");host.sfx("matchClear");
      stageUnlocked=Math.max(stageUnlocked,Math.min(MAX_STAGE,stage+1));saveProgress();
    }else if(mode==="campaign"&&moves<=0){status="failed";message=host.language==="en"?"TRY AGAIN":"再试一次";}
    else if(!hasPossibleMove()){makeBoard();message=host.language==="en"?"RESHUFFLED":"棋盘重排！";}
  }
  function newRound(){makeBoard();selected=null;dragging=false;dragOrigin=null;score=0;status="playing";message="";combo=0;bestCombo=0;popFx=[];boardKick=0;idleFrames=0;hintPair=null;lastPower="";moves=mode==="endless"?999:stageMoves(stage);target=mode==="endless"?0:stageTarget(stage);}
  function start(nextMode){loadProgress();mode=nextMode||"campaign";stage=mode==="campaign"?Math.min(stageUnlocked,MAX_STAGE):1;newRound();host.gameMode="match3";}
  function cellAt(x,y){const c=Math.floor((x-bx)/cell),r=Math.floor((y-by)/cell);return r>=0&&r<ROWS&&c>=0&&c<COLS?{r,c}:null;}
  function attempt(a,b){
    if(status!=="playing"||!a||!b||Math.abs(a.r-b.r)+Math.abs(a.c-b.c)!==1)return false;
    swap(a,b);host.sfx("matchSwap");
    if(!findMatches().size){swap(a,b);message=host.language==="en"?"NO MATCH":"没有形成消除";boardKick=3;return false;}
    if(mode==="campaign")moves--;resolve();return true;
  }
  function pointerDown(x,y){
    if(status!=="playing")return;
    idleFrames=0;hintPair=null;
    const p=cellAt(x,y);if(!p)return;selected=p;dragging=true;dragOrigin={x,y};message="";
  }
  function pointerMove(x,y){
    if(!dragging||!selected||status!=="playing")return;
    idleFrames=0;hintPair=null;
    const dx=x-dragOrigin.x,dy=y-dragOrigin.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<cell*.32)return;
    const next=Math.abs(dx)>Math.abs(dy)?{r:selected.r,c:selected.c+(dx>0?1:-1)}:{r:selected.r+(dy>0?1:-1),c:selected.c};
    dragging=false;attempt(selected,next);selected=null;
  }
  function pointerUp(x,y){
    if(!dragging)return;dragging=false;
    const p=cellAt(x,y);
    if(p&&selected&&!(p.r===selected.r&&p.c===selected.c))attempt(selected,p);
    selected=null;
  }
  function nextStage(){if(stage<MAX_STAGE){stage++;newRound();}else start("campaign");}
  function update(){
    boardKick*=.78;for(const fx of popFx)fx.life--;popFx=popFx.filter(f=>f.life>0);
    if(status==="playing"&&!dragging){idleFrames+=1;if(idleFrames===300)hintPair=findPossibleMove();}
    if(host.justPressed("escape")){host.gameMode="event";host.eventTab="match3";host.clicked=false;return;}
    if(!host.clicked)return;
    if(host.inRect(42,580,190,44)){host.gameMode="event";host.eventTab="match3";host.clicked=false;return;}
    if(status==="clear"){
      if(host.inRect(810,492,220,48)){nextStage();host.clicked=false;return;}
      if(host.inRect(810,548,220,40)){newRound();host.clicked=false;return;}
    }else if(status==="failed"){
      if(host.inRect(810,520,220,48)){newRound();host.clicked=false;return;}
    }
    host.clicked=false;
  }
  function drawGem(g,x,y,v,sel){
    g.save();g.translate(x+cell/2,y+cell/2);const pulse=sel?1.12:1;g.scale(pulse,pulse);
    g.shadowBlur=sel?24:12;g.shadowColor=COLORS[v];g.fillStyle=COLORS[v];g.beginPath();g.arc(0,0,18,0,Math.PI*2);g.fill();
    g.fillStyle="rgba(255,255,255,.42)";g.beginPath();g.arc(-6,-7,6,0,Math.PI*2);g.fill();
    g.fillStyle="#fff";g.font="bold 20px Arial";g.textAlign="center";g.textBaseline="middle";g.fillText(SYMBOLS[v],0,1);g.restore();
  }
  function draw(){
    const g=host.ctx,W=host.W,H=host.H,ox=(Math.random()-.5)*boardKick,oy=(Math.random()-.5)*boardKick;
    const bg=g.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#111b31");bg.addColorStop(.55,"#090c17");bg.addColorStop(1,"#04060b");g.fillStyle=bg;g.fillRect(0,0,W,H);
    g.fillStyle="#fff";g.font="bold 32px "+host.FONT_UI;g.textAlign="left";g.fillText(host.language==="en"?"X4 Match!":"消消消消乐！",42,55);
    g.fillStyle="rgba(255,255,255,.52)";g.font="13px "+host.FONT_UI;g.fillText(mode==="endless"?(host.language==="en"?"ENDLESS MODE":"无尽模式 · 无限消除"):(host.language==="en"?"STAGE MODE":"关卡模式 · 第"+stage+"关"),44,78);
    g.save();g.translate(ox,oy);g.fillStyle="rgba(255,255,255,.05)";g.fillRect(bx-10,by-10,COLS*cell+20,ROWS*cell+20);g.strokeStyle="rgba(124,199,255,.32)";g.lineWidth=2;g.strokeRect(bx-10,by-10,COLS*cell+20,ROWS*cell+20);
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const x=bx+c*cell,y=by+r*cell,sel=selected&&selected.r===r&&selected.c===c;
      const hinted=hintPair&&hintPair.some(p=>p.r===r&&p.c===c);
      g.fillStyle=sel?"rgba(255,224,102,.22)":hinted?"rgba(124,199,255,.14)":"rgba(255,255,255,.045)";g.fillRect(x+2,y+2,cell-4,cell-4);g.strokeStyle=sel?"#ffe066":hinted?"rgba(124,199,255,"+(.45+Math.sin(Date.now()/180)*.18)+")":"rgba(255,255,255,.09)";g.lineWidth=sel?3:hinted?2:1;g.strokeRect(x+2,y+2,cell-4,cell-4);drawGem(g,x,y,board[r][c],sel);
    }
    for(const fx of popFx){const p=1-fx.life/fx.max;g.save();g.globalAlpha=1-p;g.strokeStyle=fx.color;g.lineWidth=3;g.beginPath();g.arc(fx.x,fx.y,12+p*34,0,Math.PI*2);g.stroke();g.fillStyle="#fff";g.font="bold 17px Arial";g.textAlign="center";g.fillText("+"+(100*fx.chain),fx.x,fx.y-18-p*20);g.restore();}
    g.restore();
    g.fillStyle="rgba(0,0,0,.38)";g.fillRect(790,92,280,390);g.strokeStyle="rgba(255,255,255,.16)";g.lineWidth=1;g.strokeRect(790,92,280,390);
    g.textAlign="left";g.fillStyle="#7cc7ff";g.font="bold 15px "+host.FONT_UI;g.fillText(mode==="endless"?(host.language==="en"?"ENDLESS SCORE":"无尽分数"):(host.language==="en"?"STAGE "+stage:"第 "+stage+" 关"),820,130);
    g.fillStyle="#fff";g.font="bold 42px Arial";g.fillText(String(score),820,176);
    if(mode!=="endless"){g.fillStyle="rgba(255,255,255,.48)";g.font="13px "+host.FONT_UI;g.fillText((host.language==="en"?"Target ":"目标 ")+target,820,204);g.fillStyle="rgba(255,255,255,.10)";g.fillRect(820,220,220,10);g.fillStyle="#ffe066";g.fillRect(820,220,220*Math.min(1,score/target),10);}
    g.fillStyle="#ffe066";g.font="bold 15px "+host.FONT_UI;g.fillText(mode==="endless"?(host.language==="en"?"NO LIMIT":"无限步数"):(host.language==="en"?"MOVES":"剩余步数"),820,270);g.fillStyle="#fff";g.font="bold 50px Arial";g.fillText(mode==="endless"?"∞":String(moves).padStart(2,"0"),820,326);
    g.fillStyle="rgba(255,255,255,.55)";g.font="13px "+host.FONT_UI;host.wrapText(host.language==="en"?"Swipe a crystal to swap. Match 4 for a line clear, 5 for a cross, and 6 for a color burst.":"滑动水晶即可交换。4连整行消除，5连十字消除，6连触发同色爆破。",820,360,220,21);
    g.fillStyle="rgba(255,255,255,.42)";g.font="12px "+host.FONT_UI;g.fillText((host.language==="en"?"BEST ":"最佳连消 ")+"X"+Math.max(1,bestCombo),820,425);
    if(message){g.fillStyle=status==="clear"?"#7cffb2":status==="failed"?"#ff8d8d":"#ffe066";g.font="bold 20px "+host.FONT_UI;g.fillText(message,820,446);}
    if(status==="clear"){host.drawBtn(stage>=MAX_STAGE?(host.language==="en"?"Replay Stage 1":"重新挑战"): (host.language==="en"?"Next Stage":"下一关"),"NEXT",810,492,220,48,true,"#ffe066");host.drawBtn(host.language==="en"?"Retry":"重新挑战","",810,548,220,40,true,"#fff");}
    else if(status==="failed")host.drawBtn(host.language==="en"?"Retry Stage":"重新挑战","",810,520,220,48,true,"#ffe066");
    host.drawBtn(host.language==="en"?"Back to Events":"返回活动","ESC",42,580,190,44,true,"#fff");
  }
  browser.PZMatch3={start,update,draw,pointerDown,pointerMove,pointerUp};
})(window);
