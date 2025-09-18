import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { detectLrcSignals } from '../../../engine/lrc';
import { Candle, Signal } from '../../../engine/types';
import { ChartComponent } from '../chart/chart.component';

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
        <label><input type="checkbox" [(ngModel)]="simpleMode"> Simple</label>
        <label><input type="checkbox" [(ngModel)]="useSlopeFilter"> Slope filter</label>
        <button (click)="load()">Load</button>
        <span *ngIf="candles().length">Bars: {{ candles().length }}, Signals: {{ signals().length }}</span>
      </div>

      <div class="chart-wrap">
        <app-lwc-chart
          [candles]="candles()"
          [signals]="signals()"
          [mid]="mid()"
          [upper]="upper()"
          [lower]="lower()"
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

  // data signals
  candles = signal<Candle[]>([]);
  signals = signal<Signal[]>([]);
  mid = signal<number[]>([]);
  upper = signal<number[]>([]);
  lower = signal<number[]>([]);

  constructor(private data: DataService) {}

  ngOnInit(): void {
    // initial load
    this.load();
  }

  async load() {
    const c = await this.data.fetchBybit(this.symbol, this.interval, this.limit, 'linear');
    const res = detectLrcSignals(c, {
      length: this.length,
      bandMult: this.bandMult,
      simpleMode: this.simpleMode,
      useSlopeFilter: this.useSlopeFilter,
    });

    this.candles.set(c);
    this.signals.set(res.signals);
    this.mid.set(res.mid);
    this.upper.set(res.upper);
    this.lower.set(res.lower);
  }
}
