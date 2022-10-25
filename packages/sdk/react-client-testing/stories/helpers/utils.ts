//
// Copyright 2022 DXOS.org
//

import { SetStateAction } from 'react';

import { OrderedList } from '@dxos/client';

export const moveItemInArray = (array: any[], item: any, index: number) => {
  const arrayWithoutItem = array.filter((currentItem) => currentItem !== item);
  return [
    ...arrayWithoutItem.slice(0, index),
    item,
    ...arrayWithoutItem.slice(index)
  ];
};

export const updateSourceAndTargetState = (
  setState: (value: SetStateAction<any[]>) => void,
  targetOrderedList: OrderedList,
  newTargetOrder: string[],
  sourceOrderedList?: OrderedList,
  newSourceOrder?: string[]
) => {
  setState((prev) =>
    prev.map((currentOrder) => {
      if (currentOrder.id === targetOrderedList.id) {
        return {
          id: currentOrder.id,
          values: newTargetOrder
        };
      }

      if (
        sourceOrderedList &&
        newSourceOrder &&
        currentOrder.id === sourceOrderedList.id
      ) {
        return {
          id: currentOrder.id,
          values: newSourceOrder
        };
      }

      return currentOrder;
    })
  );
};
