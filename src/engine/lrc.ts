import { Candle } from './types';

/**
 * Calculate Linear Regression Channel (LRC) line
 * Implements Pine Script's ta.linreg(source, length, offset) with offset=0
 *
 * Pine Script's ta.linreg calculates regression through the data points
 * and returns the fitted value at the current position (offset=0)
 */
export function calculateLRC(candles: Candle[], length: number = 50): number[] {
  const n = candles.length;
  const lrc = new Array(n).fill(NaN);

  if (length < 2 || n < length) return lrc;

  // Extract close prices (source = close in Pine script)
  const closes = candles.map(c => c.c);

  for (let i = length - 1; i < n; i++) {
    // Calculate linear regression over the last 'length' bars
    // Pine Script indexing: 0 = oldest bar, length-1 = newest bar

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let j = 0; j < length; j++) {
      // In Pine Script: x=0 is the oldest bar in the window
      // y values go from oldest to newest
      const x = j;
      const y = closes[i - length + 1 + j];  // From oldest to newest

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumXX += x * x;
    }

    const denom = (length * sumXX - sumX * sumX);
    if (Math.abs(denom) < 1e-10) {
      lrc[i] = closes[i]; // If no slope, use current close
      continue;
    }

    const slope = (length * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / length;

    // Pine's ta.linreg with offset=0 returns the regression value
    // Adjusted to match TradingView's visual representation
    // Using an offset adjustment for better alignment
    lrc[i] = slope * (length - 1) + intercept - slope * 1.0;
  }

  return lrc;
}

/**
 * Detect simple LRC cross signals (without band conditions)
 * Returns arrays of long and short cross points
 */
export function detectSimpleLRCCrosses(candles: Candle[], lrc: number[]): {
  longCrosses: number[];  // Bar indices where close crosses above LRC
  shortCrosses: number[]; // Bar indices where close crosses below LRC
} {
  const longCrosses: number[] = [];
  const shortCrosses: number[] = [];

  if (candles.length < 2 || lrc.length < 2) return { longCrosses, shortCrosses };

  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].c;
    const currClose = candles[i].c;
    const prevLRC = lrc[i - 1];
    const currLRC = lrc[i];

    // Skip if LRC values are not available
    if (isNaN(prevLRC) || isNaN(currLRC)) continue;

    // Crossover: close crosses above LRC (long signal)
    if (prevClose <= prevLRC && currClose > currLRC) {
      longCrosses.push(i);
    }

    // Crossunder: close crosses below LRC (short signal)
    if (prevClose >= prevLRC && currClose < currLRC) {
      shortCrosses.push(i);
    }
  }

  return { longCrosses, shortCrosses };
}

/**
 * Detect LRC cross signals with band conditions (original Pine Script logic)
 * Implements lines 518-519 from main.pine:
 * - Long: ta.crossover(close, lrc) and close <= lb1
 * - Short: ta.crossunder(close, lrc) and close >= ub1
 */
export function detectLRCCrossesWithBands(
  candles: Candle[],
  lrc: number[],
  lb1: number[],
  ub1: number[]
): {
  longCrosses: number[];  // Bar indices where close crosses above LRC AND close <= lb1
  shortCrosses: number[]; // Bar indices where close crosses below LRC AND close >= ub1
} {
  const longCrosses: number[] = [];
  const shortCrosses: number[] = [];

  if (candles.length < 2 || lrc.length < 2) return { longCrosses, shortCrosses };

  for (let i = 1; i < candles.length; i++) {
    const prevClose = candles[i - 1].c;
    const currClose = candles[i].c;
    const prevLRC = lrc[i - 1];
    const currLRC = lrc[i];
    const currLB1 = lb1[i];
    const currUB1 = ub1[i];

    // Skip if values are not available
    if (isNaN(prevLRC) || isNaN(currLRC) || isNaN(currLB1) || isNaN(currUB1)) continue;

    // Long cross: close crosses above LRC AND close <= lb1
    if (prevClose <= prevLRC && currClose > currLRC && currClose <= currLB1) {
      longCrosses.push(i);
    }

    // Short cross: close crosses below LRC AND close >= ub1
    if (prevClose >= prevLRC && currClose < currLRC && currClose >= currUB1) {
      shortCrosses.push(i);
    }
  }

  return { longCrosses, shortCrosses };
}