export interface Candle {
  t: number;  // ms epoch (bar open)
  o: number; h: number; l: number; c: number; v?: number;
}
