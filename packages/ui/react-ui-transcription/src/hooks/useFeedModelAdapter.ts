//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { Obj } from '@dxos/echo';
import { ChunkModel, type ChunkRenderer } from '@dxos/react-ui-thread/model';

/**
 * Feeds an array of objects (typically from `useQuery(db, Query.from(feed))`) into a
 * {@link ChunkModel}.
 *
 * The snapshot is handed over whole on every change: the model reconciles it against what it last
 * wrote, so a feed that swaps, back-fills history, or revises an earlier segment is handled by the
 * same call as a plain append.
 *
 * @param renderer - chunk renderer.
 * @param objects - current snapshot of feed items.
 * @param initialChunks - chunks rendered ahead of the snapshot.
 */
export const useFeedModelAdapter = <T extends Obj.Unknown>(
  renderer: ChunkRenderer<T>,
  objects: readonly T[],
  initialChunks: T[] = [],
): ChunkModel<T> => {
  const model = useMemo(() => new ChunkModel<T>(renderer), [renderer]);

  useEffect(() => {
    model.set([...initialChunks, ...objects]);
    // `initialChunks` defaults to a fresh array, so depending on it would re-set on every render.
  }, [model, objects, objects.length]);

  return model;
};
