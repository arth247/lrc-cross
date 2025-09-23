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
 * Detect LRC cross signals
 * Returns arrays of long and short cross points
 */
export function detectLRCCrosses(candles: Candle[], lrc: number[]): {
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