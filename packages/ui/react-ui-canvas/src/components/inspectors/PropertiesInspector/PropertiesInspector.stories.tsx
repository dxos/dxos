//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useLayoutEffect, useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { Panel } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type ElementId, type Layer } from '@dxos/scene';

import { ViewBuilder } from '../../../builder/index.ts';
import { createCanvasAtoms } from '../../../engine/index.ts';
import { useCanvasHistory, useRegistry, useViewProjection } from '../../../hooks/index.ts';
import { type View, createMemoryStore, getElement } from '../../../model/index.ts';
import { between } from '../../../utils/index.ts';
import { InspectorFrame } from '../../panels/testing.ts';
import { PropertiesInspector } from './PropertiesInspector.tsx';

const box = (x: number, y = 0) => ({ x, y, width: 256, height: 128 });

/** Three layers, bottom first; `a` and the link are on the diagram layer, `n` on notes. */
const LAYERS: Layer[] = (() => {
  const background: Layer = { id: 'background', name: 'Background', z: between() };
  const notes: Layer = { id: 'notes', name: 'Notes', z: between(background.z) };
  const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(notes.z) };
  return [background, notes, diagram];
})();

const VIEW: View = (() => {
  const {
    views: [scene],
  } = ViewBuilder.view('root', [
    ViewBuilder.rect('a', box(0)).properties({ label: 'Rect', layer: 'diagram', style: { hue: 'teal' } }),
    ViewBuilder.rect('b', box(400)).properties({ label: 'Other', layer: 'background' }),
    ViewBuilder.note('n', box(0, 200)).properties({ layer: 'notes' }),
    ViewBuilder.view('f').at(box(400, 200)).properties({ label: 'View', layer: 'diagram' }),
    ViewBuilder.link('curve', 'a', 'b')
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
  const store = useMemo(() => createMemoryStore([VIEW]), []);
  const atoms = useMemo(() => createCanvasAtoms(VIEW.id), []);
  const history = useCanvasHistory({ registry, atoms, store });
  const projection = useViewProjection({ store, atoms, history });
  useLayoutEffect(() => {
    registry.set(atoms.selection, new Set(select));
  }, [registry, atoms, select]);
  // The selection as the model holds it, beside the panel editing it, so every edit shows what it wrote.
  const scene = useAtomValue(projection.scene);
  const styles = useAtomValue(store.styles);
  const selected = select.flatMap((id) => getElement(scene, id) ?? []);
  return (
    <Panel.Root>
      <Panel.Body classNames='grid grid-cols-[20rem_1fr] gap-3'>
        <InspectorFrame section={PROPERTIES}>
          <PropertiesInspector projection={projection} atoms={atoms} styles={store.styles} />
        </InspectorFrame>
        <JsonHighlighter data={{ selected, styles }} classNames='text-sm' />
      </Panel.Body>
    </Panel.Root>
  );
};

/** The section the inspector shows in, as the canvas gives it. */
const PROPERTIES = {
  id: 'properties',
  title: 'Properties',
  icon: 'ph--sliders-horizontal--regular',
  order: 0,
  defaultOpen: true,
} as const;

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas/components/inspectors/PropertiesInspector',
  render: DefaultStory,
  decorators: [withRegistry, withTheme(), withLayout({ layout: 'column', classNames: 'w-[50rem]' })],
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

/** A view node: its Link section, with how it shows what it links to. */
export const ViewNode: Story = { args: { select: ['f'] } };

/** A view node groups what it links to under one Link section. */
export const ViewNodeTest: Story = {
  args: { select: ['f'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The Link section shows; a labelled view node reads as not showing its contents.
    await expect(await canvas.findByText('Link')).toBeInTheDocument();
    await expect(await canvas.findByLabelText('Show contents')).not.toBeChecked();
  },
};

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
    // 3. The font row shows the face, unset reading as the body face.
    await expect(await canvas.findByRole('combobox', { name: 'Font' })).toHaveTextContent('Default');
    // 4. Opacity is a shape property.
    await expect(await canvas.findByLabelText('Opacity')).toBeInTheDocument();
    // 5. An unset line style reads as the style set's default, as the font does.
    await expect(await canvas.findByRole('combobox', { name: 'Line style' })).toHaveTextContent('Default');
  },
};
