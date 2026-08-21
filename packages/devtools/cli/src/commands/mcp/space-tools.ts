//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { McpServer } from '@dxos/mcp-server';

import { type LocalServer } from './local-server';

/**
 * Identity, mirroring EDGE's `mcp-space-service` tool of the same name.
 *
 * TODO(wittjosiah): Port this and a space listing together, as one Space skill. Both answer the
 *   same session question — who am I, and which spaces may I address — and both are blocked on the
 *   same thing: the session must reach an operation handler as a service. Neither can be derived
 *   from a client, because EDGE's MCP worker has none and resolves identity and spaces from the
 *   OAuth grant instead. Porting either alone is what makes the surface non-isomorphic: a
 *   `querySpaces` reading `client.spaces` works on this host and cannot work on that one, so the
 *   worker would keep a hand-written listing and the duplication would survive the port.
 *   Duplicated meanwhile with edge's `src/mcp/space-tools.ts`, and the two have already drifted
 *   (this one reports `displayName`, edge's reports `haloSpaceId`).
 */
export const WhoAmI = Tool.make('whoami', {
  description: 'Returns the authenticated DXOS identity and the spaces in the session context',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    // The DID, not the identity key: it is the identity's public name — what EDGE authorizes
    // against and what every other surface reports — where the key is an implementation detail.
    identityDid: Schema.String,
    displayName: Schema.optional(Schema.String),
    spaces: Schema.Array(Schema.String).annotate({
      description:
        'Ids of the data spaces this session can operate on. None of them is a default: a call ' +
        'that acts on a space must name one.',
    }),
  }),
  failure: McpServer.ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const SpaceToolkit = Toolkit.make(WhoAmI);

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
        return {
          identityDid: identity.did,
          ...(identity.profile?.displayName === undefined ? {} : { displayName: identity.profile.displayName }),
          spaces: server.host.spaceIds ?? [],
        };
      }),
  });
