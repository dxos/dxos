//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useContext, useMemo } from 'react';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';

import { useSceneProjection } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { type FreehandProjectionOptions } from '../../model/projection.ts';
import {
  DYNAMIC_SCENE_ID,
  type GraphModel,
  type Overlay,
  createDynamicProjection,
} from '../../model/projections/dynamic.ts';
import { createMemoryStore } from '../../model/store.ts';
import { Properties } from '../Properties/Properties.tsx';
import { SceneView } from './SceneView.tsx';

/**
 * Test:
 * 1. The graph on the right is laid out by rank (edges point down); links route between automatic ports.
 * 2. Untick a node: it and its edges leave the graph and the layout re-runs; tick it back.
 * 3. Drag a node: the move is stored as an override (listed on the right) and survives graph changes; untick that
 *    node and the override is dropped.
 * 4. Drag from a port to another node adds an edge to the graph; Delete removes a node and its edges.
 */
const ALL: GraphModel = {
  nodes: [
    { id: 'app', label: 'App' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'echo', label: 'ECHO' },
    { id: 'halo', label: 'HALO' },
    { id: 'mesh', label: 'MESH' },
    { id: 'edge', label: 'EDGE' },
    { id: 'storage', label: 'Storage' },
  ],
  edges: [
    { id: 'app-plugins', from: 'app', to: 'plugins' },
    { id: 'plugins-echo', from: 'plugins', to: 'echo' },
    { id: 'plugins-halo', from: 'plugins', to: 'halo' },
    { id: 'echo-mesh', from: 'echo', to: 'mesh' },
    { id: 'halo-mesh', from: 'halo', to: 'mesh' },
    { id: 'mesh-edge', from: 'mesh', to: 'edge' },
    { id: 'echo-storage', from: 'echo', to: 'storage' },
  ],
};

const GraphPanel = ({ graph, overlay }: { graph: Atom.Writable<GraphModel>; overlay: Atom.Writable<Overlay> }) => {
  const registry = useContext(RegistryContext);
  const value = useAtomValue(graph);
  const overrides = useAtomValue(overlay);
  const present = new Set(value.nodes.map(({ id }) => id));
  const toggle = (id: string) => {
    if (present.has(id)) {
      registry.set(graph, {
        nodes: value.nodes.filter((node) => node.id !== id),
        edges: value.edges.filter((edge) => edge.from !== id && edge.to !== id),
      });
    } else {
      // Restore the node with every edge of the full graph that both ends now allow.
      const nodes = ALL.nodes.filter((node) => present.has(node.id) || node.id === id);
      const ids = new Set(nodes.map((node) => node.id));
      registry.set(graph, {
        nodes,
        edges: ALL.edges
          .filter((edge) => ids.has(edge.from) && ids.has(edge.to) && !value.edges.some((e) => e.id === edge.id))
          .concat(value.edges),
      });
    }
  };
  return (
    <div className='flex flex-col gap-1 p-2 text-sm font-mono overflow-y-auto'>
      <div className='text-description'>nodes</div>
      {ALL.nodes.map((node) => (
        <label key={node.id} className='flex items-center gap-2'>
          <input type='checkbox' checked={present.has(node.id)} onChange={() => toggle(node.id)} />
          {node.label}
        </label>
      ))}
      <div className='text-description mt-2'>edges</div>
      {value.edges.map((edge) => (
        <div key={edge.id}>
          {edge.from} <span className='text-subdued'>→</span> {edge.to}
        </div>
      ))}
      <div className='text-description mt-2'>overrides</div>
      {Object.entries(overrides.positions).map(([id, point]) => (
        <div key={id}>
          {id} <span className='text-subdued'>@</span> {Math.round(point.x)}, {Math.round(point.y)}
        </div>
      ))}
    </div>
  );
};

const DefaultStory = () => {
  const graph = useMemo(() => Atom.keepAlive(Atom.make<GraphModel>(ALL)), []);
  const overlay = useMemo(() => Atom.keepAlive(Atom.make<Overlay>({ positions: {} })), []);
  const store = useMemo(() => createMemoryStore([]), []);
  const createProjection = useCallback(
    ({ registry }: FreehandProjectionOptions) => createDynamicProjection({ registry, graph, overlay }),
    [graph, overlay],
  );
  const atoms = useMemo(() => createSceneViewAtoms(DYNAMIC_SCENE_ID), []);
  const projection = useSceneProjection({ store, atoms, createProjection });
  return (
    <div className='dx-fill grid grid-cols-[1fr_16rem_20rem]'>
      <SceneView.Root store={store} root={DYNAMIC_SCENE_ID} atoms={atoms} createProjection={createProjection}>
        <SceneView.Canvas />
        <SceneView.Navigation />
        <SceneView.Actions />
        <SceneView.Debug />
        <SceneView.Palette />
      </SceneView.Root>
      <GraphPanel graph={graph} overlay={overlay} />
      <Properties projection={projection} atoms={atoms} classNames='border-l border-separator' />
    </div>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/scene/Dynamic',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

export const Default: StoryObj<typeof meta> = {};
