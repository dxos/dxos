//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type CreateObjectOption, CreateObjectPanel, type Metadata } from '#components';
import { translations } from '#translations';

const mockOptions: CreateObjectOption[] = [
  { id: 'org.dxos.type.document', label: 'Document', plugin: 'Markdown', icon: 'ph--file-text--regular' },
  { id: 'org.dxos.type.table', label: 'Table', plugin: 'Kanban', icon: 'ph--table--regular' },
  { id: 'org.dxos.type.canvas', label: 'Canvas', plugin: 'Sketch', icon: 'ph--paint-brush--regular' },
  { id: 'org.dxos.type.thread', label: 'Thread', plugin: 'Threads', icon: 'ph--chat-circle-text--regular' },
];

const mockSpaces = [
  { id: 'space-1', db: {} as Database.Database, displayName: 'Personal Space' },
  { id: 'space-2', db: {} as Database.Database, displayName: 'Team Space' },
] as unknown as Space[];

const DefaultStory = () => {
  const [typename, setTypename] = useState<string | undefined>(undefined);

  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Body>
            <CreateObjectPanel
              options={mockOptions}
              spaces={mockSpaces}
              typename={typename}
              target={{} as Database.Database}
              resolve={() => mockMetadata}
              onTypenameChange={setTypename}
              onCreateObject={async () => {}}
            />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const mockInputSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.annotations({ title: 'Name' }),
  description: Schema.optional(Schema.String.annotations({ title: 'Description' })),
});

const mockMetadata: Metadata = {
  id: 'org.dxos.type.document',
  createObject: () => Effect.succeed({ id: 'mock-id', subject: [], object: {} as any }),
  inputSchema: mockInputSchema,
};

const meta = {
  title: 'plugins/plugin-space/containers/CreateObjectDialog',
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager()],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: DefaultStory,
};

// Verifies the type filter matches the contributing plugin name, not just the type label:
// typing "Kanban" surfaces "Table" (contributed by the Kanban plugin) even though the label
// "Table" contains no match for the query — impossible before plugin/description were searchable.
export const FilterByPlugin: Story = {
  render: DefaultStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('create-object-form.schema-input', undefined, { timeout: 10_000 });
    await userEvent.type(input, 'Kanban');
    void expect(await canvas.findByText('Table', undefined, { timeout: 10_000 })).toBeVisible();
  },
};
