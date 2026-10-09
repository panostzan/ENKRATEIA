import {request,duration,error} from './ui.js';
import {metrics} from './model.js';
const $=id=>document.getElementById(id);let session;
const number=new Intl.NumberFormat(undefined,{maximumFractionDigits:1});
const percent=value=>value===null?'—':number.format(value)+'%';
async function init(){
  const state=await request('get');
  const id=new URLSearchParams(location.search).get('id');
  session=state.history.find(s=>s.id===id)||(!id?state.history[0]:null);
  if(!session)throw Error('No saved session found. Start a session from the ENKRATEIA toolbar button.');
  const m=metrics(session);$('report').hidden=false;
  $('date').textContent=new Date(session.startedAt).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
  $('elapsed').textContent=duration(m.duration)+' session';
  for(const k of ['focused','average','longest'])$(k).textContent=duration(m[k]);
  $('attempts-per-hour').textContent=m.attemptsPerHour===null?'—':number.format(m.attemptsPerHour);
  $('resistance').textContent=percent(m.resistance);
  $('focus-percentage').textContent=percent(m.focusPercentage);
  $('attempt-count').textContent=m.attempts+' attempt'+(m.attempts===1?'':'s');
  const time=t=>new Date(t).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  $('start-time').textContent=time(session.startedAt);$('end-time').textContent=time(session.endedAt);
  const defaultDetail=m.duration?'Each mark is a distraction attempt. Hover or focus a period to inspect it.':'No elapsed time recorded.';
  $('timeline-detail').textContent=defaultDetail;
  const names={focus:'Focused',interruption:'Interruption',distraction:'Distraction',away:'Away'};
  // Absolute positioning preserves true duration; attempt ticks keep brief impulses visible.
  // Neither minimum widths nor gaps artificially enlarge short interruptions.
  for(const seg of m.segments){
    if(!m.duration||seg.end<=seg.start)continue;
    const el=document.createElement('div');el.className='segment '+seg.kind;
    el.style.left=(100*(seg.start-session.startedAt)/m.duration)+'%';
    el.style.width=(100*(seg.end-seg.start)/m.duration)+'%';
    const detail=names[seg.kind]+' · '+duration(seg.end-seg.start)+' · '+time(seg.start)+' – '+time(seg.end);
    el.tabIndex=0;el.setAttribute('role','img');el.setAttribute('aria-label',detail);el.title=detail;
    const show=()=>{$('timeline-detail').textContent=detail;};
    const reset=()=>{$('timeline-detail').textContent=defaultDetail;};
    el.addEventListener('mouseenter',show);el.addEventListener('focus',show);
    el.addEventListener('mouseleave',()=>{if(document.activeElement!==el)reset();});
    el.addEventListener('blur',reset);$('timeline').append(el);
  }
  for(const attempt of session.attempts){
    if(!m.duration)continue;
    const tick=document.createElement('span');tick.className='attempt-marker';
    tick.style.left=Math.min(100,Math.max(0,100*(attempt.at-session.startedAt)/m.duration))+'%';
    $('attempt-markers').append(tick);
  }
  const notes=[];
  if(!m.attempts)notes.push('No distraction attempts. Resistance rate appears when there is a choice to make.');
  if(session.endReason==='browser-restarted')notes.push('The browser restarted; this session ends at its last saved checkpoint.');
  if(session.endReason==='approved-tabs-closed')notes.push('The session ended when its last approved tab closed.');
  $('context').textContent=notes.join(' ');
}
$('export').onclick=()=>{
  const {approved,lastProductive,grant,pending,...record}=session;
  const blob=new Blob([JSON.stringify({...record,metrics:metrics(session)},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='enkrateia-'+new Date(session.startedAt).toISOString().slice(0,10)+'.json';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('clear').onclick=async()=>{
  if(!confirm('Permanently delete all locally saved ENKRATEIA sessions?'))return;
  try{await request('clear');$('report').hidden=true;$('error').textContent='Session history deleted.';}catch(e){error(e);}
};
init().catch(error);
