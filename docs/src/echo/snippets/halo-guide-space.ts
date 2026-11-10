//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

// #region list
const listSpaces = Effect.gen(function* () {
  const [spaces] = yield* Space.spaces.pipe(Stream.take(1), Stream.runCollect);
  for (const space of spaces) {
    console.log(space.id, space.name, space.state);
  }
});

const findSpace = (id: SpaceId) => Space.get(id).pipe(Effect.map(Option.getOrUndefined));
// #endregion list

// #region create
const createSpace = Effect.gen(function* () {
  const space = yield* Space.create({ name: 'Team', membershipPolicy: 'invite' });
  yield* Space.waitReady(space.id);
  return space;
});
// #endregion create

// #region archive
const backUp = Effect.gen(function* () {
  const space = yield* createSpace;
  yield* Space.setEdgeReplication(space.id, 'enabled');

  const archive = yield* Space.exportSpace(space.id);
  const copy = yield* Space.importSpace(archive);
  return copy.id;
});
// #endregion archive

export { backUp, findSpace, listSpaces };
