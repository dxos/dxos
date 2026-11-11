//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Invitation, Space } from '@dxos/halo';
import { type IdentityDid, type SpaceId } from '@dxos/keys';

declare const spaceId: SpaceId;
declare const graceDid: IdentityDid;

// #region list
const listSpaces = Effect.gen(function* () {
  const [spaces] = yield* Space.spaces.pipe(Stream.take(1), Stream.runCollect);
  for (const space of spaces) {
    console.log(space.id, space.name, space.state);
  }
});

const findSpace = (id: SpaceId) =>
  Space.get(id).pipe(Effect.map(Option.getOrUndefined));
// #endregion list

// #region create
const createSpace = Effect.gen(function* () {
  const space = yield* Space.create({
    name: 'Team',
    membershipPolicy: 'invite',
  });
  yield* Space.waitReady(space.id);
  return space;
});
// #endregion create

// #region members
const listMembers = Effect.gen(function* () {
  const [members] = yield* Space.members(spaceId).pipe(
    Stream.take(1),
    Stream.runCollect,
  );
  for (const member of members) {
    console.log(member.displayName, member.role, member.online);
  }
});

const demote = Space.updateMemberRole(spaceId, graceDid, 'read');
const remove = Space.removeMember(spaceId, graceDid);
// #endregion members

// #region share
const invite = Effect.gen(function* () {
  const flow = yield* Space.share(spaceId, { authMethod: 'shared-secret' });
  console.log('Send this to Grace:', yield* Invitation.code(flow));
  return flow;
});

declare const code: string;
const accept = Space.join(code);
// #endregion share

// #region archive
const backUp = Effect.gen(function* () {
  const space = yield* createSpace;
  yield* Space.setEdgeReplication(space.id, 'enabled');

  const archive = yield* Space.exportSpace(space.id);
  const copy = yield* Space.importSpace(archive);
  return copy.id;
});
// #endregion archive

// #region errors
const safeRemove = remove.pipe(
  Effect.catchTag('SpaceError', (error) =>
    Effect.sync(() => console.error('Could not remove:', error.message)),
  ),
);
// #endregion errors

export {
  accept,
  backUp,
  demote,
  findSpace,
  invite,
  listMembers,
  listSpaces,
  safeRemove,
};
