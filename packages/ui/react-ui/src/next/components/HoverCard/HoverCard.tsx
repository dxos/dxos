//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { HoverCard as HoverCardPrimitive, useHoverCardContext } from '@ark-ui/react/hover-card';
import { Portal } from '@ark-ui/react/portal';
import React, { type RefObject, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';
import { popupPositioning, usePopupSize } from '../ScrollArea/PopupScroll.tsx';

/** Gap between trigger and card, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

/** Long enough that sweeping the pointer past a trigger opens nothing. */
const OPEN_DELAY = 300;

/** Long enough to cross the gutter from the trigger onto the card. */
const CLOSE_DELAY = 200;

//
// Root
//

type HoverCardRootProps = HoverCardPrimitive.RootProps;

/**
 * Ark hover card: a preview that opens on hover or keyboard focus of its trigger and stays open while the pointer is
 * on the card. Content mounts on open and unmounts on close unless the caller opts out; it opens above the trigger,
 * as the current HoverCard does, unless `positioning.placement` says otherwise.
 */
const HoverCardRoot = ({
  openDelay = OPEN_DELAY,
  closeDelay = CLOSE_DELAY,
  lazyMount = true,
  unmountOnExit = true,
  positioning,
  ...props
}: HoverCardRootProps) => (
  <HoverCardPrimitive.Root
    {...props}
    openDelay={openDelay}
    closeDelay={closeDelay}
    lazyMount={lazyMount}
    unmountOnExit={unmountOnExit}
    positioning={popupPositioning(POPUP_GUTTER, { placement: 'top', ...positioning })}
  />
);

HoverCardRoot.displayName = 'HoverCard.Root';

//
// Trigger
//

type HoverCardTriggerProps = HoverCardPrimitive.TriggerProps;

/** Use `asChild` to preview from any element (a link, an SVG node). */
const HoverCardTrigger = forwardRef<HTMLButtonElement, HoverCardTriggerProps>((props, forwardedRef) => (
  <HoverCardPrimitive.Trigger {...props} ref={forwardedRef} />
));

HoverCardTrigger.displayName = 'HoverCard.Trigger';

//
// Content
//

type HoverCardContentProps = ThemedClassName<HoverCardPrimitive.ContentProps> & {
  /** Overrides the size inherited from the trigger's nearest sized ancestor (Phase 4 decision 2); `md` without one. */
  size?: Size;
  /** Point at the trigger with an arrow in the card's surface colour. */
  arrow?: boolean;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/** Portalled card at `level='popup'`, padded by the size's gap, with an arrow unless `arrow={false}`. */
const HoverCardContent = forwardRef<HTMLDivElement, HoverCardContentProps>(
  ({ classNames, size, arrow = true, container, children, ...props }, forwardedRef) => {
    const hoverCard = useHoverCardContext();
    const popupSize = usePopupSize(size, hoverCard.open, [hoverCard.getTriggerProps().id], 'md');
    return (
      <Portal container={container}>
        <HoverCardPrimitive.Positioner>
          <HoverCardPrimitive.Content
            {...props}
            data-surface='popup'
            data-size={popupSize}
            className={mx(recipes.popup(), recipes.hoverCardContent(), classNames)}
            ref={forwardedRef}
          >
            {children}
            {arrow && (
              <HoverCardPrimitive.Arrow className={recipes.arrow()}>
                <HoverCardPrimitive.ArrowTip className={recipes.arrowTip()} />
              </HoverCardPrimitive.Arrow>
            )}
          </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Positioner>
      </Portal>
    );
  },
);

HoverCardContent.displayName = 'HoverCard.Content';
export type {
  HoverCardContentProps as ContentProps,
  HoverCardRootProps as RootProps,
  HoverCardTriggerProps as TriggerProps,
};

export { HoverCardContent as Content, HoverCardRoot as Root, HoverCardTrigger as Trigger };
