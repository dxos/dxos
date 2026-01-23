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
};

/**
 * Returns a handler for the given items.
 */
export const useEventHandlerAdapter = <TItem, TObject extends Obj.Any>({
  items,
  get,
  make,
  ...props
}: UseEventHandlerProps<TItem, TObject>): MosaicEventHandler => {
  return useMemo<MosaicEventHandler>(
    () => ({
      ...props,
      onTake: ({ source }, cb) => {
        log.info('onTake', { source });
        const from = items.findIndex((item) => get(item)?.id === source.object.id);
        if (from !== -1) {
          items.splice(from, 1);
        }

        void cb(source.object);
      },
      onDrop: ({ source, target }) => {
        const from = items.findIndex((item) => get(item)?.id === source.object.id);
        const to = target?.type === 'tile' || target?.type === 'placeholder' ? target.location : -1;
        log.info('onDrop', { source, target, from, to });
        if (to !== -1) {
          if (from !== -1) {
            arrayMove(items, from, to);
          } else {
            items.splice(to, 0, make(source.object as TObject));
          }
        }
      },
    }),
    [items],
  );
};
