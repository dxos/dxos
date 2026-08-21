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
 * TODO(wittjosiah): Duplicated with edge's `src/mcp/space-tools.ts`, and the two have already
 *   drifted (this one reports `displayName`, edge's reports `haloSpaceId`). Both should become one
 *   operation named by a skill, the way `querySpaces` replaced `listSpaces` — which needs the
 *   session's identity to reach an operation handler as a service, since EDGE resolves it from the
 *   OAuth grant rather than from a local client.
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
        'Ids of the data spaces this session can operate on; the first is the default for tool ' +
        'calls. Names and member counts come from the querySpaces operation.',
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
