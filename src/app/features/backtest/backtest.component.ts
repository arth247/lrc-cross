import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { Candle } from '../../../engine/types';
import { ChartComponent } from '../chart/chart.component';
import { calculateLRC, detectSimpleLRCCrosses, detectLRCCrossesWithBands } from '../../../engine/lrc';
import { calculateRVWAPWithBands } from '../../../engine/rvwap';

@Component({
  selector: 'app-chart-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartComponent],
  styles: [`
    .toolbar {
      display: flex; gap: 12px; align-items: center; padding: 8px 12px;
      background: #0f172a; color: #e2e8f0; border-bottom: 1px solid #23304a;
      position: sticky; top: 0; z-index: 10; flex-wrap: wrap;
    }
    .toolbar label { display: flex; gap: 6px; align-items: center; }
    .toolbar .checkbox-group { display: flex; gap: 12px; align-items: center; background: rgba(59, 130, 246, 0.1); padding: 4px 8px; border-radius: 4px; }
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
        <label>LRC Length <input type="number" [(ngModel)]="lrcLength"></label>
        <label>RVWAP Window <input type="number" [(ngModel)]="rvwapWindow"></label>
        <button (click)="load()">Load</button>
        <span *ngIf="candles().length">Bars: {{ candles().length }}</span>

        <div class="checkbox-group">
          <label>
            <input type="checkbox" [(ngModel)]="showLRCCrossOriginal" (change)="onCrossToggleChange()">
            LRC Cross (w/ Bands)
          </label>
          <label>
            <input type="checkbox" [(ngModel)]="showLRCCrossSimple" (change)="onCrossToggleChange()">
            Simple LRC Cross
          </label>
        </div>
      </div>

      <div class="chart-wrap">
        <app-lwc-chart
          [candles]="candles()"
          [lrcData]="lrcData()"
          [rvwapData]="rvwapData()"
          [lrcCrossData]="lrcCrossData()"
          [showLRCCrossOriginal]="showLRCCrossOriginal"
          [showLRCCrossSimple]="showLRCCrossSimple" />
      </div>
    </div>
  `,
})
export class BacktestComponent implements OnInit {
  // UI state
  symbol = 'BANKUSDT';
  interval = '120';
  limit = 500;
  lrcLength = 50; // Default LRC length from Pine Script
  rvwapWindow = 100; // Default RVWAP window from Pine Script

  // LRC Cross toggles
  showLRCCrossOriginal = true;
  showLRCCrossSimple = true;

  // data
  candles = signal<Candle[]>([]);
  lrcData = signal<number[]>([]);
  rvwapData = signal<any>({});
  lrcCrossData = signal<any>({});

  constructor(private data: DataService) {}

  ngOnInit(): void {
    // initial load
    this.load();
  }

  async load() {
    const c = await this.data.fetchBybit(this.symbol, this.interval, this.limit, 'linear');

    // Calculate LRC using Pine Script's ta.linreg logic
    const lrc = calculateLRC(c, this.lrcLength);

    // Calculate RVWAP and bands
    const rvwapBands = calculateRVWAPWithBands(c, this.rvwapWindow);

    // Calculate LRC cross signals
    const simpleCrosses = detectSimpleLRCCrosses(c, lrc);
    const bandCrosses = detectLRCCrossesWithBands(c, lrc, rvwapBands.lb1, rvwapBands.ub1);

    // Create numbered entries log
    const allEntries: { index: number; time: Date; type: string; price: number }[] = [];

    if (this.showLRCCrossSimple) {
      simpleCrosses.longCrosses.forEach(idx => {
        allEntries.push({
          index: idx,
          time: new Date(c[idx].t),
          type: 'Simple Long',
          price: c[idx].c
        });
      });
      simpleCrosses.shortCrosses.forEach(idx => {
        allEntries.push({
          index: idx,
          time: new Date(c[idx].t),
          type: 'Simple Short',
          price: c[idx].c
        });
      });
    }

    if (this.showLRCCrossOriginal) {
      bandCrosses.longCrosses.forEach(idx => {
        allEntries.push({
          index: idx,
          time: new Date(c[idx].t),
          type: 'Band Long',
          price: c[idx].c
        });
      });
      bandCrosses.shortCrosses.forEach(idx => {
        allEntries.push({
          index: idx,
          time: new Date(c[idx].t),
          type: 'Band Short',
          price: c[idx].c
        });
      });
    }

    // Sort by time and add entry numbers
    allEntries.sort((a, b) => a.time.getTime() - b.time.getTime());
    const numberedEntries = allEntries.map((entry, i) => ({
      ...entry,
      entryNumber: i + 1
    }));

    console.log('=== LRC Cross Entries (Numbered) ===');
    numberedEntries.forEach(entry => {
      console.log(`#${entry.entryNumber} | ${entry.type} | ${entry.time.toLocaleString()} | Price: ${entry.price.toFixed(4)}`);
    });
    console.log(`Total entries: ${numberedEntries.length}`);
    console.log('===================================');

    this.candles.set(c);
    this.lrcData.set(lrc);
    this.rvwapData.set(rvwapBands);
    this.lrcCrossData.set({
      simple: simpleCrosses,
      withBands: bandCrosses
    });
  }

  onCrossToggleChange() {
    // Trigger chart update by setting the data again
    const currentData = this.lrcCrossData();
    this.lrcCrossData.set({ ...currentData });
  }
}
