export interface Candle {
  t: number;  // ms epoch (bar open)
  o: number; h: number; l: number; c: number; v?: number;
}

export type Side = 'long' | 'short';

export type SignalReason =
  | 'LRC_CROSS'
  | 'LRC_SIMPLE'
  | 'EARLY'
  | 'STRONG'
  | 'SUPER';

export interface Signal {
  time: number;        // ms epoch of signal bar close
  side: Side;
  reason: SignalReason;
  price: number;
  addOn?: boolean;
}

export interface SignalToggles {
  enableLrcCross: boolean;
  enableEarly: boolean;
  enableStrong: boolean;
  enableSuper: boolean;
}

export interface LrcConfig {
  length: number;        // regression length (e.g., 50)
  bandMult: number;      // k * std(residuals)
  simpleMode: boolean;   // true -> Simple Cross rules
  useSlopeFilter: boolean; // false -> allow both directions regardless of slope
  signals?: SignalToggles;  // which signals to enable
  lrcLength2?: number;   // second LRC length (for PChannel2)
  lrcBandMult2?: number; // second LRC band multiplier
  lrcBandMult3?: number; // third band level multiplier (for super signals)
}
