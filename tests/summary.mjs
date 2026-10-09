import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createSession,transition,finish} from '../extension/model.js';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const s=createSession([1],0);s.id='fixture';transition(s,'focus',0);
transition(s,'interruption',1200000,true);s.attempts.push({at:1200000,choice:'continue'});
transition(s,'distraction',1208000);transition(s,'focus',1380000);
transition(s,'interruption',2280000,true);s.attempts.push({at:2280000,choice:'stay'});
transition(s,'focus',2288000);transition(s,'away',2888000,true);finish(s,3600000);
const browser=await chromium.launch({headless:true,args:['--disable-gpu']});
try{
 const context=await browser.newContext({viewport:{width:1280,height:1100},reducedMotion:'reduce'});
 await context.route('https://summary.test/**',async route=>{
  const name=new URL(route.request().url()).pathname.slice(1);
  if(!['summary.html','summary.css','summary.js','ui.css','ui.js','type.css','model.js'].includes(name))return route.abort();
  const ext=path.extname(name);
  await route.fulfill({contentType:ext==='.js'?'text/javascript':ext==='.css'?'text/css':'text/html',body:await readFile(path.join(root,'extension',name))});
 });
 await context.addInitScript(record=>{
  window.fixture=record;window.chrome={runtime:{sendMessage:async()=>({history:[window.fixture]})}};
 },s);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://summary.test/summary.html?id=fixture');await page.locator('#report').waitFor();
 assert.equal(await page.locator('h1').innerText(),'Attention is the\nnew status symbol.');
 assert.equal(await page.locator('.subtitle').textContent(),'A record of your ability to stay.');
 const expected={longest:'20m 0s',focused:'45m 0s',average:'15m 0s','attempts-per-hour':'2',resistance:'50%','focus-percentage':'75%'};
 for(const [id,value] of Object.entries(expected))assert.equal(await page.locator('#'+id).textContent(),value);
 assert.equal(await page.locator('.hero-metric #longest').count(),1);
 assert.equal(await page.locator('.metrics > div').count(),5);
 assert.equal(await page.locator('.attempt-marker').count(),2);
 const widths=await page.locator('.segment').evaluateAll(items=>items.map(i=>parseFloat(i.style.width)));
 assert.ok(Math.abs(widths.reduce((a,b)=>a+b,0)-100)<1e-4);
 assert.ok(Math.abs(widths[1]-8/3600*100)<1e-4);
 await page.locator('.segment').first().focus();assert.match(await page.locator('#timeline-detail').textContent(),/Focused · 20m 0s/);
 await page.locator('.segment').first().blur();
 await mkdir(path.join(root,'test-results'),{recursive:true});
 await page.screenshot({path:path.join(root,'test-results','summary-refined.png'),fullPage:true});
 const download=page.waitForEvent('download');await page.locator('#export').click();
 const exported=await download;const data=JSON.parse(await readFile(await exported.path(),'utf8'));
 assert.equal(data.metrics.attemptsPerHour,2);assert.equal(data.metrics.metricsVersion,1);assert.equal(data.segments.length,7);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:path.join(root,'test-results','summary-refined-mobile.png'),fullPage:true});
 await page.evaluate(()=>{window.fixture={...window.fixture,startedAt:0,endedAt:0,since:0,segments:[],attempts:[],streaks:[],streakMs:0};});
 // Reload the renderer against the same mock record without resetting the init script.
 await page.evaluate(()=>import('./summary.js?empty'));
 await page.waitForFunction(()=>document.querySelector('#attempts-per-hour').textContent==='—');
 assert.equal(await page.locator('#focus-percentage').textContent(),'—');
 assert.equal(await page.locator('#resistance').textContent(),'—');assert.equal(await page.locator('#longest').textContent(),'0s');
 assert.deepEqual(errors,[]);
 console.log('PASS: summary hierarchy, exact metrics, proportional timeline, keyboard inspection, JSON export, mobile layout, empty-session values.');
}finally{await browser.close();}
