//
// Copyright 2025 DXOS.org
//

export type DOMRectBounds = Pick<DOMRect, 'top' | 'left' | 'width' | 'height'>;

/** Sums layout offsets up the offsetParent chain. */
const accumulateOffsets = (element: HTMLElement): { left: number; top: number } => {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = element;
  while (node) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top };
};

/**
 * Bounds of `element` relative to `container` in LAYOUT coordinates (offset chain), not client
 * rects: client rects shrink under an animating ancestor transform (the popover's entry zoom), and
 * positions measured mid-animation would freeze the board's squares at 95% scale.
 */
export const getRelativeBounds = (container: HTMLElement, element: HTMLElement): DOMRectBounds => {
  const containerOffsets = accumulateOffsets(container);
  const elementOffsets = accumulateOffsets(element);
  return {
    top: elementOffsets.top - containerOffsets.top,
    left: elementOffsets.left - containerOffsets.left,
    width: element.offsetWidth,
    height: element.offsetHeight,
  };
};
