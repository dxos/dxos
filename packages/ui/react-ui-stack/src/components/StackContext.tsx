//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { type StackItemRearrangeHandler, type StackItemSize } from './types';
import { type Orientation, type Size } from './Stack';

export type StackContextValue = {
  orientation: Orientation;
  rail: boolean;
  size: Size;
  onRearrange?: StackItemRearrangeHandler;
  stackId?: string;
};

export const StackContext = createContext<StackContextValue>({
  orientation: 'vertical',
  rail: true,
  size: 'intrinsic',
});

export const useStack = () => useContext(StackContext);

export type ItemDragState =
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
      item: any;
    }
  | {
      type: 'is-dragging';
      item: any;
    };

export const idle: ItemDragState = { type: 'idle' };

export type StackItemContextValue = {
  selfDragHandleRef: (element: HTMLDivElement | null) => void;
  size: StackItemSize;
  setSize: (nextSize: StackItemSize, commit?: boolean) => void;
  state: ItemDragState;
  setState: (state: ItemDragState) => void;
  role?: string;
};

export const StackItemContext = createContext<StackItemContextValue>({
  selfDragHandleRef: () => {},
  size: 'min-content',
  setSize: () => {},
  state: idle,
  setState: () => {},
});

export const useStackItem = () => useContext(StackItemContext);
