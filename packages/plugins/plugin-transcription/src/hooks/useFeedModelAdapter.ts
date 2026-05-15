//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { Obj } from '@dxos/echo';

import { type ChunkRenderer, SerializationModel } from '../model';

/**
 * Feeds an array of objects (typically from `useQuery(db, Query.from(feed))`) into a
 * `SerializationModel`, appending each new tail item as the array grows.
 *
 * @param renderer - chunk renderer.
 * @param objects - current snapshot of feed items.
 * @param initialChunks - chunks to seed the model with on first render.
 */
export const useFeedModelAdapter = <T extends Obj.Unknown>(
  renderer: ChunkRenderer<T>,
  objects: readonly T[],
  initialChunks: T[] = [],
): SerializationModel<T> => {
  const model = useMemo(() => new SerializationModel<T>(renderer, initialChunks), [renderer]);

  // Seed the model with the current snapshot on first render and whenever the
  // identity of `objects` changes (e.g. feed swapped).
  useEffect(() => {
    for (const chunk of objects) {
      model.appendChunk(chunk);
    }
  }, [model, objects]);

  // Append new tail items as the array grows.
  useEffect(() => {
    if (model.chunks.length === objects.length) {
      return;
    }
    const chunk = objects.at(-1);
    if (chunk) {
      model.appendChunk(chunk);
    }
  }, [model, objects.length]);

  return model;
};
