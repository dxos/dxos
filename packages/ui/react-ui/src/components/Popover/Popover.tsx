//
// Copyright 2022 DXOS.org
//

// The machine owns positioning, dismissal, focus and presence; this file is anatomy plus the DXOS
// additions: a virtual anchor, the `Viewport` clip, the `[data-popover-collision-boundary]` ancestor, and the safe-area
// collision padding.

import { ark } from '@ark-ui/react/factory';
import { Popover as PopoverPrimitive, usePopover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithRef,
  type FC,
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useComposedRefs, useControllableState } from '@dxos/react-hooks';
import { DX_POPOVER_CONTENT_ATTR } from '@dxos/ui-types';

import { useElevationContext, useSafeCollisionPadding, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ColumnContext } from '../Column';
import {
  POPOVER_NAME,
  type PopoverAlign,
  type PopoverContentHandlers,
  type PopoverEscapeKeyDownEvent,
  type PopoverFocusOutsideEvent,
  type PopoverInteractOutsideEvent,
  type PopoverPlacementOptions,
  type PopoverPointerDownOutsideEvent,
  PopoverProvider,
  type PopoverSide,
  usePopoverContext,
} from './PopoverContext';

const toPlacement = (side: PopoverSide = 'bottom', align: PopoverAlign = 'center') =>
  align === 'center' ? side : (`${side}-${align}` as const);

/** Consumers hand the machine a per-side padding; it takes one number, so the widest side wins. */
const toOverflowPadding = (padding: { top: number; right: number; bottom: number; left: number }) =>
  Math.max(padding.top, padding.right, padding.bottom, padding.left);

/** The answer a `preventDefault()`-style handler gives, asked ahead of the moment it would fire. */
const prevents = (handler: ((event: Event) => void) | undefined) => {
  if (!handler) {
    return false;
  }
  const event = new Event('autofocus', { cancelable: true });
  handler(event);
  return event.defaultPrevented;
};

//
// Root
//

type PopoverRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
};

