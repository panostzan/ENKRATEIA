import {request,error} from './ui.js';
let pending,busy=false;
const $=id=>document.getElementById(id);
function paint(){
  if(!pending)return;
  const left=Math.max(0,pending.readyAt-Date.now()),seconds=Math.ceil(left/1000);
  $('count').textContent=String(seconds).padStart(2,'0');
  $('progress').style.strokeDashoffset=540.354*(1-left/8000);
  $('continue').disabled=!!left||busy;$('continue').textContent=left?`Continue in ${seconds}s`:'Continue →';
  $('count-label').textContent=left?'SECONDS OF INTENTION':'YOUR CHOICE';
  if(!left)$('announcement').textContent='Continue is now available.';
}
async function refresh(){const state=await request('get');pending=state.active?.pending;if(!pending){$('count').textContent='—';$('count-label').textContent='SESSION COMPLETE';$('stay').disabled=true;$('continue').disabled=true;$('destination').textContent='You can close this tab.';return;}$('destination').textContent=`Your destination · ${pending.title}`;paint();}
async function choose(choice){try{busy=true;$('stay').disabled=true;await request('choice',{id:pending?.id,choice});}catch(e){error(e);busy=false;$('stay').disabled=false;paint();}}
$('stay').onclick=()=>choose('stay');$('continue').onclick=()=>choose('continue');
$('end').onclick=()=>request('end').catch(error);
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.active)refresh().catch(error);});
setInterval(paint,50);refresh().catch(error);
