//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useLayoutEffect } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';

import { CallsCapabilities } from '#types';

import { type CallManager, type GlobalState, type MediaState, type UserState } from '../calls';
import { CallsPlugin } from '../plugin';

// CallManager reads the edge service config on construction and throws without it; the URL is never
// dialed because stories seed state directly rather than joining a swarm.
const storyConfig = new Config({
  runtime: {
    services: {
      edge: { url: 'https://edge.dxos.workers.dev/' },
      iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
    },
  },
});

/**
 * Story decorator providing a live (but unconnected) `CallManager` via the real `CallsPlugin`.
 * Pair with `useSeedCallManager` to present deterministic participants without a swarm.
 */
export const withCallManager = () =>
  withPluginManager({
    setupEvents: [AppActivationEvents.SetupSettings],
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        config: storyConfig,
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* initializeIdentity(client);
          }),
      }),
      CallsPlugin(),
    ],
  });

const emptyMedia: MediaState = { pulledAudioTracks: {}, pulledVideoStreams: {} };

/** Builds a mock participant. */
export const makeUser = (
  id: string,
  name: string,
  opts: { raisedHand?: boolean; tracks?: UserState['tracks'] } = {},
): UserState => ({
  id,
  name,
  joined: true,
  raisedHand: opts.raisedHand,
  tracks: opts.tracks ?? { audioEnabled: true, videoEnabled: true },
});

/** Builds deterministic call/media state for stories. */
export const makeCallState = (self: UserState, users: UserState[], media?: Partial<MediaState>): GlobalState => ({
  call: { roomId: 'story-room', joined: true, self, users },
  media: { ...emptyMedia, audioEnabled: true, videoEnabled: true, ...media },
});

/** Seeds the contributed `CallManager` with deterministic state for the lifetime of the story. */
export const useSeedCallManager = (state: GlobalState): CallManager => {
  const callManager = useCapability(CallsCapabilities.Manager);
  useLayoutEffect(() => {
    callManager._setState(state);
  }, [callManager, state]);
  return callManager;
};