const PopoverRoot: FC<PopoverRootProps> = ({ children, open: openProp, defaultOpen, onOpenChange, modal = false }) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const contentId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const handlersRef = useRef<PopoverContentHandlers>({});
  const [virtualAnchor, setVirtualAnchorState] = useState<RefObject<Element | null> | null>(null);
  const [placementOptions, setPlacement] = useState<PopoverPlacementOptions>({});
  const setVirtualAnchor = useCallback((ref: RefObject<Element | null>) => {
    setVirtualAnchorState(ref);
    return () => setVirtualAnchorState((current) => (current === ref ? null : current));
  }, []);

  const {
    side,
    align,
    sideOffset = 0,
    alignOffset,
    collisionPadding = 8,
    collisionBoundary,
    avoidCollisions = true,
    hideWhenDetached,
  } = placementOptions;
  const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);
  const overflowPadding = toOverflowPadding(safeCollisionPadding);

  // The closest annotated ancestor bounds the content.
  const boundary = useMemo(() => {
    const closest = triggerRef.current?.closest<HTMLElement>('[data-popover-collision-boundary]') ?? null;
    const given = Array.isArray(collisionBoundary) ? collisionBoundary : collisionBoundary ? [collisionBoundary] : [];
    const elements = [closest, ...given].filter((element): element is Element => !!element);
    return elements.length ? () => elements : undefined;
    // The trigger is read when the popover opens, which is when the boundary matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, collisionBoundary]);

  const positioning = useMemo(
    () => ({
      strategy: 'fixed' as const,
      placement: toPlacement(side, align),
      gutter: sideOffset,
      ...(alignOffset !== undefined && { offset: { mainAxis: sideOffset, crossAxis: alignOffset } }),
      overflowPadding,
      // Keeps the arrow off the rounded corners, where its fill would paint over the curve.
      arrowPadding: 12,
      flip: avoidCollisions,
      hideWhenDetached,
      boundary,
      ...(virtualAnchor && {
        getAnchorRect: () => virtualAnchor.current?.getBoundingClientRect() ?? null,
      }),
    }),
    [side, align, sideOffset, alignOffset, overflowPadding, avoidCollisions, hideWhenDetached, boundary, virtualAnchor],
  );

  const popover = usePopover({
    open,
    onOpenChange: ({ open: next }) => setOpen(next),
    modal,
    ids: { content: contentId },
    positioning,
    // The content vetoes its own auto focus with `preventDefault()`, asked at render so the machine
    // reads the answer when it opens.
    autoFocus: !prevents(handlersRef.current.onOpenAutoFocus),
    finalFocusEl: () => triggerRef.current,
    onInteractOutside: (event) => handlersRef.current.onInteractOutside?.(event),
    onPointerDownOutside: (event) => handlersRef.current.onPointerDownOutside?.(event),
    onFocusOutside: (event) => handlersRef.current.onFocusOutside?.(event),
    onEscapeKeyDown: (event) => handlersRef.current.onEscapeKeyDown?.(event),
  });
  const reposition = popover.reposition;
  useEffect(() => {
    if (open) {
      reposition(positioning);
    }
  }, [open, positioning, reposition]);

  const context = useMemo(
    () => ({ contentId, open, modal, onOpenChange: setOpen, triggerRef, setVirtualAnchor, setPlacement, handlersRef }),
    [contentId, open, modal, setOpen, setVirtualAnchor],
  );

  return (
    // Closed content is not in the DOM at all: `lazyMount` for before
    // the first open, `unmountOnExit` for after.
    <PopoverPrimitive.RootProvider value={popover} lazyMount unmountOnExit>
      <PopoverProvider {...context}>{children}</PopoverProvider>
    </PopoverPrimitive.RootProvider>
  );
};

PopoverRoot.displayName = POPOVER_NAME;

//
// Anchor
//

const ANCHOR_NAME = 'Popover.Anchor';

type PopoverAnchorProps = ComponentPropsWithRef<typeof PopoverPrimitive.Anchor>;

const PopoverAnchor = forwardRef<HTMLDivElement, PopoverAnchorProps>((props, forwardedRef) => {
  return <PopoverPrimitive.Anchor {...props} ref={forwardedRef} />;
});

PopoverAnchor.displayName = ANCHOR_NAME;

//
// Trigger
//

const TRIGGER_NAME = 'Popover.Trigger';

type PopoverTriggerProps = ComponentPropsWithRef<typeof PopoverPrimitive.Trigger>;

const PopoverTrigger = forwardRef<HTMLButtonElement, PopoverTriggerProps>((props, forwardedRef) => {
  const { triggerRef } = usePopoverContext(TRIGGER_NAME);
  return <PopoverPrimitive.Trigger {...props} ref={useComposedRefs(forwardedRef, triggerRef)} />;
});

PopoverTrigger.displayName = TRIGGER_NAME;

//
// VirtualTrigger
//

const VIRTUAL_TRIGGER_NAME = 'Popover.VirtualTrigger';

type PopoverVirtualTriggerProps = {
  /** The element the content is positioned at and focus returns to; it renders nothing itself. */
  virtualRef: RefObject<Element | null>;
};

const PopoverVirtualTrigger = ({ virtualRef }: PopoverVirtualTriggerProps) => {
  const { setVirtualAnchor, triggerRef } = usePopoverContext(VIRTUAL_TRIGGER_NAME);
  useLayoutEffect(() => setVirtualAnchor(virtualRef), [setVirtualAnchor, virtualRef]);
  useLayoutEffect(() => {
    const element = virtualRef.current;
    if (element instanceof HTMLElement) {
      triggerRef.current = element;
    }
  });
  return null;
};

PopoverVirtualTrigger.displayName = VIRTUAL_TRIGGER_NAME;

//
// Portal
//

const PORTAL_NAME = 'Popover.Portal';

type PopoverPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const PopoverPortal = ({ children, container }: PopoverPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return (
    <Portal container={containerRef}>
      {/* The portal escapes the declaring tree's DOM, but React context follows the element tree,
          so content declared inside a Column would otherwise believe it still has that host's
          gutter and place itself in a content track no ancestor provides — rendering flush
          against the popover's own edges. */}
      <ColumnContext.Provider value={false}>{children}</ColumnContext.Provider>
    </Portal>
  );
};

PopoverPortal.displayName = PORTAL_NAME;

//
// Content
//

const CONTENT_NAME = 'Popover.Content';

type PopoverContentProps = ThemedClassName<ComponentPropsWithRef<typeof PopoverPrimitive.Content>> &
  PopoverPlacementOptions &
  PopoverContentHandlers;

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      classNames,
      children,
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      avoidCollisions,
      hideWhenDetached,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const { setPlacement, handlersRef } = usePopoverContext(CONTENT_NAME);
    const { tx } = useThemeContext();
    const elevation = useElevationContext();

    // Placement is state on the root (it re-positions); the handlers are read at event time.
    useLayoutEffect(() => {
      setPlacement({
        side,
        align,
        sideOffset,
        alignOffset,
        collisionPadding,
        collisionBoundary,
        avoidCollisions,
        hideWhenDetached,
      });
    }, [
      setPlacement,
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      avoidCollisions,
      hideWhenDetached,
    ]);
    handlersRef.current = {
      onOpenAutoFocus,
      onCloseAutoFocus,
      onInteractOutside,
      onPointerDownOutside,
      onFocusOutside,
      onEscapeKeyDown,
    };

    return (
      <PopoverPrimitive.Positioner className={tx('popover.positioner', { elevation })}>
        <PopoverPrimitive.Content
          {...props}
          {...{ [DX_POPOVER_CONTENT_ATTR]: '' }}
          className={tx('popover.content', { elevation }, classNames)}
          ref={forwardedRef}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Positioner>
    );
  },
);

