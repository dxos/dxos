//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { McpServer } from '@dxos/mcp-server';

import { type LocalServer } from './local-server.ts';

/**
 * TODO(wittjosiah): Port `whoami` to an operation on a Space skill, identity and spaces together, the
 *   way every other verb is reached. It is blocked on the session reaching an operation handler as
 *   a service: neither half can be derived from a client, because EDGE's MCP worker has none and
 *   resolves identity and spaces from the OAuth grant instead. Duplicated meanwhile with edge's
 *   `src/mcp/space-tools.ts`, and the two have already drifted (this one reports `displayName`,
 *   edge's reports `haloSpaceId`).
 */
export const SpaceToolkit = McpServer.WhoAmIToolkit;

/** Binds the toolkit to one server, which supplies the client and the session's spaces. */
export const spaceHandlers = (server: LocalServer) =>
  SpaceToolkit.of({
    whoami: () =>
      Effect.gen(function* () {
        const identity = server.client.halo.identity.get();
        if (!identity) {
          return yield* Effect.fail(
            McpServer.failure('invalid_request', 'No identity on this profile. Run `dx account login` first.'),
          );
        }
        // Keyed as plain strings, since the host reports its space ids unbranded; the session's own list
        // is the set, since it is what dispatch accepts, and the client supplies the labels.
        const byId = new Map<string, McpServer.DescribableSpace>(
          server.client.spaces.get().map((space) => [space.id, space]),
        );
        return {
          identityDid: identity.did,
          ...(identity.profile?.displayName !== undefined && { displayName: identity.profile.displayName }),
          spaces: (server.host.spaceIds ?? []).map((spaceId) => McpServer.describeSpace(spaceId, byId.get(spaceId))),
        };
      }),
  });
