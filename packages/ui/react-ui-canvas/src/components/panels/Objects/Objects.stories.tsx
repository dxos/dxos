//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';

import { type SceneId } from '../../../model/index.ts';
import { withInspectorFrame } from '../InspectorPanel/testing.tsx';
import { type ObjectEntry, ObjectsInspector } from './Objects.tsx';

/** Three composites, one not yet placed anywhere. */
const OBJECTS: ObjectEntry[] = [
  { id: 'logo', name: 'Logo', instances: 2 },
  { id: 'card', name: 'Card', instances: 5 },
  { id: 'badge', name: 'Badge', instances: 0 },
];

/** The panel over local state, as a host keeps the drawing's composites. */
const DefaultStory = () => {
  const [objects, setObjects] = useState(OBJECTS);
  const [selected, setSelected] = useState<SceneId>();
  const update = (id: SceneId, values: Partial<ObjectEntry>) =>
    setObjects((objects) => objects.map((entry) => (entry.id === id ? { ...entry, ...values } : entry)));
  return (
    <ObjectsInspector
      objects={objects}
      selected={selected}
      onSelect={setSelected}
      onRename={(id, name) => update(id, { name })}
      onCompose={() =>
        setObjects((objects) => [...objects, { id: `object-${objects.length + 1}`, name: 'Object', instances: 1 }])
      }
      onPlace={(id) => update(id, { instances: (objects.find((entry) => entry.id === id)?.instances ?? 0) + 1 })}
      onDuplicate={(id) => {
        const source = objects.find((entry) => entry.id === id);
        if (source) {
          setObjects((objects) => [
            ...objects,
            { id: `${id}-copy-${objects.length}`, name: `${source.name} copy`, instances: 0 },
          ]);
        }
      }}
      onDelete={(id) => {
        setObjects((objects) => objects.filter((entry) => entry.id !== id));
        setSelected((current) => (current === id ? undefined : current));
      }}
    />
  );
};

/**
 * Test:
 * 1. Clicking a row selects it; double-clicking its name renames it in place (Enter commits, Escape keeps the old name).
 * 2. The toolbar groups a new object, and its menu places, duplicates and deletes the selected one.
 */
const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas/components/panels/Objects',
  render: DefaultStory,
  decorators: [
    withInspectorFrame({ id: 'objects', title: 'Objects', icon: 'ph--cube--regular', order: 0, show: 'never' }),
    withTheme(),
    withLayout({ layout: 'centered' }),
  ],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
