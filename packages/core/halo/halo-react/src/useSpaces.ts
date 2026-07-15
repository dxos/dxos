//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import { useMemo } from 'react';

import { Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloServices } from './useHaloServices';
import { useReactive } from './useReactive';

export type UseSpacesOptions = {
  /** Include spaces that are not yet `ready` (default: only `ready` spaces). */
  all?: boolean;
};

/**
 * Returns the spaces known to the local identity. By default only `ready` spaces are returned;
 * pass `{ all: true }` for every space. Reactive. Replaces `@dxos/react-client`'s `useSpaces`.
 */
export const useSpaces = ({ all = false }: UseSpacesOptions = {}): readonly Space.Info[] => {
  const service = Context.get(useHaloServices(), Space.Service);
  const spaces = useReactive(service.list, service.changes, [service]);
  return useMemo(() => (all ? spaces : spaces.filter((space) => space.state === 'ready')), [spaces, all]);
};

/**
 * Resolves a single space by id, or `undefined`. Reactive. Replaces `useSpace`. Unlike the
 * legacy hook this takes a {@link SpaceId} only (no `PublicKey`).
 */
export const useSpace = (spaceId?: SpaceId): Space.Info | undefined => {
  const spaces = useSpaces({ all: true });
  return useMemo(() => (spaceId ? spaces.find((space) => space.id === spaceId) : undefined), [spaces, spaceId]);
};
