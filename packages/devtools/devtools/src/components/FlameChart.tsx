//
// Copyright 2023 DXOS.org
//

import {
  type FlameChartNodes,
  type FlameChartSettings,
  type Marks,
  type Waterfall,
  FlameChart as FlameChartJs,
  type WaterfallItem,
  type Mark,
  type UIPlugin,
  type FlatTreeNode,
  type Timeseries,
} from 'flame-chart-js';
import React, { useCallback, useEffect, useRef } from 'react';
import useResizeObserver from 'use-resize-observer';

export type NodeTypes =
  | { node: FlatTreeNode | null; type: 'flame-chart-node' }
  | { node: WaterfallItem | null; type: 'waterfall-node' }
  | { node: Mark | null; type: 'mark' }
  | null;

export type FlameChartProps = {
  data?: FlameChartNodes;
  marks?: Marks;
  waterfall?: Waterfall;
  timeseries?: Timeseries;
  timeframeTimeseries?: Timeseries;
  colors?: Record<string, string>;
  settings?: FlameChartSettings;
  position?: { x: number; y: number };
  zoom?: {
    start: number;
    end: number;
  };
  plugins?: UIPlugin[];
  className?: string;
  onSelect?: (data: NodeTypes) => void;
};

export const FlameChart = (props: FlameChartProps) => {
  const boxRef = useRef<null | HTMLDivElement>(null);
  const canvasRef = useRef<null | HTMLCanvasElement>(null);
  const flameChart = useRef<null | FlameChartJs>(null);

  useResizeObserver({
    ref: boxRef,
    onResize: ({ width = 0, height = 0 }) => flameChart.current?.resize(width, height - 3),
  });

  const initialize = useCallback(() => {
    const { data, marks, waterfall, timeseries, settings, colors, plugins, timeframeTimeseries } = props;

    if (canvasRef.current && boxRef.current) {
      const { width = 0, height = 0 } = boxRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height - 3;
      flameChart.current = new FlameChartJs({
        canvas: canvasRef.current,
        data,
        marks,
        waterfall,
        timeseries,
        timeframeTimeseries,
        settings,
        colors,
        plugins,
      });
    }
  }, []);

  const setBoxRef = useCallback((ref: HTMLDivElement) => {
    const isNewRef = ref !== boxRef.current;
    boxRef.current = ref;
    if (isNewRef) {
      initialize();
    }
  }, []);

  const setCanvasRef = useCallback((ref: HTMLCanvasElement) => {
    const isNewRef = ref !== canvasRef.current;
    canvasRef.current = ref;
    if (isNewRef) {
      initialize();
    }
  }, []);

  useEffect(() => {
    if (props.data) {
      flameChart.current?.setNodes(props.data);
    }
  }, [props.data]);

  useEffect(() => {
    if (props.marks) {
      flameChart.current?.setMarks(props.marks);
    }
  }, [props.marks]);

  useEffect(() => {
    if (props.waterfall) {
      flameChart.current?.setWaterfall(props.waterfall);
    }
  }, [props.waterfall]);

  useEffect(() => {
    if (props.timeseries) {
      flameChart.current?.setTimeseries(props.timeseries);
    }
  }, [props.timeseries]);

  useEffect(() => {
    if (props.timeframeTimeseries) {
      flameChart.current?.setTimeframeTimeseries(props.timeframeTimeseries);
    }
  }, [props.timeframeTimeseries]);

  useEffect(() => {
    if (props.settings && flameChart.current) {
      flameChart.current.setSettings(props.settings);
      flameChart.current.renderEngine.recalcChildrenSizes();
      flameChart.current.render();
    }
  }, [props.settings]);

  useEffect(() => {
    if (props.position) {
      flameChart.current?.setFlameChartPosition(props.position);
    }
  }, [props.position]);

  useEffect(() => {
    if (props.zoom) {
      flameChart.current?.setZoom(props.zoom.start, props.zoom.end);
    }
  }, [props.zoom]);

  useEffect(() => {
    if (props.onSelect) {
      flameChart.current?.on('select', props.onSelect);
    }

    return () => {
      if (props.onSelect) {
        flameChart.current?.removeListener('select', props.onSelect);
      }
    };
  }, [props.onSelect]);

  return (
    <div ref={setBoxRef} className={props.className}>
      <canvas ref={setCanvasRef} />
    </div>
  );
};
