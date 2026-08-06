(function(){
  "use strict";
  const query=new URLSearchParams(location.search);
  const fromLauncher=String(query.get("accountApiUrl")||"").trim();
  const stored=String(localStorage.getItem("pz_account_api_base")||"").trim();
  const production="https://sf-account.yuyangchen2014.workers.dev";
  window.PZ_ACCOUNT_API_BASE=(fromLauncher||stored||production).replace(/\/$/,"");
  if(fromLauncher) localStorage.setItem("pz_account_api_base",window.PZ_ACCOUNT_API_BASE);
})();
