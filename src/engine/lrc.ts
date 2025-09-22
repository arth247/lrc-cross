import { Candle, Signal, LrcConfig } from './types';
import { rollingLinReg } from './linreg';
import { detectAdvancedSignals, calculateMultipleLrcBands } from './signals';
import { VWAPResult } from './vwap';

/**
 * Compute LRC arrays and detect all signal types.
 * Enhanced to support Early/Strong/Super signals from Pine script
 */
export function detectLrcSignals(
  candles: Candle[],
  cfg: LrcConfig,
  vwapData?: VWAPResult | null
): {
  signals: Signal[];
  mid: number[];
  upper: number[];
  lower: number[];
  slope: number[];
  bands?: {
    upper2: number[];
    lower2: number[];
    upper3: number[];
    lower3: number[];
  };
} {
  const close = candles.map(c => c.c);
  const { mid, residStd, slope } = rollingLinReg(close, cfg.length);

  // Calculate primary bands (level 1)
  const upper = mid.map((m, i) => isNaN(m) ? NaN : m + cfg.bandMult * (residStd[i] ?? 0));
  const lower = mid.map((m, i) => isNaN(m) ? NaN : m - cfg.bandMult * (residStd[i] ?? 0));

  // Calculate additional band levels if needed for advanced signals
  let bands;
  if (cfg.signals && (cfg.signals.enableEarly || cfg.signals.enableStrong || cfg.signals.enableSuper)) {
    const mult2 = cfg.lrcBandMult2 ?? 2.0;  // Default to 2x for band 2
    const mult3 = cfg.lrcBandMult3 ?? 3.0;  // Default to 3x for band 3

    const multipleBands = calculateMultipleLrcBands(
      mid,
      residStd,
      cfg.bandMult,
      mult2,
      mult3
    );

    bands = {
      upper2: multipleBands.upper2,
      lower2: multipleBands.lower2,
      upper3: multipleBands.upper3,
      lower3: multipleBands.lower3
    };
  }

  let signals: Signal[] = [];

  // If signal toggles are provided, use advanced detection
  if (cfg.signals) {
    signals = detectAdvancedSignals({
      candles,
      lrcMid: mid,
      lrcUpper: upper,
      lrcLower: lower,
      lrcUpper2: bands?.upper2,
      lrcLower2: bands?.lower2,
      lrcUpper3: bands?.upper3,
      lrcLower3: bands?.lower3,
      vwapData,
      toggles: cfg.signals
    });
  } else {
    // Fallback to simple LRC cross detection for backward compatibility
    for (let i = 1; i < candles.length; i++) {
      const c0 = candles[i - 1], c1 = candles[i];
      const m0 = mid[i - 1], m1 = mid[i];
      if (Number.isNaN(m0) || Number.isNaN(m1)) continue;

      const crossedUp = (c0.c <= m0 && c1.c > m1);
      const crossedDown = (c0.c >= m0 && c1.c < m1);

      const upAllowed = cfg.simpleMode || !cfg.useSlopeFilter || (slope[i] ?? 0) > 0;
      const dnAllowed = cfg.simpleMode || !cfg.useSlopeFilter || (slope[i] ?? 0) < 0;

      if (crossedUp && upAllowed) {
        signals.push({
          time: c1.t,
          side: 'long',
          reason: cfg.simpleMode ? 'LRC_SIMPLE' : 'LRC_CROSS',
          price: c1.c
        });
      } else if (crossedDown && dnAllowed) {
        signals.push({
          time: c1.t,
          side: 'short',
          reason: cfg.simpleMode ? 'LRC_SIMPLE' : 'LRC_CROSS',
          price: c1.c
        });
      }
    }
  }

  return { signals, mid, upper, lower, slope, bands };
}
