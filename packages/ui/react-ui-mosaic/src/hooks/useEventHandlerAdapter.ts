//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { arrayMove } from '@dxos/util';

import { type MosaicEventHandler } from '../components';

export type UseEventHandlerProps<TItem, TObject extends Obj.Any> = Pick<MosaicEventHandler, 'id' | 'canDrop'> & {
  items: TItem[];
  get: (item: TItem) => TObject | undefined;
  make: (object: TObject) => TItem;
  /**
   * Optional change callback for wrapping mutations in Obj.change style.
   * When provided, all array mutations will be wrapped in this callback.
   * When not provided, mutations happen directly on the items array.
   */
  onChange?: (mutator: (items: TItem[]) => void) => void;
};

/**
 * Returns a handler for the given items.
 * NOTE: This supports arrays of objects, or arrays of refs to objects.
 */
export const useEventHandlerAdapter = <TItem, TObject extends Obj.Any>({
  items,
  get,
  make,
  onChange,
  ...props
}: UseEventHandlerProps<TItem, TObject>): MosaicEventHandler => {
  return useMemo<MosaicEventHandler>(
    () => ({
      ...props,
      onTake: ({ source }, cb) => {
        log.info('onTake', { source });
        const mutate = (items: TItem[]) => {
          const from = items.findIndex((item) => get(item)?.id === source.object.id);
          if (from !== -1) {
            items.splice(from, 1);
          }
        };

        if (onChange) {
          onChange(mutate);
        } else {
          mutate(items);
        }

        void cb(source.object);
      },
      onDrop: ({ source, target }) => {
        const to = target?.type === 'tile' || target?.type === 'placeholder' ? target.location : -1;
        log.info('onDrop', { source, target, to });

        const mutate = (items: TItem[]) => {
          const from = items.findIndex((item) => get(item)?.id === source.object.id);
          if (to !== -1) {
            if (from !== -1) {
              arrayMove(items, from, to);
            } else {
              items.splice(to, 0, make(source.object as TObject));
            }
          }
        };

        if (onChange) {
          onChange(mutate);
        } else {
          mutate(items);
        }
      },
    }),
    [items, onChange],
  );
};
