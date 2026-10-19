//
// Copyright 2026 DXOS.org
//

import * as ObservablePlot from '@observablehq/plot';
import * as d3 from 'd3';
import { type Feature, type FeatureCollection } from 'geojson';
import React, { useEffect, useMemo, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { feature } from 'topojson-client';

import { loadTopology } from '@dxos/react-ui-geo/data';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { type PlotData, type PlotDatum, type PlotOptions, type PlotValue } from '../../types.ts';
import { toNumber, toPlotDatums } from '../../util/index.ts';

const MARGIN = 40;
const MIN_SIZE = MARGIN * 2;

// Approximate advance of Plot's default 10px sans-serif axis text.
const LABEL_CHAR_WIDTH = 6;

/** The width a label of `text` takes on an axis, with room for the tick. */
const labelWidth = (text: string) => text.length * LABEL_CHAR_WIDTH + MARGIN / 4;

/** The widest value an axis labels: the largest bar, which for stacked bars is a category's total. */
const maxBarValue = (datums: PlotDatum[], stacked: boolean): number => {
  if (!stacked) {
    return Math.max(0, ...datums.map((datum) => datum.value));
  }
  const totals = new Map<PlotDatum['key'], number>();
  for (const datum of datums) {
    totals.set(datum.key, (totals.get(datum.key) ?? 0) + Math.max(0, datum.value));
  }
  return Math.max(0, ...totals.values());
};

const countryKey = (value: PlotValue): string => {
  const text = String(value ?? '').trim();
  return /^\d+$/.test(text) ? String(Number(text)) : text.toLowerCase();
};

const PLOT_STYLE = { background: 'transparent', color: 'currentColor' };

// Plot's tip box defaults to a white fill, while its text follows the theme's currentColor.
const TIP = { fill: 'var(--color-modal-surface)', stroke: 'var(--color-separator)' };

// Radar spokes and rings are drawn on a sphere seen from its pole, in degrees of arc from the centre.
const RADAR_RADIUS = 0.5;
const RADAR_LABEL = RADAR_RADIUS * 1.14;
const RADAR_RINGS = [0.2, 0.4, 0.6, 0.8, 1];

type Countries = FeatureCollection;

const countryName = (country: Feature): string | undefined => country.properties?.name;

const useCountries = (enabled: boolean): Countries | undefined => {
  const [countries, setCountries] = useState<Countries>();
  useEffect(() => {
    if (!enabled || countries) {
      return;
    }

    let cancelled = false;
    void loadTopology('110m').then((topology) => {
      const collection = topology.objects.countries;
      if (!cancelled && collection.type === 'GeometryCollection') {
        setCountries(feature(topology, collection));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, countries]);

  return countries;
};

/**
 * A sequential colour scale with a ramp legend. The ramp draws on white unless the scale carries the
 * style; Plot reads legend options from the scale, but `ScaleOptions` does not declare them.
 */
const rampScale = (scale: ObservablePlot.ScaleOptions): ObservablePlot.ScaleOptions => {
  const options = { ...scale, legend: true, style: PLOT_STYLE };
  return options;
};

export type PlotProps = ThemedClassName<{
  data: PlotData;
  options: PlotOptions;
}>;

/** Renders tabular data as a bar, pie, xy, scatter, heatmap, radar or map chart sized to its container. */
export const Plot = ({ classNames, data, options }: PlotProps) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>({ refreshRate: 100 });
  const datums = useMemo(() => toPlotDatums(data), [data]);
  const countries = useCountries(options.type === 'map');

  useEffect(() => {
    const container = containerRef.current;
    // Below twice the margin the plot frame has a negative extent.
    if (!container || width < MIN_SIZE || height < MIN_SIZE || options.type === 'pie') {
      return;
    }
    if (options.type === 'map' && !countries) {
      return;
    }

    const context = { width, height, label: data.columns[0], countries };
    let plot = createPlot(datums, options, context);
    container.append(plot);

    // A legend is laid out above an SVG of the full height, pushing the x axis out of view; redraw shorter.
    const overflow = plot.getBoundingClientRect().height - height;
    if (overflow > 0) {
      plot.remove();
      plot = createPlot(datums, options, { ...context, height: height - overflow });
      container.append(plot);
    }

    return () => plot.remove();
  }, [data, datums, options, width, height, countries]);

  return (
    <div ref={containerRef} role='img' className={mx('relative dx-fill overflow-hidden', classNames)}>
      {options.type === 'pie' && width >= MIN_SIZE && height >= MIN_SIZE && (
        <Pie datums={datums} width={width} height={height} />
      )}
    </div>
  );
};

Plot.displayName = 'Plot';

type PlotContext = {
  width: number;
  height: number;
  label?: string;
  countries?: Countries;
};

type ScatterPoint = PlotDatum & { x: number };

const seriesRegression = (points: ScatterPoint[]) =>
  ObservablePlot.linearRegressionY(points, { x: 'x', y: 'value', stroke: 'series', ci: 0 });

const pooledRegression = (points: ScatterPoint[]) =>
  ObservablePlot.linearRegressionY(points, {
    x: 'x',
    y: 'value',
    stroke: 'currentColor',
    strokeDasharray: '4,4',
    ci: 0,
  });

const logScaleWhenPositive = (values: Iterable<number>): ObservablePlot.ScaleType =>
  [...values].every((value) => value > 0) ? 'log' : 'linear';

const createPlot = (
  datums: PlotDatum[],
  { type, grid = true, horizontal = false, stacked = false, regression = false }: PlotOptions,
  { label, countries, ...size }: PlotContext,
): SVGSVGElement | HTMLElement => {
  const series = new Set(datums.map((datum) => datum.series));
  // Ordinal scales sort by default; keep the sheet's row and column order.
  const keys = [...new Set(datums.map((datum) => datum.key))];
  const seriesOrder = [...series];
  const options = {
    ...size,
    grid,
    marginLeft: MARGIN,
    marginBottom: MARGIN,
    style: PLOT_STYLE,
    color: { legend: series.size > 1, domain: seriesOrder },
    y: { label: null },
  };

  switch (type) {
    case 'xy':
      return ObservablePlot.plot({
        ...options,
        x: { label },
        marks: [
          ObservablePlot.ruleY([0]),
          ObservablePlot.line(datums, { x: 'key', y: 'value', stroke: 'series' }),
          ObservablePlot.dot(datums, { x: 'key', y: 'value', fill: 'series', r: 3 }),
        ],
      });

    case 'scatter': {
      const points = datums.flatMap((datum): ScatterPoint[] => {
        const x = toNumber(datum.key);
        return x === undefined ? [] : [{ ...datum, x }];
      });
      return ObservablePlot.plot({
        ...options,
        x: { label },
        marks: [
          ObservablePlot.dot(points, {
            x: 'x',
            y: 'value',
            stroke: 'series',
            fill: 'series',
            fillOpacity: 0.3,
            r: 3.5,
            tip: TIP,
          }),
          ...(regression ? [seriesRegression(points), ...(series.size > 1 ? [pooledRegression(points)] : [])] : []),
        ],
      });
    }

    case 'heatmap': {
      const marginLeft = Math.max(MARGIN, ...keys.map((key) => labelWidth(String(key))));
      return ObservablePlot.plot({
        ...options,
        grid: false,
        marginLeft,
        padding: 0,
        x: { label: null, domain: seriesOrder, axis: 'top' },
        y: { label: null, domain: keys },
        color: rampScale({ scheme: 'viridis', label: null }),
        marks: [ObservablePlot.cell(datums, { x: 'series', y: 'key', fill: 'value', inset: 0.5, tip: TIP })],
      });
    }

    case 'radar': {
      const max = Math.max(0, ...datums.map((datum) => datum.value)) || 1;
      const spokes = keys.map(String);
      const longitude = d3.scalePoint(spokes, [180, -180]).padding(0.5).align(1);
      const angle = (datum: PlotDatum) => longitude(String(datum.key)) ?? 0;
      const distance = (datum: PlotDatum) => 90 - (Math.max(0, datum.value) / max) * RADAR_RADIUS;
      const ring = (fraction: number) =>
        d3
          .geoCircle()
          .center([0, 90])
          .radius(fraction * RADAR_RADIUS)();
      return ObservablePlot.plot({
        ...size,
        style: options.style,
        color: options.color,
        projection: {
          type: 'azimuthal-equidistant',
          rotate: [0, -90],
          domain: d3
            .geoCircle()
            .center([0, 90])
            .radius(RADAR_RADIUS * 1.25)(),
        },
        marks: [
          ObservablePlot.geo(RADAR_RINGS, {
            geometry: ring,
            stroke: 'currentColor',
            strokeOpacity: 0.25,
            fill: 'currentColor',
            fillOpacity: 0.03,
            strokeWidth: 0.5,
          }),
          ObservablePlot.link(spokes, {
            x1: (spoke: string) => longitude(spoke),
            y1: 90 - RADAR_RADIUS,
            x2: 0,
            y2: 90,
            stroke: 'currentColor',
            strokeOpacity: 0.25,
          }),
          ObservablePlot.text(RADAR_RINGS, {
            x: 180,
            y: (fraction: number) => 90 - fraction * RADAR_RADIUS,
            dx: 2,
            textAnchor: 'start',
            text: (fraction: number) => d3.format('~s')(fraction * max),
            fill: 'currentColor',
            fillOpacity: 0.6,
            fontSize: 8,
          }),
          ObservablePlot.text(spokes, {
            x: (spoke: string) => longitude(spoke),
            y: 90 - RADAR_LABEL,
            text: ObservablePlot.identity,
            lineWidth: 8,
          }),
          ObservablePlot.area(datums, {
            x1: angle,
            y1: distance,
            x2: 0,
            y2: 90,
            z: 'series',
            fill: 'series',
            fillOpacity: 0.15,
            stroke: 'series',
            curve: 'linear-closed',
          }),
          ObservablePlot.dot(datums, { x: angle, y: distance, fill: 'series', r: 3, tip: TIP }),
        ],
      });
    }

    case 'map': {
      const first = seriesOrder[0];
      const values = new Map(
        datums.filter((datum) => datum.series === first).map((datum) => [countryKey(datum.key), datum.value]),
      );
      const valueOf = (country: Feature) =>
        values.get(countryKey(countryName(country) ?? null)) ?? values.get(countryKey(country.id ?? null));
      const features = countries?.features ?? [];
      return ObservablePlot.plot({
        ...size,
        style: options.style,
        projection: 'equal-earth',
        color: rampScale({
          type: logScaleWhenPositive(values.values()),
          scheme: 'viridis',
          label: first,
        }),
        marks: [
          ObservablePlot.sphere({ stroke: 'currentColor', strokeOpacity: 0.3 }),
          ObservablePlot.geo(features, { fill: 'currentColor', fillOpacity: 0.08 }),
          ObservablePlot.geo(
            features.filter((country) => valueOf(country) !== undefined),
            ObservablePlot.centroid({
              fill: valueOf,
              stroke: 'var(--color-base-surface)',
              strokeWidth: 0.5,
              tip: TIP,
              channels: { Country: countryName },
            }),
          ),
        ],
      });
    }

    case 'bar':
    default: {
      // Several series stand side by side in a facet per category, unless they stack into one bar.
      const grouped = series.size > 1 && !stacked;
      if (horizontal) {
        // Category labels sit left of the frame, so the margin grows with the longest one.
        const marginLeft = Math.max(MARGIN, ...keys.map((key) => labelWidth(String(key))));
        return ObservablePlot.plot({
          ...options,
          marginLeft,
          x: { label: null },
          ...(grouped
            ? { fy: { label: null, domain: keys, axis: 'left' }, y: { axis: null, domain: seriesOrder } }
            : { y: { label: null, domain: keys } }),
          marks: [
            ObservablePlot.ruleX([0]),
            grouped
              ? ObservablePlot.barX(datums, { fy: 'key', y: 'series', x: 'value', fill: 'series', tip: TIP })
              : // One bar per category; with several series, barX stacks them along it.
                ObservablePlot.barX(datums, { y: 'key', x: 'value', fill: 'series', tip: TIP }),
          ],
        });
      }

      // The value labels sit left of the frame, so the margin grows with the widest one (the axis groups thousands).
      const marginLeft = Math.max(MARGIN, labelWidth(Math.round(maxBarValue(datums, stacked)).toLocaleString()));
      // Category labels that would overlap side by side are tilted, and the bottom margin grows to hold them.
      const longest = Math.max(0, ...keys.map((key) => labelWidth(String(key))));
      const tilt = longest * keys.length > size.width - marginLeft;
      const tickRotate = tilt ? -45 : 0;
      const marginBottom = tilt ? Math.max(MARGIN, longest * Math.SQRT1_2 + MARGIN / 2) : MARGIN;
      return ObservablePlot.plot({
        ...options,
        marginLeft,
        marginBottom,
        ...(grouped
          ? {
              fx: { label: null, domain: keys, axis: 'bottom', tickRotate },
              x: { axis: null, domain: seriesOrder },
            }
          : { x: { label: null, domain: keys, tickRotate } }),
        marks: [
          ObservablePlot.ruleY([0]),
          grouped
            ? ObservablePlot.barY(datums, { fx: 'key', x: 'series', y: 'value', fill: 'series', tip: TIP })
            : ObservablePlot.barY(datums, { x: 'key', y: 'value', fill: 'series', tip: TIP }),
        ],
      });
    }
  }
};

type PieProps = {
  datums: PlotDatum[];
  width: number;
  height: number;
};

/** Observable Plot has no polar marks, so the pie is drawn directly with d3-shape; the first series is used. */
const Pie = ({ datums, width, height }: PieProps) => {
  const radius = Math.max(0, Math.min(width, height) / 2 - MARGIN / 2);
  const slices = useMemo(() => {
    const first = datums[0]?.series;
    const values = datums.filter((datum) => datum.series === first && datum.value > 0);
    return d3
      .pie<PlotDatum>()
      .sort(null)
      .value((datum) => datum.value)(values);
  }, [datums]);

  const arc = d3.arc<d3.PieArcDatum<PlotDatum>>().innerRadius(0).outerRadius(radius);
  const label = d3
    .arc<d3.PieArcDatum<PlotDatum>>()
    .innerRadius(radius * 0.65)
    .outerRadius(radius * 0.65);
  const color = d3.scaleOrdinal<string, string>(d3.schemeTableau10);

  return (
    <svg width={width} height={height} viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}>
      {slices.map((slice, index) => (
        <g key={index}>
          <path d={arc(slice) ?? undefined} fill={color(String(slice.data.key))} stroke='var(--color-base-surface)'>
            <title>{`${slice.data.key}: ${slice.data.value}`}</title>
          </path>
          <text
            transform={`translate(${label.centroid(slice)})`}
            textAnchor='middle'
            dominantBaseline='middle'
            fontSize={11}
            fill='white'
          >
            {String(slice.data.key)}
          </text>
        </g>
      ))}
    </svg>
  );
};
