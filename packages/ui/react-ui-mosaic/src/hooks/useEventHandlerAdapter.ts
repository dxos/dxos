//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { arrayMove } from '@dxos/util';

import { type GetId, type MosaicEventHandler } from '../components';

export type UseEventHandlerProps<TItem = any, TObject = any> = Pick<MosaicEventHandler<TItem>, 'id' | 'canDrop'> & {
  /**
   * The items to manage.
   */
  items: TItem[];

  /**
   * ID getter.
   */
  getId: GetId<TItem>;

  /**
   * Extracts the object from an item.
   */
  get: (item: TItem) => TObject;

  /**
   * Creates a new item from the dragged object.
   */
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
export const useEventHandlerAdapter = <TItem = any, TObject extends Obj.Any = Obj.Any>({
  items,
  getId,
  get,
  make,
  onChange,
  ...props
}: UseEventHandlerProps<TItem, TObject>): MosaicEventHandler<TItem> => {
  return useMemo<MosaicEventHandler<TItem>>(
    () => ({
      ...props,
      onTake: ({ source }, cb) => {
        log.info('onTake', { source });
        const mutate = (items: TItem[]) => {
          const from = items.findIndex((item) => getId(item) === source.id);
          if (from !== -1) {
            items.splice(from, 1);
          }
        };

        if (onChange) {
          onChange(mutate);
        } else {
          mutate(items);
        }

        void cb(source.data);
      },
      onDrop: ({ source, target }) => {
        const to = target?.type === 'tile' || target?.type === 'placeholder' ? target.location : -1;
        log.info('onDrop', { source, target, to });

        const mutate = (items: TItem[]) => {
          const from = items.findIndex((item) => getId(item) === source.id);
          if (to !== -1) {
            if (from !== -1) {
              arrayMove(items, from, to);
            } else {
              // TODO(burdon): This should be the responsibility of the source container.
              items.splice(to, 0, make(get(source.data)));
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
