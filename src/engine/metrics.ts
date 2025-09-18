import { Candle, Signal } from './types';

export interface FirstTouch {
  [targetPct: string]: number | null; // bars to first touch
}

export function computeMfeMaeOverNBars(candles: Candle[], signals: Signal[], nBars: number) {
  // Placeholder: implement using your production logic
  // For each signal, compute MFE/MAE within next nBars using highs/lows.
  return [];
}

export function computeEntryToEntryExcursions(candles: Candle[], signals: Signal[]) {
  // Placeholder: implement best/worst move until next signal
  return [];
}

export function winRateExclusive(firstTouches: Array<{[k:string]: number|null}>, totalSignals: number, windows: Array<[number,number]>) {
  // Placeholder: distribute first-touch timing into mutually exclusive windows
  return {};
}

export function winRateCumulative(firstTouches: Array<{[k:string]: number|null}>, totalSignals: number, cutoffs: number[]) {
  // Placeholder: cumulative <= cutoff bars
  return {};
}
