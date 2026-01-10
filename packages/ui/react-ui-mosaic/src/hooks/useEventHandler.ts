//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { arrayMove } from '@dxos/util';

import { type MosaicEventHandler } from '../components';

/**
 * Returns a handler for the given items.
 */
export const useEventHandler = <T>(
  id: string,
  items: T[],
  get: (item: T) => Obj.Any | undefined,
  make: (obj: Obj.Any) => T,
): MosaicEventHandler => {
  return useMemo<MosaicEventHandler>(
    () => ({
      id,
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
            items.splice(to, 0, make(source.object));
          }
        }
      },
    }),
    [id, items, get, make],
  );
};
