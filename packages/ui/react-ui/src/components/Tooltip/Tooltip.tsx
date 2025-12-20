//
// Copyright 2025 DXOS.org
//

// This is based upon `@radix-ui/react-tooltip` fetched 17 March 2025 at https://github.com/radix-ui/primitives at commit 6e75e11.

import { composeEventHandlers } from '@radix-ui/primitive';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import type { Scope } from '@radix-ui/react-context';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { useId } from '@radix-ui/react-id';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { type PopperAnchorProps, createPopperScope } from '@radix-ui/react-popper';
import { Portal as PortalPrimitive } from '@radix-ui/react-portal';
import { Presence } from '@radix-ui/react-presence';
import { Primitive } from '@radix-ui/react-primitive';
import { Slottable } from '@radix-ui/react-slot';
import { type TooltipProps } from '@radix-ui/react-tooltip';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import React, {
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FC,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useElevationContext, useThemeContext } from '../../hooks';

type TooltipScopedProps<P = {}> = P & { __scopeTooltip?: Scope };
const [createTooltipContext, createTooltipScope] = createContextScope('Tooltip', [createPopperScope]);
const usePopperScope = createPopperScope();

/* -------------------------------------------------------------------------------------------------
 * Tooltip
 * ----------------------------------------------------------------------------------------------- */

const DEFAULT_DELAY_DURATION = 700;
const TOOLTIP_OPEN = 'tooltip.open';
const TOOLTIP_NAME = 'Tooltip';

type TooltipContextValue = {
  contentId: string;
  open: boolean;
  stateAttribute: 'closed' | 'delayed-open' | 'instant-open';
  trigger: TooltipTriggerElement | null;
  onTriggerChange(trigger: TooltipTriggerElement | null): void;
  onTriggerEnter(): void;
  onTriggerLeave(): void;
  onOpen(): void;
  onClose(): void;
  onPointerInTransitChange(inTransit: boolean): void;
  isPointerInTransitRef: MutableRefObject<boolean>;
  disableHoverableContent: boolean;
};

const [TooltipContextProvider, useTooltipContext] = createTooltipContext<TooltipContextValue>(TOOLTIP_NAME);

interface TooltipProviderProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * The duration from when the pointer enters the trigger until the tooltip gets opened. This will
   * override the prop with the same name passed to Provider.
   * @defaultValue 700
   */
  delayDuration?: number;
  /**
   * When `true`, trying to hover the content will result in the tooltip closing as the pointer leaves the trigger.
   * @defaultValue false
   */
  disableHoverableContent?: boolean;
  /**
   * How much time a user has to enter another trigger without incurring a delay again.
   * @defaultValue 300
   */
  skipDelayDuration?: number;
}

