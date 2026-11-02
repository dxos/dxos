//
// Copyright 2026 DXOS.org
//

import '../../../styles/graph.css';

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import { randomLcg } from 'd3';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type * as GraphModel from '@dxos/graph/GraphModel';
import * as Button from '@dxos/react-ui/Button';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { getHashStyles } from '@dxos/ui-theme';

import {
  GraphForceProjector,
  type GraphLayoutEdge,
  type GraphLayoutNode,
  type ProjectorUpdateKind,
} from '../../graph/index.ts';
import { useSvgContext } from '../../hooks/index.ts';
import { TestGraphModel, type TestNode, createGraph, seed } from '../../testing/index.ts';
import { SVG } from '../SVG/index.ts';
import { Graph } from './Graph.tsx';

const TYPES = ['type-1', 'type-2', 'type-3', 'type-4', 'type-5', 'type-6'];

/** Below 50 fps; the frame missed at least one vsync on a 60 Hz display. */
const JANK_MS = 20;

/** Time for the topology render and first layout ticks to settle before sampling. */
const WARMUP_MS = 500;

/** Force projector that times each synchronous emit, which is the renderer's JS cost for that update. */
class MeasuredForceProjector extends GraphForceProjector<TestNode> {
  readonly samples: { kind: ProjectorUpdateKind; ms: number }[] = [];

  /**
   * The force projector scatters new nodes with `Math.random`; swap in a generator seeded by the graph size
   * while it lays them out, so every run at a size starts from the same positions.
   */
  override onUpdate(graph?: GraphModel.AnyData) {
    const random = Math.random;
    Math.random = randomLcg(graph?.nodes.length ?? 0);
    try {
      super.onUpdate(graph);
    } finally {
      Math.random = random;
    }
  }

  override emitUpdate(kind: ProjectorUpdateKind = 'topology') {
    const start = performance.now();
    super.emitUpdate(kind);
    this.samples.push({ kind, ms: performance.now() - start });
  }
}

export type StressResult = {
  nodes: number;
  edges: number;
  /** DOM elements under the graph group; the SVG renderer's cost scales with this. */
  elements: number;
  fps: number;
  frameP50: number;
  frameP95: number;
  frameMax: number;
  /** Fraction of frames longer than {@link JANK_MS}. */
  jank: number;
  /** Positions-only renderer updates (simulation ticks) during the window. */
  ticks: number;
  renderP50: number;
  renderP95: number;
  /** Full topology render (enter/exit join, attributes, labels). */
  topology: number;
};

declare global {
  interface Window {
    /** Read by automation (Playwright, the browser pane) once `running` is false. */
    __graphStress?: { running: boolean; results: StressResult[] };
  }
}

const percentile = (values: number[], p: number) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Frame intervals from a rAF loop over `durationMs`; the browser's real repaint cadence. */
const sampleFrames = (durationMs: number) =>
  new Promise<number[]>((resolve) => {
    const intervals: number[] = [];
    let last = 0;
    let start = 0;
    const loop = (now: number) => {
      if (start === 0) {
        start = now;
      } else {
        intervals.push(now - last);
      }
      last = now;
      if (now - start < durationMs) {
        requestAnimationFrame(loop);
      } else {
        resolve(intervals);
      }
    };
    requestAnimationFrame(loop);
  });

const createStressGraph = (nodes: number, edgeRatio: number): GraphModel.AnyData => {
  // Same graph for a given size on every run, so before/after runs draw identical work.
  seed(nodes);
  return createGraph(nodes, Math.round(nodes * edgeRatio), TYPES);
};

type StoryArgs = {
  sizes: number[];
  edgeRatio: number;
  durationMs: number;
  labels: boolean;
  arrows: boolean;
};

const StressGraph = ({
  model,
  labels,
  arrows,
  onProjector,
}: Pick<StoryArgs, 'labels' | 'arrows'> & {
  model?: GraphModel.GraphModel;
  onProjector: (projector: MeasuredForceProjector) => void;
}) => {
  const context = useSvgContext();
  const projector = useMemo(() => new MeasuredForceProjector(context), [context]);
  useEffect(() => onProjector(projector), [projector, onProjector]);

  // Mirrors the Default story's styling so the CSS cost (data-color selectors) is part of the measurement.
  const attributes = useMemo(
    () => ({
      node: (node: GraphLayoutNode<TestNode>) => ({
        data: { color: getHashStyles(node.data?.type ?? node.type)?.hue },
      }),
      edge: (edge: GraphLayoutEdge<TestNode>) => ({
        data: { color: getHashStyles(edge.data?.type ?? edge.type)?.hue },
      }),
    }),
    [],
  );

  const labelOptions = useMemo(
    () => (labels ? { text: (node: GraphLayoutNode<TestNode>) => node.data?.label } : undefined),
    [labels],
  );

  return (
    <Graph model={model} projector={projector} labels={labelOptions} attributes={attributes} arrows={arrows} drag />
  );
};

