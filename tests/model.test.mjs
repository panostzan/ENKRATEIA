import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSession,transition,finish,metrics} from '../extension/model.js';
test('approved navigation preserves streak; countdown and distraction never count',()=>{
 const s=createSession([1,2],1000);transition(s,'focus',1000);transition(s,'focus',11000);
 transition(s,'interruption',21000,true);s.attempts.push({choice:'continue'});
 transition(s,'distraction',29000);transition(s,'focus',39000);finish(s,49000);
 const m=metrics(s);assert.equal(m.focused,30000);assert.equal(m.duration,48000);
 assert.equal(m.longest,20000);assert.equal(m.average,15000);assert.equal(m.resistance,0);
 assert.equal(m.segments.reduce((n,x)=>n+x.end-x.start,0),m.duration);
});
test('resisting an impulse still ends the streak',()=>{
 const s=createSession([1],0);transition(s,'focus',0);transition(s,'interruption',5000,true);
 s.attempts.push({choice:'stay'});transition(s,'focus',6000);finish(s,13000);
 assert.equal(metrics(s).average,6000);assert.equal(metrics(s).resistance,100);
});
test('away time is excluded and breaks continuous browsing',()=>{
 const s=createSession([1],0);transition(s,'focus',0);transition(s,'away',5000,true);
 transition(s,'focus',25000);finish(s,30000);
 assert.equal(metrics(s).focused,10000);assert.equal(metrics(s).longest,5000);
});
test('live snapshots do not mutate session or duplicate time',()=>{
 const s=createSession([1],0);transition(s,'focus',0);const before=JSON.stringify(s);
 assert.equal(metrics(s,4000).focused,4000);assert.equal(metrics(s,5000).focused,5000);
 assert.equal(JSON.stringify(s),before);assert.equal(metrics(s,0).resistance,null);
});
test('unfinished attempts are retained without overstating resistance',()=>{
 const s=createSession([1],0);s.attempts.push({choice:'stay'},{choice:null});finish(s,100);
 assert.equal(s.attempts[1].choice,'dismissed');assert.equal(metrics(s).resistance,50);
});

test('normalized metrics use elapsed session hours including away time',()=>{
 const s=createSession([1],0);transition(s,'focus',0);
 transition(s,'interruption',1200000,true);s.attempts.push({at:1200000,choice:'continue'});
 transition(s,'distraction',1208000);transition(s,'focus',1380000);
 transition(s,'interruption',2280000,true);s.attempts.push({at:2280000,choice:'stay'});
 transition(s,'focus',2288000);transition(s,'away',2888000,true);finish(s,3600000);
 const m=metrics(s);
 assert.equal(m.longest,1200000);assert.equal(m.focused,2700000);assert.equal(m.average,900000);
 assert.equal(m.attemptsPerHour,2);assert.equal(m.focusPercentage,75);assert.equal(m.metricsVersion,1);
 assert.equal(m.resistance,50);
});
test('zero-length and no-attempt sessions do not invent normalized data',()=>{
 const s=createSession([1],0);finish(s,0);let m=metrics(s);
 assert.equal(m.attemptsPerHour,null);assert.equal(m.focusPercentage,null);assert.equal(m.resistance,null);
 const reading=createSession([1],0);transition(reading,'focus',0);finish(reading,1800000);
 m=metrics(reading);assert.equal(m.attemptsPerHour,0);assert.equal(m.focusPercentage,100);assert.equal(m.resistance,null);
});
test('rates keep precision for future aggregate analysis',()=>{
 const s=createSession([1],0);s.attempts.push({choice:'stay'});finish(s,2700000);
 assert.equal(metrics(s).attemptsPerHour,4/3);
});
