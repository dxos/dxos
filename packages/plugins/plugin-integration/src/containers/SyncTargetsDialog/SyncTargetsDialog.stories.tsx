//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Ref } from '@dxos/echo';
import { corePlugins } from '@dxos/plugin-testing';
import { Dialog } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { AccessToken } from '@dxos/types';

import { translations } from '#translations';
import { Integration, type RemoteTarget } from '#types';

import { SyncTargetsDialog, type SyncTargetsDialogProps } from './SyncTargetsDialog';

const availableTargets: RemoteTarget[] = [
  { id: 'board-1', name: 'Product Roadmap', description: 'Quarterly planning board.' },
  { id: 'board-2', name: 'Engineering', description: 'Sprint tracking and backlog.' },
  { id: 'board-3', name: 'Marketing', description: 'Campaigns and content calendar.' },
  { id: 'board-4', name: 'Personal' },
];

type StoryProps = {
  availableTargets: ReadonlyArray<RemoteTarget>;
  /** Remote ids already synced into the integration (drives initial selection). */
  selectedIds?: ReadonlyArray<string>;
};

const DefaultStory = ({ availableTargets, selectedIds = [] }: StoryProps) => {
  const integration = useMemo<Integration.Integration>(
    () =>
      Integration.make({
        name: 'Work Trello',
        providerId: 'trello.com',
        accessToken: Ref.make(AccessToken.make({ source: 'trello.com', token: 'mock-token' })),
        targets: selectedIds.map((remoteId) => ({ remoteId })),
      }),
    [selectedIds],
  );

  const props: SyncTargetsDialogProps = { integration, availableTargets };

  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <SyncTargetsDialog {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-integration/containers/SyncTargetsDialog',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withPluginManager({ plugins: corePlugins() })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    availableTargets,
  },
};

export const SomeSelected: Story = {
  args: {
    availableTargets,
    selectedIds: ['board-1', 'board-3'],
  },
};

export const NoTargets: Story = {
  args: {
    availableTargets: [],
  },
};
