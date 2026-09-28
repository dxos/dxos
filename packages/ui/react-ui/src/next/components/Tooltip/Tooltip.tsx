//
// Copyright 2026 DXOS.org
//

import { Portal } from '@ark-ui/react/portal';
import { Tooltip as TooltipPrimitive, useTooltipContext } from '@ark-ui/react/tooltip';
import React, {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useComposedRefs } from '@dxos/react-hooks';
import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { type Size } from '../../sizes.ts';

/** Gap between trigger and popup, in px (positioning takes a number, not a CSS variable). */
const POPUP_GUTTER = 2;

/** Short enough to feel responsive, long enough that sweeping the pointer across a toolbar shows nothing. */
const OPEN_DELAY = 300;

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

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

type TooltipTriggerProps = TooltipPrimitive.TriggerProps & {
  /** Shorthand, as on the current `Tooltip.Trigger`: the trigger brings its own Root and a Content showing this. */
  content?: ReactNode;
  /** With `content`, the side the tooltip opens on; below by default. */
  side?: TooltipSide;
};

/**
 * Use `asChild` to describe a `Next.Button`. Opens on hover after the Root's delay and on keyboard
 * focus only; the delay runs here because zag skips it while any tooltip is marked open, so a click would flash one
 * (DESIGN.md follow-up 33). With `content` it needs no Root or Content around it.
 */
const TooltipTrigger = forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ content, side, ...props }, forwardedRef) =>
    content === undefined ? (
      <TooltipTriggerImpl {...props} ref={forwardedRef} />
    ) : (
      <TooltipRoot positioning={side ? { placement: side } : undefined}>
        <TooltipTriggerImpl {...props} ref={forwardedRef} />
        <TooltipContent>{content}</TooltipContent>
      </TooltipRoot>
    ),
);

TooltipTrigger.displayName = 'Next.Tooltip.Trigger';

const TooltipTriggerImpl = forwardRef<HTMLButtonElement, TooltipPrimitive.TriggerProps>(
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

//
// Content
//

type TooltipContentProps = ThemedClassName<TooltipPrimitive.ContentProps> & {
  /** Portalled content leaves the trigger's sized scope, so it takes its own size; `sm` reads as a caption. */
  size?: Size;
  /** Point at the trigger with an arrow in the popup's surface colour. */
  arrow?: boolean;
  /** Portals into this element instead of the body (e.g. a sized scope, AUDIT 2.2). */
  container?: RefObject<HTMLElement | null>;
};

/** Portalled text at `level='popup'`, capped at 20rem wide, with an arrow unless `arrow={false}`. */
const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ classNames, size = 'sm', arrow = true, container, children, ...props }, forwardedRef) => (
    <Portal container={container}>
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

//
// TextTooltip
//

type TextTooltipProps = ThemedClassName<Omit<ComponentPropsWithoutRef<'span'>, 'children'>> & {
  /** Rendered truncated to one line; the tooltip shows it in full, and only while it is cut off. */
  text: string;
  side?: TooltipSide;
};

/** One line of text that ellipsizes, with a tooltip of the full text on hover only when it is truncated. */
export const TextTooltip = forwardRef<HTMLSpanElement, TextTooltipProps>(
  ({ classNames, text, side, ...props }, forwardedRef) => {
    const [open, setOpen] = useState(false);
    const localRef = useRef<HTMLSpanElement>(null);
    const ref = useComposedRefs(forwardedRef, localRef);
    return (
      <TooltipRoot
        open={open}
        // Measured when the tooltip would open, so a resize that truncates the text needs no observer.
        onOpenChange={({ open }) => {
          const element = localRef.current;
          setOpen(open && !!element && element.scrollWidth > element.clientWidth);
        }}
        positioning={side ? { placement: side } : undefined}
      >
        <TooltipTriggerImpl asChild>
          <span
            {...props}
            data-scope='text-tooltip'
            data-part='root'
            className={mx(recipes.textTooltip(), classNames)}
            ref={ref}
          >
            {text}
          </span>
        </TooltipTriggerImpl>
        <TooltipContent>{text}</TooltipContent>
      </TooltipRoot>
    );
  },
);

TextTooltip.displayName = 'Next.TextTooltip';

export type { TextTooltipProps, TooltipContentProps, TooltipRootProps, TooltipTriggerProps };
