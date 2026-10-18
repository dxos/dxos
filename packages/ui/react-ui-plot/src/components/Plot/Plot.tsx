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

// Approximate advance of Plot's default 10px sans-serif axis text.
const LABEL_CHAR_WIDTH = 6;

// Plot's tip box defaults to a white fill, while its text follows the theme's currentColor.
const TIP = { fill: 'var(--color-modal-surface)', stroke: 'var(--color-separator)' };

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

    const label = data.columns[0];
    let plot = createPlot(datums, options, { width, height, label });
    container.append(plot);

    // A legend is laid out above an SVG of the full height, pushing the x axis out of view; redraw shorter.
    const overflow = plot.getBoundingClientRect().height - height;
    if (overflow > 0) {
      plot.remove();
      plot = createPlot(datums, options, { width, height: height - overflow, label });
      container.append(plot);
    }

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
  { type, grid = true, horizontal = false, stacked = false }: PlotOptions,
  { label, ...size }: { width: number; height: number; label?: string },
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
    style: { background: 'transparent', color: 'currentColor' },
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

    case 'bar':
    default: {
      // Several series stand side by side in a facet per category, unless they stack into one bar.
      const grouped = series.size > 1 && !stacked;
      if (horizontal) {
        // Category labels sit left of the frame, so the margin grows with the longest one.
        const marginLeft = Math.max(MARGIN, ...keys.map((key) => String(key).length * LABEL_CHAR_WIDTH + MARGIN / 4));
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

      return ObservablePlot.plot({
        ...options,
        ...(grouped
          ? { fx: { label: null, domain: keys, axis: 'bottom' }, x: { axis: null, domain: seriesOrder } }
          : { x: { label: null, domain: keys } }),
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
