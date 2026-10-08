//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { useRegistry, useSceneProjection } from '../../hooks/index.ts';
import { createSceneViewAtoms } from '../../model/atoms.ts';
import { createMemoryStore } from '../../model/store.ts';
import { type ElementId, type Layer, type Scene, getElement } from '../../model/types.ts';
import { SceneBuilder } from '../../utils/builder.ts';
import { between } from '../../utils/order.ts';
import { Properties } from './Properties.tsx';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

/** Three layers, bottom first; `a` and the link are on the diagram layer, `n` on notes. */
const LAYERS: Layer[] = (() => {
  const background: Layer = { id: 'background', name: 'Background', z: between() };
  const notes: Layer = { id: 'notes', name: 'Notes', z: between(background.z) };
  const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(notes.z) };
  return [background, notes, diagram];
})();

const SCENE: Scene = (() => {
  const {
    scenes: [scene],
  } = SceneBuilder.scene('root', [
    SceneBuilder.rect('a', box(0)).properties({ label: 'Rect', layer: 'diagram', style: { hue: 'teal' } }),
    SceneBuilder.rect('b', box(400)).properties({ label: 'Other', layer: 'background' }),
    SceneBuilder.note('n', box(0, 200)).properties({ layer: 'notes' }),
    SceneBuilder.link('curve', 'a', 'b')
      .id('ab')
      .properties({ layer: 'diagram', style: { lineStyle: 'dashed' } }),
  ]).build();
  return { ...scene, layers: Object.fromEntries(LAYERS.map((layer) => [layer.id, layer])) };
})();

type StoryArgs = {
  /** The elements the panel edits. */
  select: ElementId[];
};

/** The panel alone, over an in-memory scene and a fixed selection: no canvas, so every field can be read in full. */
const DefaultStory = ({ select }: StoryArgs) => {
  const registry = useRegistry();
  const store = useMemo(() => createMemoryStore([SCENE]), []);
  const atoms = useMemo(() => createSceneViewAtoms(SCENE.id), []);
  const projection = useSceneProjection({ store, atoms });
  useLayoutEffect(() => {
    registry.set(atoms.selection, new Set(select));
  }, [registry, atoms, select]);
  // The selection as the model holds it, beside the panel editing it, so every edit shows what it wrote.
  const scene = useAtomValue(projection.scene);
  const styles = useAtomValue(store.styles);
  const selected = select.flatMap((id) => getElement(scene, id) ?? []);
  return (
    <Panel.Root>
      </Panel.Rot>

    <div className='grid grid-cols-2 gap-4 h-[40rem]'>
      <Properties
        classNames='border border-separator rounded-sm'
        projection={projection}
        atoms={atoms}
        styles={store.styles}
      />
      <JsonHighlighter data={{ selected, styles }} />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/Properties',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column', classNames: 'w-[56rem]' })],
  args: { select: ['a'] },
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** A shape: its layer, class and the whole style (the full colour grid, line style and text alignment). */
export const Default: Story = {};

/** A link: the common style base alone (the outline row and line style), its layer and class. */
export const Link: Story = { args: { select: ['ab'] } };

/** A shape and a link: only what both declare, the style narrowed to its common base. */
export const Mixed: Story = { args: { select: ['a', 'ab'] } };

/** A note on its own layer. */
export const Note: Story = { args: { select: ['n'] } };

/** The layer selector lists the scene's layers top first and shows the element's own. */
export const Test: Story = {
  args: { select: ['n'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The panel renders the selection's fields.
    await expect(await canvas.findByTestId('properties')).toBeInTheDocument();
    // 2. The layer field shows the note's layer.
    const layer = await canvas.findByRole('combobox', { name: 'Layer' });
    await expect(layer).toHaveTextContent('Notes');
  },
};
