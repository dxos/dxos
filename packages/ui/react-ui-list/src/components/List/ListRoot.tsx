//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode, useEffect, useState } from 'react';

import { type ThemedClassName, useControlledValue } from '@dxos/react-ui';

import { type ListItemRecord, idle, type ItemState } from './ListItem';

type ListContext<T extends ListItemRecord> = {
  isItem: (item: any) => boolean;
  dragPreview?: boolean;
  state: ItemState & { item?: T };
  setState: (state: ItemState & { item?: T }) => void;
};

const LIST_NAME = 'List';

export const [ListProvider, useListContext] = createContext<ListContext<any>>(LIST_NAME);

export type ListRendererProps<T extends ListItemRecord> = {
  state: ListContext<T>['state'];
  items: T[];
};

export type ListRootProps<T extends ListItemRecord> = ThemedClassName<{
  children?: (props: ListRendererProps<T>) => ReactNode;
  items?: T[];
  onMove?: (source: T, index: number) => void;
}> &
  Pick<ListContext<T>, 'isItem' | 'dragPreview'>;

export const ListRoot = <T extends ListItemRecord>({
  classNames,
  children,
  items: _items = [],
  isItem,
  onMove,
  ...props
}: ListRootProps<T>) => {
  const [items, setItems] = useControlledValue<T[]>(_items);
  const [state, setState] = useState<ListContext<T>['state']>(idle);
  useEffect(() => {
    return monitorForElements({
      canMonitor: ({ source }) => isItem(source.data),
      onDrop: ({ location, source }) => {
        const target = location.current.dropTargets[0];
        if (!target) {
          return;
        }

        const sourceData = source.data;
        const targetData = target.data;
        if (!isItem(sourceData) || !isItem(targetData)) {
          return;
        }

        const sourceIdx = items.findIndex((item) => item.id === sourceData.id);
        const targetIdx = items.findIndex((item) => item.id === targetData.id);
        if (targetIdx < 0 || sourceIdx < 0) {
          return;
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData);
        setItems(
          reorderWithEdge({
            list: items,
            startIndex: sourceIdx,
            indexOfTarget: targetIdx,
            axis: 'vertical',
            closestEdgeOfTarget,
          }),
        );

        onMove?.(sourceData as T, targetIdx);
      },
    });
  }, [items]);

  return <ListProvider {...{ isItem, state, setState, ...props }}>{children?.({ state, items })}</ListProvider>;
};