const TooltipProvider: FC<TooltipProviderProps> = (props: TooltipScopedProps<TooltipProviderProps>) => {
  const {
    __scopeTooltip,
    children,
    open: openParam,
    defaultOpen = false,
    onOpenChange,
    disableHoverableContent = false,
    delayDuration = DEFAULT_DELAY_DURATION,
    skipDelayDuration = 300,
  } = props;
  const isOpenDelayedRef = useRef(true);
  const isPointerInTransitRef = useRef(false);
  const skipDelayTimerRef = useRef(0);

  useEffect(() => {
    const skipDelayTimer = skipDelayTimerRef.current;
    return () => window.clearTimeout(skipDelayTimer);
  }, []);

  const popperScope = usePopperScope(__scopeTooltip);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const [content, setContent] = useState<string>('');
  const [side, setSide] = useState<TooltipSide | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement | null>(trigger);
  const handleTriggerChange = useCallback((nextTrigger: HTMLButtonElement | null) => {
    setTrigger(nextTrigger);
    triggerRef.current = nextTrigger;
    setContent(nextTrigger?.getAttribute('data-tooltip-content') ?? '');
    setSide((nextTrigger?.getAttribute('data-tooltip-side') as TooltipSide | null) ?? undefined);
  }, []);
  const contentId = useId();
  const openTimerRef = useRef(0);
  const wasOpenDelayedRef = useRef(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        window.clearTimeout(skipDelayTimerRef.current);
        isOpenDelayedRef.current = false;
        // as `onChange` is called within a lifecycle method we
        // avoid dispatching via `dispatchDiscreteCustomEvent`.
        document.dispatchEvent(new CustomEvent(TOOLTIP_OPEN));
      } else {
        window.clearTimeout(skipDelayTimerRef.current);
        skipDelayTimerRef.current = window.setTimeout(() => (isOpenDelayedRef.current = true), skipDelayDuration);
      }
      onOpenChange?.(open);
    },
    [skipDelayDuration, onOpenChange],
  );
  const [open = false, setOpen] = useControllableState({
    prop: openParam,
    defaultProp: defaultOpen,
    onChange: handleOpenChange,
  });
  const stateAttribute = useMemo(() => {
    return open ? (wasOpenDelayedRef.current ? 'delayed-open' : 'instant-open') : 'closed';
  }, [open]);

  const handleOpen = useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
    wasOpenDelayedRef.current = false;
    setOpen(true);
  }, [setOpen]);

  const handleClose = useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = 0;
    setOpen(false);
  }, [setOpen]);

  const handleDelayedOpen = useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    openTimerRef.current = window.setTimeout(() => {
      wasOpenDelayedRef.current = true;
      setOpen(true);
      openTimerRef.current = 0;
    }, delayDuration);
  }, [delayDuration, setOpen]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = 0;
      }
    };
  }, []);

  const { tx } = useThemeContext();
  const elevation = useElevationContext();

  return (
    <PopperPrimitive.Root {...popperScope}>
      <TooltipContextProvider
        scope={__scopeTooltip}
        contentId={contentId}
        open={open}
        stateAttribute={stateAttribute}
        trigger={trigger}
        onTriggerChange={handleTriggerChange}
        onTriggerEnter={useCallback(() => {
          if (isOpenDelayedRef.current) {
            handleDelayedOpen();
          } else {
            handleOpen();
          }
        }, [isOpenDelayedRef, handleDelayedOpen, handleOpen])}
        onTriggerLeave={useCallback(() => {
          if (disableHoverableContent) {
            handleClose();
          } else {
            // Clear the timer in case the pointer leaves the trigger before the tooltip is opened.
            window.clearTimeout(openTimerRef.current);
            openTimerRef.current = 0;
          }
        }, [handleClose, disableHoverableContent])}
        onOpen={handleOpen}
        onClose={handleClose}
        disableHoverableContent={disableHoverableContent}
        isPointerInTransitRef={isPointerInTransitRef}
        onPointerInTransitChange={useCallback((inTransit: boolean) => {
          isPointerInTransitRef.current = inTransit;
        }, [])}
      >
        <TooltipContent side={side} className={tx('tooltip.content', 'tooltip', { elevation })}>
          {content}
          <TooltipArrow className={tx('tooltip.arrow', 'tooltip__arrow')} />
        </TooltipContent>
        <TooltipVirtualTrigger virtualRef={triggerRef as RefObject<HTMLButtonElement>} />
        {children}
      </TooltipContextProvider>
    </PopperPrimitive.Root>
  );
};

TooltipProvider.displayName = TOOLTIP_NAME;

/* -------------------------------------------------------------------------------------------------
 * TooltipVirtualTrigger
 * ----------------------------------------------------------------------------------------------- */

const TooltipVirtualTrigger = ({
  virtualRef,
  __scopeTooltip,
}: TooltipScopedProps<Pick<PopperAnchorProps, 'virtualRef'>>) => {
  const popperScope = usePopperScope(__scopeTooltip);
  return <PopperPrimitive.Anchor asChild {...popperScope} virtualRef={virtualRef} />;
};

/* -------------------------------------------------------------------------------------------------
 * TooltipTrigger
 * ----------------------------------------------------------------------------------------------- */

const TRIGGER_NAME = 'TooltipTrigger';

type TooltipTriggerElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;
type TooltipTriggerProps = PrimitiveButtonProps &
  Pick<TooltipProps, 'delayDuration'> & {
    content?: string;
    side?: TooltipSide;
    onInteract?: (event: SyntheticEvent) => void;
  };

