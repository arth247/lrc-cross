import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { Candle } from '../../../engine/types';
import { ChartComponent } from '../chart/chart.component';

@Component({
  selector: 'app-chart-viewer',
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
    .page { height: 100vh; display: flex; flex-direction: column; }
    .chart-wrap { flex: 1 1 auto; min-height: 0; }
  `],
  template: `
    <div class="page">
      <div class="toolbar">
        <label>Symbol <input [(ngModel)]="symbol"></label>
        <label>Interval <input [(ngModel)]="interval"></label>
        <label>Limit <input type="number" [(ngModel)]="limit"></label>
        <button (click)="load()">Load</button>
        <span *ngIf="candles().length">Bars: {{ candles().length }}</span>
      </div>

      <div class="chart-wrap">
        <app-lwc-chart [candles]="candles()" />
      </div>
    </div>
  `,
})
export class BacktestComponent implements OnInit {
  // UI state
  symbol = 'BANKUSDT';
  interval = '120';
  limit = 500;

  // data
  candles = signal<Candle[]>([]);

  constructor(private data: DataService) {}

  ngOnInit(): void {
    // initial load
    this.load();
  }

  async load() {
    const c = await this.data.fetchBybit(this.symbol, this.interval, this.limit, 'linear');
    this.candles.set(c);
  }
}
