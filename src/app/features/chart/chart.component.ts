import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  LineData,
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
  @Input() lrcData: number[] = [];
  @Input() rvwapData: any = {};
  @Input() lrcCrossData: any = {};
  @Input() showLRCCrossOriginal = true;
  @Input() showLRCCrossSimple = true;

  private chart!: IChartApi;
  private candleSeries!: ISeriesApi<'Candlestick'>;
  private lrcSeries!: ISeriesApi<'Line'>;
  private rvwapSeries!: ISeriesApi<'Line'>;
  private ub1Series!: ISeriesApi<'Line'>;
  private lb1Series!: ISeriesApi<'Line'>;
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

    // Add LRC line series with bordeaux color (#872323 from Pine Script)
    this.lrcSeries = this.chart.addLineSeries({
      color: '#872323',
      lineWidth: 3,
      priceLineVisible: false,
      title: 'LRC'
    });

    // Add RVWAP series (purple color from Pine Script)
    this.rvwapSeries = this.chart.addLineSeries({
      color: '#9945ff',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'RVWAP'
    });

    // Add UB1 series (upper band 1)
    this.ub1Series = this.chart.addLineSeries({
      color: '#808080',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'UB1'
    });

    // Add LB1 series (lower band 1)
    this.lb1Series = this.chart.addLineSeries({
      color: '#808080',
      lineWidth: 1,
      priceLineVisible: false,
      title: 'LB1'
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

    // LRC line
    const lrcLineData: LineData[] = [];
    for (let i = 0; i < this.candles.length; i++) {
      const lrcValue = this.lrcData[i];
      if (lrcValue != null && !isNaN(lrcValue)) {
        lrcLineData.push({
          time: Math.floor(this.candles[i].t / 1000) as UTCTimestamp,
          value: lrcValue
        });
      }
    }
    this.lrcSeries.setData(lrcLineData);

    // RVWAP and bands
    if (this.rvwapData && this.rvwapData.rvwap) {
      const rvwapLineData: LineData[] = [];
      const ub1LineData: LineData[] = [];
      const lb1LineData: LineData[] = [];

      for (let i = 0; i < this.candles.length; i++) {
        const time = Math.floor(this.candles[i].t / 1000) as UTCTimestamp;

        const rvwapValue = this.rvwapData.rvwap[i];
        if (rvwapValue != null && !isNaN(rvwapValue)) {
          rvwapLineData.push({ time, value: rvwapValue });
        }

        const ub1Value = this.rvwapData.ub1[i];
        if (ub1Value != null && !isNaN(ub1Value)) {
          ub1LineData.push({ time, value: ub1Value });
        }

        const lb1Value = this.rvwapData.lb1[i];
        if (lb1Value != null && !isNaN(lb1Value)) {
          lb1LineData.push({ time, value: lb1Value });
        }
      }

      this.rvwapSeries.setData(rvwapLineData);
      this.ub1Series.setData(ub1LineData);
      this.lb1Series.setData(lb1LineData);
    }

    // Add LRC cross markers
    this.addCrossMarkers();
  }

  private addCrossMarkers() {
    if (!this.lrcCrossData) return;

    // Clear existing markers
    this.candleSeries.setMarkers([]);

    const markers: any[] = [];

    // Add simple LRC cross markers
    if (this.showLRCCrossSimple && this.lrcCrossData.simple) {
      this.lrcCrossData.simple.longCrosses?.forEach((index: number) => {
        if (index < this.candles.length) {
          markers.push({
            time: Math.floor(this.candles[index].t / 1000) as UTCTimestamp,
            position: 'belowBar',
            color: '#00ff00',
            shape: 'arrowUp',
            text: 'Simple Long',
          });
        }
      });

      this.lrcCrossData.simple.shortCrosses?.forEach((index: number) => {
        if (index < this.candles.length) {
          markers.push({
            time: Math.floor(this.candles[index].t / 1000) as UTCTimestamp,
            position: 'aboveBar',
            color: '#ff0000',
            shape: 'arrowDown',
            text: 'Simple Short',
          });
        }
      });
    }

    // Add LRC cross with bands markers
    if (this.showLRCCrossOriginal && this.lrcCrossData.withBands) {
      this.lrcCrossData.withBands.longCrosses?.forEach((index: number) => {
        if (index < this.candles.length) {
          markers.push({
            time: Math.floor(this.candles[index].t / 1000) as UTCTimestamp,
            position: 'belowBar',
            color: '#0080ff',
            shape: 'circle',
            text: 'Band Long',
          });
        }
      });

      this.lrcCrossData.withBands.shortCrosses?.forEach((index: number) => {
        if (index < this.candles.length) {
          markers.push({
            time: Math.floor(this.candles[index].t / 1000) as UTCTimestamp,
            position: 'aboveBar',
            color: '#ff8000',
            shape: 'circle',
            text: 'Band Short',
          });
        }
      });
    }

    // Sort markers by time before setting them
    markers.sort((a, b) => a.time - b.time);
    this.candleSeries.setMarkers(markers);
  }
}
