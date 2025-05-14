//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Orientation, type Size } from './Stack';
import { type StackItemSize, type StackItemRearrangeHandler } from './defs';

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
