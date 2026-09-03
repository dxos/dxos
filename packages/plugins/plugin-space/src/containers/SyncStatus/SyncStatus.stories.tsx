//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { SpaceId } from '@dxos/keys';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
import { type PeerSyncState, type SpaceSyncStateMap } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { STALLED_TIMEOUT } from '#hooks';
import { translations } from '#translations';

import { SyncStatusIndicator } from './SyncStatus.tsx';

const createEdgeStatus = (props: Partial<EdgeStatus> = {}): EdgeStatus => ({
  state: EdgeStatus.ConnectionState.CONNECTED,
  rtt: 32,
  uptime: 60_000,
  rateBytesUp: 0,
  rateBytesDown: 0,
  messagesSent: 128,
  messagesReceived: 256,
  ...props,
});

const createSyncState = (props: Partial<PeerSyncState> = {}): SpaceSyncStateMap => ({
  [SpaceId.random()]: {
    missingOnLocal: 0,
    missingOnRemote: 0,
    localDocumentCount: 100,
    remoteDocumentCount: 100,
    differentDocuments: 0,
    totalDocumentCount: 100,
    unsyncedDocumentCount: 0,
    ...props,
  },
});

const meta = {
  title: 'plugins/plugin-space/containers/SyncStatusIndicator',
  component: SyncStatusIndicator,
  decorators: [withTheme(), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof SyncStatusIndicator>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    state: createSyncState(),
    saved: true,
    edgeStatus: createEdgeStatus(),
  },
};

export const Saving: Story = {
  args: {
    state: {},
    saved: false,
    edgeStatus: createEdgeStatus(),
  },
};

export const Offline: Story = {
  args: {
    state: {},
    saved: true,
    edgeStatus: createEdgeStatus({ state: EdgeStatus.ConnectionState.NOT_CONNECTED }),
  },
};

export const Downloading: Story = {
  args: {
    state: createSyncState({ missingOnLocal: 20, unsyncedDocumentCount: 20 }),
    saved: true,
    edgeStatus: createEdgeStatus({ rateBytesDown: 4_096 }),
  },
};

/**
 * Outstanding documents with no bytes moving: switches to the warning icon after the stall timeout.
 */
export const Stalled: Story = {
  args: {
    state: createSyncState({ missingOnLocal: 20, unsyncedDocumentCount: 20 }),
    saved: true,
    edgeStatus: createEdgeStatus(),
  },
  // The stall is only reported once the timer elapses; wait for it so a capture never lands on the interim state.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const indicator = await canvas.findByRole(
      'button',
      { name: 'Replication stalled' },
      { timeout: STALLED_TIMEOUT * 2 },
    );
    await expect(indicator).toBeVisible();
  },
};

/**
 * Outstanding documents with no connection.
 */
export const Disconnected: Story = {
  args: {
    state: createSyncState({ missingOnRemote: 20, unsyncedDocumentCount: 20 }),
    saved: true,
    edgeStatus: createEdgeStatus({ state: EdgeStatus.ConnectionState.NOT_CONNECTED }),
  },
};
