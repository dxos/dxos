//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import { Dsl } from '@dxos/diagram';
import { EXEMPLARS } from '@dxos/diagram/testing';
import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type LayoutIntent, type Scene, applyIntent } from '@dxos/scene';

import { Scene3DEditor } from './Scene3DEditor.tsx';
import { type Tool3D } from './tools.ts';

const EXEMPLARS_3D = ['cube', 'cluster', 'encapsulated', 'hierarchy', 'solid'] as const;

type StoryProps = { exemplar: (typeof EXEMPLARS_3D)[number] };

const TOOLS: { tool: Tool3D; icon: string; label: string }[] = [
  { tool: 'select', icon: 'ph--cursor--regular', label: 'Select' },
  { tool: 'orbit', icon: 'ph--globe-simple--regular', label: 'Orbit' },
  { tool: 'move', icon: 'ph--arrows-out-cardinal--regular', label: 'Move' },
  { tool: 'rotate', icon: 'ph--arrow-clockwise--regular', label: 'Rotate' },
  { tool: 'scale', icon: 'ph--arrows-out--regular', label: 'Scale' },
  { tool: 'link', icon: 'ph--line-segment--regular', label: 'Link' },
  { tool: { create: 'cube' }, icon: 'ph--cube--regular', label: 'Cube' },
  { tool: { create: 'sphere' }, icon: 'ph--circle--regular', label: 'Sphere' },
];

/**
 * Arranging a 3D exemplar in memory.
 * 1. Click selects (shift toggles); Move, Rotate or Scale puts a gizmo on the one selected element.
 * 2. Cube or Sphere places one where the pointer meets the ground; Link binds the next two clicked elements.
 * 3. Double-click a composite (the encapsulated cluster's shell) to edit its parts; Escape goes back out.
 * 4. Delete removes the selection; Orbit (or the middle button) orbits, shift or the right button pans, the wheel zooms.
 */
const DefaultStory = ({ exemplar }: StoryProps) => {
  const initial = useMemo(() => Dsl.readScenes(EXEMPLARS[exemplar]).document, [exemplar]);
  const [document, setDocument] = useState<Scene.SceneDocument>(initial);
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool3D>('select');
  const [editing, setEditing] = useState<string>();
  const scene = document.scenes[0];
  const onIntent = useCallback((layout: string, intent: LayoutIntent) => {
    setDocument((current) => ({
      ...current,
      layouts: current.layouts.map((record) => (record.id === layout ? applyIntent(record, intent) : record)),
    }));
  }, []);
  if (!scene) {
    return null;
  }
  return (
    <div className='flex flex-col dx-fill'>
      <Toolbar.Root>
        {TOOLS.map((entry) => (
          <Button.Root
            key={entry.label}
            variant={JSON.stringify(entry.tool) === JSON.stringify(tool) ? 'primary' : 'ghost'}
            iconOnly
            icon={entry.icon}
            label={entry.label}
            data-testid={`tool-${entry.label.toLowerCase()}`}
            onClick={() => setTool(entry.tool)}
          />
        ))}
      </Toolbar.Root>
      <Scene3DEditor
        classNames='grow'
        document={document}
        scene={scene.id}
        editing={editing}
        selection={selection}
        tool={tool}
        onSelect={setSelection}
        onIntent={onIntent}
        onEdit={setEditing}
      />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-scene/components/Scene3DEditor',
  component: DefaultStory,
  render: (args) => <DefaultStory key={args.exemplar} {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: { exemplar: { control: 'select', options: EXEMPLARS_3D } },
  args: { exemplar: 'encapsulated' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
