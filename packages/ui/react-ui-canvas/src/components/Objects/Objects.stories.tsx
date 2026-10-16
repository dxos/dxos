//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withRegistry, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { reduceIntent } from '../../model/projection.ts';
import { type SceneMap } from '../../model/store.ts';
import { type CompoundEntry, compoundTree } from '../../utils/scenes.ts';
import { createNetworkTree } from '../../utils/testing.ts';
import { ObjectsPanel } from './Objects.tsx';

const NETWORK = createNetworkTree();

/** The panel over local scenes, as a view keeps them in its store. */
const DefaultStory = () => {
  const [scenes, setScenes] = useState<SceneMap>(() =>
    Object.fromEntries(NETWORK.scenes.map((scene) => [scene.id, scene])),
  );
  const [selected, setSelected] = useState<string>();
  const entries = useMemo(() => compoundTree(scenes, NETWORK.root), [scenes]);
  const isSelected = useCallback((entry: CompoundEntry) => entry.frame.id === selected, [selected]);
  return (
    <ObjectsPanel
      classNames='w-72 border border-separator rounded-sm'
      entries={entries}
      isSelected={isSelected}
      onSelect={(entry) => setSelected(entry.frame.id)}
      onToggle={(entry) =>
        setScenes((scenes) => ({
          ...scenes,
          [entry.scene]: reduceIntent(scenes[entry.scene], {
            kind: 'update',
            id: entry.frame.id,
            values: { hidden: !entry.hidden },
          }),
        }))
      }
      onRename={(entry, name) =>
        setScenes((scenes) => ({ ...scenes, [entry.child]: { ...scenes[entry.child], name } }))
      }
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/Objects',
  render: DefaultStory,
  decorators: [withTheme(), withRegistry, withLayout({ layout: 'centered' })],
  parameters: { translations: [...uiTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The tree's rows, hiding one, and renaming one in place. */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const names = () => canvas.getAllByTestId(/^object-name-/).map((element) => element.textContent);

    // 1. Every compound object is listed, nested ones under their parent, top first as they stack.
    await waitFor(() => expect(names()).toEqual(['Cloud', 'Office', 'Desk']));

    // 2. The eye hides an object.
    await userEvent.click(canvas.getByTestId('object-toggle-net:cloud'));
    await waitFor(() => expect(canvas.getByTestId('object-toggle-net:cloud')).toHaveAccessibleName('Show object'));

    // 3. A double-click opens a name; the green check saves it.
    await userEvent.dblClick(canvas.getByTestId('object-name-net:office/net:desk'));
    const input = await canvas.findByTestId('object-input-net:office/net:desk');
    await userEvent.clear(input);
    await userEvent.type(input, 'Workstation');
    await userEvent.click(within(input.parentElement ?? canvasElement).getByTestId('editable.save'));
    await waitFor(() => expect(names()).toEqual(['Cloud', 'Office', 'Workstation']));

    // 4. Grouping and ungrouping wait for a selection in the canvas.
    await expect(canvas.getByTestId('objects-group')).toBeDisabled();
  },
};
