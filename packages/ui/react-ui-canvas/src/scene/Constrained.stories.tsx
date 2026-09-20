//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSceneViewAtoms } from './atoms.ts';
import { CellProperties } from './CellProperties.tsx';
import { useSceneProjection } from './hooks.ts';
import { type FreehandProjectionOptions } from './projection.ts';
import { CONSTRAINED_SCENE_ID, type ConstrainedModel, createConstrainedProjection } from './projections/constrained.ts';
import { SceneView } from './SceneView.tsx';
import { createMemoryStore } from './store.ts';

/**
 * Test:
 * 1. Cells are placed by the constraints listed on the right; there are no stored coordinates.
 * 2. Drag a cell next to another: its constraints are rewritten (east/west + aligned, or north/south of the
 *    nearest cell) and the scene re-solves. A drop with no neighbour snaps back.
 * 3. R then drag draws a rect that is constrained relative to where it was drawn; Delete removes a cell and
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

const RegistryWrapper = ({ children }: { children: ReactNode }) => {
  const [registry] = useState(() => Registry.make());
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
};

const withRegistry: Decorator = (Story) => (
  <RegistryWrapper>
    <Story />
  </RegistryWrapper>
);

const ConstraintList = ({ model }: { model: Atom.Writable<ConstrainedModel> }) => {
  const value = useAtomValue(model);
  return (
    <div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>
      <div className='text-description'>constraints</div>
      {value.constraints.map((constraint, index) => (
        <div key={index}>
          {constraint.subject} <span className='text-subdued'>{constraint.relation}</span> {constraint.object}
        </div>
      ))}
    </div>
  );
};

const DefaultStory = () => {
  const model = useMemo(() => Atom.keepAlive(Atom.make<ConstrainedModel>(INITIAL)), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const createProjection = useCallback(
    ({ registry }: FreehandProjectionOptions) => createConstrainedProjection({ registry, model }),
    [model],
  );
  const atoms = useMemo(() => createSceneViewAtoms(CONSTRAINED_SCENE_ID), []);
  const projection = useSceneProjection({ store, atoms, createProjection });
  return (
    <div className='dx-fill grid grid-cols-[1fr_16rem_20rem]'>
      <SceneView store={store} root={CONSTRAINED_SCENE_ID} atoms={atoms} createProjection={createProjection} />
      <ConstraintList model={model} />
      <CellProperties projection={projection} atoms={atoms} classNames='border-l border-separator' />
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/scene/Constrained',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

export const Default: StoryObj<typeof meta> = {};
