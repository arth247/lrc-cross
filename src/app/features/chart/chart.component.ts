import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  UTCTimestamp, ColorType,
} from 'lightweight-charts';
import { Candle } from '../../../engine/types';

@Component({
  selector: 'app-lwc-chart',
  standalone: true,
  template: `<div #container class="chart w-full h-full" style="height: 600px;"></div>`,
})
export class ChartComponent implements OnChanges {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  @Input() candles: Candle[] = [];

  private chart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private initialised = false;

  ngOnChanges(): void {
    if (!this.initialised) {
      this.initChart();
      this.initialised = true;
    }
    this.render();
  }

  private initChart() {
    this.chart = createChart(this.container.nativeElement, {
      layout: {
        fontSize: 12,
        textColor: '#c8d1dc',
        background: { type: ColorType.Solid, color: '#ffffff' },
      },
      grid: {
        horzLines: { color: 'rgba(197,203,206,0.2)' },
        vertLines: { color: 'rgba(197,203,206,0.2)' },
      },
      crosshair: { mode: 0 },
      timeScale: { rightOffset: 5, barSpacing: 8, minBarSpacing: 2, borderVisible: false },
      rightPriceScale: { borderVisible: false },
      autoSize: true,
    });

    this.candleSeries = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
    });
  }

  private render() {
    // candles
    const candleData: CandlestickData[] = this.candles.map(c => ({
      time: Math.floor(c.t / 1000) as UTCTimestamp,
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
    }));
    this.candleSeries.setData(candleData);
  }
}
