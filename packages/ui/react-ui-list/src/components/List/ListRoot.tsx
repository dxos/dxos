//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode, useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

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
  items?: T[];
};

export type ListRootProps<T extends ListItemRecord> = ThemedClassName<{
  children?: (props: ListRendererProps<T>) => ReactNode;
  items?: T[];
  onMove?: (fromIndex: number, toIndex: number) => void;
}> &
  Pick<ListContext<T>, 'isItem' | 'dragPreview'>;

export const ListRoot = <T extends ListItemRecord>({
  classNames,
  children,
  items,
  isItem,
  onMove,
  ...props
}: ListRootProps<T>) => {
  const [state, setState] = useState<ListContext<T>['state']>(idle);
  useEffect(() => {
    if (!items) {
      return;
    }

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
        const destinationIndex = getReorderDestinationIndex({
          closestEdgeOfTarget,
          startIndex: sourceIdx,
          indexOfTarget: targetIdx,
          axis: 'vertical',
        });
        onMove?.(sourceIdx, destinationIndex);
      },
    });
  }, [items]);

  return <ListProvider {...{ isItem, state, setState, ...props }}>{children?.({ state, items })}</ListProvider>;
};
