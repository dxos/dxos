//
// Copyright 2025 DXOS.org
//

import { useMemo, useEffect } from 'react';

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
  useEffect(() => {
    for (const block of queue?.items ?? []) {
      model.appendBlock(block);
    }
  }, [model, queue]);
  useEffect(() => {
    if (!queue?.items.length || model.blocks.length === queue.items.length) {
      return;
    }

    const block = queue.items[queue.items.length - 1];
    model.appendBlock(block);
  }, [model, queue?.items.length]);

  return model;
};
