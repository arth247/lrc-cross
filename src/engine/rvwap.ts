import { Candle } from './types';

/**
 * Calculate True Range for ATR calculations
 */
function trueRange(high: number, low: number, prevClose: number): number {
  const tr1 = high - low;
  const tr2 = Math.abs(high - prevClose);
  const tr3 = Math.abs(low - prevClose);
  return Math.max(tr1, tr2, tr3);
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(values: number[], period: number): number[] {
  const ema = new Array(values.length).fill(NaN);
  if (values.length < period) return ema;

  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  ema[period - 1] = sum / period;

  // Calculate EMA for remaining values
  const multiplier = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }

  return ema;
}

/**
 * Calculate VWMA (Volume Weighted Moving Average)
 * Implements Pine Script's ta.vwma(src, win)
 *
 * Pine Script ta.vwma logic:
 * - If no volume data, it behaves like SMA
 * - Uses actual volume when available
 */
function calculateVWMA(candles: Candle[], source: 'close' | 'hlc3', window: number): number[] {
  const n = candles.length;
  const vwma = new Array(n).fill(NaN);

  if (n < window) return vwma;

  // Check if we have volume data
  const hasVolume = candles.some(c => c.v != null && c.v > 0);

  for (let i = window - 1; i < n; i++) {
    let sumPriceVolume = 0;
    let sumVolume = 0;

    for (let j = 0; j < window; j++) {
      const idx = i - window + 1 + j;
      const price = source === 'close' ? candles[idx].c :
                    (candles[idx].h + candles[idx].l + candles[idx].c) / 3; // hlc3

      // Pine Script behavior: if no volume, treat as SMA (volume = 1)
      const candleVolume = candles[idx].v;
      const volume: number = hasVolume && candleVolume != null ? candleVolume : 1;

      sumPriceVolume += price * volume;
      sumVolume += volume;
    }

    vwma[i] = sumVolume > 0 ? sumPriceVolume / sumVolume : NaN;
  }

  return vwma;
}

/**
 * Calculate standard deviation
 */
function calculateStdev(values: number[], period: number): number[] {
  const n = values.length;
  const stdev = new Array(n).fill(NaN);

  if (n < period) return stdev;

  for (let i = period - 1; i < n; i++) {
    let sum = 0;
    let sumSq = 0;

    for (let j = 0; j < period; j++) {
      const val = values[i - period + 1 + j];
      sum += val;
      sumSq += val * val;
    }

    const mean = sum / period;
    const variance = (sumSq / period) - (mean * mean);
    stdev[i] = Math.sqrt(Math.max(0, variance));
  }

  return stdev;
}

/**
 * Calculate RVWAP and bands
 * Implements the Pine Script logic from lines 42-58
 */
export function calculateRVWAPWithBands(
  candles: Candle[],
  window: number = 100
): {
  rvwap: number[];
  ub1: number[];
  lb1: number[];
  ub2: number[];
  lb2: number[];
  ub3: number[];
  lb3: number[];
} {
  const n = candles.length;

  // Initialize arrays
  const result = {
    rvwap: new Array(n).fill(NaN),
    ub1: new Array(n).fill(NaN),
    lb1: new Array(n).fill(NaN),
    ub2: new Array(n).fill(NaN),
    lb2: new Array(n).fill(NaN),
    ub3: new Array(n).fill(NaN),
    lb3: new Array(n).fill(NaN),
  };

  if (n < window) return result;

  // Calculate RVWAP (ta.vwma with hlc3 source)
  result.rvwap = calculateVWMA(candles, 'hlc3', window);

  // Calculate True Range values
  const trValues = new Array(n).fill(NaN);
  for (let i = 1; i < n; i++) {
    trValues[i] = trueRange(candles[i].h, candles[i].l, candles[i - 1].c);
  }

  // Calculate volAdj = ta.ema(tr(high, low, close), 100)
  const volAdj = calculateEMA(trValues, Math.min(100, n));

  // Calculate standard deviation of source (hlc3)
  const hlc3Values = candles.map(c => (c.h + c.l + c.c) / 3);
  const stdev = calculateStdev(hlc3Values, window);

  // Calculate devNew = math.avg(volAdj, stdev)
  for (let i = window - 1; i < n; i++) {
    if (!isNaN(volAdj[i]) && !isNaN(stdev[i])) {
      const devNew = (volAdj[i] + stdev[i]) / 2;

      // Calculate bands
      result.ub1[i] = result.rvwap[i] + devNew * 2.0;
      result.lb1[i] = result.rvwap[i] - devNew * 2.0;
      result.ub2[i] = result.rvwap[i] + devNew * 2.5;
      result.lb2[i] = result.rvwap[i] - devNew * 2.5;
      result.ub3[i] = result.rvwap[i] + devNew * 3.0;
      result.lb3[i] = result.rvwap[i] - devNew * 3.0;
    }
  }

  return result;
}