(() => {
  let shield;
  function set(blocked) {
    if(!blocked){shield?.remove();shield=null;return;}
    if(shield || !document.documentElement)return;
    shield=document.createElement('div');shield.dataset.enkrateiaShield='';
    shield.style.cssText='all:initial;position:fixed;inset:0;z-index:2147483647;background:#10110f;color:#eeeee8;display:grid;place-items:center;font:14px system-ui;letter-spacing:4px;pointer-events:auto;';
    shield.textContent='ENKRATEIA';document.documentElement.append(shield);
  }
  function guard(){chrome.runtime.sendMessage({type:'guard'}).then(r=>set(r?.blocked)).catch(()=>set(false));}
  chrome.runtime.onMessage.addListener(m=>{if(m.type==='shield')set(m.blocked);});
  for(const name of ['keydown','pointerdown','click','wheel','touchstart'])document.addEventListener(name,e=>{
    if(shield){e.preventDefault();e.stopImmediatePropagation();}
  },{capture:true,passive:false});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)guard();});
  if(document.documentElement)guard();else document.addEventListener('DOMContentLoaded',guard,{once:true});
})();
