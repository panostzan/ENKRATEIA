import {request,clock,error,domain} from './ui.js';
import {metrics} from './model.js';
let state, available=[];
const $=id=>document.getElementById(id);
function selections(){return [...document.querySelectorAll('input:checked')].map(e=>Number(e.value));}
function selectionChanged(){$('selected').textContent=selections().length;$('start').disabled=!selections().length;$('select-all').textContent=selections().length===available.length?'Clear selection':'Select all';}
function paint(){
  const s=state?.active;$('setup').hidden=!!s;$('live').hidden=!s;if(!s)return;
  const m=metrics(s);$('timer').textContent=clock(m.focused);
  $('streak').textContent=clock(s.streakMs+(s.mode==='focus'?Date.now()-s.since:0));
  $('attempts').textContent=m.attempts;$('status').textContent={focus:'In your workspace',away:'Focus timer paused',interruption:'A moment to choose',distraction:'Outside your workspace'}[s.mode]||'Session in progress';
  $('session-detail').textContent=`${s.approved.length} approved tab${s.approved.length===1?'':'s'} · ${clock(m.duration)} elapsed`;
}
async function init(){
  state=await request('get');available=(await chrome.tabs.query({})).filter(t=>!t.url?.startsWith(chrome.runtime.getURL('')));
  for(const t of available){const label=document.createElement('label');label.className='tab-option';
    const input=document.createElement('input');input.type='checkbox';input.value=t.id;input.checked=t.active&&t.windowId===(await chrome.windows.getLastFocused()).id;
    const copy=document.createElement('div');copy.className='tab-copy';
    const title=document.createElement('div');title.className='tab-title';title.textContent=t.title||'Untitled tab';
    const sub=document.createElement('div');sub.className='tab-domain';sub.textContent=domain(t.url);
    copy.append(title,sub);label.append(input,copy);$('tabs').append(label);input.addEventListener('change',selectionChanged);
  }
  selectionChanged();paint();
  if(state.history.length){$('previous').hidden=false;$('previous').onclick=()=>chrome.tabs.create({url:'summary.html?id='+state.history[0].id});}
}
$('select-all').onclick=()=>{const select=selections().length!==available.length;document.querySelectorAll('input').forEach(i=>i.checked=select);selectionChanged();};
$('start').onclick=async()=>{try{$('start').disabled=true;state=await request('start',{ids:selections()});paint();}catch(e){error(e);selectionChanged();}};
$('end').onclick=async()=>{try{$('end').disabled=true;await request('end');window.close();}catch(e){error(e);$('end').disabled=false;}};
chrome.storage.onChanged.addListener((changes,area)=>{if(state&&area==='local'&&changes.active){state.active=changes.active.newValue;paint();}});
setInterval(paint,250);init().catch(error);
