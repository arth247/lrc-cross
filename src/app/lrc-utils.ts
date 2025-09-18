// src/app/lrc-utils.ts
export type OHLC = { time: number | string | Date; open: number; high: number; low: number; close: number };

export type LrcPoint = {
  time: number;               // unix seconds
  mid: number;
  upper: number;
  lower: number;
};

function toUnix(time: OHLC['time']): number {
  if (typeof time === 'number') return time;
  if (time instanceof Date) return Math.floor(time.getTime() / 1000);
  // ISO 8601 string
  return Math.floor(new Date(time).getTime() / 1000);
}

/**
 * Linear Regression Channel (mid, upper, lower)
 * length = lookback bars, mult = stdev multiplier for bands
 */
export function computeLRC(data: OHLC[], length = 100, mult = 2): LrcPoint[] {
  const out: LrcPoint[] = [];
  if (!data?.length || data.length < length) return out;

  // use closes
  const closes = data.map(d => ({ t: toUnix(d.time), c: d.close }));

  for (let i = length - 1; i < closes.length; i++) {
    const win = closes.slice(i - length + 1, i + 1);
    const n = win.length;
    // x: 0..n-1
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let j = 0; j < n; j++) {
      const x = j;
      const y = win[j].c;
      sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
    }
    const denom = (n * sumXX - sumX * sumX) || 1;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // midline value at the last x (n-1)
    const mid = intercept + slope * (n - 1);

    // stdev of residuals
    let sumSq = 0;
    for (let j = 0; j < n; j++) {
      const fit = intercept + slope * j;
      const resid = win[j].c - fit;
      sumSq += resid * resid;
    }
    const stdev = Math.sqrt(sumSq / n);

    out.push({
      time: closes[i].t,
      mid,
      upper: mid + mult * stdev,
      lower: mid - mult * stdev,
    });
  }

  return out;
}

/** Split midline into 2 arrays for slope-based coloring */
export function splitMidBySlope(lrc: LrcPoint[]) {
  const up: { time: number; value: number }[] = [];
  const down: { time: number; value: number }[] = [];

  for (let i = 0; i < lrc.length; i++) {
    const prev = lrc[i - 1];
    const cur = lrc[i];
    if (!prev) {
      // seed as gap
      up.push({ time: cur.time, value: Number.NaN });
      down.push({ time: cur.time, value: Number.NaN });
      continue;
    }
    const rising = cur.mid >= prev.mid;
    if (rising) {
      up.push({ time: cur.time, value: cur.mid });
      down.push({ time: cur.time, value: Number.NaN });
    } else {
      up.push({ time: cur.time, value: Number.NaN });
      down.push({ time: cur.time, value: cur.mid });
    }
  }
  return { up, down };
}

/** Build “cloud” candles (fills between lower/upper using candlestick bodies) */
export function buildCloudCandles(lrc: LrcPoint[]) {
  return lrc.map(p => ({
    time: p.time,
    open: p.lower,
    close: p.upper,
    high: p.upper, // kill wicks by matching
    low: p.lower,
  }));
}

/** Find price crossovers with the midline (close vs mid) */
export function findMidCrossMarkers(data: OHLC[], lrc: LrcPoint[]) {
  // index LRC by time for quick lookup
  const map = new Map<number, LrcPoint>();
  for (const p of lrc) map.set(p.time, p);
  const markers: {
    time: number;
    position: 'aboveBar' | 'belowBar';
    color: string;
    shape: 'arrowUp' | 'arrowDown';
    text: string;
    size?: number;
  }[] = [];

  function toUnixLocal(t: any): number {
    if (typeof t === 'number') return t;
    if (t instanceof Date) return Math.floor(t.getTime() / 1000);
    return Math.floor(new Date(t).getTime() / 1000);
  }

  for (let i = 1; i < data.length; i++) {
    const t0 = toUnixLocal(data[i - 1].time);
    const t1 = toUnixLocal(data[i].time);
    const l0 = map.get(t0);
    const l1 = map.get(t1);
    if (!l0 || !l1) continue;

    const c0 = data[i - 1].close;
    const c1 = data[i].close;

    const prevAbove = c0 > l0.mid;
    const nowAbove = c1 > l1.mid;

    if (prevAbove !== nowAbove) {
      if (nowAbove) {
        markers.push({
          time: t1,
          position: 'belowBar',
          color: 'rgba(38,166,154,0.9)',
          shape: 'arrowUp',
          text: 'LRC↑',
          size: 0.8,
        });
      } else {
        markers.push({
          time: t1,
          position: 'aboveBar',
          color: 'rgba(239,83,80,0.9)',
          shape: 'arrowDown',
          text: 'LRC↓',
          size: 0.8,
        });
      }
    }
  }
  return markers;
}
