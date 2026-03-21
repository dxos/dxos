//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Database } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { type CreateObjectOption, type Metadata, CreateObjectPanel } from '../../components';
import { translations } from '../../translations';

//
// Mock data.
//

const mockOptions: CreateObjectOption[] = [
  { id: 'dxos.org/type/Document', label: 'Document', icon: 'ph--file-text--regular' },
  { id: 'dxos.org/type/Table', label: 'Table', icon: 'ph--table--regular' },
  { id: 'dxos.org/type/Canvas', label: 'Canvas', icon: 'ph--paint-brush--regular' },
  { id: 'dxos.org/type/Thread', label: 'Thread', icon: 'ph--chat-circle-text--regular' },
];

const mockSpaces = [
  { id: 'space-1', db: {} as Database.Database, displayName: 'Personal Space' },
  { id: 'space-2', db: {} as Database.Database, displayName: 'Team Space' },
] as unknown as Space[];

const mockResolve = (_typename: string): Metadata | undefined => undefined;

//
// Wrapper that places the panel inside a Dialog (matching production usage).
//

const DialogWrapper = ({ children }: { children: React.ReactNode }) => (
  <Dialog.Root open>
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>Create Object</Dialog.Title>
      </Dialog.Header>
      <Dialog.Body>{children}</Dialog.Body>
    </Dialog.Content>
  </Dialog.Root>
);

//
// Stories.
//

const SelectTypeStory = () => {
  const [typename, setTypename] = useState<string | undefined>(undefined);

  return (
    <DialogWrapper>
      <CreateObjectPanel
        options={mockOptions}
        spaces={mockSpaces}
        typename={typename}
        resolve={mockResolve}
        onTypenameChange={setTypename}
        onCreateObject={async () => {}}
      />
    </DialogWrapper>
  );
};

const SelectSpaceStory = () => {
  const [target, setTarget] = useState<Database.Database | undefined>(undefined);

  return (
    <DialogWrapper>
      <CreateObjectPanel
        options={mockOptions}
        spaces={mockSpaces}
        typename='dxos.org/type/Document'
        target={target}
        resolve={mockResolve}
        onTargetChange={setTarget as any}
        onCreateObject={async () => {}}
      />
    </DialogWrapper>
  );
};

const meta = {
  title: 'plugins/plugin-space/containers/CreateObjectDialog',
  decorators: [withTheme(), withPluginManager()],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const SelectType: Story = {
  render: SelectTypeStory,
};

export const SelectSpace: Story = {
  render: SelectSpaceStory,
};
