//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  type BackgroundGrid,
  type Bounds,
  SceneView,
  createMemoryStore,
  defaultThemeRegistry,
  resolveLook,
} from '@dxos/react-ui-canvas/scene';
import { useThemeContext } from '@dxos/react-ui/Theme';

import {
  type Block,
  DATA_FLOW_SCENE_ID,
  type DataFlowLayout,
  type DataFlowSpec,
  createDataFlowScene,
  layoutDataFlow,
  partitionHub,
} from './layout.ts';
import { LOOKS, MoleculeOverlay, type Outgoing, REVEAL_MS } from './MoleculeOverlay.tsx';
import { type SplitMove, planSplit } from './morph.ts';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';

/** Milliseconds a sink changing kind takes to fade out before its replacement starts to fade in. */
const SWAP_MS = 1000;

/** How many buckets a partitioned hub gets, and how long the morph to it takes. */
const PARTITIONS = 3;
const PARTITION_MS = 3000;

/** Runs linearly from where it is to `target` over `duration` ms whenever `target` changes, rendering each step. */
const useTween = (target: number, duration: number): number => {
  const [value, setValue] = useState(target);
  useEffect(() => {
    const from = value;
    if (from === target) {
      return;
    }
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const t = Math.min(1, (now - start) / duration);
      setValue(from + (target - from) * t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
      }
    });
    return () => cancelAnimationFrame(frame);
    // Restarted only by a new target, from wherever the last run left off.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
};

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
  /**
   * The sinks as they are now, by position, over the spec's: one whose kind changes (an application becoming an agent)
   * fades out, then its replacement fades in, while the rest of the diagram runs on.
   */
  sinks?: DataFlowSpec['sinks'];
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
  sinks,
}: DataFlowViewProps) => {
  // With no theme chosen, the diagram follows the app's light or dark mode: paper by day, the glow by night.
  const { themeMode } = useThemeContext();
  const initialTheme = chosenTheme ?? (themeMode === 'light' ? 'paper' : 'glass-night');
  const laidOut = useMemo(() => layoutDataFlow(spec), [spec]);
  // The sinks keep their places; only what each is (its label, and whether it is an application) follows `sinks`.
  const layout = useMemo(
    () =>
      sinks
        ? {
            ...laidOut,
            sinks: laidOut.sinks.map((sink, index) =>
              sinks[index] ? { ...sink, label: sinks[index].label, app: sinks[index].app } : sink,
            ),
          }
        : laidOut,
    [laidOut, sinks],
  );
  const registry = useContext(RegistryContext);
  // Created per layout, not per reveal: a new store would reset the view; the reveal rewrites its one scene instead.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store = useMemo(() => createMemoryStore([createDataFlowScene(layout, revealed)]), [layout]);
  const simulation = useMemo(() => new DataFlowSimulation(laidOut, options), [laidOut, options]);
  // A sink that changes kind is converted in the running simulation: the outgoing one fades over `SWAP_MS` (drawn from
  // what it held), and only then does its replacement come into view. Converted at once when the view opens.
  const [outgoing, setOutgoing] = useState<Outgoing>();
  const sinksRef = useRef<{ simulation: DataFlowSimulation; sinks: readonly Block[] }>(undefined);
  useLayoutEffect(() => {
    const last = sinksRef.current;
    const before = last?.simulation === simulation ? last.sinks : laidOut.sinks;
    if (before === layout.sinks) {
      return;
    }
    sinksRef.current = { simulation, sinks: layout.sinks };
    const changed = layout.sinks.filter((sink, index) => Boolean(sink.app) !== Boolean(before[index]?.app));
    if (changed.length === 0) {
      return;
    }
    const opening = last?.simulation !== simulation;
    if (!opening) {
      const { apps } = simulation.frame();
      const leaving = before.filter((sink, index) => Boolean(sink.app) !== Boolean(layout.sinks[index]?.app));
      setOutgoing({ key: Date.now(), sinks: leaving, apps: leaving.map((sink) => apps[before.indexOf(sink)] ?? []) });
    }
    simulation.convertSinks(layout.sinks, opening ? 0 : SWAP_MS / 1000);
  }, [simulation, laidOut, layout]);
  const morphing = partitioned !== undefined;
  const morph = useMemo(
    () => (morphing ? { target: partitionHub(layout.hub, PARTITIONS) } : undefined),
    [layout, morphing],
  );
  // Linear: each phase of the split eases itself.
  const progress = useTween(partitioned ? 1 : 0, PARTITION_MS);
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
      const plan = planSplit(layout.hub, morph.target, bodies, bonds, layout.hubGrid.spacing);
      simulation.split(morph.target, plan);
      setApplied(plan);
    } else {
      // Merging moves nothing: the molecules stay put while the buckets close around them.
      simulation.merge(layout.hub);
      setApplied(new Map());
    }
  }, [morph, running, partitioned, simulation, layout]);
  // The scene takes the hub's end state at once, so the camera frames where the morph is heading.
  const sceneLayout = morph && partitioned ? { ...layout, hub: morph.target } : layout;
  useLayoutEffect(() => {
    const scene = createDataFlowScene(sceneLayout, revealed);
    registry.set(store.scenes, { ...registry.get(store.scenes), [scene.id]: scene });
  }, [registry, store, sceneLayout, revealed]);
  useLayoutEffect(() => {
    simulation.agentReads = revealed;
  }, [simulation, revealed]);
  const [theme, setTheme] = useState<string | undefined>(initialTheme);
  useEffect(() => setTheme(initialTheme), [initialTheme]);
  const [grid, setGrid] = useState(initialGrid);
  useEffect(() => setGrid(initialGrid), [initialGrid]);
  const look = useMemo(() => resolveLook(defaultThemeRegistry, { theme }), [theme]);
  // The background spans the containers' frames, not the canvas nodes' wider bases, so its washes sit as they always did.
  const field = useMemo(() => framesBounds(layout), [layout]);
  // The containers are drawn by the overlay, in the theme's style set (glass for one the sample has no palette for).
  const overlayLook = LOOKS.find((candidate) => candidate === look.styleSet.id) ?? 'glass';
  return (
    <SceneView.Root
      store={store}
      root={DATA_FLOW_SCENE_ID}
      readonly
      theme={theme}
      backgroundGrid={grid}
      refitKey={`${revealed ? 'revealed' : 'hidden'}:${partitioned ? 'partitioned' : 'whole'}`}
      // The camera widens over the same second the monolithic agent fades in, so the two settle together.
      refitDuration={REVEAL_MS}
      onThemeChange={setTheme}
      onBackgroundGridChange={setGrid}
    >
      <SceneView.Canvas
        backgroundBounds={field}
        overlay={
          <MoleculeOverlay
            layout={layout}
            outgoing={outgoing}
            simulation={simulation}
            running={running}
            molecules={molecules}
            look={overlayLook}
            tone={look.theme.mode ?? 'dark'}
            revealed={revealed}
            hubMorph={
              morph && progress > 0 ? { ...morph, progress, applied: running ? applied : undefined } : undefined
            }
          />
        }
      />
      <SceneView.Navigation />
      <SceneView.Debug />
      <SceneView.Theme />
    </SceneView.Root>
  );
};
