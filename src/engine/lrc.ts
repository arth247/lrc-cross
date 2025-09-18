import { Candle, Signal, LrcConfig } from './types';
import { rollingLinReg } from './linreg';

/**
 * Compute LRC arrays and detect LRC Cross / Simple Cross signals.
 * This mirrors Pine semantics:
 * - Cross up if close crosses above midline on this bar
 * - Cross down if close crosses below midline on this bar
 * - Slope/cloud filters applied unless simpleMode
 * - Signal time is bar close (candle.t of current bar)
 */
export function detectLrcSignals(candles: Candle[], cfg: LrcConfig): { signals: Signal[]; mid:number[]; upper:number[]; lower:number[]; slope:number[] } {
  const close = candles.map(c => c.c);
  const { mid, residStd, slope } = rollingLinReg(close, cfg.length);
  const upper = mid.map((m,i)=> isNaN(m) ? NaN : m + cfg.bandMult * (residStd[i] ?? 0));
  const lower = mid.map((m,i)=> isNaN(m) ? NaN : m - cfg.bandMult * (residStd[i] ?? 0));

  const signals: Signal[] = [];
  for (let i=1; i<candles.length; i++) {
    const c0 = candles[i-1], c1 = candles[i];
    const m0 = mid[i-1], m1 = mid[i];
    if (Number.isNaN(m0) || Number.isNaN(m1)) continue;

    const crossedUp   = (c0.c <= m0 && c1.c > m1);
    const crossedDown = (c0.c >= m0 && c1.c < m1);

    const upAllowed = cfg.simpleMode || !cfg.useSlopeFilter || (slope[i] ?? 0) > 0;
    const dnAllowed = cfg.simpleMode || !cfg.useSlopeFilter || (slope[i] ?? 0) < 0;

    if (crossedUp && upAllowed) {
      signals.push({ time: c1.t, side: 'long', reason: cfg.simpleMode ? 'LRC_SIMPLE' : 'LRC_CROSS', price: c1.c });
    } else if (crossedDown && dnAllowed) {
      signals.push({ time: c1.t, side: 'short', reason: cfg.simpleMode ? 'LRC_SIMPLE' : 'LRC_CROSS', price: c1.c });
    }
  }
  return { signals, mid, upper, lower, slope };
}
