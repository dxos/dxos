//
// Copyright 2026 DXOS.org
//

import { Portal } from '@ark-ui/react/portal';
import { Tooltip as TooltipPrimitive } from '@ark-ui/react/tooltip';
import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

/** Short enough to feel responsive, long enough that sweeping the pointer across a toolbar shows nothing. */
const OPEN_DELAY = 300;

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
  <TooltipPrimitive.Root
    {...props}
    openDelay={openDelay}
    lazyMount={lazyMount}
    unmountOnExit={unmountOnExit}
    positioning={{ gutter: POPUP_GUTTER, ...positioning }}
  />
);

TooltipRoot.displayName = 'Next.Tooltip.Root';

//
// Trigger
//

type TooltipTriggerProps = TooltipPrimitive.TriggerProps;

/** Use `asChild` to describe a `Next.Button` or `Next.IconButton`. */
const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>((props, forwardedRef) => (
  <TooltipPrimitive.Trigger {...props} ref={forwardedRef} />
));

TooltipTrigger.displayName = 'Next.Tooltip.Trigger';

//
// Content
//

type TooltipContentProps = ThemedClassName<TooltipPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size; `sm` reads as a caption. */
  size?: Size;
};

/** Portalled text at `level='popup'`, capped at 20rem wide. */
const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ classNames, size = 'sm', children, ...props }, forwardedRef) => (
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
