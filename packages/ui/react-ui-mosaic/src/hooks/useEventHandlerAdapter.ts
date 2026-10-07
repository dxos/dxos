//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type DndContainerHandler, type GetId } from '@dxos/react-ui-dnd';

export type UseEventHandlerProps<TItem = any, TObject extends Obj.Unknown = Obj.Unknown> = Pick<
  DndContainerHandler<TItem>,
  'id' | 'canDrop'
> & {
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
   * Optional change callback for wrapping mutations in Obj.update style.
   * When provided, all array mutations will be wrapped in this callback.
   * When not provided, mutations happen directly on the items array.
   */
  onChange?: (mutator: (items: TItem[]) => void) => void;
};

/**
 * Returns a handler for the given items.
 * NOTE: This supports arrays of objects, or arrays of refs to objects.
 */
export const useEventHandlerAdapter = <TItem = any, TObject extends Obj.Unknown = Obj.Unknown>({
  items,
  getId,
  get,
  make,
  onChange,
  ...props
}: UseEventHandlerProps<TItem, TObject>): DndContainerHandler<TItem> => {
  return useMemo<DndContainerHandler<TItem>>(
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
        log.info('onDrop', { source, target });

        const mutate = (items: TItem[]) => {
          const from = items.findIndex((item) => getId(item) === source.id);

          // `none` when the drop resolves to no position. A tile target's index comes from its id
          // against the CURRENT list, never from its `location`: that number is captured at the last
          // dragover, so a release beating the post-drag-start re-render still holds the pre-reflow
          // position, one too high. Placeholders keep `location`, which names the gap itself.
          const resolveInsertIndex = (): Option.Option<number> => {
            if (target?.type === 'tile') {
              const withoutSource = from === -1 ? items : items.filter((item) => getId(item) !== source.id);
              const tileIndex = withoutSource.findIndex((item) => getId(item) === target.id);
              return tileIndex === -1 ? Option.none() : Option.some(tileIndex + 1);
            }

            const to =
              target?.type === 'placeholder' ? target.location : target?.type === 'container' ? items.length : -1;
            return typeof to === 'number' && to >= 0 ? Option.some(Math.floor(to)) : Option.none();
          };

          Option.match(resolveInsertIndex(), {
            onNone: () => {},
            // Clamped against the length read AFTER the removal: the index is measured against the list
            // including the dragged item, so one past the end makes an ECHO array throw rather than
            // append, and the removal has already committed, destroying the item.
            onSome: (insertIndex) => {
              if (from !== -1) {
                // Read before removing, because an ECHO array's `splice` returns the stored wire form,
                // which its own schema rejects on re-insert.
                const item = items[from];
                items.splice(from, 1);
                items.splice(Math.min(insertIndex, items.length), 0, item);
              } else {
                // TODO(burdon): This should be the responsibility of the source container.
                items.splice(Math.min(insertIndex, items.length), 0, make(get(source.data)));
              }
            },
          });
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
