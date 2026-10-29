// Transparent baseline, not a trained or calibrated probability model.
export function buildField(races, round, formWeight = .6) {
  const history = races.filter(r => +r.round < +round).sort((a,b) => +a.round - +b.round);
  if (!history.length) return { field: [], history };
  const latest = history.at(-1).Results;
  const field = latest.map(result => {
    const id = result.Driver.driverId;
    const entries = history.flatMap(r => r.Results.filter(x => x.Driver.driverId === id));
    const recent = entries.slice(-5);
    const avg = (xs, key) => xs.reduce((s,x) => s + (+x[key] || 22), 0) / xs.length;
    const recentPos = avg(recent,'position');
    const seasonPos = avg(entries,'position');
    const grid = avg(recent,'grid');
    const teammates = history.slice(-5).flatMap(r => r.Results.filter(x => x.Constructor.constructorId === result.Constructor.constructorId));
    const team = avg(teammates,'position');
    const score = .72 * (formWeight * recentPos + (1 - formWeight) * seasonPos) + .18 * grid + .10 * team;
    const dnf = recent.filter(x => !/^Finished$|^\+\d+ Lap/.test(x.status)).length / recent.length;
    return { id, driver: result.Driver, team: result.Constructor, score, dnf, recentPos, entries };
  });
  return { field, history };
}
export function simulate(field, runs = 10000, variability = 5, random = Math.random) {
  if (!field.length) return [];
  const tally = field.map(d => ({...d, wins:0, podiums:0, positionSum:0}));
  for (let i = 0; i < runs; i++) {
    const order = tally.map((d,index) => {
      const u = Math.max(random(), .000001), v = random();
      const noise = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      const retirement = random() < .025 + d.dnf * .18 ? 20 : 0;
      return {index, value: d.score + noise * (1 + variability * .65) + retirement};
    }).sort((a,b) => a.value - b.value);
    order.forEach((d,p) => { const t = tally[d.index]; t.positionSum += p + 1; if (p===0) t.wins++; if(p<3) t.podiums++; });
  }
  return tally.map(d => ({...d, win: d.wins/runs*100, podium:d.podiums/runs*100, avgPosition:d.positionSum/runs})).sort((a,b) => b.win-a.win || a.avgPosition-b.avgPosition);
}
export function cleanLaps(laps) {
  const valid = laps.filter(l => Number.isFinite(l.lap_duration) && l.lap_duration > 0 && !l.is_pit_out_lap);
  if (!valid.length) return [];
  const sorted = valid.map(x => x.lap_duration).sort((a,b) => a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  // Excludes obvious pit/safety-car laps; no fuel or tyre correction.
  return valid.filter(x => x.lap_duration >= median * .85 && x.lap_duration <= median * 1.10);
}