PopoverContent.displayName = CONTENT_NAME;

//
// Close
//

const CLOSE_NAME = 'Popover.Close';

type PopoverCloseProps = ComponentPropsWithRef<typeof PopoverPrimitive.CloseTrigger>;

const PopoverClose = forwardRef<HTMLButtonElement, PopoverCloseProps>((props, forwardedRef) => {
  return <PopoverPrimitive.CloseTrigger {...props} ref={forwardedRef} />;
});

PopoverClose.displayName = CLOSE_NAME;

//
// Arrow
//

const ARROW_NAME = 'Popover.Arrow';

type PopoverArrowProps = ThemedClassName<ComponentPropsWithRef<typeof PopoverPrimitive.Arrow>>;

const PopoverArrow = forwardRef<HTMLDivElement, PopoverArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <PopoverPrimitive.Arrow {...props} className={tx('popover.arrow', {}, classNames)} ref={forwardedRef}>
      <PopoverPrimitive.ArrowTip />
    </PopoverPrimitive.Arrow>
  );
});

PopoverArrow.displayName = ARROW_NAME;

//
// Viewport
//

type PopoverViewportProps = ThemedClassName<ComponentPropsWithRef<typeof ark.div>> & {
  asChild?: boolean;
  constrainInline?: boolean;
  constrainBlock?: boolean;
};

const PopoverViewport = forwardRef<HTMLDivElement, PopoverViewportProps>(
  ({ classNames, asChild, constrainInline = true, constrainBlock = true, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <ark.div
        asChild={asChild}
        {...props}
        className={tx('popover.viewport', { constrainInline, constrainBlock }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

PopoverViewport.displayName = 'Popover.Viewport';

type PopoverContentInteractOutsideEvent = PopoverInteractOutsideEvent;

//
// Popover
//

export const Popover = {
  Root: PopoverRoot,
  Anchor: PopoverAnchor,
  Trigger: PopoverTrigger,
  VirtualTrigger: PopoverVirtualTrigger,
  Portal: PopoverPortal,
  Content: PopoverContent,
  Close: PopoverClose,
  Arrow: PopoverArrow,
  Viewport: PopoverViewport,
};

export type {
  PopoverAnchorProps,
  PopoverArrowProps,
  PopoverCloseProps,
  PopoverContentInteractOutsideEvent,
  PopoverContentProps,
  PopoverEscapeKeyDownEvent,
  PopoverFocusOutsideEvent,
  PopoverPointerDownOutsideEvent,
  PopoverPortalProps,
  PopoverRootProps,
  PopoverTriggerProps,
  PopoverViewportProps,
  PopoverVirtualTriggerProps,
};
