//
// Copyright 2024 DXOS.org
//

/**
 * Gets the relative client rect of an element within a parent container.
 * NOTE: This is stable even when the parent is scrolling.
 * https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
 * @param root Parent container (e.g., scrollable container).
 * @param element
 */
export const getRelativeClientRect = (root: HTMLElement, element: HTMLElement): DOMRect => {
  const rootRect = root.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  return new DOMRect(
    elementRect.left - rootRect.left + root.scrollLeft,
    elementRect.top - rootRect.top + root.scrollTop,
    elementRect.width,
    elementRect.height,
  );
};

/**
 * Union of two rectangles.
 */
export const getRectUnion = (b1: DOMRect, b2: DOMRect): Pick<DOMRect, 'left' | 'top' | 'width' | 'height'> => {
  return {
    left: Math.min(b1.left, b2.left),
    top: Math.min(b1.top, b2.top),
    width: Math.abs(b1.left - b2.left) + (b1.left > b2.left ? b1.width : b2.width),
    height: Math.abs(b1.top - b2.top) + (b1.height > b2.height ? b1.height : b2.height),
  };
};

/**
 * Scroll to cell.
 * We need to correct for the DOM `scrollIntoView` function which doesn't show the border.
 */
export const scrollIntoView = (scrollContainer: HTMLElement, el: HTMLElement) => {
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  const cellBounds = el.getBoundingClientRect();
  const scrollerBounds = scrollContainer.getBoundingClientRect();

  if (cellBounds.top < scrollerBounds.top) {
    scrollContainer.scrollTop -= scrollerBounds.top - cellBounds.top;
  } else if (cellBounds.bottom >= scrollerBounds.bottom - 1) {
    scrollContainer.scrollTop += 2 + scrollerBounds.bottom - cellBounds.bottom;
  }

  if (cellBounds.left < scrollerBounds.left) {
    scrollContainer.scrollLeft -= scrollerBounds.left - cellBounds.left;
  } else if (cellBounds.right >= scrollerBounds.right) {
    scrollContainer.scrollLeft += 2 + scrollerBounds.right - cellBounds.right;
  }
};
