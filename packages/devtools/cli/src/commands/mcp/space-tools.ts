//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { type Space } from '@dxos/client/echo';
import { log } from '@dxos/log';
import { McpServer } from '@dxos/mcp-server';

import { type LocalServer } from './local-server.ts';

const SpaceInfo = Schema.Struct({
  spaceId: Schema.String,
  name: Schema.optional(Schema.String).annotate({
    description: 'Display name of the space. Absent when the space is unnamed or its properties are unreadable.',
  }),
  memberCount: Schema.optional(Schema.Number).annotate({
    description:
      'Number of identities with membership. 1 means the space is private to this identity; more ' +
      'means it is shared. Absent when membership could not be read.',
  }),
});
type SpaceInfo = Schema.Schema.Type<typeof SpaceInfo>;

/**
 * Identity and session spaces, mirroring EDGE's `mcp-space-service` tool of the same name.
 *
 * One tool rather than two: the `listSpaces` this replaces returned `describeSpaces` and so did
 * `whoami`, so the second tool spent a slot on a value the first already carried.
 *
 * TODO(wittjosiah): Port this to an operation on a Space skill, identity and spaces together, the
 *   way every other verb is reached. It is blocked on the session reaching an operation handler as
 *   a service: neither half can be derived from a client, because EDGE's MCP worker has none and
 *   resolves identity and spaces from the OAuth grant instead. That is also why a space listing
 *   cannot port on its own — one reading `client.spaces` works on this host and cannot work on
 *   that one, so the worker would keep a hand-written listing and the duplication would survive
 *   the port. Duplicated meanwhile with edge's `src/mcp/space-tools.ts`, and the two have already
 *   drifted (this one reports `displayName`, edge's reports `haloSpaceId`).
 */
export const WhoAmI = Tool.make('whoami', {
  description:
    'Returns the authenticated DXOS identity and the data spaces this session can operate on, each ' +
    'with its name and member count — refer to a space by name when talking to the user, and pass ' +
    'its id when calling a tool.',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    // The DID, not the identity key: it is the identity's public name — what EDGE authorizes
    // against and what every other surface reports — where the key is an implementation detail.
    identityDid: Schema.String,
    displayName: Schema.optional(Schema.String),
    spaces: Schema.Array(SpaceInfo).annotate({
      description:
        'The data spaces this session can operate on. None of them is a default: a call that acts ' +
        'on a space must name one.',
    }),
  }),
  failure: McpServer.ToolFailure,
})
  .annotate(Tool.Readonly, true)
  .annotate(Tool.Destructive, false);

export const SpaceToolkit = Toolkit.make(WhoAmI);

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
        return {
          identityDid: identity.did,
          ...optional('displayName', identity.profile?.displayName),
          spaces: describeSpaces(server),
        };
      }),
  });

/**
 * Describes the session's spaces. The session's own list is the set — it is what dispatch accepts —
 * and the client supplies the labels. Best-effort per field: a space whose properties or membership
 * cannot be read is still listed, with whatever did resolve.
 */
const describeSpaces = (server: LocalServer): readonly SpaceInfo[] => {
  // Keyed as plain strings, since the host reports its space ids unbranded.
  const byId = new Map<string, Space>(server.client.spaces.get().map((space) => [space.id, space]));
  return (server.host.spaceIds ?? []).map((spaceId) => {
    const space = byId.get(spaceId);
    if (!space) {
      return { spaceId };
    }
    return {
      spaceId,
      ...optional('name', readName(space)),
      ...optional('memberCount', readMemberCount(space)),
    };
  });
};

/** Omits the key entirely when unresolved, so an optional field is absent rather than `undefined`. */
const optional = <T>(key: string, value: T | undefined): Record<string, T> =>
  value === undefined ? {} : { [key]: value };

const readName = (space: Space): string | undefined => {
  try {
    const name = space.properties.name;
    return typeof name === 'string' ? name : undefined;
  } catch (error) {
    // Properties are unreadable until the space is open, which a listing must not wait on.
    log.warn('failed to read space properties', { spaceId: space.id, error });
    return undefined;
  }
};

/**
 * `undefined` rather than 0 when the read fails: a space always has at least one member, so zero
 * would be a claim about the space rather than about this host's luck.
 */
const readMemberCount = (space: Space): number | undefined => {
  try {
    return space.members.get().length;
  } catch (error) {
    log.warn('failed to read space members', { spaceId: space.id, error });
    return undefined;
  }
};
