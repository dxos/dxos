//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type Layer, type LayerId } from '../../model/types.ts';
import { between } from '../../utils/order.ts';
import { LayersPanel } from './Layers.tsx';

/** Three layers, bottom first, the middle one hidden. */
const LAYERS: Layer[] = (() => {
  const background: Layer = { id: 'background', name: 'Background', z: between() };
  const notes: Layer = { id: 'notes', name: 'Notes', z: between(background.z), hidden: true };
  const diagram: Layer = { id: 'diagram', name: 'Diagram', z: between(notes.z) };
  return [background, notes, diagram];
})();

/** The panel over local state, as a host keeps the scene's layers. */
const DefaultStory = () => {
  const [layers, setLayers] = useState(LAYERS);
  const [selected, setSelected] = useState<LayerId[]>(['diagram']);
  const update = (id: LayerId, values: Partial<Layer>) =>
    setLayers((layers) => layers.map((layer) => (layer.id === id ? { ...layer, ...values } : layer)));
  const remove = (ids: LayerId[]) => setLayers((layers) => layers.filter((layer) => !ids.includes(layer.id)));
  return (
    <LayersPanel
      classNames='w-72 border border-separator rounded-sm'
      layers={layers}
      selected={selected}
      onSelectedChange={setSelected}
      onToggle={(id) => update(id, { hidden: !layers.find((layer) => layer.id === id)?.hidden })}
      onRename={(id, name) => update(id, { name })}
      onMove={(id, index) =>
        setLayers((layers) => {
          const moved = layers.find((layer) => layer.id === id);
          const others = layers.filter((layer) => layer.id !== id);
          return moved ? [...others.slice(0, index), moved, ...others.slice(index)] : layers;
        })
      }
      onCreate={() => {
        const id = `layer-${layers.length + 1}`;
        setLayers((layers) => [
          { id, name: `Layer ${layers.length + 1}`, z: between(undefined, layers[0]?.z) },
          ...layers,
        ]);
        setSelected([id]);
        return id;
      }}
      // In a scene, deleting takes the layer's shapes and merging moves them down; here there are none.
      onDelete={(ids) => {
        remove(ids);
        setSelected([]);
      }}
      onMerge={(ids, into) => {
        remove(ids.filter((id) => id !== into));
        setSelected([into]);
      }}
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/Layers',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every toolbar action and an inline rename, against the panel's local state. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The layers list top first, as they stack.
    const names = () => canvas.getAllByTestId(/^layer-name-/).map((element) => element.textContent);
    await expect(names()).toEqual(['Diagram', 'Notes', 'Background']);

    // 2. A new layer goes at the end of the list (the bottom of the stack).
    await userEvent.click(canvas.getByTestId('layers-create'));
    await waitFor(() => expect(names().at(-1)).toBe('Layer 4'));

    // 3. The new layer's name opens for editing; the green check saves it.
    const input = await canvas.findByTestId('layer-input-layer-4');
    await waitFor(() => expect(input).toHaveFocus());
    await userEvent.clear(input);
    await userEvent.type(input, 'Sketch');
    await userEvent.click(within(canvas.getByTestId('layer-layer-4')).getByTestId('editable.save'));
    await waitFor(() => expect(names().at(-1)).toBe('Sketch'));

    // 4. The eye shows a hidden layer.
    await userEvent.click(canvas.getByTestId('layer-toggle-notes'));
    await expect(canvas.getByTestId('layer-toggle-notes')).toHaveAccessibleName('Hide layer');

    // 5. Merge needs two layers: a Shift-click extends the selection to the next one, and merging keeps the top-most.
    // Shift rather than Cmd/Ctrl, whose key the listbox picks by platform.
    await expect(canvas.getByTestId('layers-merge')).toBeDisabled();
    await userEvent.click(canvas.getByTestId('layer-name-diagram'));
    // One session, so the held key is still down for the click.
    const user = userEvent.setup();
    await user.keyboard('{Shift>}');
    await user.click(canvas.getByTestId('layer-name-notes'));
    await user.keyboard('{/Shift}');
    await waitFor(() => expect(canvas.getByTestId('layers-merge')).toBeEnabled());
    await userEvent.click(canvas.getByTestId('layers-merge'));
    await waitFor(() => expect(names()).toEqual(['Diagram', 'Background', 'Sketch']));

    // 6. The arrows move along the list, and Enter opens the current row's name.
    await userEvent.click(canvas.getByTestId('layer-name-diagram'));
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => expect(canvas.getByTestId('layer-input-background')).toHaveFocus());
  },
};
