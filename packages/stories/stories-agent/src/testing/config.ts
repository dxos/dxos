//
// Copyright 2026 DXOS.org
//

import { EDGE_URLS } from '@dxos/config';
import { Config } from '@dxos/react-client';

import { getEdgeEnvironment } from './story-settings.ts';

export type StoryConfigOptions = {
  /** Keeps the profile across reloads (the dedicated/coordinator worker pair); the story's `persistent` arg. */
  persistent?: boolean;
};

/**
 * The live stories' client: the EDGE the toolbar chose ({@link getEdgeEnvironment}), read at boot, and the storage the
 * story's args ask for. Local EDGE is every worker behind :8787; see the package README.
 */
export const storyConfig = ({ persistent = true }: StoryConfigOptions = {}): Config => {
  const edge = EDGE_URLS[getEdgeEnvironment()];
  return new Config({
    runtime: {
      client: {
        storage: { persistent },
        // Without these the client never replicates the space to EDGE, which reads the bot's config from it.
        edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true },
      },
      services: {
        edge: { url: edge },
        ai: { server: `${edge}/ai` },
        // TURN through EDGE, as the app has: peers on one machine behind its firewall cannot reach each other directly.
        iceProviders: [{ urls: `${edge}/ice` }],
      },
    },
  });
};

/**
 * No EDGE at all, but an EDGE URL for the client to address: a scripted story's fake answers the routes it
 * exercises (`installFakeDiscordBot`), and with every EDGE feature off nothing else is ever sent.
 */
export const edgeFake = new Config({
  runtime: {
    client: {
      edgeFeatures: { signaling: false, subductionReplicator: false, feedReplicator: false, agents: false },
    },
    services: { edge: { url: 'http://edge.test' } },
  },
});
