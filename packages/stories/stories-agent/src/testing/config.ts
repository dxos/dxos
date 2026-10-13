//
// Copyright 2026 DXOS.org
//

import { EDGE_URLS } from '@dxos/config';
import { Config } from '@dxos/react-client';

import { getEdgeEnvironment, isPersistent } from './story-settings.ts';

/**
 * The live stories' client: the EDGE and storage the toolbar chose ({@link getEdgeEnvironment}, {@link isPersistent}),
 * read at boot. Local EDGE is every worker behind :8787; see the package README.
 */
export const storyConfig = (): Config => {
  const edge = EDGE_URLS[getEdgeEnvironment()];
  return new Config({
    runtime: {
      client: {
        storage: { persistent: isPersistent() },
        // Without these the client never replicates the space to EDGE, which reads the bot's config from it.
        edgeFeatures: { signaling: true, subductionReplicator: true, feedReplicator: true },
      },
      services: {
        edge: { url: edge },
        ai: { server: `${edge}/ai` },
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
