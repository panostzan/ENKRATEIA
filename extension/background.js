import {createSession, transition, finish, WAIT} from './model.js';
const gateBase = chrome.runtime.getURL('gate.html');
let state, queue = Promise.resolve();
async function load() {
  if (state) return;
  const data = await chrome.storage.local.get(['active','history']);
  state = {active: data.active ?? null, history: data.history ?? []};
  const {boot} = await chrome.storage.session.get('boot');
  if (!boot && state.active) {
    state.history.unshift(finish(state.active, state.active.checkpoint, 'browser-restarted'));
    state.active = null;
  }
  await chrome.storage.session.set({boot:true});
  await save();
}
async function save() {
  await chrome.storage.local.set(state);
  await chrome.action.setBadgeText({text: state.active ? '•' : ''});
  await chrome.action.setBadgeBackgroundColor({color:'#20221f'});
}
function run(fn) {
  const result = queue.then(async()=>{await load(); return fn();});
  queue = result.catch(console.error); return result;
}
async function tab(id) {try {return await chrome.tabs.get(id);} catch {return null;}}
function isGate(t) {return t?.url?.startsWith(gateBase);}
async function shield(id, blocked) {try {await chrome.tabs.sendMessage(id,{type:'shield',blocked});} catch {}}
async function removeGate(p) {if(p?.gateId) try {await chrome.tabs.remove(p.gateId);}catch{}}
function resolvePending(choice) {
  const s = state.active, p = s.pending;
  if (p) {const a = s.attempts.find(a=>a.id===p.id); if(a && !a.choice) {a.choice=choice;a.resolvedAt=Date.now();}}
  s.pending=null; return p;
}
async function activate(id) {
  const t = await tab(id); if(!t) return false;
  await chrome.tabs.update(id,{active:true});
  await chrome.windows.update(t.windowId,{focused:true}); return true;
}
async function reconcile() {
  const s=state.active; if(!s) return;
  const win = await chrome.windows.getLastFocused();
  if (!win.focused || await chrome.idle.queryState(60)==='locked') {transition(s,'away',Date.now(),true);await save();return;}
  const [t] = await chrome.tabs.query({active:true,windowId:win.id});
  if(!t) {transition(s,'away',Date.now(),true);await save();return;}
  if(isGate(t)) {transition(s,'interruption');await save();return;}
  if(s.approved.includes(t.id)) {
    const p = s.pending ? resolvePending('returned') : null;
    s.grant=null; s.lastProductive=t.id; transition(s,'focus');
    await save(); await shield(t.id,false); await removeGate(p); return;
  }
  if(s.grant===t.id) {transition(s,'distraction');await save();await shield(t.id,false);return;}
  s.grant=null;
  if(s.pending && s.pending.targetId!==t.id) {
    const old=resolvePending('dismissed'); await removeGate(old);
  }
  transition(s,'interruption',Date.now(),true);
  if(!s.pending) {
    const id=crypto.randomUUID(), now=Date.now();
    s.attempts.push({id,at:now,choice:null});
    s.pending={id,targetId:t.id,windowId:t.windowId,readyAt:now+WAIT,title:t.title||'Your destination'};
  }
  await save(); await shield(t.id,true);
  const existing = await tab(s.pending.gateId);
  if(existing) await chrome.tabs.update(existing.id,{active:true});
  else {
    const gate=await chrome.tabs.create({windowId:t.windowId,index:t.index+1,url:gateBase,active:true});
    s.pending.gateId=gate.id;await save();
  }
}
async function end(reason='ended') {
  const s=state.active;if(!s)return null;
  const p=s.pending;finish(s,Date.now(),reason);state.history.unshift(s);state.active=null;
  await save();await chrome.alarms.clear('checkpoint');
  const tabs=await chrome.tabs.query({});await Promise.all(tabs.map(t=>shield(t.id,false)));
  await removeGate(p);return s.id;
}
async function handle(m,sender) {
  if(m.type==='guard') {
    const s=state.active,t=sender.tab;
    return {blocked:!!(s&&t&&!s.approved.includes(t.id)&&s.grant!==t.id)};
  }
  if(m.type==='get') return state;
  if(m.type==='start') {
    if(state.active) throw Error('A session is already running.');
    const all=await chrome.tabs.query({});
    const ids=[...new Set(m.ids)].filter(id=>all.some(t=>t.id===id&&!t.url?.startsWith(chrome.runtime.getURL(''))));
    if(!ids.length) throw Error('Select at least one open tab.');
    state.active=createSession(ids);await save();
    await chrome.alarms.create('checkpoint',{periodInMinutes:0.5});
    await activate(ids[0]);await reconcile();return state;
  }
  if(m.type==='end') {
    const id=await end();if(id)await chrome.tabs.create({url:chrome.runtime.getURL('summary.html')+'?id='+id});return {ok:true};
  }
  if(m.type==='choice') {
    const s=state.active,p=s?.pending;
    if(!p || m.id!==p.id) throw Error('This interruption has already ended.');
    if(!['stay','continue'].includes(m.choice)) throw Error('Unknown choice.');
    if(m.choice==='continue'&&Date.now()<p.readyAt) throw Error('Take the full eight seconds.');
    if(m.choice==='stay') {
      const ids=[s.lastProductive,...s.approved]; let destination;
      for(const id of ids) if(await tab(id)){destination=id;break;}
      if(!destination) {await end('approved-tabs-closed');return {ok:true};}
      resolvePending('stay');s.grant=null;await save();await activate(destination);
    } else {
      if(!await tab(p.targetId)) {resolvePending('dismissed');await save();await removeGate(p);await reconcile();return {ok:true};}
      resolvePending('continue');s.grant=p.targetId;await save();
      await shield(p.targetId,false);await activate(p.targetId);
    }
    await removeGate(p);await reconcile();return {ok:true};
  }
  if(m.type==='clear') {if(state.active)throw Error('End your session first.');state.history=[];await save();return {ok:true};}
  throw Error('Unknown request.');
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  run(()=>handle(m,sender)).then(reply,e=>reply({error:e.message}));return true;
});
chrome.tabs.onActivated.addListener(()=>run(reconcile));
chrome.windows.onFocusChanged.addListener(()=>run(reconcile));
chrome.idle.onStateChanged.addListener(()=>run(reconcile));
chrome.tabs.onUpdated.addListener((id,change,t)=>{
  if(change.title || (t.active && (change.status==='loading'||change.url))) run(async()=>{
    if(state.active?.pending?.targetId===id && change.title) {
      state.active.pending.title=t.title||'Your destination'; await save();
    }
    if(t.active && (change.status==='loading'||change.url)) await reconcile();
  });
});
chrome.tabs.onRemoved.addListener(id=>run(async()=>{
  const s=state.active;if(!s)return;
  s.approved=s.approved.filter(x=>x!==id);
  if(!s.approved.length) {const sessionId=await end('approved-tabs-closed');await chrome.tabs.create({url:chrome.runtime.getURL('summary.html')+'?id='+sessionId});return;}
  if(s.pending?.targetId===id) {const p=resolvePending('dismissed');await removeGate(p);}
  if(s.pending?.gateId===id) s.pending.gateId=null;
  await save();await reconcile();
}));
chrome.tabs.onReplaced.addListener((added,removed)=>run(async()=>{
  const s=state.active;if(!s)return;
  s.approved=s.approved.map(id=>id===removed?added:id);
  if(s.lastProductive===removed)s.lastProductive=added;
  if(s.grant===removed)s.grant=added;
  if(s.pending?.targetId===removed)s.pending.targetId=added;
  await save();await reconcile();
}));
chrome.alarms.onAlarm.addListener(()=>run(async()=>{await reconcile();if(state.active){state.active.checkpoint=Date.now();await save();}}));
chrome.runtime.onStartup.addListener(()=>run(async()=>{}));
chrome.runtime.onInstalled.addListener(()=>run(async()=>{}));
