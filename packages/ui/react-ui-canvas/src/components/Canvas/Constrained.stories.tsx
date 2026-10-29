//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import {
  CONSTRAINED_VIEW_ID,
  type ConstrainedModel,
  type FreehandProjectionOptions,
  createCanvasAtoms,
  createConstrainedProjection,
} from '../../engine/index.ts';
import { useCanvasHistory, useRegistry, useViewProjection } from '../../hooks/index.ts';
import { createMemoryStore } from '../../model/index.ts';
import { PropertiesInspector } from '../inspectors/index.ts';
import { defaultNodeRegistry } from '../SceneLayer/index.ts';
import { Canvas } from './Canvas.tsx';

/**
 * Test:
 * 1. Nodes are placed by the constraints listed on the right; there are no stored coordinates.
 * 2. Drag a node next to another: its constraints are rewritten (east/west + aligned, or north/south of the
 *    nearest node) and the scene re-solves. A drop with no neighbour snaps back.
 * 3. R / E / C / T then drag draws a node of that type, constrained relative to where it was drawn; Delete removes a node and
 *    its constraints. Resize and link are unavailable: the projection does not offer them.
 */
const INITIAL: ConstrainedModel = {
  nodes: [
    { id: 'client', label: 'Client' },
    { id: 'edge', label: 'Edge' },
    { id: 'echo', label: 'ECHO' },
    { id: 'halo', label: 'HALO' },
    { id: 'mesh', label: 'MESH' },
  ],
  constraints: [
    { subject: 'edge', relation: 'east', object: 'client' },
    { subject: 'edge', relation: 'aligned', object: 'client' },
    { subject: 'echo', relation: 'south', object: 'client' },
    { subject: 'halo', relation: 'east', object: 'echo' },
    { subject: 'halo', relation: 'aligned', object: 'echo' },
    { subject: 'mesh', relation: 'east', object: 'halo' },
    { subject: 'mesh', relation: 'aligned', object: 'halo' },
  ],
};

const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }) => {
  const value = useAtomValue(model);
  return (
    <div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>
      <div className='text-fg-muted'>constraints</div>
      {value.constraints.map((constraint, index) => (
        <div key={index}>
          {constraint.subject} <span className='text-fg-subtle'>{constraint.relation}</span> {constraint.object}
        </div>
      ))}
    </div>
  );
};

const DefaultStory = () => {
  const model = useMemo(() => Atom.keepAlive(Atom.make<ConstrainedModel>(INITIAL)), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const createProjection = useCallback(
    ({ registry }: FreehandProjectionOptions) =>
      createConstrainedProjection({ registry, model, options: { nodes: defaultNodeRegistry } }),
    [model],
  );
  const atoms = useMemo(() => createCanvasAtoms(CONSTRAINED_VIEW_ID), []);
  // One history for the canvas and the panel beside it, so either's edits undo from the canvas.
  const history = useCanvasHistory({ registry: useRegistry(), atoms, store });
  const projection = useViewProjection({ store, atoms, createProjection, history });
  return (
    <div className='dx-fill grid grid-cols-[1fr_16rem_20rem]'>
      <Canvas.Root
        store={store}
        root={CONSTRAINED_VIEW_ID}
        atoms={atoms}
        createProjection={createProjection}
        history={history}
      >
        <Canvas.Viewport />
        <Canvas.Navigation />
        <Canvas.Actions />
        <Canvas.Camera />
        <Canvas.Tools />
      </Canvas.Root>
      <ConstraintList model={model} />
      <PropertiesInspector projection={projection} atoms={atoms} classNames='border-l border-separator' />
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/components/Constrained',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

export const Default: StoryObj<typeof meta> = {};
