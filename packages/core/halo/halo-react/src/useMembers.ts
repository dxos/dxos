//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloServices } from './useHaloServices';
import { useReactive } from './useReactive';

const EMPTY: readonly Space.Member[] = [];

/**
 * Returns the membership of a space. Reactive: re-renders on join/leave/role/presence changes.
 * Replaces `@dxos/react-client`'s `useMembers` (which took a `PublicKey`; this takes a
 * {@link SpaceId}).
 */
export const useMembers = (spaceId?: SpaceId): readonly Space.Member[] => {
  const service = Context.get(useHaloServices(), Space.Service);
  return useReactive(
    // Total the snapshot: an unresolved space yields no members rather than throwing.
    spaceId ? Effect.orElseSucceed(service.members(spaceId), () => EMPTY) : Effect.succeed(EMPTY),
    spaceId ? service.memberChanges(spaceId) : Stream.empty,
    [service, spaceId],
  );
};
