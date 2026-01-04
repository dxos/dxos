//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import type { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/react-client/echo';

import { type ChunkRenderer, SerializationModel } from '../model';

/**
 * Model adapter for a queue.
 */
export const useQueueModelAdapter = <T extends Obj.AnyProps>(
  renderer: ChunkRenderer<T>,
  queue: Queue<T> | undefined,
  initialChunks: T[] = [],
): SerializationModel<T> => {
  const model = useMemo(() => new SerializationModel<T>(renderer, initialChunks), [queue]);
  const [loaded, setLoaded] = useState(false);

  // Set initial blocks.
  useEffect(() => {
    if (!queue) {
      return;
    }

    const update = () => {
      for (const block of queue?.objects ?? []) {
        model.appendChunk(block);
      }

      setLoaded(true);
    };

    // TODO(burdon): This is a hack to ensure the queue is loaded.
    let i: NodeJS.Timeout | undefined;
    if (queue.isLoading) {
      i = setInterval(() => {
        if (!queue?.isLoading) {
          clearInterval(i);
          update();
        }
      }, 1_000);
    } else {
      update();
    }

    return () => clearTimeout(i);
  }, [model, queue]);

  // TODO(burdon): Can we listen for queue events?
  useEffect(() => {
    if (!loaded || !queue || model.chunks.length === queue.objects.length) {
      return;
    }

    const chunk = queue.objects.at(-1);
    if (chunk) {
      model.appendChunk(chunk);
    }
  }, [model, loaded, queue?.objects.length]);

  return model;
};
