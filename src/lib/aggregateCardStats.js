export function aggregateCardStats(pairData) {
  const cardMap = {};

  for (const [key, data] of Object.entries(pairData)) {
    const [a, b] = key.split("|||");
    const p = data.p ?? 0;
    const c = data.c ?? 0;
    const l = data.l ?? 0;

    for (const name of [a, b]) {
      if (!cardMap[name]) {
        cardMap[name] = { pairs: 0, totalPower: 0, totalConf: 0, totalLogMult: 0 };
      }
      cardMap[name].pairs++;
      cardMap[name].totalPower += p;
      cardMap[name].totalConf += c;
      cardMap[name].totalLogMult += l;
    }
  }

  const result = Object.entries(cardMap).map(([name, stats]) => ({
    name,
    pairs: stats.pairs,
    totalPower: stats.totalPower,
    totalConf: stats.totalConf,
    totalLogMult: stats.totalLogMult,
    avgPower: stats.pairs > 0 ? stats.totalPower / stats.pairs : 0,
  }));

  result.sort((a, b) => b.avgPower - a.avgPower);
  return result;
}
