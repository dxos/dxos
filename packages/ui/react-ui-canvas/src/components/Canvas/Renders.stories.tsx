//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Profiler, type ProfilerOnRenderCallback, type ReactNode, useMemo } from 'react';
import { expect, waitFor } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { createCanvasAtoms } from '../../engine/index.ts';
import { useRegistry } from '../../hooks/index.ts';
import { createMemoryStore } from '../../model/index.ts';
import { createViewTree } from '../../testing/index.ts';
import { Canvas } from './Canvas.tsx';

/** Commits per part, keyed by the Profiler id; read by the play function. */
const commits = new Map<string, number>();
const onRender: ProfilerOnRenderCallback = (id) => commits.set(id, (commits.get(id) ?? 0) + 1);

const Counted = ({ id, children }: { id: string; children: ReactNode }) => (
  <Profiler id={id} onRender={onRender}>
    {children}
  </Profiler>
);

/** The panels a pan must not re-render; the Viewport (and the zoom readout) draw the camera, so they may. */
const PANELS = ['navigation', 'actions', 'theme', 'tools', 'properties', 'layers'] as const;

/**
 * The panels a selection must not re-render (DESIGN.md §13.1): the Actions read it, the Properties and Layers take
 * turns in the floating inspector by it, and the rest do not read it.
 */
const UNSELECTED = ['navigation', 'theme', 'tools'] as const;

/** Commits per panel since `before`. */
const grownSince = (before: Map<string, number>, ids: readonly string[]) =>
  Object.fromEntries(ids.map((id) => [id, (commits.get(id) ?? 0) - (before.get(id) ?? 0)]));

const DefaultStory = () => {
  const registry = useRegistry();
  const { store, root } = useMemo(() => {
    const tree = createViewTree(1);
    return { store: createMemoryStore(tree.views), root: tree.root };
  }, []);
  const atoms = useMemo(() => createCanvasAtoms(root), [root]);
  // Exposed so the play function pans through the camera atom, as the wheel and the camera animation do.
  Reflect.set(window, '__canvasPan', (dx: number) => {
    const camera = registry.get(atoms.camera);
    registry.set(atoms.camera, { ...camera, x: camera.x + dx });
  });
  // Selects as a click does, through the selection atom.
  Reflect.set(window, '__canvasSelect', (ids: string[]) => registry.set(atoms.selection, new Set(ids)));
  return (
    <Canvas.Root store={store} root={root} atoms={atoms}>
      <Canvas.Viewport />
      <Counted id='navigation'>
        <Canvas.Navigation />
      </Counted>
      <Counted id='actions'>
        <Canvas.Actions />
      </Counted>
      <Canvas.Debug />
      <Counted id='theme'>
        <Canvas.Theme />
      </Counted>
      <Counted id='tools'>
        <Canvas.Tools />
      </Counted>
      <Counted id='properties'>
        <Canvas.Properties />
      </Counted>
      <Counted id='layers'>
        <Canvas.Layers />
      </Counted>
    </Canvas.Root>
  );
};

const meta: Meta = {
  title: 'ui/react-ui-canvas/components/Canvas/Renders',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj;

/** The canvas with its panels; pan it and only the Viewport should redraw (DESIGN.md §13). */
export const Default: Story = {};

/**
 * A pan re-renders no panel: they read the atoms they draw, and the camera is none of them. A selection re-renders
 * only the panels that read it.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    // 1. Let the canvas settle (measure, fit) before counting.
    await waitFor(() => expect(canvasElement.querySelector('[data-node-id]')).not.toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const before = new Map(commits);

    // 2. Pan twenty steps, a frame apart, as a drag would.
    const pan = Reflect.get(window, '__canvasPan');
    for (let step = 0; step < 20; step++) {
      pan(10);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 3. No panel committed during the pan.
    await expect(grownSince(before, PANELS)).toEqual(Object.fromEntries(PANELS.map((id) => [id, 0])));

    // 4. Select a node, then clear the selection.
    const node = canvasElement.querySelector('[data-node-id]')?.getAttribute('data-node-id');
    await expect(node).toBeTruthy();
    const selected = new Map(commits);
    const select = Reflect.get(window, '__canvasSelect');
    select([node]);
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector('[data-testid="dock-section-properties"]')).not.toBeNull(),
    );
    select([]);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 5. Only the panels that read the selection committed.
    await expect(grownSince(selected, UNSELECTED)).toEqual(Object.fromEntries(UNSELECTED.map((id) => [id, 0])));
    await expect((commits.get('actions') ?? 0) - (selected.get('actions') ?? 0)).toBeGreaterThan(0);
  },
};
