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
import { Tooltip as TooltipPrimitive, useTooltip } from '@ark-ui/react/tooltip';
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

import { useControllableState } from '@dxos/react-hooks';

import { useElevationContext, useThemeContext } from '../../hooks';
import {
  DEFAULT_DELAY_DURATION,
  TOOLTIP_NAME,
  TooltipContextProvider,
  type TooltipEntry,
  type TooltipSide,
  type TooltipStateAttribute,
  useTooltipContext,
} from './TooltipContext';

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
  const register = useCallback((value: string, entry: TooltipEntry) => {
    registry.current.set(value, entry);
    if (activeValueRef.current === value) {
      setRegistryVersion((version) => version + 1);
    }
    return () => {
      registry.current.delete(value);
    };
  }, []);

  const contentId = useId();
  const tooltip = useTooltip({
    open,
    onOpenChange: ({ open: next }) => setOpen(next),
    openDelay: delayDuration,
    interactive: !disableHoverableContent,
    // A trigger's DOM id is its value, which is how the machine finds the active one to position at.
    ids: { content: contentId, trigger: (value) => value ?? '' },
  });
  const apiRef = useRef(tooltip);
  apiRef.current = tooltip;
  activeValueRef.current = tooltip.triggerValue;

  const active = tooltip.triggerValue ? registry.current.get(tooltip.triggerValue) : undefined;
  const placement = active?.side ?? 'top';
  useEffect(() => {
    if (open) {
      tooltip.reposition({ placement });
    }
    // The api identity changes every render; the placement is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placement]);

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
      onOpen: () => apiRef.current?.setOpen(true),
      onClose: () => apiRef.current?.setOpen(false),
    }),
    [contentId, register],
  );

  const { tx } = useThemeContext();
  const elevation = useElevationContext();

  return (
    <TooltipContextProvider {...context}>
      {children}
      <TooltipPrimitive.RootProvider value={tooltip} unmountOnExit>
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
  /** Called as the pointer arrives; `preventDefault()` keeps the tooltip closed for this hover. */
  onInteract?: (event: SyntheticEvent) => void;
  /** Accepted for compatibility; the provider owns the delay. */
  delayDuration?: number;
};

const TooltipTrigger = forwardRef<TooltipTriggerElement, TooltipTriggerProps>(
  (
    { onInteract, delayDuration: _delayDuration, side, content, id: idProp, asChild, ...triggerProps },
    forwardedRef,
  ) => {
    const { apiRef, register } = useTooltipContext(TRIGGER_NAME);
    const generatedId = useId();
    const value = idProp ?? generatedId;

    useLayoutEffect(() => register(value, { content, side }), [register, value, content, side]);

    // The machine's own trigger handlers, fetched at event time so nothing here subscribes to it.
    const machine = useCallback(() => apiRef.current?.getTriggerProps({ value }), [apiRef, value]);

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
          onInteract?.(event);
          if (event.defaultPrevented) {
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
