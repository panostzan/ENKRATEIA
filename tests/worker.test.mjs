import {test} from 'node:test';
import assert from 'node:assert/strict';
function harness(saved={},session={boot:true}) {
 const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn)},fire(...args){for(const fn of this.listeners)fn(...args)}});
 const events={message:event(),activated:event(),updated:event(),removed:event(),replaced:event(),focus:event(),idle:event(),alarm:event(),startup:event(),installed:event()};
 const tabs=new Map([[1,{id:1,windowId:1,index:0,active:true,url:'https://work.test',title:'Work'}],[2,{id:2,windowId:1,index:1,active:false,url:'https://draft.test',title:'Draft'}],[3,{id:3,windowId:1,index:2,active:false,url:'https://other.test',title:'Other'}]]);
 let next=10,focused=true,locked=false;
 const local=structuredClone(saved),sessionStore=structuredClone(session);
 const storage=data=>({async get(keys){if(typeof keys==='string')keys=[keys];return Object.fromEntries(keys.map(k=>[k,structuredClone(data[k])]))},async set(value){Object.assign(data,structuredClone(value))}});
 const chrome={
 storage:{local:storage(local),session:storage(sessionStore)},
 action:{async setBadgeText(){},async setBadgeBackgroundColor(){}},
 runtime:{getURL:p=>'chrome-extension://test/'+p,onMessage:events.message,onStartup:events.startup,onInstalled:events.installed},
 idle:{async queryState(){return locked?'locked':'active'},onStateChanged:events.idle},
 alarms:{async create(){},async clear(){},onAlarm:events.alarm},
 windows:{async getLastFocused(){return {id:1,focused}},async update(){focused=true;events.focus.fire(1)},onFocusChanged:events.focus},
 tabs:{
 async get(id){if(!tabs.has(id))throw Error('closed');return {...tabs.get(id)}},
 async query(filter){return [...tabs.values()].filter(t=>(filter.active===undefined||t.active===filter.active)&&(filter.windowId===undefined||filter.windowId===t.windowId))},
 async update(id,patch){const t=tabs.get(id);if(!t)throw Error('closed');if(patch.active){for(const x of tabs.values())x.active=false;}Object.assign(t,patch);if(patch.active)events.activated.fire({tabId:id,windowId:1});return {...t}},
 async create(p){const id=next++;if(p.active!==false)for(const x of tabs.values())x.active=false;const t={id,windowId:1,index:tabs.size,active:p.active!==false,...p};tabs.set(id,t);if(t.active)events.activated.fire({tabId:id,windowId:1});return {...t}},
 async remove(id){if(!tabs.delete(id))throw Error('closed');if(![...tabs.values()].some(t=>t.active)&&tabs.size)tabs.values().next().value.active=true;events.removed.fire(id)},
 async sendMessage(){},
 onActivated:events.activated,onUpdated:events.updated,onRemoved:events.removed,onReplaced:events.replaced
 }};
 const send=(type,data={})=>new Promise(resolve=>events.message.listeners[0]({type,...data},{},resolve));
 return {chrome,tabs,local,send,events,blur(){focused=false;events.focus.fire(-1)},focus(){focused=true;events.focus.fire(1)},lock(value){locked=value;events.idle.fire(value?'locked':'active')}};
}
let clock=100000;
const originalNow=Date.now;
test('worker coordinates gating, blur, lock, closures, direct return, and enforcement',async()=>{
 Date.now=()=>clock;
 const h=harness();globalThis.chrome=h.chrome;await import('../extension/background.js?mock=flow');
 try {
  let s=await h.send('start',{ids:[1,2]});assert.equal(s.active.mode,'focus');
  clock+=5000;h.blur();s=await h.send('get');assert.equal(s.active.mode,'away');
  clock+=20000;h.focus();s=await h.send('get');assert.equal(s.active.mode,'focus');
  clock+=1000;h.lock(true);s=await h.send('get');assert.equal(s.active.mode,'away');
  clock+=10000;h.lock(false);s=await h.send('get');assert.equal(s.active.mode,'focus');
  clock+=1000;await h.chrome.tabs.update(3,{active:true});s=await h.send('get');
  const p={...s.active.pending};assert.equal(s.active.attempts.length,1);
  const early=await h.send('choice',{id:p.id,choice:'continue'});assert.match(early.error,/eight/);
  await h.chrome.tabs.remove(p.gateId);s=await h.send('get');
  // Closing the gate selected the approved tab; this is a direct return, not a Stay choice.
  assert.equal(s.active.attempts[0].choice,'returned');assert.equal(s.active.mode,'focus');
  await h.chrome.tabs.update(3,{active:true});s=await h.send('get');const p2={...s.active.pending};
  await h.chrome.tabs.remove(3);s=await h.send('get');assert.equal(s.active.pending,null);
  assert.equal(s.active.attempts[1].choice,'dismissed');
  await h.chrome.tabs.remove(2);s=await h.send('get');assert.deepEqual(s.active.approved,[1]);
  clock+=1000;await h.send('end');s=await h.send('get');assert.equal(s.active,null);
  const finished=s.history[0];assert.equal(finished.pending,null);
  assert.equal(finished.segments.filter(x=>x.kind==='away').reduce((n,x)=>n+x.end-x.start,0),30000);
  assert.ok(finished.segments.filter(x=>x.kind==='focus').reduce((n,x)=>n+x.end-x.start,0)<10000);
 } finally {Date.now=originalNow;}
});
test('worker suspension preserves active state; full restart ends at checkpoint',async()=>{
 const {createSession}=await import('../extension/model.js');
 const active=createSession([1],100);active.checkpoint=500;active.mode='focus';active.since=100;
 let h=harness({active,history:[]},{boot:true});globalThis.chrome=h.chrome;
 await import('../extension/background.js?mock=resume');let s=await h.send('get');
 assert.equal(s.active.id,active.id);assert.equal(s.history.length,0);
 h=harness({active,history:[]},{});globalThis.chrome=h.chrome;
 await import('../extension/background.js?mock=restart');s=await h.send('get');
 assert.equal(s.active,null);assert.equal(s.history[0].endedAt,500);
 assert.equal(s.history[0].endReason,'browser-restarted');
});