const StressStory = ({ sizes, edgeRatio, durationMs, labels, arrows }: StoryArgs) => {
  const registry = useContext(RegistryContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const projectorRef = useRef<MeasuredForceProjector>(null);
  const [model, setModel] = useState<GraphModel.GraphModel>();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StressResult[]>([]);

  const handleProjector = useCallback((projector: MeasuredForceProjector) => {
    projectorRef.current = projector;
  }, []);

  const measure = useCallback(
    async (nodes: number): Promise<StressResult | undefined> => {
      const graph = createStressGraph(nodes, edgeRatio);
      const projector = projectorRef.current;
      if (!projector) {
        return undefined;
      }

      projector.samples.length = 0;
      setModel(new TestGraphModel({ registry, graph }));
      await delay(WARMUP_MS);
      const topology = projector.samples.filter(({ kind }) => kind === 'topology').map(({ ms }) => ms);

      projector.samples.length = 0;
      projector.restart();
      const frames = await sampleFrames(durationMs);
      const renders = projector.samples.filter(({ kind }) => kind === 'positions').map(({ ms }) => ms);
      const elapsed = frames.reduce((sum, ms) => sum + ms, 0);

      return {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
        elements: containerRef.current?.querySelectorAll('g.dx-graph *').length ?? 0,
        fps: (frames.length * 1000) / elapsed,
        frameP50: percentile(frames, 50),
        frameP95: percentile(frames, 95),
        frameMax: Math.max(...frames),
        jank: frames.filter((ms) => ms > JANK_MS).length / frames.length,
        ticks: renders.length,
        renderP50: percentile(renders, 50),
        renderP95: percentile(renders, 95),
        topology: Math.max(0, ...topology),
      };
    },
    [registry, edgeRatio, durationMs],
  );

  const handleRun = useCallback(async () => {
    setRunning(true);
    setResults([]);
    window.__graphStress = { running: true, results: [] };
    const collected: StressResult[] = [];
    for (const size of sizes) {
      const result = await measure(size);
      if (result) {
        collected.push(result);
        setResults([...collected]);
      }
    }
    window.__graphStress = { running: false, results: collected };
    setRunning(false);
  }, [sizes, measure]);

  const handleLoad = useCallback(
    (nodes: number) => setModel(new TestGraphModel({ registry, graph: createStressGraph(nodes, edgeRatio) })),
    [registry, edgeRatio],
  );

  return (
    <div className='dx-fill grid grid-cols-[1fr_36rem] divide-x divide-separator'>
      <div ref={containerRef} className='dx-fill'>
        <SVG.Root>
          <SVG.Markers />
          <SVG.FPS corner='top-left' />
          <SVG.Zoom extent={[1 / 8, 4]}>
            <StressGraph model={model} labels={labels} arrows={arrows} onProjector={handleProjector} />
          </SVG.Zoom>
        </SVG.Root>
      </div>

      <div className='flex flex-col overflow-hidden'>
        <Toolbar.Root>
          <Button.Root
            onClick={() => void handleRun()}
            disabled={running}
            spin={running}
            icon={running ? 'ph--spinner--regular' : 'ph--play--regular'}
            label='Run sweep'
            data-testid='graph-stress-run'
          />
          {sizes.map((size) => (
            <Button.Root key={size} onClick={() => handleLoad(size)} disabled={running} label={String(size)} />
          ))}
        </Toolbar.Root>
        <div className='overflow-auto p-2'>
          <table className='w-full font-mono text-xs tabular-nums' data-testid='graph-stress-results'>
            <thead className='text-description'>
              <tr className='text-end'>
                <th className='text-end'>nodes</th>
                <th className='text-end'>edges</th>
                <th className='text-end'>elems</th>
                <th className='text-end'>fps</th>
                <th className='text-end'>p50 ms</th>
                <th className='text-end'>p95 ms</th>
                <th className='text-end'>max ms</th>
                <th className='text-end'>jank</th>
                <th className='text-end'>ticks</th>
                <th className='text-end'>js p50</th>
                <th className='text-end'>js p95</th>
                <th className='text-end'>topo</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.nodes} className='text-end'>
                  <td>{result.nodes}</td>
                  <td>{result.edges}</td>
                  <td>{result.elements}</td>
                  <td>{result.fps.toFixed(1)}</td>
                  <td>{result.frameP50.toFixed(1)}</td>
                  <td>{result.frameP95.toFixed(1)}</td>
                  <td>{result.frameMax.toFixed(0)}</td>
                  <td>{(result.jank * 100).toFixed(0)}%</td>
                  <td>{result.ticks}</td>
                  <td>{result.renderP50.toFixed(2)}</td>
                  <td>{result.renderP95.toFixed(2)}</td>
                  <td>{result.topology.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className='mt-2 text-xs text-description'>
            Each size: {WARMUP_MS} ms warm-up after the topology render, then the simulation restarts and frames are
            sampled for {durationMs} ms. "js" is the renderer's synchronous cost per simulation tick; frame time also
            includes style, layout and paint. Results are on <code>window.__graphStress</code>.
          </p>
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-graph/GraphStress',
  render: StressStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
  },
} satisfies Meta<typeof StressStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sizes: [100, 300, 600, 1000, 2000],
    edgeRatio: 1.5,
    durationMs: 4000,
    labels: true,
    arrows: true,
  },
};
