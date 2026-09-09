//
// Copyright 2026 DXOS.org
//

// `Drawer` — a panel that slides in from an edge of the viewport, built on Ark's drawer machine,
// which owns the swipe gesture (drag to dismiss, snap points, velocity), dismissal and the dialog
// ARIA. DXOS owns the layout parts — `Overlay` as the scrim the content nests in, the positioner
// folded into `Content` — and names the edge as a `side` rather than a swipe direction.

import {
  Drawer as DrawerPrimitive,
  type DrawerSnapPointChangeDetails,
  type UseDrawerProps,
  useDrawer,
} from '@ark-ui/react/drawer';
import { Portal } from '@ark-ui/react/portal';
import React, { type ComponentPropsWithRef, type ReactNode, forwardRef, useMemo } from 'react';

import { useControllableState } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { ElevationProvider } from '../../providers';
import { type ThemedClassName } from '../../util';

type DrawerSide = 'start' | 'end' | 'top' | 'bottom';

type DrawerSnapPoint = NonNullable<DrawerSnapPointChangeDetails['snapPoint']>;

/** The machine speaks in the direction a swipe dismisses; a drawer on the start edge leaves toward it. */
const swipeDirections: Record<DrawerSide, NonNullable<UseDrawerProps['swipeDirection']>> = {
  start: 'start',
  end: 'end',
  top: 'up',
  bottom: 'down',
};

//
// Root
//

type DrawerRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The edge the drawer slides in from. */
  side?: DrawerSide;
  /** A modal drawer traps focus, locks scroll and hides the page from assistive technology. */
  modal?: boolean;
  /**
   * Where the drawer rests: fractions of the viewport, or lengths (`px`/`rem`), each capped by the
   * content's own extent — a short panel is fully open at every point. The last is fully open.
   */
  snapPoints?: DrawerSnapPoint[];
  snapPoint?: DrawerSnapPoint | null;
  defaultSnapPoint?: DrawerSnapPoint;
  onSnapPointChange?: (snapPoint: DrawerSnapPoint | null) => void;
  closeOnInteractOutside?: boolean;
  closeOnEscape?: boolean;
};

const DrawerRoot = ({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  side = 'bottom',
  modal = true,
  snapPoints,
  snapPoint,
  defaultSnapPoint,
  onSnapPointChange,
  closeOnInteractOutside = true,
  closeOnEscape = true,
}: DrawerRootProps) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const drawer = useDrawer({
    open,
    onOpenChange: ({ open: next }) => setOpen(next),
    swipeDirection: swipeDirections[side],
    modal,
    trapFocus: modal,
    preventScroll: modal,
    closeOnInteractOutside,
    closeOnEscape,
    onSnapPointChange: ({ snapPoint: next }) => onSnapPointChange?.(next),
    // The machine's defaults are spread under the props, so a key present as `undefined` erases one.
    ...(snapPoints && { snapPoints }),
    ...(snapPoint !== undefined && { snapPoint }),
    ...(defaultSnapPoint !== undefined && { defaultSnapPoint }),
  });

  return (
    <ElevationProvider elevation='dialog'>
      {/* Closed content is not in the DOM at all. */}
      <DrawerPrimitive.RootProvider value={drawer} lazyMount unmountOnExit>
        {children}
      </DrawerPrimitive.RootProvider>
    </ElevationProvider>
  );
};

DrawerRoot.displayName = 'Drawer.Root';

//
// Trigger
//

type DrawerTriggerProps = ComponentPropsWithRef<typeof DrawerPrimitive.Trigger>;

const DrawerTrigger = DrawerPrimitive.Trigger;

//
// Portal
//

type DrawerPortalProps = {
  children?: ReactNode;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
};

const DrawerPortal = ({ children, container }: DrawerPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return <Portal container={containerRef}>{children}</Portal>;
};

DrawerPortal.displayName = 'Drawer.Portal';

//
// Overlay
//

type DrawerOverlayProps = ThemedClassName<ComponentPropsWithRef<typeof DrawerPrimitive.Backdrop>>;

/**
 * The scrim. Consumers nest `Content` inside it, as with `Dialog`; a non-modal drawer renders
 * `Content` alone.
 */
const DrawerOverlay = forwardRef<HTMLDivElement, DrawerOverlayProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <DrawerPrimitive.Backdrop {...props} className={tx('drawer.overlay', {}, classNames)} ref={forwardedRef} />;
});

