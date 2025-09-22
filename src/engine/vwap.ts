import { Candle } from './types';

/**
 * Calculate True Range for a candle (matching Pine's tr() function)
 */
function trueRange(current: Candle, previous: Candle | null): number {
  const hl = current.h - current.l;
  if (!previous) return hl;

  const hc = Math.abs(current.h - previous.c);
  const lc = Math.abs(current.l - previous.c);
  return Math.max(hl, hc, lc);
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function ema(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return result;

  const alpha = 2 / (period + 1);

  // Start with SMA for initial value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += values[i];
  }
  result[period - 1] = sum / period;

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    result[i] = alpha * values[i] + (1 - alpha) * result[i - 1];
  }

  return result;
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function sma(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return result;

  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - j];
    }
    result[i] = sum / period;
  }

  return result;
}

/**
 * Calculate standard deviation
 */
function stdev(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  const means = sma(values, period);

  for (let i = period - 1; i < values.length; i++) {
    let sumSquares = 0;
    const mean = means[i];

    for (let j = 0; j < period; j++) {
      const diff = values[i - j] - mean;
      sumSquares += diff * diff;
    }

    result[i] = Math.sqrt(sumSquares / period);
  }

  return result;
}

/**
 * Calculate Rolling VWAP (Volume Weighted Average Price)
 * Matches Pine script's ta.vwma(src, win)
 */
export function rollingVWAP(candles: Candle[], window: number): number[] {
  const result: number[] = new Array(candles.length).fill(NaN);

  if (candles.length < window) return result;

  for (let i = window - 1; i < candles.length; i++) {
    let sumPriceVolume = 0;
    let sumVolume = 0;

    for (let j = 0; j < window; j++) {
      const candle = candles[i - j];
      const hlc3 = (candle.h + candle.l + candle.c) / 3;
      const volume = candle.v || 0;

      sumPriceVolume += hlc3 * volume;
      sumVolume += volume;
    }

    result[i] = sumVolume > 0 ? sumPriceVolume / sumVolume : NaN;
  }

  return result;
}

/**
 * Calculate VWAP bands based on adjusted volatility
 * Matches Pine script's devNew calculation
 */
export function calculateVWAPBands(
  candles: Candle[],
  rvwap: number[],
  window: number
): {
  ub1: number[];
  lb1: number[];
  ub2: number[];
  lb2: number[];
  ub3: number[];
  lb3: number[];
  ub4: number[];
  lb4: number[];
  ub5: number[];
  lb5: number[];
} {
  const n = candles.length;

  // Calculate True Range for volatility adjustment
  const trValues: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    trValues[i] = trueRange(candles[i], i > 0 ? candles[i - 1] : null);
  }

  // Calculate volatility adjustment (matching Pine's volAdj)
  const volAdj = ema(trValues, 100);

  // Calculate source values (HLC3)
  const hlc3Values = candles.map(c => (c.h + c.l + c.c) / 3);

  // Calculate standard deviation
  const stdevValues = stdev(hlc3Values, window);

  // Calculate devNew (average of volAdj and stdev)
  const devNew: number[] = new Array(n).fill(NaN);
  for (let i = 0; i < n; i++) {
    if (!isNaN(volAdj[i]) && !isNaN(stdevValues[i])) {
      devNew[i] = (volAdj[i] + stdevValues[i]) / 2;
    }
  }

  // Calculate bands at different multipliers
  const bands = {
    ub1: new Array(n).fill(NaN),
    lb1: new Array(n).fill(NaN),
    ub2: new Array(n).fill(NaN),
    lb2: new Array(n).fill(NaN),
    ub3: new Array(n).fill(NaN),
    lb3: new Array(n).fill(NaN),
    ub4: new Array(n).fill(NaN),
    lb4: new Array(n).fill(NaN),
    ub5: new Array(n).fill(NaN),
    lb5: new Array(n).fill(NaN),
  };

  for (let i = 0; i < n; i++) {
    if (!isNaN(rvwap[i]) && !isNaN(devNew[i])) {
      const dev = devNew[i];
      const vwap = rvwap[i];

      bands.ub1[i] = vwap + dev * 2.0;
      bands.lb1[i] = vwap - dev * 2.0;
      bands.ub2[i] = vwap + dev * 2.5;
      bands.lb2[i] = vwap - dev * 2.5;
      bands.ub3[i] = vwap + dev * 3.0;
      bands.lb3[i] = vwap - dev * 3.0;
      bands.ub4[i] = vwap + dev * 3.5;
      bands.lb4[i] = vwap - dev * 3.5;
      bands.ub5[i] = vwap + dev * 4.0;
      bands.lb5[i] = vwap - dev * 4.0;
    }
  }

  return bands;
}

/**
 * Main VWAP calculation function with all indicators
 */
export interface VWAPResult {
  rvwap: number[];
  sma: number[];
  ema: number[];
  bands: {
    ub1: number[];
    lb1: number[];
    ub2: number[];
    lb2: number[];
    ub3: number[];
    lb3: number[];
    ub4: number[];
    lb4: number[];
    ub5: number[];
    lb5: number[];
  };
}

export function calculateVWAPIndicators(
  candles: Candle[],
  vwapWindow: number = 100,
  smaLength: number = 21,
  emaLength: number = 45
): VWAPResult {
  // Calculate RVWAP
  const rvwap = rollingVWAP(candles, vwapWindow);

  // Calculate SMA and EMA on close prices
  const closePrices = candles.map(c => c.c);
  const smaValues = sma(closePrices, smaLength);
  const emaValues = ema(closePrices, emaLength);

  // Calculate VWAP bands
  const bands = calculateVWAPBands(candles, rvwap, vwapWindow);

  return {
    rvwap,
    sma: smaValues,
    ema: emaValues,
    bands
  };
}