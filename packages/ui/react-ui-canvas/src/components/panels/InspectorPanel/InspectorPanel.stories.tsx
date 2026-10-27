//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { ViewBuilder } from '../../../builder/index.ts';
import { type InspectorMode, createCanvasAtoms } from '../../../engine/index.ts';
import { useRegistry } from '../../../hooks/index.ts';
import { type Layer, createMemoryStore } from '../../../model/index.ts';
import { between } from '../../../utils/index.ts';
import { Canvas } from '../../Canvas/index.ts';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

/** A scene with two layers and a shape on each. */
const createTree = () => {
  const background: Layer = { id: 'background', name: 'Background', z: between() };
  const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(background.z) };
  const tree = ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)).properties({ label: 'Rect', layer: 'diagram' }),
    ViewBuilder.rect('b', box(400)).properties({ label: 'Other', layer: 'background' }),
  ]).build();
  const [scene, ...rest] = tree.views;
  return { root: tree.root, scenes: [{ ...scene, layers: { background, diagram } }, ...rest] };
};

type StoryArgs = {
  /** The element selected, whose properties fill the dock's first section. */
  select?: string;
};

/** The inspector panel alone, floating to start: its toolbar, then the sections that show, without the canvas beside it. */
const DefaultStory = ({ select }: StoryArgs) => {
  const registry = useRegistry();
  const { store, root } = useMemo(() => {
    const tree = createTree();
    return { store: createMemoryStore(tree.scenes), root: tree.root };
  }, []);
  const atoms = useMemo(() => createCanvasAtoms(root), [root]);
  useLayoutEffect(() => {
    registry.set(atoms.selection, new Set(select ? [select] : []));
  }, [registry, atoms, select]);
  // The panel's toolbar docks and floats the inspectors.
  const [inspectors, setInspectors] = useState<InspectorMode>('floating');
  return (
    <Canvas.Root store={store} root={root} atoms={atoms} inspectors={inspectors} onInspectorsChange={setInspectors}>
      <Canvas.Properties />
      <Canvas.Layers />
      <Canvas.Objects />
      <Canvas.Objects />
    </Canvas.Root>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/panels/InspectorPanel',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { select: 'a' },
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** A shape selected: its properties above the scene's layers. */
export const Default: Story = {};

/** Nothing selected: there is nothing to edit, so the properties section goes and the layers lead. */
export const Empty: Story = { args: { select: undefined } };

/** Each section's header collapses it. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. Floating, only the properties show; docked (from the panel's toolbar), every inspector does.
    await userEvent.click(await canvas.findByTestId('dock-open'));
    const dock = await canvas.findByTestId('scene-view-dock');
    await waitFor(() => expect(dock).not.toHaveAttribute('data-floating'));
    // 2. Only the properties start open, showing the selected shape's layer; the layers and about wait closed.
    await waitFor(() =>
      expect(within(dock).getByTestId('dock-section-properties')).toHaveAttribute('data-state', 'open'),
    );
    await expect(within(dock).getByTestId('dock-section-layers')).toHaveAttribute('data-state', 'closed');
    await expect(await within(dock).findByRole('combobox', { name: 'Layer' })).toHaveTextContent('Diagram');
    // 3. The properties header collapses its section.
    await userEvent.click(within(dock).getByRole('button', { name: 'Properties' }));
    await waitFor(() =>
      expect(within(dock).getByTestId('dock-section-properties')).toHaveAttribute('data-state', 'closed'),
    );
  },
};
