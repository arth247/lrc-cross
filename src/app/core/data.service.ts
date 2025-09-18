// src/app/core/data.service.ts
import { Injectable } from '@angular/core';
import type { Candle } from '../../engine/types';

@Injectable({ providedIn: 'root' })
export class DataService {
  // Pick one:
  private base = 'http://localhost:8080';

  async fetchBinance(symbol: string, interval = '2h', limit = 500, market: 'spot' | 'futures' = 'spot'): Promise<Candle[]> {
    const url = `${this.base}/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&market=${market}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance error: ${res.status}`);
    return await res.json() as Candle[];
  }

  async fetchBybit(symbol: string, interval = '120', limit = 500, category: 'linear' | 'spot' | 'inverse' | 'option' = 'linear'): Promise<Candle[]> {
    const url = `${this.base}/api/bybit/kline?symbol=${symbol}&interval=${interval}&limit=${limit}&category=${category}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Bybit error: ${res.status}`);
    return await res.json() as Candle[];
  }
}
