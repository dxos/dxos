//
// Copyright 2024 DXOS.org
//

import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { createContext, useContext } from 'react';

import { type Orientation, type Size } from './Stack';

export type StackItemSize = number | 'min-content';

export type StackItemData = { id: string; type: 'column' | 'card' };

export type StackItemRearrangeHandler = (
  source: StackItemData,
  target: StackItemData,
  closestEdge: Edge | null,
) => void;

export type StackContextValue = {
  orientation: Orientation;
  rail: boolean;
  size: Size;
  onRearrange?: StackItemRearrangeHandler;
};

export const StackContext = createContext<StackContextValue>({
  orientation: 'vertical',
  rail: true,
  size: 'intrinsic',
});

export const useStack = () => useContext(StackContext);

export type StackItemContextValue = {
  selfDragHandleRef: (element: HTMLDivElement | null) => void;
  size: StackItemSize;
  setSize: (nextSize: StackItemSize, commit?: boolean) => void;
};

export const StackItemContext = createContext<StackItemContextValue>({
  selfDragHandleRef: () => {},
  size: 'min-content',
  setSize: () => {},
});

export const useStackItem = () => useContext(StackItemContext);
