//
// Copyright 2026 DXOS.org
//

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
          // A tile target's index is derived from its id against the CURRENT list, never from its
          // `location` payload: that number is captured at the last dragover, and a release that
          // beats the post-drag-start re-render still carries the pre-reflow position — one too
          // high once the source left `useVisibleItems`. Instrumented on kanban's column drag
          // (webkit, 3 of 20): `Root.onDrop` resolved the correct tile while its stale location
          // landed the drop one slot too far. Placeholders keep `location` — it names the gap
          // itself, and the aimed placeholder is re-rendered by its activation.
          let insertIndex: number;
          if (target?.type === 'tile') {
            const withoutSource = from === -1 ? items : items.filter((item) => getId(item) !== source.id);
            const tileIndex = withoutSource.findIndex((item) => getId(item) === target.id);
            insertIndex = tileIndex === -1 ? -1 : tileIndex + 1;
          } else {
            const to =
              target?.type === 'placeholder' ? target.location : target?.type === 'container' ? items.length : -1;
            insertIndex = typeof to === 'number' && to >= 0 ? Math.floor(to) : -1;
          }
          if (insertIndex === -1) {
            return;
          }

          if (from !== -1) {
            // `to` is measured against the list as the user sees it, which still counts the dragged
            // item; the insert happens after it has been spliced out, so the index can be one past
            // the end. A plain array appends, but an ECHO array throws ("index N is out of bounds")
            // — and since the removal has already committed, the item is destroyed. Dropping on the
            // container body (`to === items.length`) hits this on every browser.
            const [item] = items.splice(from, 1);
            items.splice(Math.min(insertIndex, items.length), 0, item);
          } else {
            // TODO(burdon): This should be the responsibility of the source container.
            items.splice(Math.min(insertIndex, items.length), 0, make(get(source.data)));
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
