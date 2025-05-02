//
// Copyright 2025 DXOS.org
//

import { useMemo, useEffect, useState } from 'react';

import { type Queue } from '@dxos/react-client/echo';

import { type Block, BlockModel, type BlockRenderer } from '../model';

/**
 * Model adapter for a queue.
 */
export const useQueueModelAdapter = <T extends Block>(
  renderer: BlockRenderer<T>,
  queue: Queue<T> | undefined,
  initialBlocks: T[] = [],
): BlockModel<T> => {
  const model = useMemo(() => new BlockModel<T>(renderer, initialBlocks), [queue]);
  const [loaded, setLoaded] = useState(false);

  // Set initial blocks.
  useEffect(() => {
    if (!queue) {
      return;
    }

    const update = () => {
      for (const block of queue?.items ?? []) {
        model.appendBlock(block);
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
    if (!loaded || !queue || model.blocks.length === queue.items.length) {
      return;
    }

    const block = queue.items[queue.items.length - 1];
    model.appendBlock(block);
  }, [model, loaded, queue?.items.length]);

  return model;
};
