//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { SceneView, createMemoryStore } from '@dxos/react-ui-canvas/scene';

import { DATA_FLOW_SCENE_ID, type DataFlowSpec, createDataFlowScene, layoutDataFlow } from './layout.ts';
import { MoleculeOverlay } from './MoleculeOverlay.tsx';
import { DataFlowSimulation, type SimulationOptions } from './simulation.ts';

export type DataFlowViewProps = {
  spec: DataFlowSpec;
  options?: SimulationOptions;
  running?: boolean;
  /** Off, only the containers and channels are drawn and nothing moves. */
  molecules?: boolean;
};

/** The blocks as a read-only canvas scene, with the molecule simulation animated over it. */
export const DataFlowView = ({ spec, options, running = true, molecules = true }: DataFlowViewProps) => {
  const layout = useMemo(() => layoutDataFlow(spec), [spec]);
  const store = useMemo(() => createMemoryStore([createDataFlowScene(layout)]), [layout]);
  const simulation = useMemo(() => new DataFlowSimulation(layout, options), [layout, options]);
  return (
    <SceneView.Root store={store} root={DATA_FLOW_SCENE_ID} readonly>
      <SceneView.Canvas
        overlay={<MoleculeOverlay layout={layout} simulation={simulation} running={running} molecules={molecules} />}
      />
      <SceneView.Navigation />
    </SceneView.Root>
  );
};
