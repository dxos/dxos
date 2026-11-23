//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { compositeViews, instanceCounts } from '@dxos/react-ui-canvas';
import { createObjectsTree } from '@dxos/react-ui-canvas/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as uiTranslations } from '@dxos/react-ui/translations';
import { type ViewId } from '@dxos/scene';

import { withInspectorFrame } from '../../panels/testing.ts';
import { type ObjectEntry, ObjectsInspector } from './ObjectsInspector.tsx';

/** The objects of the shared fixture: Logo placed three times (once inside Card), Card once, Badge nowhere. */
const createObjects = (): ObjectEntry[] => {
  const tree = createObjectsTree();
  const scenes = Object.fromEntries(tree.views.map((scene) => [scene.id, scene]));
  const counts = instanceCounts(scenes);
  return compositeViews(scenes).map((scene) => ({
    id: scene.id,
    name: scene.name ?? scene.id,
    instances: counts[scene.id] ?? 0,
  }));
};

/** The panel over local state, as a host keeps the drawing's composites. */
const DefaultStory = () => {
  const [objects, setObjects] = useState(createObjects);
  const [selected, setSelected] = useState<ViewId>();
  const update = (id: ViewId, values: Partial<ObjectEntry>) =>
    setObjects((objects) => objects.map((entry) => (entry.id === id ? { ...entry, ...values } : entry)));
  return (
    <ObjectsInspector
      objects={objects}
      selected={selected}
      onSelect={setSelected}
      onRename={(id, name) => update(id, { name })}
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
 * 2. The toolbar places the selected object, and its menu duplicates and deletes it.
 */
const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-canvas-editor/components/inspectors/ObjectsInspector',
  render: DefaultStory,
  decorators: [
    withInspectorFrame({
      id: 'objects',
      title: 'Objects',
      icon: 'ph--cube--regular',
      order: 0,
      defaultOpen: true,
    }),
    withTheme(),
    withLayout({ layout: 'centered' }),
  ],
  parameters: { translations: [...uiTranslations, ...formTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
