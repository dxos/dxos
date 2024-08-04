//
// Copyright 2024 DXOS.org
//

// TODO(burdon): Factor out to html util.

import type { CSSProperties } from 'react';

export const findAncestorWithData = (element: HTMLElement, dataKey: string): HTMLElement | null => {
  let currentElement: HTMLElement | null = element;
  while (currentElement) {
    if (currentElement.dataset && currentElement.dataset[dataKey]) {
      return currentElement;
    }
    currentElement = currentElement.parentElement;
  }

  return null;
};

export const findChildWithData = (node: HTMLElement, dataKey: string, value: string) => {
  return node.querySelector(`[data-${dataKey}="${value}"]`);
};

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export const getRect = ({ left, top, width, height }: CSSProperties): Rect => ({
  left: left as number,
  top: top as number,
  width: width as number,
  height: height as number,
});

export const getBounds = (style1: Rect, style2: Rect): Rect => {
  return {
    left: Math.min(style1.left, style2.left),
    top: Math.min(style1.top, style2.top),
    width: Math.abs(style1.left - style2.left) + (style1.left < style2.left ? style2.width : style1.width),
    height: Math.abs(style1.top - style2.top) + (style1.top < style2.top ? style2.height : style1.height),
  };
};
