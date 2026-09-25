//
// Copyright 2022 DXOS.org
//

// One provider serves every trigger in the app: a single content node, positioned at whichever
// trigger is active, on Ark's tooltip machine — which supports many triggers on one machine
// (`triggerValue`, per-value trigger ids). The triggers are our own elements rather than Ark's
// `Tooltip.Trigger`: Ark's subscribes every trigger to the machine (all re-render on hover) and stamps
// the open tooltip's ARIA on all of them, where only the active trigger may carry it.

import { ark } from '@ark-ui/react/factory';
import { Portal } from '@ark-ui/react/portal';
import { Tooltip as TooltipPrimitive, type UseTooltipReturn, useTooltip } from '@ark-ui/react/tooltip';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  type FC,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type SyntheticEvent,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import { useControllableState } from '@dxos/react-hooks';

import { useElevationContext, useThemeContext } from '../../hooks/index.ts';
import {
  DEFAULT_DELAY_DURATION,
  TOOLTIP_NAME,
  TooltipContextProvider,
  type TooltipEntry,
  type TooltipSide,
  type TooltipStateAttribute,
  useTooltipContext,
} from './TooltipContext.ts';

//
// Provider
//

type TooltipProviderProps = {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The duration from when the pointer enters the trigger until the tooltip gets opened.
   * @defaultValue 700
   */
  delayDuration?: number;
  /**
   * When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger.
   * @defaultValue false
   */
  disableHoverableContent?: boolean;
  /**
   * How much time a user has to enter another trigger without incurring a delay again. The machine
   * keeps one global "instant" window of its own, so this only names the intent.
   * @defaultValue 300
   */
  skipDelayDuration?: number;
};

const TooltipProvider: FC<TooltipProviderProps> = ({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  disableHoverableContent = false,
  delayDuration = DEFAULT_DELAY_DURATION,
}) => {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  // What each trigger shows, by its value; a change to the active entry re-renders the content.
  const registry = useRef(new Map<string, TooltipEntry>());
  const [, setRegistryVersion] = useState(0);
  const activeValueRef = useRef<string | null>(null);
  const contentId = useId();
  // The machine copies `positioning` when it opens or switches trigger, so the side must be rendered before that event.
  const [placement, setPlacement] = useState<TooltipSide>('top');
  const placementRef = useRef(placement);
  const prepareTrigger = useCallback((value: string) => {
    const side = registry.current.get(value)?.side ?? 'top';
    if (placementRef.current !== side) {
      placementRef.current = side;
      flushSync(() => setPlacement(side));
    }
  }, []);

  const register = useCallback((value: string, entry: TooltipEntry) => {
    registry.current.set(value, entry);
    if (activeValueRef.current === value) {
      setRegistryVersion((version) => version + 1);
    }
    return () => {
      registry.current.delete(value);
    };
  }, []);

  // Open with nothing to point at — `defaultOpen`, or `open` set before any trigger was hovered — the
  // machine would show an empty tooltip off screen, and switching its trigger while open closes and
  // reopens it. So the machine is held closed until it has a trigger: the first registered one is
  // adopted below, after the triggers' layout effects have filled the registry. A hover sets the
  // machine's trigger before it asks to open, and the ref sees that synchronously, so the hover path
  // never passes through a closed render — which would close and reopen the tooltip it just showed.
  const triggerValueRef = useRef<string | null>(null);
  const [anchored, setAnchored] = useState(false);
  const tooltip = useTooltip({
    open: open && (anchored || triggerValueRef.current !== null),
    onTriggerValueChange: ({ value }) => {
      triggerValueRef.current = value;
    },
    onOpenChange: ({ open: next }) => setOpen(next),
    openDelay: delayDuration,
    interactive: !disableHoverableContent,
    positioning: { placement },
    // A trigger's DOM id is its value, which is how the machine finds the active one to position at.
    ids: { content: contentId, trigger: (value) => value ?? '' },
  });
  const apiRef = useRef<UseTooltipReturn | null>(tooltip);
  apiRef.current = tooltip;
  activeValueRef.current = tooltip.triggerValue;

  const triggerValue = tooltip.triggerValue;
  useEffect(() => {
    if (!open) {
      setAnchored(false);
      return;
    }
    if (anchored) {
      return;
    }
    if (triggerValue) {
      setAnchored(true);
      return;
    }
    const first = registry.current.keys().next().value;
    if (!first) {
      return;
    }
    // The side is rendered before the trigger is adopted, so the machine opens with the right
    // placement; a synchronous flush is not allowed from an effect, hence the second pass.
    const side = registry.current.get(first)?.side ?? 'top';
    if (placement !== side) {
      placementRef.current = side;
      setPlacement(side);
      return;
    }
    apiRef.current?.setTriggerValue(first);
    setAnchored(true);
  }, [open, anchored, triggerValue, placement]);

  const active = tooltip.triggerValue ? registry.current.get(tooltip.triggerValue) : undefined;

  // The open trigger's side can change without an event to forward, so reposition in place. Only
  // once there is an open trigger: before one is adopted below, this would keep resetting the side
  // that adoption has just rendered.
  const activeSide = active?.side ?? 'top';
  useEffect(() => {
    if (open && active && placementRef.current !== activeSide) {
      placementRef.current = activeSide;
      setPlacement(activeSide);
      apiRef.current?.reposition({ placement: activeSide });
    }
  }, [open, active, activeSide]);

  const stateAttribute: TooltipStateAttribute = open ? 'delayed-open' : 'closed';

  // Applied to the element rather than rendered by `Tooltip.Trigger`, which reads only the stable
  // context: these describe the one open tooltip, so only the active trigger may carry them.
  useEffect(() => {
    const trigger = tooltip.triggerValue ? document.getElementById(tooltip.triggerValue) : null;
    if (!trigger) {
      return;
    }

    // A trigger may already be described by something of its own, so merge rather than replace.
    const describedBy = trigger.getAttribute('aria-describedby');
    trigger.setAttribute('data-state', stateAttribute);
    if (open) {
      const ids = new Set(describedBy?.split(/\s+/).filter(Boolean));
      ids.add(contentId);
      trigger.setAttribute('aria-describedby', [...ids].join(' '));
    }

    return () => {
      trigger.setAttribute('data-state', 'closed');
      if (describedBy === null) {
        trigger.removeAttribute('aria-describedby');
      } else {
        trigger.setAttribute('aria-describedby', describedBy);
      }
    };
  }, [tooltip.triggerValue, open, stateAttribute, contentId]);

  const context = useMemo(
    () => ({
      apiRef,
      contentId,
      register,
      prepareTrigger,
      onOpen: () => apiRef.current?.setOpen(true),
      onClose: () => apiRef.current?.setOpen(false),
    }),
    [contentId, register, prepareTrigger],
  );

  const { tx } = useThemeContext();
  const elevation = useElevationContext();

  return (
    <TooltipContextProvider {...context}>
      {children}
      <TooltipPrimitive.RootProvider value={tooltip} lazyMount unmountOnExit>
        <Portal>
          <TooltipPrimitive.Positioner className={tx('tooltip.positioner', { elevation })}>
            <TooltipPrimitive.Content className={tx('tooltip.content', { elevation })}>
              {active?.content}
              <TooltipPrimitive.Arrow className={tx('tooltip.arrow')}>
                <TooltipPrimitive.ArrowTip />
              </TooltipPrimitive.Arrow>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Positioner>
        </Portal>
      </TooltipPrimitive.RootProvider>
    </TooltipContextProvider>
  );
};

