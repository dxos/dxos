//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

import { SpaceOperation } from '#types';

const handler: Operation.WithHandler<typeof SpaceOperation.QuerySpaces> = SpaceOperation.QuerySpaces.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* ClientService;
      // One visibility rule for every surface: tagged spaces are ones the app manages on the user's
      // behalf, and the HALO space is not in `client.spaces` at all.
      const spaces = client.spaces
        .get()
        .filter(AppSpace.isVisibleSpace)
        .map((space) => ({
          spaceId: space.id,
          ...optional('name', readName(space)),
          ...optional('memberCount', readMemberCount(space)),
        }));
      return { spaces };
    }),
  ),
);

export default handler;

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
