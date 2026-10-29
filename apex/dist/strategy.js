// Conditional tyre-age sensitivity model anchored to recorded finishing times.
// This is not a causal replay: opponents, track conditions and incidents stay fixed.
export function stopWindow(stops, index, totalLaps) {
  if (!stops[index]) throw new Error('Choose a recorded pit stop.');
  const lap = +stops[index].lap;
  const previous = index ? +stops[index-1].lap : 0;
  const next = index+1 < stops.length ? +stops[index+1].lap : totalLaps;
  return { original:lap, previous, next, min:previous+1, max:Math.min(totalLaps-1,next-1) };
}
export function pitScenario({stops,index,totalLaps,targetLap,oldDegradation=.07,newDegradation=.05,freshAdvantage=.8,pitLossDelta=0}) {
  const window=stopWindow(stops,index,totalLaps);
  if (![targetLap,oldDegradation,newDegradation,freshAdvantage,pitLossDelta].every(Number.isFinite)) throw new Error('All scenario inputs must be finite numbers.');
  if (!Number.isInteger(targetLap)||targetLap<window.min||targetLap>window.max) throw new Error(`Choose a pit lap from ${window.min} to ${window.max}, without crossing another stop.`);
  if (oldDegradation<0||newDegradation<0||freshAdvantage<0) throw new Error('Tyre assumptions must be non-negative.');
  const cost=(lap,pit)=>lap<=pit ? oldDegradation*(lap-window.previous-1) : -freshAdvantage+newDegradation*(lap-pit-1);
  let delta=0;const timeline=[];
  for(let lap=window.previous+1;lap<=window.next;lap++) {
    delta+=cost(lap,targetLap)-cost(lap,window.original);
    if(lap===targetLap)delta+=pitLossDelta;
    timeline.push({lap,delta});
  }
  return {delta:Math.abs(delta)<1e-9?0:delta,timeline,window,targetLap};
}
export function projectedClassification(results,driverId,delta) {
  if (!Number.isFinite(delta)) throw new Error('Invalid race time change.');
  const leaderLaps=Math.max(...results.map(r=>+r.laps));
  const winner=results.find(r=>+r.position===1);
  const winnerTime=+winner?.Time?.millis;
  const timeOf=r=>{const millis=+r.Time?.millis;return Number.isFinite(millis)&&millis>0?(millis<winnerTime?winnerTime+millis:millis):null};
  const comparable=r=>+r.laps===leaderLaps&&r.status==='Finished'&&timeOf(r)!==null;
  const selected=results.find(r=>r.Driver.driverId===driverId);
  if(!selected||!comparable(selected))return {supported:false,rows:results.map(r=>({result:r,position:+r.position,change:0})),position:null};
  const field=results.filter(comparable).map(r=>({result:r,total:timeOf(r)+(r.Driver.driverId===driverId?delta*1000:0)})).sort((a,b)=>a.total-b.total||+a.result.position-+b.result.position);
  const slots=results.filter(comparable).map(r=>+r.position).sort((a,b)=>a-b);
  const rank=new Map(field.map((r,i)=>[r.result.Driver.driverId,slots[i]]));
  const rows=results.map(r=>({result:r,position:rank.get(r.Driver.driverId)??+r.position,change:+r.position-(rank.get(r.Driver.driverId)??+r.position)})).sort((a,b)=>a.position-b.position);
  return {supported:true,rows,position:rank.get(driverId)};
}
