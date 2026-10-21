//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import type { Obj } from '@dxos/echo';

import { type ChunkRenderer, TranscriptModel } from '../model/index.ts';

/**
 * Feeds an array of objects (typically from `useQuery(db, Query.from(feed))`) into a
 * `TranscriptModel`, appending each new tail item as the array grows.
 *
 * @param renderer - chunk renderer.
 * @param objects - current snapshot of feed items.
 * @param initialChunks - chunks to seed the model with on first render.
 */
export const useFeedModelAdapter = <T extends Obj.Unknown>(
  renderer: ChunkRenderer<T>,
  objects: readonly T[],
  initialChunks: T[] = [],
): TranscriptModel<T> => {
  const model = useMemo(() => new TranscriptModel<T>(renderer, initialChunks), [renderer]);

  // A query result changes identity and length together as it grows, so append by id rather than by position.
  useEffect(() => {
    const known = new Set(model.chunks.map((chunk) => chunk.id));
    for (const chunk of objects) {
      if (!known.has(chunk.id)) {
        model.appendChunk(chunk);
      }
    }
  }, [model, objects]);

  return model;
};
