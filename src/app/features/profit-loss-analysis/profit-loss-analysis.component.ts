import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Candle } from '../../../engine/types';

interface EntryAnalysis {
  entryNumber: number;
  type: string;
  entryPrice: number;
  entryTime: Date;
  maxProfit: number;
  maxLoss: number;
  candleIndex: number;
}

type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-profit-loss-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .analysis-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #f8f9fa;
      border-top: 2px solid #dee2e6;
    }

    .controls {
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .controls label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }

    .controls input {
      width: 80px;
      padding: 4px 8px;
      border: 1px solid #ced4da;
      border-radius: 4px;
    }

    .table-container {
      flex: 1;
      overflow-y: auto;
      padding: 0 16px 16px 16px;
    }

    .analysis-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .analysis-table th {
      background: #495057;
      color: white;
      padding: 8px 12px;
      text-align: left;
      font-weight: 500;
      font-size: 14px;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .sortable {
      cursor: pointer;
      user-select: none;
    }

    .sortable:hover {
      background: #5a6268;
    }

    .sort-indicator {
      margin-left: 4px;
      font-size: 12px;
    }

    .analysis-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #dee2e6;
      font-size: 14px;
    }

    .analysis-table tr:hover {
      background: #f8f9fa;
    }

    .profit {
      color: #28a745;
      font-weight: 500;
    }

    .loss {
      color: #dc3545;
      font-weight: 500;
    }

    .entry-type {
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 12px;
      font-weight: 500;
    }

    .type-simple-long { background: #d4edda; color: #155724; }
    .type-simple-short { background: #f8d7da; color: #721c24; }
    .type-band-long { background: #cce5ff; color: #004085; }
    .type-band-short { background: #ffe5cc; color: #854500; }

    .no-data {
      padding: 24px;
      text-align: center;
      color: #6c757d;
      font-style: italic;
    }
  `],
  template: `
    <div class="analysis-container">
      <div class="controls">
        <label>
          Analyze next candles:
          <input type="number" [(ngModel)]="candleRange" (ngModelChange)="onCandleRangeChange()" min="1" max="100">
        </label>
        <span *ngIf="entries.length > 0">
          (Analyzing {{entries.length}} entries)
        </span>
        <span *ngIf="analysisData.length > 0" style="margin-left: 16px;">
          Avg Profit: <span class="profit">+{{averageProfit.toFixed(2)}}%</span>
          | Avg Loss: <span class="loss">{{averageLoss.toFixed(2)}}%</span>
        </span>
      </div>

      <div class="table-container" *ngIf="sortedAnalysisData.length > 0; else noData">
        <table class="analysis-table">
          <thead>
            <tr>
              <th class="sortable" (click)="toggleSort()">
                Entry #
                <span class="sort-indicator">{{sortDirection === 'desc' ? '▼' : '▲'}}</span>
              </th>
              <th>Type</th>
              <th>Entry Price</th>
              <th>Max Profit</th>
              <th>Max Loss</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let analysis of sortedAnalysisData">
              <td>#{{analysis.entryNumber}}</td>
              <td>
                <span class="entry-type" [ngClass]="getTypeClass(analysis.type)">
                  {{analysis.type}}
                </span>
              </td>
              <td>{{analysis.entryPrice.toFixed(4)}}</td>
              <td class="profit">+{{analysis.maxProfit.toFixed(2)}}%</td>
              <td class="loss">{{analysis.maxLoss.toFixed(2)}}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #noData>
        <div class="table-container">
          <div class="no-data">
            No entry data available. Click "Load" to fetch data and generate entries.
          </div>
        </div>
      </ng-template>
    </div>
  `
})
export class ProfitLossAnalysisComponent implements OnChanges {
  @Input() candles: Candle[] = [];
  @Input() entries: any[] = [];

  candleRange = 10;
  analysisData: EntryAnalysis[] = [];
  sortedAnalysisData: EntryAnalysis[] = [];
  sortDirection: SortDirection = 'desc';
  averageProfit = 0;
  averageLoss = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['candles'] || changes['entries']) {
      this.analyzeEntries();
    }
  }

  onCandleRangeChange(): void {
    this.analyzeEntries();
  }

  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortData();
  }

  private sortData(): void {
    this.sortedAnalysisData = [...this.analysisData].sort((a, b) => {
      if (this.sortDirection === 'asc') {
        return a.entryNumber - b.entryNumber;
      } else {
        return b.entryNumber - a.entryNumber;
      }
    });
  }

  private analyzeEntries(): void {
    if (!this.candles.length || !this.entries.length) {
      this.analysisData = [];
      this.sortedAnalysisData = [];
      this.averageProfit = 0;
      this.averageLoss = 0;
      return;
    }

    this.analysisData = this.entries.map(entry => {
      const analysis = this.analyzeEntry(entry);
      return analysis;
    });

    // Calculate averages
    if (this.analysisData.length > 0) {
      const totalProfit = this.analysisData.reduce((sum, a) => sum + a.maxProfit, 0);
      const totalLoss = this.analysisData.reduce((sum, a) => sum + a.maxLoss, 0);
      this.averageProfit = totalProfit / this.analysisData.length;
      this.averageLoss = totalLoss / this.analysisData.length;
    } else {
      this.averageProfit = 0;
      this.averageLoss = 0;
    }

    this.sortData();
  }

  private analyzeEntry(entry: any): EntryAnalysis {
    const startIndex = entry.candleIndex;
    const endIndex = Math.min(startIndex + this.candleRange, this.candles.length - 1);

    const entryCandle = this.candles[startIndex];
    const entryPrice = entryCandle.c;

    // Find highest high and lowest low in the range
    let highestHigh = entryCandle.h;
    let lowestLow = entryCandle.l;

    for (let i = startIndex + 1; i <= endIndex; i++) {
      if (i < this.candles.length) {
        highestHigh = Math.max(highestHigh, this.candles[i].h);
        lowestLow = Math.min(lowestLow, this.candles[i].l);
      }
    }

    // Calculate profit and loss based on entry type
    let maxProfit: number;
    let maxLoss: number;

    if (entry.isLong) {
      // Long position: profit when price goes up, loss when price goes down
      maxProfit = ((highestHigh - entryPrice) / entryPrice) * 100;
      maxLoss = ((lowestLow - entryPrice) / entryPrice) * 100;
    } else {
      // Short position: profit when price goes down, loss when price goes up
      maxProfit = ((entryPrice - lowestLow) / entryPrice) * 100;
      maxLoss = ((highestHigh - entryPrice) / entryPrice) * 100;
    }

    return {
      entryNumber: entry.entryNumber,
      type: entry.type,
      entryPrice: entryPrice,
      entryTime: new Date(entryCandle.t),
      maxProfit: Math.max(0, maxProfit),
      maxLoss: Math.min(0, maxLoss),
      candleIndex: startIndex
    };
  }

  getTypeClass(type: string): string {
    return 'type-' + type.toLowerCase().replace(' ', '-');
  }
}