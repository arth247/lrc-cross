import { Candle, Signal, SignalReason, SignalToggles } from './types';
import { VWAPResult } from './vwap';

/**
 * Advanced signal detection matching Pine script logic
 *
 * Signal Types from Pine:
 * - Early: Price outside LRC band 2 but within VWAP band 1 (cloud)
 * - Strong: Price breaks outside VWAP band 1
 * - Super: Price reaches LRC band 3 (dotted line in Pine)
 * - LRC Cross: Price crosses LRC midline
 */

export interface SignalDetectionParams {
  candles: Candle[];
  lrcMid: number[];
  lrcUpper: number[];
  lrcLower: number[];
  lrcUpper2?: number[];  // LRC band 2
  lrcLower2?: number[];
  lrcUpper3?: number[];  // LRC band 3
  lrcLower3?: number[];
  vwapData?: VWAPResult | null;
  toggles: SignalToggles;
}

export function detectAdvancedSignals(params: SignalDetectionParams): Signal[] {
  const {
    candles,
    lrcMid,
    lrcUpper,
    lrcLower,
    lrcUpper2,
    lrcLower2,
    lrcUpper3,
    lrcLower3,
    vwapData,
    toggles
  } = params;

  const signals: Signal[] = [];

  // Need at least 2 candles for comparisons
  if (candles.length < 2) return signals;

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i];
    const prevCandle = candles[i - 1];

    // Get indicator values at current index
    const mid = lrcMid[i];
    const upper = lrcUpper[i];
    const lower = lrcLower[i];
    const upper2 = lrcUpper2?.[i];
    const lower2 = lrcLower2?.[i];
    const upper3 = lrcUpper3?.[i];
    const lower3 = lrcLower3?.[i];

    // Skip if no valid LRC data
    if (isNaN(mid) || isNaN(upper) || isNaN(lower)) continue;

    // Get VWAP bands if available
    const vwapUb1 = vwapData?.bands.ub1[i];
    const vwapLb1 = vwapData?.bands.lb1[i];
    const rvwap = vwapData?.rvwap[i];

    // Pine script conditions translated:
    // priceInCloud = close > lb1 and close < ub1
    const priceInCloud = vwapLb1 && vwapUb1 &&
                         candle.c > vwapLb1 && candle.c < vwapUb1;

    // EARLY SIGNALS
    // earlyLongCondition = close < pEnd - i_lrvalue_2 * stdDev
    // earlyLong = earlyLongCondition and priceInCloud
    if (toggles.enableEarly && upper2 && lower2) {
      const earlyLongCondition = candle.c < lower2;
      const earlyShortCondition = candle.c > upper2;

      if (earlyLongCondition && priceInCloud) {
        signals.push({
          time: candle.t,
          side: 'long',
          reason: 'EARLY',
          price: candle.c
        });
      }

      if (earlyShortCondition && priceInCloud) {
        signals.push({
          time: candle.t,
          side: 'short',
          reason: 'EARLY',
          price: candle.c
        });
      }
    }

    // STRONG SIGNALS
    // lowerBreakCondition = close < lb1 and close < pEnd - i_lrvalue_2 * stdDev
    // upperBreakCondition = close > ub1 and close > pEnd + i_lrvalue_2 * stdDev
    if (toggles.enableStrong && vwapLb1 && vwapUb1 && upper2 && lower2) {
      const lowerBreakCondition = candle.c < vwapLb1 && candle.c < lower2;
      const upperBreakCondition = candle.c > vwapUb1 && candle.c > upper2;

      if (lowerBreakCondition) {
        signals.push({
          time: candle.t,
          side: 'long',
          reason: 'STRONG',
          price: candle.c
        });
      }

      if (upperBreakCondition) {
        signals.push({
          time: candle.t,
          side: 'short',
          reason: 'STRONG',
          price: candle.c
        });
      }
    }

    // SUPER SIGNALS
    // priceInDottedLineLong = low < endPrice - i_lrvalue_3 * stdDev and low < lb1
    // priceInDottedLineShort = high > endPrice + i_lrvalue_3 * stdDev and high > ub1
    if (toggles.enableSuper && vwapLb1 && vwapUb1 && upper3 && lower3) {
      const priceInDottedLineLong = candle.l < lower3 && candle.l < vwapLb1;
      const priceInDottedLineShort = candle.h > upper3 && candle.h > vwapUb1;

      if (priceInDottedLineLong) {
        signals.push({
          time: candle.t,
          side: 'long',
          reason: 'SUPER',
          price: candle.c
        });
      }

      if (priceInDottedLineShort) {
        signals.push({
          time: candle.t,
          side: 'short',
          reason: 'SUPER',
          price: candle.c
        });
      }
    }

    // LRC CROSS SIGNALS (from original implementation)
    if (toggles.enableLrcCross) {
      const prevMid = lrcMid[i - 1];
      if (!isNaN(prevMid)) {
        const crossedUp = (prevCandle.c <= prevMid && candle.c > mid);
        const crossedDown = (prevCandle.c >= prevMid && candle.c < mid);

        if (crossedUp) {
          signals.push({
            time: candle.t,
            side: 'long',
            reason: 'LRC_CROSS',
            price: candle.c
          });
        }

        if (crossedDown) {
          signals.push({
            time: candle.t,
            side: 'short',
            reason: 'LRC_CROSS',
            price: candle.c
          });
        }
      }
    }
  }

  return signals;
}

/**
 * Helper function to calculate additional LRC bands
 * Multiplies the residual std by different factors for band levels
 */
export function calculateMultipleLrcBands(
  mid: number[],
  residStd: number[],
  mult1: number,
  mult2: number,
  mult3: number
) {
  const n = mid.length;

  return {
    upper1: mid.map((m, i) => isNaN(m) ? NaN : m + mult1 * (residStd[i] ?? 0)),
    lower1: mid.map((m, i) => isNaN(m) ? NaN : m - mult1 * (residStd[i] ?? 0)),
    upper2: mid.map((m, i) => isNaN(m) ? NaN : m + mult2 * (residStd[i] ?? 0)),
    lower2: mid.map((m, i) => isNaN(m) ? NaN : m - mult2 * (residStd[i] ?? 0)),
    upper3: mid.map((m, i) => isNaN(m) ? NaN : m + mult3 * (residStd[i] ?? 0)),
    lower3: mid.map((m, i) => isNaN(m) ? NaN : m - mult3 * (residStd[i] ?? 0))
  };
}