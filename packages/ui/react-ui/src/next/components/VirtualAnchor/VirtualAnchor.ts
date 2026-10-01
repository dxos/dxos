//
// Copyright 2026 DXOS.org
//

import { type RefObject, useMemo } from 'react';

export type VirtualAnchorPositioning = {
  getAnchorRect: () => DOMRect | null;
};

/**
 * Positioning that anchors a Menu, Popover or Combobox popup at another element's rect: Ark has no virtual-trigger
 * part, so a popup without a Trigger is opened under control and placed with `positioning.getAnchorRect`.
 */
export const virtualAnchor = (virtualRef: RefObject<Element | null>): VirtualAnchorPositioning => ({
  getAnchorRect: () => virtualRef.current?.getBoundingClientRect() ?? null,
});

/** {@link virtualAnchor} kept stable across renders; `undefined` without a ref, so a Trigger anchors as usual. */
export const useVirtualAnchor = (virtualRef?: RefObject<Element | null>): VirtualAnchorPositioning | undefined =>
  useMemo(() => (virtualRef ? virtualAnchor(virtualRef) : undefined), [virtualRef]);
