import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { detectLrcSignals } from '../../../engine/lrc';
import { Candle, Signal } from '../../../engine/types';
import { ChartComponent } from '../chart/chart.component';
import { calculateVWAPIndicators } from '../../../engine/vwap';

@Component({
  selector: 'app-backtest',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  styles: [`
    .toolbar {
      display: flex; gap: 12px; align-items: center; padding: 8px 12px;
      background: #0f172a; color: #e2e8f0; border-bottom: 1px solid #23304a;
      position: sticky; top: 0; z-index: 10;
    }
    .toolbar label { display: flex; gap: 6px; align-items: center; }
    .toolbar input[type="number"] { width: 80px; }
    .page { height: 100%; display: flex; flex-direction: column; }
    .chart-wrap { flex: 1 1 auto; min-height: 0; }
  `],
  template: `
    <div class="page">
      <div class="toolbar">
        <label>Symbol <input [(ngModel)]="symbol"></label>
        <label>Interval <input [(ngModel)]="interval"></label>
        <label>Limit <input type="number" [(ngModel)]="limit"></label>
        <label>Length <input type="number" [(ngModel)]="length"></label>
        <label>Band k <input type="number" step="0.1" [(ngModel)]="bandMult"></label>
        <label>VWAP Win <input type="number" [(ngModel)]="vwapWindow"></label>
        <button (click)="load()">Load</button>
        <span *ngIf="candles().length">Bars: {{ candles().length }}, Signals: {{ signals().length }}</span>
      </div>

      <div class="toolbar">
        <span>Signals:</span>
        <label><input type="checkbox" [(ngModel)]="enableLrcCross"> LRC Cross</label>
        <label><input type="checkbox" [(ngModel)]="enableEarly"> Early</label>
        <label><input type="checkbox" [(ngModel)]="enableStrong"> Strong</label>
        <label><input type="checkbox" [(ngModel)]="enableSuper"> Super</label>
        <span style="margin-left: 20px;">Options:</span>
        <label><input type="checkbox" [(ngModel)]="simpleMode"> Simple Mode</label>
        <label><input type="checkbox" [(ngModel)]="useSlopeFilter"> Slope Filter</label>
        <label><input type="checkbox" [(ngModel)]="showVWAP"> Show VWAP</label>
      </div>

      <div class="chart-wrap">
        <app-lwc-chart
          [candles]="candles()"
          [signals]="signals()"
          [mid]="mid()"
          [upper]="upper()"
          [lower]="lower()"
          [vwapData]="vwapData()"
        />
      </div>
    </div>
  `,
})
export class BacktestComponent implements OnInit {
  // UI state
  symbol = 'BANKUSDT';
  interval = '120';
  limit = 500;

  length = 50;
  bandMult = 2.0;
  simpleMode = false;
  useSlopeFilter = true;

  // VWAP settings
  vwapWindow = 100;
  showVWAP = true;

  // Signal toggles
  enableLrcCross = true;
  enableEarly = true;
  enableStrong = true;
  enableSuper = true;

  // data signals
  candles = signal<Candle[]>([]);
  signals = signal<Signal[]>([]);
  mid = signal<number[]>([]);
  upper = signal<number[]>([]);
  lower = signal<number[]>([]);
  vwapData = signal<any>(null);

  constructor(private data: DataService) {}

  ngOnInit(): void {
    // initial load
    this.load();
  }

  async load() {
    const c = await this.data.fetchBybit(this.symbol, this.interval, this.limit, 'linear');

    // Calculate VWAP indicators if enabled
    let vwapResult = null;
    if (this.showVWAP) {
      vwapResult = calculateVWAPIndicators(c, this.vwapWindow);
    }

    // Detect signals with advanced options
    const res = detectLrcSignals(c, {
      length: this.length,
      bandMult: this.bandMult,
      simpleMode: this.simpleMode,
      useSlopeFilter: this.useSlopeFilter,
      signals: {
        enableLrcCross: this.enableLrcCross,
        enableEarly: this.enableEarly,
        enableStrong: this.enableStrong,
        enableSuper: this.enableSuper
      },
      lrcBandMult2: 2.0,
      lrcBandMult3: 3.0
    }, vwapResult);

    this.candles.set(c);
    this.signals.set(res.signals);
    this.mid.set(res.mid);
    this.upper.set(res.upper);
    this.lower.set(res.lower);
    this.vwapData.set(vwapResult);
  }
}
