//
// Copyright 2026 DXOS.org
//

/** Marks an element a scroll position can be kept against, by an id that names the same item in every session. */
export const SCROLL_ANCHOR_ATTRIBUTE = 'data-scroll-anchor';

// Object rows and tiles already carry their object's id, which serves as an anchor with no markup of their own.
const ANCHOR_ATTRIBUTES = [SCROLL_ANCHOR_ATTRIBUTE, 'data-object-id'];

const ANCHOR_SELECTOR = ANCHOR_ATTRIBUTES.map((attribute) => `[${attribute}]`).join(', ');

const getAnchorId = (element: Element) =>
  ANCHOR_ATTRIBUTES.map((attribute) => element.getAttribute(attribute)).find((id) => id !== null);

/** Where a scrolling area is scrolled to, in a form another session with another width can restore. */
export type ScrollPosition = {
  /** The anchor of the element at the top of the area. */
  anchor?: string;
  /** How far, in pixels, the area is scrolled past the anchor's top. */
  offset?: number;
  /** The fraction of the vertical scroll range scrolled. */
  y: number;
  /** The fraction of the horizontal scroll range scrolled, when the area scrolls sideways. */
  x?: number;
};

// A viewport merged onto its child with `asChild` takes the child's data attributes but keeps the recipe's class.
const VIEWPORT_SELECTOR = '.dx-scroll-viewport';

const fraction = (scrolled: number, range: number) => (range > 0 ? Math.min(Math.max(scrolled / range, 0), 1) : 0);

// Anchors are in document order, which is their order down the area, so the first one whose bottom is below the area's
// top is found by bisection.
const findTopAnchor = (viewport: HTMLElement, top: number): HTMLElement | undefined => {
  const anchors = viewport.querySelectorAll<HTMLElement>(ANCHOR_SELECTOR);
  let low = 0;
  let high = anchors.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (anchors[middle].getBoundingClientRect().bottom <= top) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  const anchor = anchors[low];
  // An anchor inside a nested scrolling area moves with that area, not this one.
  return anchor && anchor.closest(VIEWPORT_SELECTOR) === viewport ? anchor : undefined;
};

/** Reads where `viewport` is scrolled to. */
export const captureScrollPosition = (viewport: HTMLElement): ScrollPosition => {
  const { scrollTop, scrollHeight, clientHeight, scrollLeft, scrollWidth, clientWidth } = viewport;
  const top = viewport.getBoundingClientRect().top;
  const anchor = scrollTop > 0 ? findTopAnchor(viewport, top) : undefined;
  const id = anchor && getAnchorId(anchor);
  return {
    ...(anchor && id && { anchor: id, offset: Math.round(top - anchor.getBoundingClientRect().top) }),
    y: fraction(scrollTop, scrollHeight - clientHeight),
    ...(scrollWidth > clientWidth && { x: fraction(scrollLeft, scrollWidth - clientWidth) }),
  };
};

/**
 * Scrolls `viewport` to `position`: to its anchor when the area holds it, else to its fractions. Answers whether it
 * landed on the anchor, or had none to land on.
 */
export const applyScrollPosition = (viewport: HTMLElement, position: ScrollPosition): boolean => {
  const { scrollHeight, clientHeight, scrollWidth, clientWidth } = viewport;
  const left = position.x === undefined ? undefined : position.x * (scrollWidth - clientWidth);
  const id = position.anchor;
  const anchor =
    id === undefined
      ? undefined
      : [
          ...viewport.querySelectorAll<HTMLElement>(
            ANCHOR_ATTRIBUTES.map((attribute) => `[${attribute}="${CSS.escape(id)}"]`).join(', '),
          ),
        ].find((element) => element.closest(VIEWPORT_SELECTOR) === viewport && getAnchorId(element) === id);
  if (anchor) {
    const top =
      viewport.scrollTop +
      anchor.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top +
      (position.offset ?? 0);
    viewport.scrollTo({ top, left, behavior: 'instant' });
    return true;
  }

  viewport.scrollTo({ top: position.y * (scrollHeight - clientHeight), left, behavior: 'instant' });
  return position.anchor === undefined;
};