const TooltipTrigger = forwardRef<TooltipTriggerElement, TooltipTriggerProps>(
  (props: TooltipScopedProps<TooltipTriggerProps>, forwardedRef) => {
    const {
      __scopeTooltip,
      onInteract,
      // TODO(thure): Pass `delayDuration` into the context.
      delayDuration: _delayDuration,
      side,
      content,
      ...triggerProps
    } = props;
    const context = useTooltipContext(TRIGGER_NAME, __scopeTooltip);
    const ref = useRef<TooltipTriggerElement>(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const isPointerDownRef = useRef(false);
    const hasPointerMoveOpenedRef = useRef(false);
    const handlePointerUp = useCallback(() => (isPointerDownRef.current = false), []);

    useEffect(() => {
      return () => document.removeEventListener('pointerup', handlePointerUp);
    }, [handlePointerUp]);

    return (
      <Primitive.button
        // We purposefully avoid adding `type=button` here because tooltip triggers are also
        // commonly anchors and the anchor `type` attribute signifies MIME type.
        aria-describedby={context.open ? context.contentId : undefined}
        data-state={context.stateAttribute}
        data-tooltip-content={content}
        data-tooltip-side={side}
        {...triggerProps}
        ref={composedRefs}
        onPointerMove={composeEventHandlers(props.onPointerMove, (event) => {
          if (event.pointerType === 'touch') {
            return;
          }
          if (!hasPointerMoveOpenedRef.current && !context.isPointerInTransitRef.current) {
            onInteract?.(event);
            if (event.defaultPrevented) {
              return;
            }
            context.onTriggerChange(ref.current);
            context.onTriggerEnter();
            hasPointerMoveOpenedRef.current = true;
          }
        })}
        onPointerLeave={composeEventHandlers(props.onPointerLeave, () => {
          context.onTriggerLeave();
          hasPointerMoveOpenedRef.current = false;
        })}
        onPointerDown={composeEventHandlers(props.onPointerDown, () => {
          if (context.open) {
            context.onClose();
          }
          isPointerDownRef.current = true;
          document.addEventListener('pointerup', handlePointerUp, { once: true });
        })}
        onFocus={props.onFocus}
        onBlur={composeEventHandlers(props.onBlur, context.onClose)}
        onClick={composeEventHandlers(props.onClick, context.onClose)}
      />
    );
  },
);

TooltipTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * TooltipPortal
 * ----------------------------------------------------------------------------------------------- */

const PORTAL_NAME = 'TooltipPortal';

type PortalContextValue = { forceMount?: true };
const [PortalProvider, usePortalContext] = createTooltipContext<PortalContextValue>(PORTAL_NAME, {
  forceMount: undefined,
});

type PortalProps = ComponentPropsWithoutRef<typeof PortalPrimitive>;
interface TooltipPortalProps {
  children?: ReactNode;
  /**
   * Specify a container element to portal the content into.
   */
  container?: PortalProps['container'];
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true;
}

const TooltipPortal: FC<TooltipPortalProps> = (props: TooltipScopedProps<TooltipPortalProps>) => {
  const { __scopeTooltip, forceMount, children, container } = props;
  const context = useTooltipContext(PORTAL_NAME, __scopeTooltip);
  return (
    <PortalProvider scope={__scopeTooltip} forceMount={forceMount}>
      <Presence present={forceMount || context.open}>
        <PortalPrimitive asChild container={container}>
          {children}
        </PortalPrimitive>
      </Presence>
    </PortalProvider>
  );
};

TooltipPortal.displayName = PORTAL_NAME;

/* -------------------------------------------------------------------------------------------------
 * TooltipContent
 * ----------------------------------------------------------------------------------------------- */

const CONTENT_NAME = 'TooltipContent';

type TooltipContentElement = TooltipContentImplElement;
interface TooltipContentProps extends TooltipContentImplProps {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: true;
}

const TooltipContent = forwardRef<TooltipContentElement, TooltipContentProps>(
  (props: TooltipScopedProps<TooltipContentProps>, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME, props.__scopeTooltip);
    const { forceMount = portalContext.forceMount, side = 'top', ...contentProps } = props;
    const context = useTooltipContext(CONTENT_NAME, props.__scopeTooltip);

    return (
      <Presence present={forceMount || context.open}>
        {context.disableHoverableContent ? (
          <TooltipContentImpl side={side} {...contentProps} ref={forwardedRef} />
        ) : (
          <TooltipContentHoverable side={side} {...contentProps} ref={forwardedRef} />
        )}
      </Presence>
    );
  },
);

