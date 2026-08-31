//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Database, DXN, Obj, Type } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type CreateObjectOption, CreateObjectPanel, type Metadata } from './CreateObjectPanel';

const mockOptions: CreateObjectOption[] = [
  { id: 'org.dxos.type.document', label: 'Document', plugin: 'Markdown', icon: 'ph--file-text--regular' },
  { id: 'org.dxos.type.table', label: 'Table', plugin: 'Kanban', icon: 'ph--table--regular' },
  { id: 'org.dxos.type.canvas', label: 'Canvas', plugin: 'Sketch', icon: 'ph--paint-brush--regular' },
  { id: 'org.dxos.type.thread', label: 'Thread', plugin: 'Threads', icon: 'ph--chat-circle-text--regular' },
];

// The story always supplies `target`, so `CreateObjectPanel` never renders the space picker that
// would read these — an empty, honestly-typed array avoids forcing fixture data through a cast.
const mockSpaces: Space[] = [];

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
  name: Schema.String.annotate({ title: 'Name' }),
  description: Schema.optional(Schema.String.annotate({ title: 'Description' })),
});

class MockObject extends Type.makeObject<MockObject>(DXN.make('org.dxos.type.test.mock', '0.1.0'))(Schema.Struct({})) {}

const mockMetadata: Metadata = {
  id: 'org.dxos.type.document',
  createObject: () => Effect.succeed({ id: 'mock-id', subject: [], object: Obj.make(MockObject, {}) }),
  inputSchema: mockInputSchema,
};

const meta = {
  title: 'plugins/plugin-space/components/CreateObjectPanel',
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
