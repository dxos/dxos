//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Tool from 'effect/unstable/ai/Tool';
import * as Toolkit from 'effect/unstable/ai/Toolkit';

import { type Space } from '@dxos/client-protocol';
import { log } from '@dxos/log';
import { Server } from '@dxos/mcp-server';

import { type LocalGateway } from './gateway';

/**
 * Identity and space listing, mirroring EDGE's `mcp-space-service` tools of the same names.
 *
 * TODO(wittjosiah): Duplicated with edge's `src/mcp/space-tools.ts`. Both should become annotated
 *   operations contributed by a plugin, so each host projects them through `@dxos/mcp-server`
 *   rather than hand-writing a toolkit — the same route the project and task verbs already take.
 *   Until then a change to either tool's shape has to be made twice.
 */

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

export const WhoAmI = Tool.make('whoami', {
  description: 'Returns the authenticated DXOS identity and the spaces in the session context',
  parameters: Schema.Struct({}),
  success: Schema.Struct({
    identityKey: Schema.String,
    displayName: Schema.optional(Schema.String),
    spaces: Schema.Array(SpaceInfo).annotate({
      description: 'Data spaces this session can operate on; the first is the default for tool calls.',
    }),
  }),
  failure: Server.ToolFailure,
});

export const ListSpaces = Tool.make('listSpaces', {
  description:
    'Lists the data spaces this session can operate on, each with its name and member count — refer ' +
    'to spaces by name rather than by id when talking to the user. Every space listed is usable as ' +
    "`spaceId`. The identity's own HALO space is not a data space and is never listed.",
  parameters: Schema.Struct({}),
  success: Schema.Struct({ spaces: Schema.Array(SpaceInfo) }),
  failure: Server.ToolFailure,
});

export const SpaceToolkit = Toolkit.make(WhoAmI, ListSpaces);

/**
 * Describes the session's spaces. Best-effort per field: a space whose properties or membership
 * cannot be read is still listed, with whatever did resolve.
 */
const describeSpaces = (gateway: LocalGateway): readonly SpaceInfo[] => {
  // Keyed as plain strings: the gateway reports its space ids in the wire shape, unbranded.
  const byId = new Map<string, Space>(gateway.client.spaces.get().map((space) => [space.id, space]));
  return gateway.spaceIds.map((spaceId) => {
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

export const spaceHandlers = (gateway: LocalGateway) =>
  SpaceToolkit.of({
    whoami: () =>
      Effect.gen(function* () {
        const identity = gateway.client.halo.identity.get();
        if (!identity) {
          return yield* Effect.fail(
            Server.failure('invalid_request', 'No identity on this profile. Run `dx account login` first.'),
          );
        }
        return {
          identityKey: identity.identityKey.toHex(),
          ...optional('displayName', identity.profile?.displayName),
          spaces: describeSpaces(gateway),
        };
      }),

    listSpaces: () => Effect.sync(() => ({ spaces: describeSpaces(gateway) })),
  });