type Point = { x: number; y: number };
type Polygon = Point[];

type TooltipContentHoverableElement = TooltipContentImplElement;
interface TooltipContentHoverableProps extends TooltipContentImplProps {}

const TooltipContentHoverable = forwardRef<TooltipContentHoverableElement, TooltipContentHoverableProps>(
  (props: TooltipScopedProps<TooltipContentHoverableProps>, forwardedRef) => {
    const context = useTooltipContext(CONTENT_NAME, props.__scopeTooltip);
    const ref = useRef<TooltipContentHoverableElement>(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const [pointerGraceArea, setPointerGraceArea] = useState<Polygon | null>(null);

    const { trigger, onClose } = context;
    const content = ref.current;

    const { onPointerInTransitChange } = context;

    const handleRemoveGraceArea = useCallback(() => {
      setPointerGraceArea(null);
      onPointerInTransitChange(false);
    }, [onPointerInTransitChange]);

    const handleCreateGraceArea = useCallback(
      (event: PointerEvent, hoverTarget: HTMLElement) => {
        const currentTarget = event.currentTarget as HTMLElement;
        const exitPoint = { x: event.clientX, y: event.clientY };
        const exitSide = getExitSideFromRect(exitPoint, currentTarget.getBoundingClientRect());
        const paddedExitPoints = getPaddedExitPoints(exitPoint, exitSide);
        const hoverTargetPoints = getPointsFromRect(hoverTarget.getBoundingClientRect());
        const graceArea = getHull([...paddedExitPoints, ...hoverTargetPoints]);
        setPointerGraceArea(graceArea);
        onPointerInTransitChange(true);
      },
      [onPointerInTransitChange],
    );

    useEffect(() => {
      return () => handleRemoveGraceArea();
    }, [handleRemoveGraceArea]);

    useEffect(() => {
      if (trigger && content) {
        const handleTriggerLeave = (event: PointerEvent) => handleCreateGraceArea(event, content);
        const handleContentLeave = (event: PointerEvent) => handleCreateGraceArea(event, trigger);

        trigger.addEventListener('pointerleave', handleTriggerLeave);
        content.addEventListener('pointerleave', handleContentLeave);
        return () => {
          trigger.removeEventListener('pointerleave', handleTriggerLeave);
          content.removeEventListener('pointerleave', handleContentLeave);
        };
      }
    }, [trigger, content, handleCreateGraceArea, handleRemoveGraceArea]);

    useEffect(() => {
      if (pointerGraceArea) {
        const handleTrackPointerGrace = (event: PointerEvent) => {
          const target = event.target as HTMLElement;
          const pointerPosition = { x: event.clientX, y: event.clientY };
          const hasEnteredTarget = trigger?.contains(target) || content?.contains(target);
          const isPointerOutsideGraceArea = !isPointInPolygon(pointerPosition, pointerGraceArea);

          if (hasEnteredTarget) {
            handleRemoveGraceArea();
          } else if (isPointerOutsideGraceArea) {
            handleRemoveGraceArea();
            onClose();
          }
        };
        document.addEventListener('pointermove', handleTrackPointerGrace);
        return () => document.removeEventListener('pointermove', handleTrackPointerGrace);
      }
    }, [trigger, content, pointerGraceArea, onClose, handleRemoveGraceArea]);

    return <TooltipContentImpl {...props} ref={composedRefs} />;
  },
);

const [VisuallyHiddenContentContextProvider, useVisuallyHiddenContentContext] = createTooltipContext(TOOLTIP_NAME, {
  isInside: false,
});

type TooltipContentImplElement = ElementRef<typeof PopperPrimitive.Content>;
type DismissableLayerProps = ComponentPropsWithoutRef<typeof DismissableLayer>;
type PopperContentProps = ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface TooltipContentImplProps extends Omit<PopperContentProps, 'onPlaced'> {
  /**
   * A more descriptive label for accessibility purpose
   */
  'aria-label'?: string;

  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown'];
  /**
   * Event handler called when the a `pointerdown` event happens outside of the `Tooltip`.
   * Can be prevented.
   */
  onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside'];
}

const TooltipContentImpl = forwardRef<TooltipContentImplElement, TooltipContentImplProps>(
  (props: TooltipScopedProps<TooltipContentImplProps>, forwardedRef) => {
    const {
      __scopeTooltip,
      children,
      'aria-label': ariaLabel,
      onEscapeKeyDown,
      onPointerDownOutside,
      ...contentProps
    } = props;
    const context = useTooltipContext(CONTENT_NAME, __scopeTooltip);
    const popperScope = usePopperScope(__scopeTooltip);
    const { onClose } = context;

    // Close this tooltip if another one opens
    useEffect(() => {
      document.addEventListener(TOOLTIP_OPEN, onClose);
      return () => document.removeEventListener(TOOLTIP_OPEN, onClose);
    }, [onClose]);

    // Close the tooltip if the trigger is scrolled
    useEffect(() => {
      if (context.trigger) {
        const handleScroll = (event: Event) => {
          const target = event.target as HTMLElement;
          if (target?.contains(context.trigger)) {
            onClose();
          }
        };
        window.addEventListener('scroll', handleScroll, { capture: true });
        return () => window.removeEventListener('scroll', handleScroll, { capture: true });
      }
    }, [context.trigger, onClose]);

    return (
      <DismissableLayer
        asChild
        disableOutsidePointerEvents={false}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
        onFocusOutside={(event) => event.preventDefault()}
        onDismiss={onClose}
      >
        <PopperPrimitive.Content
          data-state={context.stateAttribute}
          {...popperScope}
          {...contentProps}
          ref={forwardedRef}
          style={{
            ...contentProps.style,
            // re-namespace exposed content custom properties
            ...{
              '--radix-tooltip-content-transform-origin': 'var(--radix-popper-transform-origin)',
              '--radix-tooltip-content-available-width': 'var(--radix-popper-available-width)',
              '--radix-tooltip-content-available-height': 'var(--radix-popper-available-height)',
              '--radix-tooltip-trigger-width': 'var(--radix-popper-anchor-width)',
              '--radix-tooltip-trigger-height': 'var(--radix-popper-anchor-height)',
            },
          }}
        >
          <Slottable>{children}</Slottable>
          <VisuallyHiddenContentContextProvider scope={__scopeTooltip} isInside={true}>
            <VisuallyHiddenPrimitive.Root id={context.contentId} role='tooltip'>
              {ariaLabel || children}
            </VisuallyHiddenPrimitive.Root>
          </VisuallyHiddenContentContextProvider>
        </PopperPrimitive.Content>
      </DismissableLayer>
    );
  },
);

TooltipContent.displayName = CONTENT_NAME;

/* -------------------------------------------------------------------------------------------------
 * TooltipArrow
 * ----------------------------------------------------------------------------------------------- */

const ARROW_NAME = 'TooltipArrow';

type TooltipArrowElement = ElementRef<typeof PopperPrimitive.Arrow>;
type PopperArrowProps = ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>;
interface TooltipArrowProps extends PopperArrowProps {}

const TooltipArrow = forwardRef<TooltipArrowElement, TooltipArrowProps>(
  (props: TooltipScopedProps<TooltipArrowProps>, forwardedRef) => {
    const { __scopeTooltip, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeTooltip);
    const visuallyHiddenContentContext = useVisuallyHiddenContentContext(ARROW_NAME, __scopeTooltip);
    // if the arrow is inside the `VisuallyHidden`, we don't want to render it all to
    // prevent issues in positioning the arrow due to the duplicate
    return visuallyHiddenContentContext.isInside ? null : (
      <PopperPrimitive.Arrow {...popperScope} {...arrowProps} ref={forwardedRef} />
    );
  },
);

TooltipArrow.displayName = ARROW_NAME;

/* ----------------------------------------------------------------------------------------------- */

type TooltipSide = NonNullable<TooltipContentProps['side']>;

const getExitSideFromRect = (point: Point, rect: DOMRect): TooltipSide => {
  const top = Math.abs(rect.top - point.y);
  const bottom = Math.abs(rect.bottom - point.y);
  const right = Math.abs(rect.right - point.x);
  const left = Math.abs(rect.left - point.x);

  switch (Math.min(top, bottom, right, left)) {
    case left:
      return 'left';
    case right:
      return 'right';
    case top:
      return 'top';
    case bottom:
      return 'bottom';
    default:
      throw new Error('unreachable');
  }
};

const getPaddedExitPoints = (exitPoint: Point, exitSide: TooltipSide, padding = 5) => {
  const paddedExitPoints: Point[] = [];
  switch (exitSide) {
    case 'top':
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding },
      );
      break;
    case 'bottom':
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
      );
      break;
    case 'left':
      paddedExitPoints.push(
        { x: exitPoint.x + padding, y: exitPoint.y - padding },
        { x: exitPoint.x + padding, y: exitPoint.y + padding },
      );
      break;
    case 'right':
      paddedExitPoints.push(
        { x: exitPoint.x - padding, y: exitPoint.y - padding },
        { x: exitPoint.x - padding, y: exitPoint.y + padding },
      );
      break;
  }
  return paddedExitPoints;
};

