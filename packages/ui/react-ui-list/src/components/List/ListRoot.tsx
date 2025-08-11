//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';

import { type ItemDragState, type ListItemRecord, idle } from './ListItem';

type ListContext<T extends ListItemRecord> = {
  // TODO(burdon): Rename drag state.
  state: ItemDragState & { item?: T };
  setState: (state: ItemDragState & { item?: T }) => void;
  readonly?: boolean;
  dragPreview?: boolean;
  isItem?: (item: any) => boolean;
  getId?: (item: T) => string; // TODO(burdon): Require if T doesn't conform to type.
};

const LIST_NAME = 'List';

export const [ListProvider, useListContext] = createContext<ListContext<any>>(LIST_NAME);

export type ListRendererProps<T extends ListItemRecord> = {
  state: ListContext<T>['state'];
  items: T[];
};

const defaultGetId = <T extends ListItemRecord>(item: T) => (item as any)?.id;

export type ListRootProps<T extends ListItemRecord> = {
  children?: (props: ListRendererProps<T>) => ReactNode;
  items?: T[];
  onMove?: (fromIndex: number, toIndex: number) => void;
} & Pick<ListContext<T>, 'isItem' | 'getId' | 'readonly' | 'dragPreview'>;

export const ListRoot = <T extends ListItemRecord>({
  children,
  items,
  isItem,
  getId = defaultGetId,
  onMove,
  ...props
}: ListRootProps<T>) => {
  const isEqual = useCallback(
    (a: T, b: T) => {
      const idA = getId?.(a);
      const idB = getId?.(b);

      if (idA !== undefined && idB !== undefined) {
        return idA === idB;
      } else {
        // Fallback for primitive values or when getId fails.
        // NOTE(ZaymonFC): After drag and drop, pragmatic internally serializes drop targets which breaks reference equality.
        // You must provide an `getId` function that returns a stable identifier for your items.
        return a === b;
      }
    },
    [getId],
  );

  const [state, setState] = useState<ListContext<T>['state']>(idle);
  useEffect(() => {
    if (!items) {
      return;
    }

    return monitorForElements({
      canMonitor: ({ source }) => isItem?.(source.data) ?? false,
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!isItem?.(sourceData) || !isItem?.(targetData)) {
          return;
        }

        const sourceIdx = items.findIndex((item) => isEqual(item, sourceData as T));
        const targetIdx = items.findIndex((item) => isEqual(item, targetData as T));
        if (targetIdx < 0 || sourceIdx < 0) {
          return;
        }
        const closestEdgeOfTarget = extractClosestEdge(targetData);
        const destinationIndex = getReorderDestinationIndex({
          closestEdgeOfTarget,
          startIndex: sourceIdx,
          indexOfTarget: targetIdx,
          axis: 'vertical',
        });

        onMove?.(sourceIdx, destinationIndex);
      },
    });
  }, [items, isEqual, onMove]);

  return (
    <ListProvider {...{ state, setState, isItem, ...props }}>{children?.({ state, items: items ?? [] })}</ListProvider>
  );
};
