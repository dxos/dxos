//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  type BackgroundGrid,
  Canvas,
  createMemoryStore,
  defaultThemeRegistry,
  resolveLook,
} from '@dxos/react-ui-canvas/scene';
import { useThemeContext } from '@dxos/react-ui/Theme';
import { type Bounds } from '@dxos/scene';

import {
  DATA_FLOW_VIEW_ID,
  type DataFlowLayout,
  type DataFlowSpec,
  createDataFlowView,
  layoutDataFlow,
  partitionHub,
} from './layout.ts';
import { LOOKS, MoleculeOverlay, REVEAL_MS } from './MoleculeOverlay.tsx';
import { type Arrivals, type SplitMove, planArrivals, planMove, planSplit } from './morph.ts';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';
import { useRun, useTween } from './tween.ts';

/** How many buckets a partitioned hub gets, and how long the morph to it takes. */
const PARTITIONS = 3;
const PARTITION_MS = 3000;

/** Milliseconds a relayout takes: slow, so the hub's growth and then each new agent and source can be watched arriving. */
const RELAYOUT_MS = 8000;

/** How far into a growing relayout the hub has passed the edges of the view, and the pan that then sets off along it. */
const DRIFT_START = 0.2;
/** The pan's speed (scene units per second): it sets off slowly and keeps gathering pace. */
const DRIFT = { start: 40, acceleration: 20 };

const driftSpeedAt = (seconds: number) => DRIFT.start + DRIFT.acceleration * seconds;

/** How often the focus's boost is raised while the view pans. */
const FOCUS_TICK = 250;

/** How much busier than normal what is in view gets as the pan sets off, how fast that climbs per second, and its cap. */
const FOCUS = { start: 2, rise: 0.5, top: 8 };

