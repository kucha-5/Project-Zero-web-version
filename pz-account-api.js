(function(){
  "use strict";
  const REFRESH_KEY="pz_sf_refresh_token";
  const USER_KEY="pz_sf_account_user";
  let accessToken="";
  let refreshToken=localStorage.getItem(REFRESH_KEY)||"";
  let user=null;
  try{ user=JSON.parse(localStorage.getItem(USER_KEY)||"null"); }catch(_){ user=null; }

  function base(){ return String(window.PZ_ACCOUNT_API_BASE||"").replace(/\/$/,""); }
  function enabled(){ return /^https?:\/\//i.test(base()); }
  async function request(path,options={},retry=true){
    if(!enabled()) throw new Error("ACCOUNT_API_NOT_CONFIGURED");
    const headers=Object.assign({"Content-Type":"application/json"},options.headers||{});
    if(accessToken) headers.Authorization="Bearer "+accessToken;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    let response;
    try{ response=await fetch(base()+path,Object.assign({},options,{headers,signal:controller.signal})); }
    catch(error){ throw new Error(error&&error.name==="AbortError"?"ACCOUNT_API_TIMEOUT":"ACCOUNT_API_OFFLINE"); }
    finally{ clearTimeout(timer); }
    if(response.status===401&&retry&&refreshToken&&path!=="/api/auth/refresh"){
      await refresh();
      return request(path,options,false);
    }
    const body=await response.json().catch(()=>({}));
    if(!response.ok){
      const errorBody=body&&body.error&&typeof body.error==="object"?body.error:{};
      const detail=errorBody.message||body.error;
      const error=new Error(String(body.message||detail||body.code||("HTTP_"+response.status)));
      error.code=String(body.code||errorBody.code||("HTTP_"+response.status));
      error.status=response.status;
      throw error;
    }
    return body;
  }
  function remember(payload){
    accessToken=String(payload.accessToken||accessToken||"");
    refreshToken=String(payload.refreshToken||refreshToken||"");
    user=payload.user||user;
    if(refreshToken) localStorage.setItem(REFRESH_KEY,refreshToken); else localStorage.removeItem(REFRESH_KEY);
    if(user) localStorage.setItem(USER_KEY,JSON.stringify(user)); else localStorage.removeItem(USER_KEY);
    return user;
  }
  async function refresh(){
    if(!refreshToken) throw new Error("NO_ACCOUNT_SESSION");
    const body=await request("/api/auth/refresh",{method:"POST",body:JSON.stringify({refreshToken})},false);
    remember(body); return body;
  }
  async function restore(){
    if(!enabled()||!refreshToken) return null;
    try{ await refresh(); return user; }catch(_){ clear(); return null; }
  }
  function deletionTimeMs(value){
    const n=Number(value||0);
    if(!Number.isFinite(n)||n<=0) return 0;
    return n<1000000000000?n*1000:n;
  }
  function accountMeta(body){
    const payload=body&&typeof body==="object"?body:{};
    const account=payload.account&&typeof payload.account==="object"?payload.account:{};
    const scheduled=deletionTimeMs(account.deleteAt!==undefined?account.deleteAt:payload.deleteAt);
    const pendingValue=account.pendingDeletion!==undefined?account.pendingDeletion:payload.deletionPending;
    const pending=pendingValue===undefined?scheduled>0:Boolean(pendingValue);
    const identity=payload.user&&typeof payload.user==="object"?payload.user:{};
    if(Object.keys(identity).length)remember({user:Object.assign({},user||{},identity)});
    return Object.assign({},user||{},identity,account,{
      pendingDeletion:pending,
      deletionPending:pending,
      deleteAt:scheduled||null,
      deletionScheduledAt:scheduled||null,
      remainingSeconds:Number(account.remainingSeconds!==undefined?account.remainingSeconds:payload.remainingSeconds)||0
    });
  }
  async function health(){
    if(!enabled()) return false;
    try{ const r=await request("/api/health",{method:"GET"},false); return !!(r.success||r.ok); }catch(_){ return false; }
  }
  async function login(identifier,password){
    const body=await request("/api/auth/login",{method:"POST",body:JSON.stringify({identifier,password})},false);
    remember(body); return body;
  }
  async function logout(){
    try{ if(refreshToken) await request("/api/auth/logout",{method:"POST",body:JSON.stringify({refreshToken})},false); }catch(_){}
    clear();
  }
  function clear(){ accessToken="";refreshToken="";user=null;localStorage.removeItem(REFRESH_KEY);localStorage.removeItem(USER_KEY); }
  const post=(path,data)=>request(path,{method:"POST",body:JSON.stringify(data)},false);
  window.PZAccount={
    enabled,health,restore,login,logout,clear,
    requestCode:email=>post("/api/auth/request-code",{email}),
    verifyCode:(email,code)=>post("/api/auth/verify-code",{email,code}),
    async completeRegistration(verificationToken,password){
      const body=await post("/api/auth/complete-registration",{verificationToken,password});remember(body);return body;
    },
    async getSave(){
      const body=await request("/api/saves?gameId=project-zero",{method:"GET"});
      const save=body.save||null;
      if(!save) return null;
      return {
        game_id:save.gameId||"project-zero",
        save_data:save.saveData,
        save_schema_version:Number(save.saveSchemaVersion||1),
        updated_at:Number(save.updatedAt||0)
      };
    },
    putSave:(saveData,saveSchemaVersion)=>request("/api/saves",{method:"PUT",body:JSON.stringify({gameId:"project-zero",saveData,saveSchemaVersion})}),
    async getAccount(){
      const body=await request("/api/account/meta",{method:"GET"});
      return accountMeta(body);
    },
    async requestDeletion(){ const body=await request("/api/account/request-deletion",{method:"POST",body:"{}"});return accountMeta(body); },
    async cancelDeletion(){ const body=await request("/api/account/cancel-deletion",{method:"POST",body:"{}"});return accountMeta(body); },
    get user(){return user;}, get configured(){return enabled();}
  };
})();
