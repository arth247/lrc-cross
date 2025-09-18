import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
  SeriesMarker,
  Time,
  UTCTimestamp, ColorType,
} from 'lightweight-charts';
import { Candle, Signal } from '../../../engine/types';

@Component({
  selector: 'app-lwc-chart',
  standalone: true,
  template: `<div #container class="chart w-full h-full" style="height: 600px;"></div>`,
})
export class ChartComponent implements OnChanges {
  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  @Input() candles: Candle[] = [];
  @Input() signals: Signal[] = [];
  @Input() mid: (number | undefined)[] = [];
  @Input() upper: (number | undefined)[] = [];
  @Input() lower: (number | undefined)[] = [];

  private chart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private midSeries!: ISeriesApi<'Line'>;
  private upperSeries!: ISeriesApi<'Line'>;
  private lowerSeries!: ISeriesApi<'Line'>;
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

    this.midSeries = this.chart.addLineSeries({ lineWidth: 2, priceLineVisible: false });
    this.upperSeries = this.chart.addLineSeries({ lineWidth: 1, priceLineVisible: false });
    this.lowerSeries = this.chart.addLineSeries({ lineWidth: 1, priceLineVisible: false });
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

    // markers for signals
    const marks: SeriesMarker<Time>[] = this.signals.map(s => ({
      time: Math.floor(s.time / 1000) as UTCTimestamp,
      position: s.side === 'long' ? 'belowBar' : 'aboveBar',
      color: s.side === 'long' ? '#2ecc71' : '#e74c3c',
      shape: s.side === 'long' ? 'arrowUp' : 'arrowDown',
      text: s.reason,
    }));
    this.candleSeries.setMarkers(marks);

    // LRC lines
    const toLine = (arr: (number | undefined)[]): LineData[] => {
      const out: LineData[] = [];
      for (let i = 0; i < this.candles.length; i++) {
        const v = arr?.[i];
        if (v != null && !Number.isNaN(v)) {
          out.push({ time: Math.floor(this.candles[i].t / 1000) as UTCTimestamp, value: v });
        }
      }
      return out;
    };

    this.midSeries.setData(toLine(this.mid));
    this.upperSeries.setData(toLine(this.upper));
    this.lowerSeries.setData(toLine(this.lower));
  }
}
