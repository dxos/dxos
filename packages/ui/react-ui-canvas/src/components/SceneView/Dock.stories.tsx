//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { useRegistry } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { createMemoryStore } from '../../model/store.ts';
import { type Layer } from '../../model/types.ts';
import { SceneBuilder } from '../../utils/builder.ts';
import { between } from '../../utils/order.ts';
import { SceneView } from './SceneView.tsx';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

/** A scene with two layers and a shape on each. */
const createTree = () => {
  const background: Layer = { id: 'background', name: 'Background', z: between() };
  const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(background.z) };
  const tree = SceneBuilder.scene('root', [
    SceneBuilder.rect('a', box(0)).properties({ label: 'Rect', layer: 'diagram' }),
    SceneBuilder.rect('b', box(400)).properties({ label: 'Other', layer: 'background' }),
  ]).build();
  const [scene, ...rest] = tree.scenes;
  return { root: tree.root, scenes: [{ ...scene, layers: { background, diagram } }, ...rest] };
};

type StoryArgs = {
  /** The element selected, whose properties fill the dock's first section. */
  select?: string;
};

/** The docked panels alone: the properties and layers sections, without the canvas they sit beside. */
const DefaultStory = ({ select }: StoryArgs) => {
  const registry = useRegistry();
  const { store, root } = useMemo(() => {
    const tree = createTree();
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, []);
  const atoms = useMemo(() => createSceneViewAtoms(root), [root]);
  useLayoutEffect(() => {
    registry.set(atoms.selection, new Set(select ? [select] : []));
  }, [registry, atoms, select]);
  return (
    <SceneView.Root store={store} root={root} atoms={atoms}>
      <SceneView.Properties />
      <SceneView.Layers />
    </SceneView.Root>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/Dock',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { select: 'a' },
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** A shape selected: its properties above the scene's layers. */
export const Default: Story = {};

/** Nothing selected: the properties section says so rather than going away. */
export const Empty: Story = { args: { select: undefined } };

/** Each section's header collapses it. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Both sections are open, the properties showing the selected shape's layer.
    const dock = await canvas.findByTestId('scene-view-dock');
    await waitFor(() => expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'open'));
    await expect(await within(dock).findByRole('combobox', { name: 'Layer' })).toHaveTextContent('Diagram');
    // 2. The properties header collapses its section.
    await userEvent.click(within(dock).getByRole('button', { name: 'Properties' }));
    await waitFor(() =>
      expect(within(dock).getByTestId('dock-section-properties')).toHaveAttribute('data-state', 'closed'),
    );
  },
};
