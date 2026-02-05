//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { getSpace } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Key } from '@dxos/echo';
import { type Function } from '@dxos/functions';

import { getNextVersion, loadFunctionObject } from './echo';

export const parseOptions = Effect.fn(function* (options: {
  name: Option.Option<string>;
  version: Option.Option<string>;
  functionId: Option.Option<string>;
  spaceId: Option.Option<Key.SpaceId>;
}) {
  const client = yield* ClientService;
  const identity = client.halo.identity.get();
  if (!identity) {
    return yield* Effect.fail(new Error('Identity not available'));
  }

  const space = yield* Option.match(options.spaceId, {
    onNone: () => Effect.succeed(Option.none<Space>()),
    onSome: (spaceId) => getSpace(spaceId).pipe(Effect.map(Option.some)),
  });

  const ownerPublicKey = Option.match(space, {
    onNone: () => identity.identityKey.toString(),
    onSome: (space) => space.key.toString(),
  });

  const functionId = Option.getOrUndefined(options.functionId);

  const existingObject = yield* Option.all([space, options.functionId]).pipe(
    Option.match({
      onNone: () => Effect.succeed(Option.none<Function.Function>()),
      onSome: ([space, functionId]) => loadFunctionObject(space, functionId).pipe(Effect.map(Option.some)),
    }),
  );

  const name = Option.getOrUndefined(options.name);
  const version = Option.getOrElse(options.version, () => getNextVersion(existingObject));

  return {
    space,
    ownerPublicKey,
    functionId,
    existingObject,
    name,
    version,
  };
});