const getPointsFromRect = (rect: DOMRect) => {
  const { top, right, bottom, left } = rect;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
};

// Determine if a point is inside of a polygon.
// Based on https://github.com/substack/point-in-polygon
const isPointInPolygon = (point: Point, polygon: Polygon) => {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    // prettier-ignore
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
};

// Returns a new array of points representing the convex hull of the given set of points.
// https://www.nayuki.io/page/convex-hull-algorithm
const getHull = <P extends Point>(points: Readonly<Array<P>>): Array<P> => {
  const newPoints: Array<P> = points.slice();
  newPoints.sort((a: Point, b: Point) => {
    if (a.x < b.x) {
      return -1;
    } else if (a.x > b.x) {
      return +1;
    } else if (a.y < b.y) {
      return -1;
    } else if (a.y > b.y) {
      return +1;
    } else {
      return 0;
    }
  });
  return getHullPresorted(newPoints);
};

// Returns the convex hull, assuming that each points[i] <= points[i + 1]. Runs in O(n) time.
const getHullPresorted = <P extends Point>(points: Readonly<Array<P>>): Array<P> => {
  if (points.length <= 1) {
    return points.slice();
  }

  const upperHull: Array<P> = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    while (upperHull.length >= 2) {
      const q = upperHull[upperHull.length - 1];
      const r = upperHull[upperHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) {
        upperHull.pop();
      } else {
        break;
      }
    }
    upperHull.push(p);
  }
  upperHull.pop();

  const lowerHull: Array<P> = [];
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i];
    while (lowerHull.length >= 2) {
      const q = lowerHull[lowerHull.length - 1];
      const r = lowerHull[lowerHull.length - 2];
      if ((q.x - r.x) * (p.y - r.y) >= (q.y - r.y) * (p.x - r.x)) {
        lowerHull.pop();
      } else {
        break;
      }
    }
    lowerHull.push(p);
  }
  lowerHull.pop();

  if (
    upperHull.length === 1 &&
    lowerHull.length === 1 &&
    upperHull[0].x === lowerHull[0].x &&
    upperHull[0].y === lowerHull[0].y
  ) {
    return upperHull;
  } else {
    return upperHull.concat(lowerHull);
  }
};

export const Tooltip = {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
};

export { createTooltipScope, useTooltipContext };

export type { TooltipProviderProps, TooltipTriggerProps, TooltipScopedProps, TooltipSide };
