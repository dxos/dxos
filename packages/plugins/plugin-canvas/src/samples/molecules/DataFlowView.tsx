//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import {
  SceneView,
  createMemoryStore,
  createStyleSetRegistry,
  defaultStyleSetRegistry,
  resolveBackground,
} from '@dxos/react-ui-canvas/scene';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { DATA_FLOW_SCENE_ID, type DataFlowSpec, createDataFlowScene, layoutDataFlow } from './layout.ts';
import { type Grid, type Look, MoleculeOverlay } from './MoleculeOverlay.tsx';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';

export type DataFlowViewProps = {
  spec: DataFlowSpec;
  options?: SimulationOptions;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
  /** How containers, channels and app content are drawn. */
  look?: Look;
  /** The canvas background under the diagram, by id; the panel changes it from there. */
  background?: string;
  /** The background's grid, in place of its own; the panel changes it from there. */
  grid?: Grid;
};

/** The backgrounds the panel offers, with their icons and labels. */
const BACKGROUND_OPTIONS: readonly { id: string; icon: string; label: string }[] = [
  { id: 'paper', icon: 'ph--scroll--regular', label: 'Paper' },
  { id: 'glow', icon: 'ph--sparkle--regular', label: 'Glow' },
  { id: 'plain', icon: 'ph--square--regular', label: 'Plain' },
];

/** Each grid the panel offers, with its icon and label. */
const GRID_OPTIONS: readonly { grid: Grid; icon: string; label: string }[] = [
  { grid: 'dots', icon: 'ph--dots-nine--regular', label: 'Dots on the minor grid' },
  { grid: 'lines', icon: 'ph--grid-four--regular', label: 'Lines on the minor and major grid' },
  { grid: 'none', icon: 'ph--prohibit--regular', label: 'No grid' },
];

/** The bar the canvas's own toolbars sit in, so this panel matches them. */
const BAR = 'gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

type BackgroundPanelProps = {
  background: string;
  grid: Grid;
  onBackgroundChange: (background: string) => void;
  onGridChange: (grid: Grid) => void;
};

/** Picks the background under the containers and its grid. */
const BackgroundPanel = ({ background, grid, onBackgroundChange, onGridChange }: BackgroundPanelProps) => (
  <div className='absolute bottom-2 right-2 w-max'>
    <Toolbar.Root classNames={BAR}>
      {BACKGROUND_OPTIONS.map((option) => (
        <Button.Root
          key={option.id}
          variant='ghost'
          iconOnly
          icon={option.icon}
          label={option.label}
          classNames={mx(background === option.id && 'bg-primary-500/20')}
          onClick={() => onBackgroundChange(option.id)}
        />
      ))}
      <Toolbar.Separator />
      {GRID_OPTIONS.map((option) => (
        <Button.Root
          key={option.grid}
          variant='ghost'
          iconOnly
          icon={option.icon}
          label={option.label}
          classNames={mx(grid === option.grid && 'bg-primary-500/20')}
          onClick={() => onGridChange(option.grid)}
        />
      ))}
    </Toolbar.Root>
  </div>
);

/**
 * The blocks as a read-only canvas scene on one of the canvas's backgrounds, with the molecule simulation animated over
 * it, and its zoom and background panels.
 */
export const DataFlowView = ({
  spec,
  options,
  running = true,
  molecules = true,
  look = 'glass',
  background: initialBackground = 'paper',
  grid: initialGrid,
}: DataFlowViewProps) => {
  const layout = useMemo(() => layoutDataFlow(spec), [spec]);
  const store = useMemo(() => createMemoryStore([createDataFlowScene(layout)]), [layout]);
  const simulation = useMemo(() => new DataFlowSimulation(layout, options), [layout, options]);
  const [backgroundId, setBackgroundId] = useState(initialBackground);
  useEffect(() => setBackgroundId(initialBackground), [initialBackground]);
  const base = resolveBackground(defaultStyleSetRegistry, backgroundId);
  const [grid, setGrid] = useState<Grid>(initialGrid ?? base.grid);
  useEffect(() => setGrid(initialGrid ?? base.grid), [initialGrid, base.grid]);
  // The panel's grid over the chosen background, registered as a background of its own so the canvas draws it.
  const { styleSets, background } = useMemo(() => {
    const id = `${base.id}-${grid}`;
    return {
      styleSets: createStyleSetRegistry({ backgrounds: { [id]: { ...base, id, grid } } }),
      background: id,
    };
  }, [base, grid]);
  return (
    <SceneView.Root
      store={store}
      root={DATA_FLOW_SCENE_ID}
      readonly
      styleSets={styleSets}
      styleSet={look}
      background={background}
    >
      <SceneView.Canvas
        overlay={
          <MoleculeOverlay
            layout={layout}
            simulation={simulation}
            running={running}
            molecules={molecules}
            look={look}
            tone={base.tone ?? 'dark'}
          />
        }
      />
      <SceneView.Navigation />
      <SceneView.Debug />
      <BackgroundPanel
        background={backgroundId}
        grid={grid}
        onBackgroundChange={setBackgroundId}
        onGridChange={setGrid}
      />
    </SceneView.Root>
  );
};
