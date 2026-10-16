//
// Copyright 2026 DXOS.org
//

import * as ObservablePlot from '@observablehq/plot';
import * as d3 from 'd3';
import React, { useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { type PlotData, type PlotDatum, type PlotOptions } from '../../types.ts';
import { toPlotDatums } from '../../util/index.ts';

const MARGIN = 40;
const MIN_SIZE = MARGIN * 2;

export type PlotProps = ThemedClassName<{
  data: PlotData;
  options: PlotOptions;
}>;

/** Renders tabular data as a bar, pie, or xy chart sized to its container. */
export const Plot = ({ classNames, data, options }: PlotProps) => {
  const { ref: containerRef, width = 0, height = 0 } = useResizeDetector<HTMLDivElement>({ refreshRate: 100 });
  const datums = useMemo(() => toPlotDatums(data), [data]);

  useEffect(() => {
    const container = containerRef.current;
    // Below twice the margin the plot frame has a negative extent.
    if (!container || width < MIN_SIZE || height < MIN_SIZE || options.type === 'pie') {
      return;
    }

    const plot = createPlot(datums, options, { width, height, label: data.columns[0] });
    container.append(plot);
    return () => plot.remove();
  }, [data, datums, options, width, height]);

  return (
    <div ref={containerRef} role='img' className={mx('relative dx-fill overflow-hidden', classNames)}>
      {options.type === 'pie' && width >= MIN_SIZE && height >= MIN_SIZE && (
        <Pie datums={datums} width={width} height={height} />
      )}
    </div>
  );
};

Plot.displayName = 'Plot';

const createPlot = (
  datums: PlotDatum[],
  { type, grid = true }: PlotOptions,
  { label, ...size }: { width: number; height: number; label?: string },
): SVGSVGElement | HTMLElement => {
  const series = new Set(datums.map((datum) => datum.series));
  // Ordinal scales sort by default; keep the sheet's row order.
  const keys = [...new Set(datums.map((datum) => datum.key))];
  const options = {
    ...size,
    grid,
    marginLeft: MARGIN,
    marginBottom: MARGIN / 2,
    style: { background: 'transparent', color: 'currentColor' },
    color: { legend: series.size > 1 },
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

    case 'bar':
    default:
      return ObservablePlot.plot({
        ...options,
        ...(series.size > 1
          ? { fx: { label: null, domain: keys }, x: { axis: null } }
          : { x: { label: null, domain: keys } }),
        marks: [
          ObservablePlot.ruleY([0]),
          series.size > 1
            ? ObservablePlot.barY(datums, { fx: 'key', x: 'series', y: 'value', fill: 'series', tip: true })
            : ObservablePlot.barY(datums, { x: 'key', y: 'value', fill: 'series', tip: true }),
        ],
      });
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
