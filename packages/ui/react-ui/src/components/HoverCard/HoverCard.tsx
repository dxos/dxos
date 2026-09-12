//
// Copyright 2026 DXOS.org
//

// A card that opens on hover or focus of its trigger, for previewing what a small element stands
// for without a click. The Ark machine owns the open/close delays, hover intent, positioning and
// presence; this file is anatomy plus the DXOS placement vocabulary the popover speaks, and the
// popover's surface, so the two float alike.

import { HoverCard as HoverCardPrimitive, useHoverCard } from '@ark-ui/react/hover-card';
import { Portal } from '@ark-ui/react/portal';
import React, {
  type ComponentPropsWithRef,
  type FC,
  type ReactNode,
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { createContext, useControllableState } from '@dxos/react-hooks';
import { elevationAttrs, elevationSurface } from '@dxos/ui-theme';
import { type ElevationLevel } from '@dxos/ui-types';

import { useElevationContext, usePositioning, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { ColumnContext } from '../Column';
import { type PopoverPlacementOptions } from '../Popover';

const HOVER_CARD_NAME = 'HoverCard';

type HoverCardContextValue = {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  setPlacement: (options: PopoverPlacementOptions) => void;
};

const [HoverCardProvider, useHoverCardContext] = createContext<HoverCardContextValue>(HOVER_CARD_NAME);

//
// Root
//

type HoverCardRootProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Milliseconds the pointer rests on the trigger before the card opens. */
  openDelay?: number;
  /** Milliseconds after the pointer leaves the trigger and card before it closes. */
  closeDelay?: number;
};

const HoverCardRoot: FC<HoverCardRootProps> = ({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  openDelay = 300,
  closeDelay = 200,
}) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const triggerRef = useRef<HTMLElement | null>(null);
  const [placementOptions, setPlacement] = useState<PopoverPlacementOptions>({});
  const { positioning } = usePositioning({ open, triggerRef, placement: placementOptions, defaultSide: 'top' });

  const hoverCard = useHoverCard({
    open,
    onOpenChange: ({ open: next }) => setOpen(next),
    openDelay,
    closeDelay,
    positioning,
  });
  const reposition = hoverCard.reposition;
  useEffect(() => {
    if (open) {
      reposition(positioning);
    }
  }, [open, positioning, reposition]);

  const context = useMemo(() => ({ open, triggerRef, setPlacement }), [open]);

  return (
    // Closed content is not in the DOM at all: `lazyMount` for before the first open,
    // `unmountOnExit` for after.
    <HoverCardPrimitive.RootProvider value={hoverCard} lazyMount unmountOnExit>
      <HoverCardProvider {...context}>{children}</HoverCardProvider>
    </HoverCardPrimitive.RootProvider>
  );
};

HoverCardRoot.displayName = HOVER_CARD_NAME;

//
// Trigger
//

const TRIGGER_NAME = 'HoverCard.Trigger';

type HoverCardTriggerProps = ComponentPropsWithRef<typeof HoverCardPrimitive.Trigger>;

const HoverCardTrigger = forwardRef<HTMLButtonElement, HoverCardTriggerProps>((props, forwardedRef) => {
  const { triggerRef } = useHoverCardContext(TRIGGER_NAME);
  return (
    <HoverCardPrimitive.Trigger
      {...props}
      ref={(element) => {
        triggerRef.current = element;
        if (typeof forwardedRef === 'function') {
          forwardedRef(element);
        } else if (forwardedRef) {
          forwardedRef.current = element;
        }
      }}
    />
  );
});

HoverCardTrigger.displayName = TRIGGER_NAME;

//
// Portal
//

const PORTAL_NAME = 'HoverCard.Portal';

type HoverCardPortalProps = {
  children?: ReactNode;
  container?: HTMLElement | null;
};

const HoverCardPortal = ({ children, container }: HoverCardPortalProps) => {
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);
  return (
    <Portal container={containerRef}>
      {/* The portal leaves the declaring tree's DOM but not its React context, so content declared
          inside a Column would otherwise lay out for a gutter no ancestor provides. */}
      <ColumnContext.Provider value={false}>{children}</ColumnContext.Provider>
    </Portal>
  );
};

HoverCardPortal.displayName = PORTAL_NAME;

//
// Content
//

const CONTENT_NAME = 'HoverCard.Content';

type HoverCardContentProps = ThemedClassName<ComponentPropsWithRef<typeof HoverCardPrimitive.Content>> &
  PopoverPlacementOptions & {
    /** Material-style elevation, 0–5, onto the surface ladder; a card is `popup` (5) by default. */
    elevation?: ElevationLevel;
  };

const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  (
    {
      classNames,
      children,
      elevation: elevationProp,
      side,
      align,
      sideOffset,
      alignOffset,
      collisionPadding,
      collisionBoundary,
      avoidCollisions,
      hideWhenDetached,
      ...props
    },
    forwardedRef,
  ) => {
    const { setPlacement } = useHoverCardContext(CONTENT_NAME);
    const { tx } = useThemeContext();
    const elevation = useElevationContext();

    // Placement is state on the root, which re-positions when it changes.
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

    return (
      <HoverCardPrimitive.Positioner className={tx('hoverCard.positioner', { elevation })}>
        <HoverCardPrimitive.Content
          {...props}
          {...elevationAttrs(elevationProp)}
          className={tx('hoverCard.content', { elevation, surface: elevationSurface(elevationProp) }, classNames)}
          ref={forwardedRef}
        >
          {children}
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Positioner>
    );
  },
);

HoverCardContent.displayName = CONTENT_NAME;

//
// Arrow
//

const ARROW_NAME = 'HoverCard.Arrow';

type HoverCardArrowProps = ThemedClassName<ComponentPropsWithRef<typeof HoverCardPrimitive.Arrow>>;

const HoverCardArrow = forwardRef<HTMLDivElement, HoverCardArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <HoverCardPrimitive.Arrow {...props} className={tx('hoverCard.arrow', {}, classNames)} ref={forwardedRef}>
      <HoverCardPrimitive.ArrowTip />
    </HoverCardPrimitive.Arrow>
  );
});

HoverCardArrow.displayName = ARROW_NAME;

export const HoverCard = {
  Root: HoverCardRoot,
  Trigger: HoverCardTrigger,
  Portal: HoverCardPortal,
  Content: HoverCardContent,
  Arrow: HoverCardArrow,
};

export type {
  HoverCardArrowProps,
  HoverCardContentProps,
  HoverCardPortalProps,
  HoverCardRootProps,
  HoverCardTriggerProps,
};
