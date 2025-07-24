//
// Copyright 2025 DXOS.org
//

export type DOMRectBounds = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

export const getRelativeBounds = (container: HTMLElement, element: HTMLElement): DOMRectBounds => {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return {
    top: elementRect.top - containerRect.top,
    left: elementRect.left - containerRect.left,
    width: elementRect.width,
    height: elementRect.height,
  };
};
