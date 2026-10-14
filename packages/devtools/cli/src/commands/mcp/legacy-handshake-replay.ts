//
// Copyright 2026 DXOS.org
//

import type { Frame, ReloadReplay } from './watch-replay.ts';

/**
 * Id for the handshake replayed into a reloaded child. Namespaced so a client's own id cannot
 * collide with it, and the response is dropped rather than forwarded — the client already holds an
 * `initialize` result from before the reload.
 */
const REPLAY_ID = '@dxos/cli:watch-initialize';

/**
 * Re-drives the client's handshake into a reloaded child, since a client that initialized once
 * never does so again.
 *
 * TODO(wittjosiah): Remove when dx mcp serve drops 2025-era MCP support.
 */
export const makeHandshakeReplay = (): ReloadReplay => {
  let initialize: Frame | undefined;
  let initialized: Frame | undefined;

  return {
    observeClient: (frame) => {
      if (frame.method === 'initialize' && frame.id !== undefined) {
        initialize = frame;
      } else if (frame.method === 'notifications/initialized') {
        initialized = frame;
      }
    },

    retains: () => false,

    onReload: (io) => {
      if (!initialize) {
        return;
      }
      io.hold();
      io.toChild({ ...initialize, id: REPLAY_ID });
    },

    onChild: (frames, io) => {
      if (frames.length !== 1 || frames[0].id !== REPLAY_ID) {
        return 'forward';
      }
      if (initialized) {
        io.toChild(initialized);
      }
      io.release();
      // Emitted here rather than left to the server: it announces its toolkits while building the
      // layer, which happens before the replay above creates the session to announce them into.
      io.notifyClient('notifications/tools/list_changed', {});
      io.notifyClient('notifications/prompts/list_changed', {});
      return 'consumed';
    },
  };
};