TooltipProvider.displayName = TOOLTIP_NAME;

//
// Trigger
//

const TRIGGER_NAME = 'Tooltip.Trigger';

type TooltipTriggerElement = ComponentRef<typeof ark.button>;
type TooltipTriggerProps = Omit<ComponentPropsWithoutRef<typeof ark.button>, 'content'> & {
  content?: ReactNode;
  side?: TooltipSide;
  /**
   * Called as the pointer arrives; returning `false` keeps the tooltip closed for this hover.
   * A return value rather than `preventDefault()`: WebKit starts no native drag after a cancelled pointermove.
   */
  onInteract?: (event: SyntheticEvent) => boolean | void;
  /** Accepted for compatibility; the provider owns the delay. */
  delayDuration?: number;
};

const TooltipTrigger = forwardRef<TooltipTriggerElement, TooltipTriggerProps>(
  (
    { onInteract, delayDuration: _delayDuration, side, content, id: idProp, asChild, ...triggerProps },
    forwardedRef,
  ) => {
    const { apiRef, register, prepareTrigger } = useTooltipContext(TRIGGER_NAME);
    const generatedId = useId();
    const value = idProp ?? generatedId;

    useLayoutEffect(() => register(value, { content, side }), [register, value, content, side]);

    // The machine's own trigger handlers, fetched at event time so nothing here subscribes to it.
    // Any forwarded event may open or switch the tooltip, so the trigger is prepared before each one.
    const machine = useCallback(() => {
      prepareTrigger(value);
      return apiRef.current?.getTriggerProps({ value });
    }, [apiRef, value, prepareTrigger]);

    return (
      <ark.button
        // We purposefully avoid adding `type=button` here because tooltip triggers are also
        // commonly anchors and the anchor `type` attribute signifies MIME type.
        // NOTE: The provider sets `data-state` and `aria-describedby` on whichever trigger is active, since
        //   rendering them from state here would describe every trigger with the one open tooltip. The
        //   constant below never registers as changed, so React cannot overwrite what the provider set.
        data-state='closed'
        {...triggerProps}
        id={value}
        asChild={asChild}
        ref={forwardedRef}
        onPointerMove={(event: PointerEvent<HTMLButtonElement>) => {
          triggerProps.onPointerMove?.(event);
          if (event.defaultPrevented) {
            return;
          }
          if (onInteract?.(event) === false) {
            return;
          }
          machine()?.onPointerMove?.(event);
        }}
        onPointerLeave={(event: PointerEvent<HTMLButtonElement>) => {
          triggerProps.onPointerLeave?.(event);
          machine()?.onPointerLeave?.(event);
        }}
        onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
          triggerProps.onPointerDown?.(event);
          machine()?.onPointerDown?.(event);
        }}
        onBlur={(event: FocusEvent<HTMLButtonElement>) => {
          triggerProps.onBlur?.(event);
          machine()?.onBlur?.(event);
        }}
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          triggerProps.onClick?.(event);
          machine()?.onClick?.(event);
        }}
      />
    );
  },
);

TooltipTrigger.displayName = TRIGGER_NAME;

//
// Tooltip
//

export const Tooltip = {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
};

export type { TooltipProviderProps, TooltipSide, TooltipTriggerElement, TooltipTriggerProps };