DrawerOverlay.displayName = 'Drawer.Overlay';

//
// Content
//

type DrawerContentProps = ThemedClassName<ComponentPropsWithRef<typeof DrawerPrimitive.Content>>;

/**
 * The panel, inside the machine's positioner: a fixed layer that pins the panel to the drawer's
 * edge, which the panel carries as `data-swipe-direction` for the theme.
 */
const DrawerContent = forwardRef<HTMLDivElement, DrawerContentProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <DrawerPrimitive.Positioner className={tx('drawer.positioner', {})}>
      <DrawerPrimitive.Content {...props} className={tx('drawer.content', {}, classNames)} ref={forwardedRef} />
    </DrawerPrimitive.Positioner>
  );
});

DrawerContent.displayName = 'Drawer.Content';

//
// Grabber
//

type DrawerGrabberProps = ThemedClassName<Omit<ComponentPropsWithRef<typeof DrawerPrimitive.Grabber>, 'children'>>;

/** The handle a sheet is dragged by; the indicator is the bar the reader sees. */
const DrawerGrabber = forwardRef<HTMLDivElement, DrawerGrabberProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <DrawerPrimitive.Grabber {...props} className={tx('drawer.grabber', {}, classNames)} ref={forwardedRef}>
      <DrawerPrimitive.GrabberIndicator className={tx('drawer.grabberIndicator', {})} />
    </DrawerPrimitive.Grabber>
  );
});

DrawerGrabber.displayName = 'Drawer.Grabber';

//
// Title
//

type DrawerTitleProps = ThemedClassName<ComponentPropsWithRef<typeof DrawerPrimitive.Title>> & { srOnly?: boolean };

const DrawerTitle = forwardRef<HTMLHeadingElement, DrawerTitleProps>(
  ({ classNames, srOnly, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <DrawerPrimitive.Title {...props} className={tx('drawer.title', { srOnly }, classNames)} ref={forwardedRef} />
    );
  },
);

DrawerTitle.displayName = 'Drawer.Title';

//
// Description
//

type DrawerDescriptionProps = ThemedClassName<ComponentPropsWithRef<typeof DrawerPrimitive.Description>> & {
  srOnly?: boolean;
};

const DrawerDescription = forwardRef<HTMLParagraphElement, DrawerDescriptionProps>(
  ({ classNames, srOnly, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      // A paragraph; Ark's default is a div.
      <DrawerPrimitive.Description asChild {...props}>
        <p className={tx('drawer.description', { srOnly }, classNames)} ref={forwardedRef}>
          {children}
        </p>
      </DrawerPrimitive.Description>
    );
  },
);

DrawerDescription.displayName = 'Drawer.Description';

//
// Close
//

type DrawerCloseProps = ComponentPropsWithRef<typeof DrawerPrimitive.CloseTrigger>;

const DrawerClose = DrawerPrimitive.CloseTrigger;

//
// SwipeArea
//

type DrawerSwipeAreaProps = ThemedClassName<ComponentPropsWithRef<typeof DrawerPrimitive.SwipeArea>>;

/** A strip along the drawer's edge that a swipe inward from opens it; rendered while closed. */
const DrawerSwipeArea = forwardRef<HTMLDivElement, DrawerSwipeAreaProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <DrawerPrimitive.SwipeArea {...props} className={tx('drawer.swipeArea', {}, classNames)} ref={forwardedRef} />;
});

DrawerSwipeArea.displayName = 'Drawer.SwipeArea';

//
// Drawer
//

export const Drawer = {
  Root: DrawerRoot,
  Trigger: DrawerTrigger,
  Portal: DrawerPortal,
  Overlay: DrawerOverlay,
  Content: DrawerContent,
  Grabber: DrawerGrabber,
  Title: DrawerTitle,
  Description: DrawerDescription,
  Close: DrawerClose,
  SwipeArea: DrawerSwipeArea,
};

export type {
  DrawerCloseProps,
  DrawerContentProps,
  DrawerDescriptionProps,
  DrawerGrabberProps,
  DrawerOverlayProps,
  DrawerPortalProps,
  DrawerRootProps,
  DrawerSide,
  DrawerSnapPoint,
  DrawerSwipeAreaProps,
  DrawerTitleProps,
  DrawerTriggerProps,
};
