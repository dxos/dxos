//
// Copyright 2026 DXOS.org
//

import { Result, useAtomValue } from '@effect-atom/atom-react';
import { useMemo } from 'react';

import { Space } from '@dxos/halo';
import { type SpaceId } from '@dxos/keys';

import { useHaloRuntime } from './HaloProvider';

const EMPTY: readonly Space.Info[] = [];

export type UseSpacesOptions = {
  /** Include spaces that are not yet `ready` (default: only `ready` spaces). */
  all?: boolean;
};

/**
 * Returns the spaces known to the local identity. By default only `ready` spaces are returned;
 * pass `{ all: true }` for every space. Reactive. Replaces `@dxos/react-client`'s `useSpaces`.
 */
export const useSpaces = ({ all = false }: UseSpacesOptions = {}): readonly Space.Info[] => {
  const runtime = useHaloRuntime();
  const atom = useMemo(() => runtime.atom(Space.spaces), [runtime]);
  const spaces = Result.getOrElse(useAtomValue(atom), () => EMPTY);
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
