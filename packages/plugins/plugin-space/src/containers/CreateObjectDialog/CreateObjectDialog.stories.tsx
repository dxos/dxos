//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type CreateObjectOption, type Metadata, CreateObjectPanel } from '../../components';
import { translations } from '../../translations';

const mockOptions: CreateObjectOption[] = [
  { id: 'org.dxos.type.document', label: 'Document', icon: 'ph--file-text--regular' },
  { id: 'org.dxos.type.table', label: 'Table', icon: 'ph--table--regular' },
  { id: 'org.dxos.type.canvas', label: 'Canvas', icon: 'ph--paint-brush--regular' },
  { id: 'org.dxos.type.thread', label: 'Thread', icon: 'ph--chat-circle-text--regular' },
];

const mockSpaces = [
  { id: 'space-1', db: {} as Database.Database, displayName: 'Personal Space' },
  { id: 'space-2', db: {} as Database.Database, displayName: 'Team Space' },
] as unknown as Space[];

const mockResolve = (_typename: string): Metadata | undefined => undefined;

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
              resolve={mockResolve}
              onTypenameChange={setTypename}
              onCreateObject={async () => {}}
            />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

// TODO(burdon): Remove.
const SelectSpaceStory = () => {
  const [target, setTarget] = useState<Database.Database | undefined>(undefined);

  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Body>
            <CreateObjectPanel
              options={mockOptions}
              spaces={mockSpaces}
              typename='org.dxos.type.document'
              target={target}
              resolve={mockResolve}
              onTargetChange={setTarget as any}
              onCreateObject={async () => {}}
            />
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog.Root>
  );
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

export const SelectType: Story = {
  render: DefaultStory,
};

export const SelectSpace: Story = {
  render: SelectSpaceStory,
};
