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
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useComposedRefs, useControllableState } from '@dxos/react-hooks';
import { elevationAttrs, elevationSurface } from '@dxos/ui-theme';
import { DX_POPOVER_CONTENT_ATTR, type ElevationLevel } from '@dxos/ui-types';

import { useElevationContext, usePositioning, useThemeContext } from '../../hooks/index.ts';
import { type ThemedClassName } from '../../util/index.ts';
import { ColumnContext } from '../Column/index.ts';
import {
  POPOVER_NAME,
  type PopoverContentHandlers,
  type PopoverEscapeKeyDownEvent,
  type PopoverFocusOutsideEvent,
  type PopoverInteractOutsideEvent,
  type PopoverPlacementOptions,
  type PopoverPointerDownOutsideEvent,
  PopoverProvider,
  usePopoverContext,
} from './PopoverContext.ts';

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
  const [placementOptions, setPlacement] = useState<PopoverPlacementOptions>({});
  const { positioning, setVirtualAnchor } = usePositioning({ open, triggerRef, placement: placementOptions });

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
  PopoverContentHandlers & {
    /** Material-style elevation, 0–5, onto the surface ladder; a popover is `popup` (5) by default. */
    elevation?: ElevationLevel;
    /** Outline the content with the separator; the arrow follows it. */
    border?: boolean;
  };

const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      classNames,
      children,
      elevation: elevationProp,
      border,
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
          {...elevationAttrs(elevationProp)}
          className={tx('popover.content', { border, elevation, surface: elevationSurface(elevationProp) }, classNames)}
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

/**
 * The tip is drawn rather than taken from the machine: its rotated-square tip is two CSS borders
 * meeting the content's outline, and the joint between a diagonal border band and a straight line
 * is never clean. Here the outline is one stroked path — the content's line for four px, the
 * chevron, and the line again — so the corners are mitred by the rasteriser and the arrow's edges
 * are the outline continued. It is drawn pointing right for a popover on the left, and turned per
 * side by `positioning.css`.
 *
 * Coordinates are in the machine's 12px arrow box, which `positioning.css` centres on the outline's
 * outer edge, at 6. The path runs along that edge and is stroked at twice the outline's width, and
 * the svg is clipped to the arrow's outer shape, so exactly one width shows inside the edge whatever
 * the width is (see the theme). The fill covers the outline under the chevron so it opens into it.
 */
const ARROW_SHAPE = 'polygon(4px -4px, 6px -4px, 6px 0, 12px 6px, 6px 12px, 6px 16px, 4px 16px)';

const PopoverArrow = forwardRef<HTMLDivElement, PopoverArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <PopoverPrimitive.Arrow {...props} className={tx('popover.arrow', {}, classNames)} ref={forwardedRef}>
      <svg viewBox='0 0 12 12' aria-hidden='true' style={{ clipPath: ARROW_SHAPE }}>
        <path d='M4 -4H6V0L12 6L6 12V16H4Z' stroke='none' />
        <path d='M6 -4V0L12 6L6 12V16' fill='none' />
      </svg>
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
