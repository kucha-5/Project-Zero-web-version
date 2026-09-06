const VERSION="1.0.0";
const FRIEND_LIMIT=15;
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, DELETE, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Max-Age":"86400"};

export default {async fetch(request,env){
  if(request.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
  try{
    if(!env.DB)throw new Error("缺少D1数据库绑定：DB");
    await ensureTables(env.DB);
    const url=new URL(request.url),path=url.pathname.replace(/\/+$/,"")||"/";
    if(path==="/api/friends/health"&&request.method==="GET")return json({success:true,service:"PZ Friends",version:VERSION});
    const session=await authenticate(request,env.DB);if(session.error)return session.error;
    if(path==="/api/support/operators"&&request.method==="GET")return supportOperators(env.DB,session.user.id,url.searchParams.get("profession")||"all",url.searchParams.get("seed")||"0");
    if(path==="/api/friends"&&request.method==="GET")return json(await friendCenter(env.DB,session.user.id));
    if(path==="/api/friends/search"&&request.method==="GET")return searchPlayers(env.DB,session.user.id,url.searchParams.get("q")||"");
    if(path==="/api/friends/request"&&request.method==="POST")return sendRequest(request,env.DB,session.user.id);
    if(path==="/api/friends/respond"&&request.method==="POST")return respondRequest(request,env.DB,session.user.id);
    if(path.startsWith("/api/friends/")&&request.method==="DELETE")return removeFriend(env.DB,session.user.id,decodeURIComponent(path.slice(13)));
    return fail(404,"NOT_FOUND","好友接口不存在");
  }catch(error){console.error("Friends Worker:",error);return fail(500,"INTERNAL_ERROR",String(error?.message||error).slice(0,300));}
}};

async function ensureTables(db){
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS pz_friend_requests_v1 (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(sender_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS pz_friendships_v1 (
      user_low TEXT NOT NULL,
      user_high TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY(user_low,user_high),
      FOREIGN KEY(user_low) REFERENCES sf_users_v2(id) ON DELETE CASCADE,
      FOREIGN KEY(user_high) REFERENCES sf_users_v2(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_pz_friend_request_receiver ON pz_friend_requests_v1(receiver_id,status,created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_pz_friend_request_sender ON pz_friend_requests_v1(sender_id,status,created_at)")
  ]);
}

async function authenticate(request,db){
  const match=(request.headers.get("Authorization")||"").match(/^Bearer\s+(.+)$/i);
  if(!match)return{error:fail(401,"AUTHENTICATION_REQUIRED","请先登录")};
  const hash=await sha256(match[1].trim()),now=unix();
  const user=await db.prepare(`SELECT u.id,u.username,u.email,u.pending_delete,s.expires_at
    FROM sf_sessions_v2 s JOIN sf_users_v2 u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.token_type='access' LIMIT 1`).bind(hash).first();
  if(!user||Number(user.expires_at)<=now)return{error:fail(401,"INVALID_SESSION","登录状态无效或已过期")};
  if(Number(user.pending_delete)===1)return{error:fail(403,"ACCOUNT_PENDING_DELETION","注销期账号无法使用好友功能")};
  return{user};
}

function publicSelect(alias="u",save="s"){
  return `${alias}.id AS account_id,${alias}.username,
    COALESCE(json_extract(${save}.save_data,'$.playerName'),${alias}.username) AS display_name,
    COALESCE(json_extract(${save}.save_data,'$.playerUID'),'--------') AS player_uid,
    COALESCE(json_extract(${save}.save_data,'$.playerLevel'),1) AS level,
    COALESCE(json_extract(${save}.save_data,'$.profileAvatarRole'),4) AS avatar_role,
    COALESCE(json_extract(${save}.save_data,'$.profileAvatarFrame'),'zero') AS avatar_frame,
    COALESCE(json_extract(${save}.save_data,'$.profileShowcase'),'[4,0,1]') AS showcase_roles`;
}
function profile(row){let showcaseRoles=[4,0,1];try{const parsed=typeof row.showcase_roles==="string"?JSON.parse(row.showcase_roles):row.showcase_roles;if(Array.isArray(parsed))showcaseRoles=parsed.slice(0,3).map(v=>Math.max(0,Math.min(5,Math.floor(Number(v)||0))));}catch(_){}return{accountId:String(row.account_id),username:String(row.username||""),displayName:String(row.display_name||row.username||"PLAYER"),playerUid:String(row.player_uid||"--------"),level:Math.max(1,Number(row.level)||1),avatarRole:Math.max(0,Number(row.avatar_role)||0),avatarFrame:String(row.avatar_frame||"zero"),showcaseRoles};}

async function profilesByIds(db,ids){
  const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return[];
  const marks=unique.map(()=>"?").join(","),result=await db.prepare(`SELECT ${publicSelect()} FROM sf_users_v2 u
    LEFT JOIN sf_saves_v2 s ON s.user_id=u.id AND s.game_id='project-zero'
    WHERE u.id IN (${marks})`).bind(...unique).all();
  const map=new Map((result.results||[]).map(r=>[String(r.account_id),profile(r)]));return unique.map(id=>map.get(String(id))).filter(Boolean);
}
async function friendCount(db,userId){const row=await db.prepare("SELECT COUNT(*) AS n FROM pz_friendships_v1 WHERE user_low=? OR user_high=?").bind(userId,userId).first();return Number(row?.n||0);}
function pair(a,b){return String(a)<String(b)?[String(a),String(b)]:[String(b),String(a)];}

async function friendCenter(db,userId){
  const rel=await db.prepare(`SELECT CASE WHEN user_low=? THEN user_high ELSE user_low END AS friend_id,created_at
    FROM pz_friendships_v1 WHERE user_low=? OR user_high=? ORDER BY created_at DESC`).bind(userId,userId,userId).all();
  const incoming=await db.prepare("SELECT id,sender_id,created_at FROM pz_friend_requests_v1 WHERE receiver_id=? AND status='pending' ORDER BY created_at DESC LIMIT 20").bind(userId).all();
  const outgoing=await db.prepare("SELECT id,receiver_id,created_at FROM pz_friend_requests_v1 WHERE sender_id=? AND status='pending' ORDER BY created_at DESC LIMIT 20").bind(userId).all();
  const friendRows=rel.results||[],inRows=incoming.results||[],outRows=outgoing.results||[];
  const all=await profilesByIds(db,[...friendRows.map(r=>r.friend_id),...inRows.map(r=>r.sender_id),...outRows.map(r=>r.receiver_id)]),map=new Map(all.map(p=>[p.accountId,p]));
  return{success:true,limit:FRIEND_LIMIT,friends:friendRows.map(r=>Object.assign({},map.get(String(r.friend_id)),{friendsSince:Number(r.created_at)})).filter(p=>p.accountId),incomingRequests:inRows.map(r=>Object.assign({},map.get(String(r.sender_id)),{requestId:r.id,requestedAt:Number(r.created_at)})).filter(p=>p.accountId),outgoingRequests:outRows.map(r=>Object.assign({},map.get(String(r.receiver_id)),{requestId:r.id,requestedAt:Number(r.created_at)})).filter(p=>p.accountId)};
}

async function searchPlayers(db,userId,raw){
  const q=String(raw||"").trim();if(q.length<2)return fail(400,"FRIEND_QUERY_TOO_SHORT","搜索内容至少2个字符");
  const like="%"+q.replace(/[\\%_]/g,"\\$&")+"%";
  const result=await db.prepare(`SELECT ${publicSelect()} FROM sf_users_v2 u LEFT JOIN sf_saves_v2 s ON s.user_id=u.id AND s.game_id='project-zero'
    WHERE u.id<>? AND COALESCE(u.pending_delete,0)=0 AND (u.id=? OR LOWER(u.username) LIKE LOWER(?) ESCAPE '\\' OR CAST(json_extract(s.save_data,'$.playerUID') AS TEXT)=? OR LOWER(CAST(json_extract(s.save_data,'$.playerName') AS TEXT)) LIKE LOWER(?) ESCAPE '\\')
    ORDER BY CASE WHEN u.id=? OR u.username=? OR CAST(json_extract(s.save_data,'$.playerUID') AS TEXT)=? THEN 0 ELSE 1 END,u.username LIMIT 12`).bind(userId,q,like,q,like,q,q,q).all();
  return json({success:true,results:(result.results||[]).map(profile)});
}

async function supportOperators(db,userId,professionRaw,seedRaw){
  const profession=["all","guard","damage","breaker","support"].includes(String(professionRaw))?String(professionRaw):"all";
  const seed=Math.max(0,Math.floor(Number(seedRaw)||0));
  const result=await db.prepare(`SELECT ${publicSelect()} FROM sf_users_v2 u
    JOIN sf_saves_v2 s ON s.user_id=u.id AND s.game_id='project-zero'
    WHERE u.id<>? AND COALESCE(u.pending_delete,0)=0
      AND json_array_length(COALESCE(json_extract(s.save_data,'$.profileShowcase'),'[]'))>0
    ORDER BY ((length(u.id)*1103515245 + ? + length(COALESCE(u.username,''))*12345) & 2147483647),u.id LIMIT 40`).bind(userId,seed*7919).all();
  const providers=(result.results||[]).map(profile),operators=[];
  const professionOf=roleId=>roleId===0?"guard":roleId===1||roleId===5?"support":roleId===2?"breaker":"damage";
  for(const provider of providers)for(const roleId of provider.showcaseRoles){
    const roleProfession=professionOf(roleId);if(profession!=="all"&&profession!==roleProfession)continue;
    operators.push({roleId,profession:roleProfession,accountId:provider.accountId,owner:provider.displayName,playerUid:provider.playerUid});
  }
  return json({success:true,profession,seed,operators:operators.slice(0,24)});
}

async function resolveTarget(db,target){
  return db.prepare(`SELECT u.id FROM sf_users_v2 u LEFT JOIN sf_saves_v2 s ON s.user_id=u.id AND s.game_id='project-zero'
    WHERE COALESCE(u.pending_delete,0)=0 AND (u.id=? OR LOWER(u.username)=LOWER(?) OR CAST(json_extract(s.save_data,'$.playerUID') AS TEXT)=?) LIMIT 1`).bind(target,target,target).first();
}
async function sendRequest(request,db,userId){
  const body=await readJson(request),targetText=String(body.target||"").trim(),target=await resolveTarget(db,targetText);
  if(!target)return fail(404,"FRIEND_TARGET_NOT_FOUND","未找到该玩家");if(target.id===userId)return fail(400,"FRIEND_SELF_REQUEST","不能添加自己");
  const [low,high]=pair(userId,target.id),existing=await db.prepare("SELECT 1 AS ok FROM pz_friendships_v1 WHERE user_low=? AND user_high=?").bind(low,high).first();
  if(existing)return fail(409,"FRIEND_ALREADY_EXISTS","已经是好友");
  if(await friendCount(db,userId)>=FRIEND_LIMIT||await friendCount(db,target.id)>=FRIEND_LIMIT)return fail(409,"FRIEND_LIMIT_REACHED","好友数量已达上限");
  const pending=await db.prepare("SELECT id FROM pz_friend_requests_v1 WHERE status='pending' AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)) LIMIT 1").bind(userId,target.id,target.id,userId).first();
  if(pending)return fail(409,"FRIEND_REQUEST_EXISTS","好友申请已经存在");
  const at=unix();await db.prepare("INSERT INTO pz_friend_requests_v1(id,sender_id,receiver_id,status,created_at,updated_at) VALUES(?,?,?,'pending',?,?)").bind(crypto.randomUUID(),userId,target.id,at,at).run();
  return json(await friendCenter(db,userId),201);
}

async function respondRequest(request,db,userId){
  const body=await readJson(request),id=String(body.requestId||""),action=body.action==="accept"?"accept":"reject",row=await db.prepare("SELECT id,sender_id,receiver_id FROM pz_friend_requests_v1 WHERE id=? AND receiver_id=? AND status='pending' LIMIT 1").bind(id,userId).first();
  if(!row)return fail(404,"FRIEND_REQUEST_NOT_FOUND","好友申请不存在或已经处理");const at=unix();
  if(action==="accept"){
    if(await friendCount(db,userId)>=FRIEND_LIMIT||await friendCount(db,row.sender_id)>=FRIEND_LIMIT)return fail(409,"FRIEND_LIMIT_REACHED","好友数量已达上限");
    const [low,high]=pair(userId,row.sender_id);await db.batch([db.prepare("INSERT OR IGNORE INTO pz_friendships_v1(user_low,user_high,created_at) VALUES(?,?,?)").bind(low,high,at),db.prepare("UPDATE pz_friend_requests_v1 SET status='accepted',updated_at=? WHERE id=? AND status='pending'").bind(at,id),db.prepare("UPDATE pz_friend_requests_v1 SET status='closed',updated_at=? WHERE status='pending' AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))").bind(at,userId,row.sender_id,row.sender_id,userId)]);
  }else await db.prepare("UPDATE pz_friend_requests_v1 SET status='rejected',updated_at=? WHERE id=? AND status='pending'").bind(at,id).run();
  return json(await friendCenter(db,userId));
}

async function removeFriend(db,userId,targetId){
  if(!targetId)return fail(400,"FRIEND_ID_REQUIRED","缺少好友ID");const [low,high]=pair(userId,targetId),result=await db.prepare("DELETE FROM pz_friendships_v1 WHERE user_low=? AND user_high=?").bind(low,high).run();
  if(!result.meta?.changes)return fail(404,"FRIEND_NOT_FOUND","好友关系不存在");return json(await friendCenter(db,userId));
}
async function readJson(request){try{const body=await request.json();if(!body||Array.isArray(body)||typeof body!=="object")throw 0;return body;}catch{throw new Error("请求JSON格式无效");}}
async function sha256(value){const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value)));return Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,"0")).join("");}
function unix(){return Math.floor(Date.now()/1000);}
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{...CORS,"Content-Type":"application/json; charset=UTF-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});}
function fail(status,code,message){return json({success:false,code,message,error:{code,message}},status);}
