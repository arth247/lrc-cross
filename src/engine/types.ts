export interface Candle {
  t: number;  // ms epoch (bar open)
  o: number; h: number; l: number; c: number; v?: number;
}

export type Side = 'long' | 'short';

export interface Signal {
  time: number;        // ms epoch of signal bar close
  side: Side;
  reason: 'LRC_CROSS' | 'LRC_SIMPLE';
  price: number;
  addOn?: boolean;
}

export interface LrcConfig {
  length: number;        // regression length (e.g., 50)
  bandMult: number;      // k * std(residuals)
  simpleMode: boolean;   // true -> Simple Cross rules
  useSlopeFilter: boolean; // false -> allow both directions regardless of slope
}
