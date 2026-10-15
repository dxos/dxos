//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import {
  type BackgroundGrid,
  type Bounds,
  SceneView,
  createMemoryStore,
  defaultThemeRegistry,
  resolveLook,
} from '@dxos/react-ui-canvas/scene';

import {
  DATA_FLOW_SCENE_ID,
  type DataFlowLayout,
  type DataFlowSpec,
  createDataFlowScene,
  layoutDataFlow,
} from './layout.ts';
import { LOOKS, MoleculeOverlay } from './MoleculeOverlay.tsx';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';

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
  /** The canvas theme the diagram opens in; the theme bar changes it from there. */
  theme?: string;
  /** The grid over the theme's background, in place of its own; the theme bar changes it from there. */
  grid?: BackgroundGrid;
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
  theme: initialTheme = 'paper',
  grid: initialGrid,
}: DataFlowViewProps) => {
  const layout = useMemo(() => layoutDataFlow(spec), [spec]);
  const store = useMemo(() => createMemoryStore([createDataFlowScene(layout)]), [layout]);
  const simulation = useMemo(() => new DataFlowSimulation(layout, options), [layout, options]);
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
      onThemeChange={setTheme}
      onBackgroundGridChange={setGrid}
    >
      <SceneView.Canvas
        backgroundBounds={field}
        overlay={
          <MoleculeOverlay
            layout={layout}
            simulation={simulation}
            running={running}
            molecules={molecules}
            look={overlayLook}
            tone={look.theme.mode ?? 'dark'}
          />
        }
      />
      <SceneView.Navigation />
      <SceneView.Debug />
      <SceneView.Theme />
    </SceneView.Root>
  );
};
