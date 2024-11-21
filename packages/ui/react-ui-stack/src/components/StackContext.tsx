//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Orientation, type Size } from './Stack';
import { type StackItemSize } from './StackItem';

export type StackContextValue = {
  orientation: Orientation;
  separators: boolean;
  rail: boolean;
  size: Size;
};

export const StackContext = createContext<StackContextValue>({
  orientation: 'vertical',
  rail: true,
  size: 'intrinsic',
  separators: true,
});

export const useStack = () => useContext(StackContext);

type StackItemContextValue = {
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
