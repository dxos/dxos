//
// Copyright 2026 DXOS.org
//

/** What a Zag machine accepts as the element its floating content is positioned against. */
export type AnchorElement = HTMLElement | { getBoundingClientRect: () => DOMRect; contextElement?: Element };

/**
 * Hands a virtual anchor to the machine as its anchor element rather than as a bare rect: the
 * element is what the machine's scroll and resize observers attach to, so the content follows the
 * anchor when an ancestor scrolls.
 */
export const toAnchorElement = (element: Element | null): AnchorElement | null => {
  if (element instanceof HTMLElement) {
    return element;
  }
  return element ? { getBoundingClientRect: () => element.getBoundingClientRect(), contextElement: element } : null;
};
