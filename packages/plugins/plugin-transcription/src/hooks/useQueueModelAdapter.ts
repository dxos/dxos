//
// Copyright 2025 DXOS.org
//

import { useMemo, useEffect } from 'react';

import { type Queue } from '@dxos/react-client/echo';

import { type Chunk, type ChunkRenderer, SerializationModel } from '../model';

/**
 * Model adapter for a queue.
 */
export const useQueueModelAdapter = <T extends Chunk>(
  renderer: ChunkRenderer<T>,
  queue: Queue<T> | undefined,
  initialChunks: T[] = [],
): SerializationModel<T> => {
  const model = useMemo(() => new SerializationModel<T>(renderer, initialChunks), [queue]);
  useEffect(() => {
    if (!queue?.items.length) {
      return;
    }

    const chunk = queue.items[queue.items.length - 1];
    model.appendChunk(chunk);
  }, [model, queue?.items.length]);

  return model;
};
