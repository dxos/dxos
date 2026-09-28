//
// Copyright 2026 DXOS.org
//

import { Portal } from '@ark-ui/react/portal';
import { Tooltip as TooltipPrimitive, useTooltipContext } from '@ark-ui/react/tooltip';
import React, { createContext, forwardRef, useContext, useEffect, useRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

/** Short enough to feel responsive, long enough that sweeping the pointer across a toolbar shows nothing. */
const OPEN_DELAY = 300;

/** The Root's `openDelay`, read by the Trigger, which runs the hover delay itself (DESIGN.md follow-up 33). */
const OpenDelayContext = createContext(OPEN_DELAY);

//
// Root
//

type TooltipRootProps = TooltipPrimitive.RootProps;

/** Ark tooltip; content mounts on open and unmounts on close unless the caller opts out. */
const TooltipRoot = ({
  openDelay = OPEN_DELAY,
  lazyMount = true,
  unmountOnExit = true,
  positioning,
  ...props
}: TooltipRootProps) => (
  <OpenDelayContext.Provider value={openDelay}>
    <TooltipPrimitive.Root
      {...props}
      openDelay={openDelay}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      positioning={{ gutter: POPUP_GUTTER, ...positioning }}
    />
  </OpenDelayContext.Provider>
);

TooltipRoot.displayName = 'Next.Tooltip.Root';

//
// Trigger
//

type TooltipTriggerProps = TooltipPrimitive.TriggerProps;

/**
 * Use `asChild` to describe a `Next.Button` or `Next.IconButton`. Opens on hover after the Root's delay and on keyboard
 * focus only; the delay runs here because zag skips it while any tooltip is marked open, so a click would flash one
 * (DESIGN.md follow-up 33).
 */
const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  (
    { onBlur, onFocus, onPointerMove, onPointerOver, onPointerEnter, onPointerLeave, onPointerDown, ...props },
    forwardedRef,
  ) => {
    const tooltip = useTooltipContext();
    const openDelay = useContext(OpenDelayContext);
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const pressed = useRef(false);
    const cancel = () => clearTimeout(timer.current);
    useEffect(
      () => () => {
        cancel();
        clearTimeout(closeTimer.current);
      },
      [],
    );

    return (
      <TooltipPrimitive.Trigger
        {...props}
        onPointerMove={(event) => {
          onPointerMove?.(event);
          event.preventDefault();
        }}
        onPointerOver={(event) => {
          onPointerOver?.(event);
          event.preventDefault();
        }}
        onPointerEnter={(event) => {
          onPointerEnter?.(event);
          if (event.defaultPrevented || event.pointerType === 'touch' || pressed.current) {
            return;
          }
          cancel();
          timer.current = setTimeout(() => {
            if (!pressed.current) {
              tooltip.setOpen(true);
            }
          }, openDelay);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          pressed.current = false;
          cancel();
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event);
          pressed.current = true;
          cancel();
          tooltip.setOpen(false);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (pressed.current || !event.currentTarget.matches(':focus-visible')) {
            event.preventDefault();
          }
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (event.defaultPrevented) {
            return;
          }
          // Deferred so a tooltip opened by the same focus move claims zag's shared store first (DESIGN.md follow-up 20).
          event.preventDefault();
          // A pending hover would otherwise reopen the tooltip on a trigger that no longer has focus.
          cancel();
          closeTimer.current = setTimeout(() => tooltip.setOpen(false));
        }}
        ref={forwardedRef}
      />
    );
  },
);

TooltipTrigger.displayName = 'Next.Tooltip.Trigger';

//
// Content
//

type TooltipContentProps = ThemedClassName<TooltipPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size; `sm` reads as a caption. */
  size?: Size;
  /** Point at the trigger with an arrow in the popup's surface colour. */
  arrow?: boolean;
};

/** Portalled text at `level='popup'`, capped at 20rem wide, with an arrow unless `arrow={false}`. */
const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ classNames, size = 'sm', arrow = true, children, ...props }, forwardedRef) => (
    <Portal>
      <TooltipPrimitive.Positioner>
        <TooltipPrimitive.Content
          {...props}
          data-surface='popup'
          data-size={size}
          className={mx(recipes.popup(), recipes.tooltipContent(), classNames)}
          ref={forwardedRef}
        >
          {children}
          {arrow && (
            <TooltipPrimitive.Arrow className={recipes.arrow()}>
              <TooltipPrimitive.ArrowTip className={recipes.arrowTip()} />
            </TooltipPrimitive.Arrow>
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Positioner>
    </Portal>
  ),
);

TooltipContent.displayName = 'Next.Tooltip.Content';

export const Tooltip = {
  Root: TooltipRoot,
  Trigger: TooltipTrigger,
  Content: TooltipContent,
};

export type { TooltipContentProps, TooltipRootProps, TooltipTriggerProps };
