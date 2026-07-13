//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type Client } from '@dxos/client';
import { type Space as ClientSpace, SpaceState } from '@dxos/client/echo';
import { Space as HaloSpace, SpaceError } from '@dxos/halo';
import { IdentityDid, type SpaceId } from '@dxos/keys';
import { SpaceArchive, type SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { fromAccess, isOnline, makeFlow, streamFromObservable, toAccess, toShareOptions } from './util';

const toState = (state: SpaceState): HaloSpace.State => {
  switch (state) {
    case SpaceState.SPACE_READY:
      return 'ready';
    case SpaceState.SPACE_CLOSED:
      return 'closed';
    default:
      return 'inactive';
  }
};

const toSpaceInfo = (space: ClientSpace): HaloSpace.Info => ({
  id: space.id,
  name: space.state.get() === SpaceState.SPACE_READY ? space.properties.name : undefined,
  state: toState(space.state.get()),
});

const toMembers = (members: readonly SpaceMember[]): HaloSpace.Member[] =>
  members.flatMap((member) => {
    const role = toAccess(member.role);
    if (role === undefined) {
      // Skip removed members.
      return [];
    }
    return [
      {
        did: member.identity?.did !== undefined ? IdentityDid.make(member.identity.did) : undefined,
        role,
        online: isOnline(member),
      },
    ];
  });

const resolveSpace = (client: Client, id: SpaceId): ClientSpace => {
  const space = client.spaces.get(id);
  if (!space) {
    throw new Error(`Space not found: ${id}`);
  }
  return space;
};

// The HALO API addresses members by DID; the legacy proxy needs the identity key, resolved here
// from the materialized membership.
const setMemberRole = async (
  client: Client,
  id: SpaceId,
  subject: IdentityDid,
  newRole: HaloSpaceMember.Role,
): Promise<void> => {
  const space = resolveSpace(client, id);
  const member = space.members.get().find((entry) => entry.identity?.did === subject);
  if (!member) {
    throw new Error(`Member not found: ${subject}`);
  }
  await space.updateMemberRole({ memberKey: member.identity.identityKey, newRole });
};

/**
 * Builds the {@link HaloSpace.Service} implementation over a client's `spaces` proxy.
 */
export const makeSpaceService = (client: Client): Context.Tag.Service<HaloSpace.Service> => ({
  list: Effect.sync(() => client.spaces.get().map(toSpaceInfo)),

  changes: streamFromObservable(client.spaces).pipe(Stream.map((spaces) => (spaces ?? []).map(toSpaceInfo))),

  get: (id) =>
    Effect.sync(() => {
      const space = client.spaces.get(id);
      return space ? Option.some(toSpaceInfo(space)) : Option.none();
    }),

  create: (options) =>
    Effect.tryPromise({
      try: async () =>
        toSpaceInfo(await client.spaces.create(options?.name !== undefined ? { name: options.name } : {})),
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  waitReady: (id) =>
    Effect.tryPromise({
      try: async () => {
        await resolveSpace(client, id).waitUntilReady();
      },
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  members: (id) =>
    Effect.try({
      try: () => toMembers(resolveSpace(client, id).members.get()),
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  memberChanges: (id) => {
    const space = client.spaces.get(id);
    return space ? streamFromObservable(space.members).pipe(Stream.map(toMembers)) : Stream.empty;
  },

  updateMemberRole: (id, subject, role) =>
    Effect.tryPromise({
      try: async () => {
        const newRole = fromAccess(role);
        if (newRole === undefined) {
          throw new Error(`No legacy role for access level: ${role}`);
        }
        await setMemberRole(client, id, subject, newRole);
      },
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  removeMember: (id, subject) =>
    Effect.tryPromise({
      try: () => setMemberRole(client, id, subject, HaloSpaceMember.Role.REMOVED),
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  share: (id, options) =>
    Effect.try({
      try: () => makeFlow(resolveSpace(client, id).share(toShareOptions(options)), 'space'),
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  join: (code) =>
    Effect.try({
      try: () => makeFlow(client.spaces.join(code), 'space'),
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  export: (id) =>
    Effect.tryPromise({
      try: async () => {
        const archive = await resolveSpace(client, id).internal.export();
        return { filename: archive.filename, contents: archive.contents };
      },
      catch: (error) => new SpaceError({ context: { error } }),
    }),

  import: (archive, options) =>
    Effect.tryPromise({
      try: async () => {
        const format = archive.filename.endsWith('.json') ? SpaceArchive.Format.JSON : SpaceArchive.Format.BINARY;
        const space = await client.spaces.import(
          { filename: archive.filename, contents: archive.contents, format },
          options?.tags !== undefined ? { tags: [...options.tags] } : undefined,
        );
        return toSpaceInfo(space);
      },
      catch: (error) => new SpaceError({ context: { error } }),
    }),
});

/**
 * Layer providing {@link HaloSpace.Service} backed by the given client.
 */
export const layerSpace = (client: Client): Layer.Layer<HaloSpace.Service> =>
  Layer.succeed(HaloSpace.Service, makeSpaceService(client));