/** The rectangle every shown block's frame lies in. */
const framesBounds = (layout: DataFlowLayout): Bounds | undefined => {
  const frames = [...layout.sources, layout.hub, ...layout.sinks]
    .filter((block) => !block.hidden)
    .map((block) => block.frame);
  if (frames.length === 0) {
    return undefined;
  }
  const left = Math.min(...frames.map((frame) => frame.x));
  const top = Math.min(...frames.map((frame) => frame.y));
  const right = Math.max(...frames.map((frame) => frame.x + frame.width));
  const bottom = Math.max(...frames.map((frame) => frame.y + frame.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
};

export type DataFlowViewProps = {
  spec: DataFlowSpec;
  options?: SimulationOptions;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
  /** The canvas theme the diagram opens in (unset, one following the app's mode); the theme bar changes it from there. */
  theme?: string;
  /** The grid over the theme's background, in place of its own; the theme bar changes it from there. */
  grid?: BackgroundGrid;
  /**
   * For a monolithic layout, whether its agent is in the picture: off, only the silos show and the agent reads nothing;
   * turned on, its parts fade in, it starts reading, and the camera widens to take it in.
   */
  revealed?: boolean;
  /**
   * Splits a one-bucket hub into three while on: its clusters slide into their buckets' columns, then the buckets open,
   * over three seconds. Running, the simulation is split too; held (`running` off), the morph only redraws the frame.
   */
  partitioned?: boolean;
  /** Keeps one simulation running as `spec` changes, moving it to each new layout in place rather than starting over. */
  continuous?: boolean;
  /** Off, the canvas's toolbars are hidden, leaving the diagram alone on screen (as during playback). */
  chrome?: boolean;
};

/**
 * The blocks as a read-only canvas scene in one of the canvas's themes, with the molecule simulation animated over it,
 * and its zoom and theme bars.
 */
export const DataFlowView = ({
  spec,
  options,
  running = true,
  molecules = true,
  theme: chosenTheme,
  grid: initialGrid,
  revealed = true,
  partitioned,
  continuous = false,
  chrome = true,
}: DataFlowViewProps) => {
  // With no theme chosen, the diagram follows the app's light or dark mode: paper by day, the glow by night.
  const { themeMode } = useThemeContext();
  const initialTheme = chosenTheme ?? (themeMode === 'light' ? 'paper' : 'glass-night');
  const laidOut = useMemo(() => layoutDataFlow(spec), [spec]);
  const registry = useContext(RegistryContext);
  // Continuous, one simulation runs on as the spec changes, moved to each new layout in place; else a new spec starts over.
  const [origin] = useState(laidOut);
  const seed = continuous ? origin : laidOut;
  const simulation = useMemo(() => new DataFlowSimulation(seed, options), [seed, options]);
  // Only a one-bucket hub splits; a spec already partitioned is drawn as it is.
  const splittable = partitioned !== undefined && (laidOut.hub.buckets?.length ?? 1) === 1;
  const morph = useMemo(
    () => (splittable ? { from: laidOut.hub, target: partitionHub(laidOut.hub, PARTITIONS) } : undefined),
    [laidOut, splittable],
  );
  // Linear: each phase of the split eases itself.
  const progress = useTween(partitioned ? 1 : 0, PARTITION_MS);
  // The layout as it now stands: split, once the split is asked for.
  const layout = morph && partitioned ? { ...laidOut, hub: morph.target } : laidOut;
  // Created once per simulation: a new store would reset the view, so later layouts rewrite its one scene instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createMemoryStore([createDataFlowView(layout, revealed)]), [simulation]);
  // Running, the split is made in the simulation, so what arrives afterwards lands in the new buckets; held, the morph
  // only redraws the frame. The ref keeps one toggle to one split, however often the effect runs.
  const [applied, setApplied] = useState<ReadonlyMap<string, SplitMove>>();
  const splitRef = useRef<{ simulation: DataFlowSimulation; on: boolean }>(undefined);
  useLayoutEffect(() => {
    if (!morph || !running) {
      return;
    }
    const on = partitioned === true;
    const last = splitRef.current;
    if (last?.simulation === simulation ? last.on === on : !on) {
      return;
    }
    splitRef.current = { simulation, on };
    if (on) {
      const { bodies, bonds } = simulation.frame();
      const plan = planSplit(laidOut.hub, morph.target, bodies, bonds, laidOut.hubGrid.spacing);
      simulation.split(morph.target, plan);
      setApplied(plan);
    } else {
      // Merging moves nothing: the molecules stay put while the buckets close around them.
      simulation.merge(laidOut.hub);
      setApplied(new Map());
    }
  }, [morph, running, partitioned, simulation, laidOut]);
  // A new spec, continuous and running, moves the simulation to its layout: blocks glide to their new places, what is
  // new fades in, and the hub's clusters move with their buckets.
  const [relayout, setRelayout] = useState<{
    key: number;
    from: DataFlowLayout;
    plan: ReadonlyMap<string, SplitMove>;
    arrivals: Arrivals;
  }>();
  const appliedRef = useRef<{ simulation: DataFlowSimulation; spec: DataFlowSpec; layout: DataFlowLayout }>(undefined);
  useLayoutEffect(() => {
    const last = appliedRef.current;
    if (!continuous || !running || last?.simulation !== simulation || last.spec === spec) {
      appliedRef.current = { simulation, spec, layout };
      return;
    }
    const { bodies, bonds } = simulation.frame();
    const plan = planMove(last.layout.hub, layout.hub, bodies, bonds, layout.hubGrid.spacing);
    const arrivals = planArrivals(last.layout, layout);
    // Each new block takes part from when it comes into view, so nothing is fed to a box not yet there.
    const seconds = new Map([...arrivals.windows].map(([id, { start }]) => [id, (start * RELAYOUT_MS) / 1000]));
    simulation.relayout(layout, plan, seconds);
    appliedRef.current = { simulation, spec, layout };
    setRelayout({ key: Date.now(), from: last.layout, plan, arrivals });
  }, [continuous, running, simulation, spec, layout]);
  const moved = useRun(relayout?.key, RELAYOUT_MS);
  // Once a growing hub has passed the edges of the view, the view sets off rightward along it, and keeps going.
  const drifting =
    relayout !== undefined && relayout.from.hub.frame.width < layout.hub.frame.width && moved >= DRIFT_START;
  // What is on screen is the simulation's focus, so only what can be seen is active. While the view pans (picking up
  // speed as it goes), what is in view also grows busier the longer the pan runs.
  const [driftSpeed, setDriftSpeed] = useState(DRIFT.start);
  const boostRef = useRef(0);
  const viewRef = useRef<Bounds>(undefined);
  const refocus = useCallback(() => {
    const view = viewRef.current;
    simulation.focus(view && { left: view.x, right: view.x + view.width, boost: boostRef.current });
  }, [simulation]);
  const handleViewChange = useCallback(
    (view: Bounds) => {
      viewRef.current = view;
      refocus();
    },
    [refocus],
  );
  useEffect(() => {
    if (!drifting) {
      boostRef.current = 0;
      setDriftSpeed(DRIFT.start);
      refocus();
      return;
    }
    const started = performance.now();
    const timer = setInterval(() => {
      const seconds = (performance.now() - started) / 1000;
      setDriftSpeed(driftSpeedAt(seconds));
      boostRef.current = Math.min(FOCUS.top, FOCUS.start + FOCUS.rise * seconds);
      refocus();
    }, FOCUS_TICK);
    return () => clearInterval(timer);
  }, [drifting, refocus]);
  useLayoutEffect(() => {
    const scene = createDataFlowView(layout, revealed);
    registry.set(store.views, { ...registry.get(store.views), [scene.id]: scene });
  }, [registry, store, layout, revealed]);
  useLayoutEffect(() => {
    simulation.agentReads = revealed;
  }, [simulation, revealed]);
  const [theme, setTheme] = useState<string | undefined>(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);
  const [grid, setGrid] = useState(initialGrid);
  useEffect(() => setGrid(initialGrid), [initialGrid]);
  const look = useMemo(() => resolveLook(defaultThemeRegistry, { theme }), [theme]);
  // The background spans the containers' frames, not the canvas nodes' wider bases, so its washes sit as they always did.
  // Continuous, it stays on the layout the view opened with: a layout that grows would otherwise slide the washes.
  const field = useMemo(() => framesBounds(continuous ? origin : layout), [continuous, origin, layout]);
  // The containers are drawn by the overlay, in the theme's style set (glass for one the sample has no palette for).
  const overlayLook = LOOKS.find((candidate) => candidate === look.styleSet.id) ?? 'glass';
  return (
    <Canvas.Root
      store={store}
      root={DATA_FLOW_VIEW_ID}
      readonly
      theme={theme}
      backgroundGrid={grid}
      refitKey={`${revealed ? 'revealed' : 'hidden'}:${partitioned ? 'partitioned' : 'whole'}`}
      // The camera widens over the same second the monolithic agent fades in, so the two settle together; a relayout
      // leaves it where it is, so a diagram that extends runs on past the edges of the view.
      refitDuration={REVEAL_MS}
      drift={drifting ? { x: driftSpeed, y: 0 } : undefined}
      onViewChange={handleViewChange}
      onThemeChange={setTheme}
      onBackgroundGridChange={setGrid}
    >
      <Canvas.Viewport
        backgroundBounds={field}
        overlay={
          <MoleculeOverlay
            layout={layout}
            simulation={simulation}
            running={running}
            molecules={molecules}
            look={overlayLook}
            tone={look.theme.mode ?? 'dark'}
            revealed={revealed}
            relayout={relayout && moved < 1 ? { ...relayout, progress: moved } : undefined}
            hubMorph={
              // From the first frame the split is asked for, before its progress has moved off zero: otherwise that frame
              // draws the split layout's dividers outright.
              morph && (partitioned || progress > 0)
                ? { ...morph, progress, applied: running ? applied : undefined }
                : undefined
            }
          />
        }
      />
      {chrome && (
        <>
          <Canvas.Navigation />
          <Canvas.Camera />
          <Canvas.Theme />
        </>
      )}
    </Canvas.Root>
  );
};
