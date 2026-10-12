//
// Copyright 2026 DXOS.org
//

import { Config } from '@dxos/react-client';

/**
 * A local EDGE stack (`node scripts/stack.mjs start` in dxos/edge: every worker behind :8787) on persistent
 * storage, so the test space and what the forms hold survive a reload. See the package README.
 */
export const edgeLocalPersistent = new Config({
  runtime: {
    client: {
      storage: { persistent: true },
      // Without these the client never replicates the space to EDGE, which reads the bot's config from it.
      edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true },
    },
    services: {
      edge: { url: 'http://localhost:8787' },
      ai: { server: 'http://localhost:8787/ai' },
    },
  },
});

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
