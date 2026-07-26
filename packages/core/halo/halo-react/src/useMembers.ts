//
// Copyright 2026 DXOS.org
//

import { Atom, Result, useAtomValue } from '@effect-atom/atom-react';
import * as Stream from 'effect/Stream';
import { useMemo } from 'react';

import { Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloServices } from './HaloProvider';

const EMPTY: readonly Space.Member[] = [];

/**
 * Returns the membership of a space. Reactive: re-renders on join/leave/role/presence changes.
 * Replaces `@dxos/react-client`'s `useMembers` (which took a `PublicKey`; this takes a
 * {@link SpaceId}).
 */
export const useMembers = (spaceId?: SpaceId): readonly Space.Member[] => {
  const services = useHaloServices();
  const atom = useMemo(
    () => Atom.make((spaceId ? Space.members(spaceId) : Stream.empty).pipe(Stream.provideContext(services))),
    [services, spaceId],
  );

  return Result.getOrElse(useAtomValue(atom), () => EMPTY);
};
