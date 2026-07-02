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
import { Connection, type RemoteTarget } from '#types';

import { SyncTargetsDialog, type SyncTargetsDialogProps } from './SyncTargetsDialog';

const availableTargets: RemoteTarget[] = [
  { id: 'board-1', name: 'Product Roadmap', description: 'Quarterly planning board.' },
  { id: 'board-2', name: 'Engineering', description: 'Sprint tracking and backlog.' },
  { id: 'board-3', name: 'Marketing', description: 'Campaigns and content calendar.' },
  { id: 'board-4', name: 'Personal' },
];

type StoryArgs = {
  availableTargets: ReadonlyArray<RemoteTarget>;
};

const DefaultStory = ({ availableTargets }: StoryArgs) => {
  const connection = useMemo<Connection.Connection>(
    () =>
      Connection.make({
        name: 'Work Trello',
        connectorId: 'trello.com',
        accessToken: Ref.make(AccessToken.make({ source: 'trello.com', token: 'mock-token' })),
      }),
    [],
  );

  const props: SyncTargetsDialogProps = { connection, availableTargets };

  return (
    <Dialog.Root open>
      <Dialog.Overlay>
        <SyncTargetsDialog {...props} />
      </Dialog.Overlay>
    </Dialog.Root>
  );
};

const meta = {
  title: 'plugins/plugin-connector/containers/SyncTargetsDialog',
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

export const NoTargets: Story = {
  args: {
    availableTargets: [],
  },
};
