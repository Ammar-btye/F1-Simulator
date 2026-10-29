import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildField,simulate,cleanLaps} from '../dist/model.js';
const data=JSON.parse(await readFile(new URL('../dist/data/2024.json',import.meta.url)));
test('forecasts exclude the selected race and all later results',()=>{
 const before=buildField(data.races,12);
 const changed=structuredClone(data.races);
 changed.filter(r=>+r.round>=12).forEach(r=>r.Results.forEach(x=>x.position='99'));
 assert.deepEqual(before,buildField(changed,12));
 assert.equal(before.history.length,11);
 assert.equal(buildField(data.races,1).field.length,0);
});
test('win probabilities total 100% and podium probabilities total 300%',()=>{
 const {field}=buildField(data.races,12);
 let seed=1234;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 const results=simulate(field,3000,5,random);
 assert.equal(results.length,20);
 assert.ok(Math.abs(results.reduce((s,x)=>s+x.win,0)-100)<1e-8);
 assert.ok(Math.abs(results.reduce((s,x)=>s+x.podium,0)-300)<1e-8);
 results.forEach(x=>{assert.ok(x.win<=x.podium);assert.ok(x.avgPosition>=1&&x.avgPosition<=20)});
});
test('pace filter removes pit-out laps, null records and slow outliers',()=>{
 const laps=[90,91,92,91,90,145,null].map(lap_duration=>({lap_duration,is_pit_out_lap:false}));
 laps.push({lap_duration:91,is_pit_out_lap:true});
 assert.equal(cleanLaps(laps).length,5);
 assert.deepEqual(cleanLaps([]),[]);
});
test('cached datasets contain unique drivers per race and complete calendars',async()=>{
 for(const year of [2024,2026]){
  const d=JSON.parse(await readFile(new URL(`../dist/data/${year}.json`,import.meta.url)));
  assert.ok(d.schedule.length>=20);
  for(const r of d.races){assert.equal(new Set(r.Results.map(x=>x.Driver.driverId)).size,r.Results.length);assert.ok(r.Results.length>=19)}
 }
});

const {pitScenario,stopWindow,projectedClassification}=await import('../dist/strategy.js');
test('unmodified pit strategy preserves recorded times exactly',()=>{
 const stops=[{lap:'20'},{lap:'40'}];
 for(const index of [0,1]) {
  const s=pitScenario({stops,index,totalLaps:60,targetLap:+stops[index].lap});
  assert.equal(s.delta,0);
  assert.ok(s.timeline.every(x=>x.delta===0));
 }
});
test('a two-lap delay accounts for two extra laps on slower tyres and extra pit time',()=>{
 const params={stops:[{lap:'20'}],index:0,totalLaps:60,oldDegradation:0,newDegradation:0,freshAdvantage:1};
 assert.equal(pitScenario({...params,targetLap:22}).delta,2);
 assert.equal(pitScenario({...params,targetLap:18}).delta,-2);
 assert.equal(pitScenario({...params,targetLap:22,pitLossDelta:3}).delta,5);
});
test('pit scenarios cannot cross another recorded stop or use invalid inputs',()=>{
 const stops=[{lap:20},{lap:40}];
 assert.deepEqual(stopWindow(stops,0,60),{original:20,previous:0,next:40,min:1,max:39});
 assert.throws(()=>pitScenario({stops,index:0,totalLaps:60,targetLap:40}));
 assert.throws(()=>pitScenario({stops,index:1,totalLaps:60,targetLap:20}));
 assert.throws(()=>pitScenario({stops,index:0,totalLaps:60,targetLap:22,oldDegradation:NaN}));
});
test('zero-delta classification preserves official order and time gain can change the winner',()=>{
 const results=[{Driver:{driverId:'a'},position:'1',laps:'60',status:'Finished',Time:{millis:'6000000'}},{Driver:{driverId:'b'},position:'2',laps:'60',status:'Finished',Time:{millis:'6001000'}},{Driver:{driverId:'c'},position:'3',laps:'59',status:'+1 Lap'},{Driver:{driverId:'d'},position:'4',laps:'40',status:'Retired'}];
 assert.deepEqual(projectedClassification(results,'b',0).rows.map(x=>x.position),[1,2,3,4]);
 const changed=projectedClassification(results,'b',-2);
 assert.equal(changed.position,1);assert.equal(changed.rows[0].result.Driver.driverId,'b');assert.equal(changed.rows[2].result.Driver.driverId,'c');
 assert.equal(projectedClassification(results,'d',-1000).supported,false);
});
test('recorded 2026 finishing order is reproduced when no strategy changes',async()=>{
 const d=JSON.parse(await readFile(new URL('../dist/data/2026.json',import.meta.url)));
 const results=d.races.at(-1).Results;
 const c=projectedClassification(results,results[0].Driver.driverId,0);
 assert.equal(c.supported,true);
 assert.deepEqual(c.rows.map(x=>x.result.Driver.driverId),results.map(x=>x.Driver.driverId));
});
