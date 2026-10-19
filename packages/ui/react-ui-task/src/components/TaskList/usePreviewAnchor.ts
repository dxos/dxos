//
// Copyright 2026 DXOS.org
//

import { type KeyboardEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useMemo, useRef } from 'react';

import { DxAnchorActivate } from '@dxos/ui-types';

import { AnchorHover } from './anchor-hover.ts';

export type PreviewAnchorOptions = {
  /** URI of the object the chip names; without one the chip does nothing. */
  eid?: string;
  label: string;
  /** Card title, for an object whose own label would fall back to its type's placeholder. */
  title?: string;
};

/**
 * Wires a chip to the object it names: hovering shows the object's card, leaving closes it, and a
 * click (or Enter/Space) opens the object itself. Spread the result onto the chip.
 */
export const usePreviewAnchor = ({ eid, label, title }: PreviewAnchorOptions) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const hoverRef = useRef<AnchorHover | undefined>(undefined);

  const dispatch = useCallback(
    (props?: { state?: false; navigate?: true }) => {
      const trigger = elementRef.current;
      if (trigger && eid) {
        trigger.dispatchEvent(new DxAnchorActivate({ trigger, eid, label, kind: 'card', title, ...props }));
      }
    },
    [eid, label, title],
  );

  // The controller lives as long as the element, so it reads the latest `dispatch` through a ref.
  const dispatchRef = useRef(dispatch);
  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  const ref = useCallback((element: HTMLElement | null) => {
    hoverRef.current?.reset();
    elementRef.current = element;
    hoverRef.current = element
      ? new AnchorHover({
          anchor: element,
          open: () => dispatchRef.current(),
          close: () => dispatchRef.current({ state: false }),
        })
      : undefined;
  }, []);

  const openObject = useCallback(() => {
    hoverRef.current?.reset();
    dispatch({ navigate: true });
  }, [dispatch]);

  return useMemo(
    () => ({
      ref,
      onPointerEnter: (event: PointerEvent<HTMLElement>) => {
        if (eid) {
          hoverRef.current?.enter(event.pointerType);
        }
      },
      onPointerLeave: () => hoverRef.current?.leave(),
      onBlur: () => hoverRef.current?.blur(),
      onClick: (event: MouseEvent<HTMLElement>) => {
        // The row is an option: without this the click selects the task as well as opening the object.
        event.stopPropagation();
        openObject();
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          openObject();
        }
      },
    }),
    [ref, eid, openObject],
  );
};
