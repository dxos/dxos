//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { SceneView, createMemoryStore } from '@dxos/react-ui-canvas/scene';
import * as Button from '@dxos/react-ui/Button';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { mx } from '@dxos/ui-theme';

import { DATA_FLOW_SCENE_ID, type DataFlowSpec, createDataFlowScene, layoutDataFlow } from './layout.ts';
import { type Grid, type Look, MoleculeOverlay, useNoise } from './MoleculeOverlay.tsx';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';

export type DataFlowViewProps = {
  spec: DataFlowSpec;
  options?: SimulationOptions;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
  /** How containers, channels and app content are drawn. */
  look?: Look;
  /** The grid behind the containers, for a look with a backdrop; the grid panel changes it from there. */
  grid?: Grid;
};

/** Each grid the panel offers, with its icon and label. */
const GRID_OPTIONS: readonly { grid: Grid; icon: string; label: string }[] = [
  { grid: 'dots', icon: 'ph--dots-nine--regular', label: 'Dots on the minor grid' },
  { grid: 'lines', icon: 'ph--grid-four--regular', label: 'Lines on the minor and major grid' },
  { grid: 'none', icon: 'ph--square--regular', label: 'No grid' },
];

/** The bar the canvas's own toolbars sit in, so this panel matches them. */
const BAR = 'gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator';

/** Picks the grid behind the containers. */
const GridPanel = ({ grid, onChange }: { grid: Grid; onChange: (grid: Grid) => void }) => (
  <div className='absolute bottom-2 right-2 w-max'>
    <Toolbar.Root classNames={BAR}>
      {GRID_OPTIONS.map((option) => (
        <Button.Root
          key={option.grid}
          variant='ghost'
          iconOnly
          icon={option.icon}
          label={option.label}
          classNames={mx(grid === option.grid && 'bg-primary-500/20')}
          onClick={() => onChange(option.grid)}
        />
      ))}
    </Toolbar.Root>
  </div>
);

/** The blocks as a read-only canvas scene, with the molecule simulation animated over it, and its zoom and grid panels. */
export const DataFlowView = ({
  spec,
  options,
  running = true,
  molecules = true,
  look = 'glass',
  grid: initialGrid = 'dots',
}: DataFlowViewProps) => {
  const noise = useNoise();
  const layout = useMemo(() => layoutDataFlow(spec), [spec]);
  const store = useMemo(() => createMemoryStore([createDataFlowScene(layout)]), [layout]);
  const simulation = useMemo(() => new DataFlowSimulation(layout, options), [layout, options]);
  const [grid, setGrid] = useState(initialGrid);
  useEffect(() => setGrid(initialGrid), [initialGrid]);
  return (
    <SceneView.Root store={store} root={DATA_FLOW_SCENE_ID} readonly>
      <SceneView.Canvas
        overlay={
          <MoleculeOverlay
            layout={layout}
            simulation={simulation}
            running={running}
            molecules={molecules}
            look={look}
            grid={grid}
          />
        }
      />
      {/* Screen-space grain over the glass look's backdrop, so its dim gradients show no bands at any zoom. */}
      {look === 'glass' && noise && (
        <div className='dx-cover pointer-events-none' style={{ backgroundImage: `url(${noise})` }} />
      )}
      <SceneView.Navigation />
      <SceneView.Debug />
      <GridPanel grid={grid} onChange={setGrid} />
    </SceneView.Root>
  );
};
