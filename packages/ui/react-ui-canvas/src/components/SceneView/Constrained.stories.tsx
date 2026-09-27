//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useMemo } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { useSceneProjection } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { type FreehandProjectionOptions } from '../../model/projection.ts';
import {
  CONSTRAINED_SCENE_ID,
  type ConstrainedModel,
  createConstrainedProjection,
} from '../../model/projections/constrained.ts';
import { createMemoryStore } from '../../model/store.ts';
import { Properties } from '../Properties/Properties.tsx';
import { SceneView } from './SceneView.tsx';

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
      <SceneView.Root store={store} root={CONSTRAINED_SCENE_ID} atoms={atoms} createProjection={createProjection}>
        <SceneView.Canvas />
        <SceneView.Navigation />
        <SceneView.Actions />
        <SceneView.Debug />
        <SceneView.Palette />
      </SceneView.Root>
      <ConstraintList model={model} />
      <Properties projection={projection} atoms={atoms} classNames='border-l border-separator' />
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
