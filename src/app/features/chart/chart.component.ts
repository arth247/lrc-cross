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
import { VWAPResult } from '../../../engine/vwap';

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
  @Input() vwapData: VWAPResult | null = null;

  private chart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private midSeries!: ISeriesApi<'Line'>;
  private upperSeries!: ISeriesApi<'Line'>;
  private lowerSeries!: ISeriesApi<'Line'>;

  // VWAP series
  private vwapSeries!: ISeriesApi<'Line'>;
  private smaSeries!: ISeriesApi<'Line'>;
  private emaSeries!: ISeriesApi<'Line'>;
  private vwapBand1Upper!: ISeriesApi<'Line'>;
  private vwapBand1Lower!: ISeriesApi<'Line'>;
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

    // Initialize VWAP series
    this.vwapSeries = this.chart.addLineSeries({
      color: '#9c27b0',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'RVWAP'
    });

    this.smaSeries = this.chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'SMA'
    });

    this.emaSeries = this.chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'EMA'
    });

    this.vwapBand1Upper = this.chart.addLineSeries({
      color: 'rgba(156, 39, 176, 0.3)',
      lineWidth: 1,
      lineStyle: 1,
      priceLineVisible: false,
      title: 'VWAP UB1'
    });

    this.vwapBand1Lower = this.chart.addLineSeries({
      color: 'rgba(156, 39, 176, 0.3)',
      lineWidth: 1,
      lineStyle: 1,
      priceLineVisible: false,
      title: 'VWAP LB1'
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

    // markers for signals with color coding by signal type
    const getSignalColor = (reason: string, side: string) => {
      const baseColors = {
        long: { EARLY: '#4caf50', STRONG: '#2196f3', SUPER: '#9c27b0', LRC_CROSS: '#ff9800', LRC_SIMPLE: '#ffc107' },
        short: { EARLY: '#f44336', STRONG: '#e91e63', SUPER: '#673ab7', LRC_CROSS: '#ff5722', LRC_SIMPLE: '#ff6f00' }
      };
      return baseColors[side as 'long' | 'short'][reason as keyof typeof baseColors.long] || (side === 'long' ? '#2ecc71' : '#e74c3c');
    };

    const getSignalShape = (reason: string, side: string) => {
      // Different shapes for different signal types
      switch (reason) {
        case 'EARLY': return side === 'long' ? 'circle' : 'circle';
        case 'STRONG': return side === 'long' ? 'arrowUp' : 'arrowDown';
        case 'SUPER': return side === 'long' ? 'square' : 'square';
        default: return side === 'long' ? 'arrowUp' : 'arrowDown';
      }
    };

    const marks: SeriesMarker<Time>[] = this.signals.map(s => ({
      time: Math.floor(s.time / 1000) as UTCTimestamp,
      position: s.side === 'long' ? 'belowBar' : 'aboveBar',
      color: getSignalColor(s.reason, s.side),
      shape: getSignalShape(s.reason, s.side) as any,
      text: s.reason,
      size: s.reason === 'SUPER' ? 2 : 1,  // Make SUPER signals larger
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

    // Render VWAP data if available
    if (this.vwapData) {
      this.vwapSeries.setData(toLine(this.vwapData.rvwap));
      this.smaSeries.setData(toLine(this.vwapData.sma));
      this.emaSeries.setData(toLine(this.vwapData.ema));
      this.vwapBand1Upper.setData(toLine(this.vwapData.bands.ub1));
      this.vwapBand1Lower.setData(toLine(this.vwapData.bands.lb1));
    } else {
      // Clear VWAP series if no data
      this.vwapSeries.setData([]);
      this.smaSeries.setData([]);
      this.emaSeries.setData([]);
      this.vwapBand1Upper.setData([]);
      this.vwapBand1Lower.setData([]);
    }
  }
}
