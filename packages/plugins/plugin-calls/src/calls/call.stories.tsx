//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapabilities } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { Config, LocalClientServices } from '@dxos/react-client';
import { withLayout } from '@dxos/react-ui/testing';

import { CallArticle } from '#containers';

import { type CallManager } from './call-manager';

//
// LIVE two-peer meeting: open this SAME story in two browser tabs, then click "Join" in each. Both tabs
// join ONE meeting because the room id is hardcoded (each tab is an isolated in-memory identity, so a
// Meeting-derived room id would differ). It runs the real meeting UI (Lobby → join → participant grid)
// over the full path — swarm presence, meeting-id coordination, RealtimeKit media — to debug the 2-peer
// connectivity/race. Filter the console for `resolveMeetingId` / `advertiseMeetingId` / `reconciling`.
//
// Requires the edge dev stack on http://localhost:8787 and network to Cloudflare RealtimeKit. A full HALO
// identity (below) is created + registered so the persistent edge WebSocket authenticates.
//
const LOCAL = true;
const EDGE_URL = LOCAL ? 'http://localhost:8787/' : 'https://edge.dxos.workers.dev/';

// Hardcoded shared room — both tabs join this exact room (no replicated Meeting object needed).
const ROOM_ID = 'echo:/rtk-shared-meeting-room';

// Route swarm signaling/replication through the edge (not the in-memory signal manager) so the two tabs
// discover each other and coordination works.
const config = new Config({
  runtime: {
    services: { edge: { url: EDGE_URL } },
    client: {
      edgeFeatures: { echoReplicator: true, feedReplicator: true, signaling: true },
      storage: { persistent: false },
    },
  },
});

// Swarm activity key that carries the shared RealtimeKit meeting id (mirrors call-swarm-synchronizer).
const MEETING_ACTIVITY_KEY = 'dxos.org/plugin-calls/realtimekit-meeting';

// The coordinated RealtimeKit meeting id (CRDT-merged across peers). Two tabs showing the SAME value
// proves the meeting-id coordination converged (both share one SFU session).
const MeetingIdBadge = ({ callManager }: { callManager: CallManager }) => {
  const activity = useAtomValue(callManager.activityAtom(MEETING_ACTIVITY_KEY));
  const meetingId = (activity?.payload as { meetingId?: string } | undefined)?.meetingId;
  return (
    <div data-testid='meeting-id' className='text-xs p-1'>
      meetingId: {meetingId ?? '(none)'}
    </div>
  );
};

const MeetingView = () => {
  // `CallTransportProvider.join` is idempotent (leaves any in-progress call first), so auto-joining on
  // mount is safe against StrictMode double-invoke — every tab joins the shared room automatically.
  const provider = useCapabilities(CallsCapabilities.CallTransportProvider)[0];
  const callManager = useCapabilities(CallsCapabilities.Manager)[0];
  const joined = useRef(false);
  useEffect(() => {
    if (!provider || joined.current) {
      return;
    }
    joined.current = true;
    log.info('MEETING auto-join', { roomId: ROOM_ID });
    void provider.join(ROOM_ID).catch((err) => log.catch(err));
  }, [provider]);

  return (
    <div className='dx-container bs-full flex flex-col'>
      {callManager && <MeetingIdBadge callManager={callManager} />}
      <div className='grow min-bs-0'>
        <CallArticle roomId={ROOM_ID} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/Call',
  render: () => <MeetingView />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          config,
          // Real edge-backed services (not the in-memory signal manager) so the persistent edge WebSocket
          // is used and the two tabs discover each other.
          services: new LocalClientServices({ config }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              // Register the identity/device with the edge so its persistent WebSocket authenticates with
              // a proper credential-chain presentation (a bare fresh identity otherwise gets 401'd).
              yield* Effect.tryPromise(() =>
                client.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 20_000 }),
              ).pipe(
                Effect.tapError((error) => Effect.sync(() => log.warn('MEETING createAgent failed', { error }))),
                Effect.ignore,
              );
              log.info('MEETING client ready', { did: client.halo.identity.get()?.did });
            }),
        }),
        StorybookPlugin({}),
        CallsPlugin(),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
