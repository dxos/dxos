//
// Copyright 2023 DXOS.org
//

// This is based upon `@radix-ui/react-popover` fetched 25 Oct 2024 at https://github.com/radix-ui/primitives at commit 374c7d7.

import { composeEventHandlers } from '@radix-ui/primitive';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import { type Scope } from '@radix-ui/react-context';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { useFocusGuards } from '@radix-ui/react-focus-guards';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { useId } from '@radix-ui/react-id';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { createPopperScope } from '@radix-ui/react-popper';
import { Portal as PortalPrimitive } from '@radix-ui/react-portal';
import { Presence } from '@radix-ui/react-presence';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { hideOthers } from 'aria-hidden';
import React, {
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type FC,
  type MutableRefObject,
  type ReactNode,
  type RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RemoveScroll } from 'react-remove-scroll';

import { useElevationContext, useThemeContext } from '../../hooks';
import { useSafeCollisionPadding } from '../../hooks/useSafeCollisionPadding';
import { type ThemedClassName } from '../../util';

/* -------------------------------------------------------------------------------------------------
 * Popover
 * ----------------------------------------------------------------------------------------------- */

const POPOVER_NAME = 'Popover';

type ScopedProps<P> = P & { __scopePopover?: Scope };
const [createPopoverContext, createPopoverScope] = createContextScope(POPOVER_NAME, [createPopperScope]);
const usePopperScope = createPopperScope();

type PopoverContextValue = {
  triggerRef: MutableRefObject<HTMLButtonElement>;
  contentId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  onOpenToggle(): void;
  hasCustomAnchor: boolean;
  onCustomAnchorAdd(): void;
  onCustomAnchorRemove(): void;
  modal: boolean;
};

const [PopoverProvider, usePopoverContext] = createPopoverContext<PopoverContextValue>(POPOVER_NAME);

interface PopoverRootProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}

const PopoverRoot: FC<PopoverRootProps> = (props: ScopedProps<PopoverRootProps>) => {
  const { __scopePopover, children, open: openProp, defaultOpen, onOpenChange, modal = false } = props;
  const popperScope = usePopperScope(__scopePopover);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [hasCustomAnchor, setHasCustomAnchor] = useState(false);
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <PopperPrimitive.Root {...popperScope}>
      <PopoverProvider
        scope={__scopePopover}
        contentId={useId()}
        triggerRef={triggerRef as MutableRefObject<HTMLButtonElement>}
        open={open}
        onOpenChange={setOpen}
        onOpenToggle={useCallback(() => setOpen((prevOpen) => !prevOpen), [setOpen])}
        hasCustomAnchor={hasCustomAnchor}
        onCustomAnchorAdd={useCallback(() => setHasCustomAnchor(true), [])}
        onCustomAnchorRemove={useCallback(() => setHasCustomAnchor(false), [])}
        modal={modal}
      >
        {children}
      </PopoverProvider>
    </PopperPrimitive.Root>
  );
};

PopoverRoot.displayName = POPOVER_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverAnchor
 * ----------------------------------------------------------------------------------------------- */

const ANCHOR_NAME = 'PopoverAnchor';

type PopoverAnchorElement = ElementRef<typeof PopperPrimitive.Anchor>;
type PopperAnchorProps = ComponentPropsWithoutRef<typeof PopperPrimitive.Anchor>;
interface PopoverAnchorProps extends PopperAnchorProps {}

const PopoverAnchor = forwardRef<PopoverAnchorElement, PopoverAnchorProps>(
  (props: ScopedProps<PopoverAnchorProps>, forwardedRef) => {
    const { __scopePopover, ...anchorProps } = props;
    const context = usePopoverContext(ANCHOR_NAME, __scopePopover);
    const popperScope = usePopperScope(__scopePopover);
    const { onCustomAnchorAdd, onCustomAnchorRemove } = context;

    useEffect(() => {
      onCustomAnchorAdd();
      return () => onCustomAnchorRemove();
    }, [onCustomAnchorAdd, onCustomAnchorRemove]);

    return <PopperPrimitive.Anchor {...popperScope} {...anchorProps} ref={forwardedRef} />;
  },
);

PopoverAnchor.displayName = ANCHOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverTrigger
 * ----------------------------------------------------------------------------------------------- */

const TRIGGER_NAME = 'PopoverTrigger';

type PopoverTriggerElement = ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = ComponentPropsWithoutRef<typeof Primitive.button>;
interface PopoverTriggerProps extends PrimitiveButtonProps {}

const PopoverTrigger = forwardRef<PopoverTriggerElement, PopoverTriggerProps>(
  (props: ScopedProps<PopoverTriggerProps>, forwardedRef) => {
    const { __scopePopover, ...triggerProps } = props;
    const context = usePopoverContext(TRIGGER_NAME, __scopePopover);
    const popperScope = usePopperScope(__scopePopover);
    const composedTriggerRef = useComposedRefs(forwardedRef, context.triggerRef);

    const trigger = (
      <Primitive.button
        type='button'
        aria-haspopup='dialog'
        aria-expanded={context.open}
        aria-controls={context.contentId}
        data-state={getState(context.open)}
        {...triggerProps}
        ref={composedTriggerRef}
        onClick={composeEventHandlers(props.onClick, context.onOpenToggle)}
      />
    );

    return context.hasCustomAnchor ? (
      trigger
    ) : (
      <PopperPrimitive.Anchor asChild {...popperScope}>
        {trigger}
      </PopperPrimitive.Anchor>
    );
  },
);

PopoverTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverVirtualTrigger
 * ----------------------------------------------------------------------------------------------- */

const VIRTUAL_TRIGGER_NAME = 'PopoverVirtualTrigger';

interface PopoverVirtualTriggerProps {
  virtualRef: RefObject<PopoverTriggerElement | null>;
}

const PopoverVirtualTrigger = (props: ScopedProps<PopoverVirtualTriggerProps>) => {
  const { __scopePopover, virtualRef } = props;
  const context = usePopoverContext(VIRTUAL_TRIGGER_NAME, __scopePopover);
  const popperScope = usePopperScope(__scopePopover);
  useEffect(() => {
    if (virtualRef.current) {
      context.triggerRef.current = virtualRef.current;
    }
  });
  return <PopperPrimitive.Anchor {...popperScope} virtualRef={virtualRef as RefObject<PopoverTriggerElement>} />;
};

PopoverVirtualTrigger.displayName = VIRTUAL_TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverPortal
 * ----------------------------------------------------------------------------------------------- */

const PORTAL_NAME = 'PopoverPortal';

type PortalContextValue = { forceMount?: true };
const [PortalProvider, usePortalContext] = createPopoverContext<PortalContextValue>(PORTAL_NAME, {
  forceMount: undefined,
});

type PortalProps = ComponentPropsWithoutRef<typeof PortalPrimitive>;
interface PopoverPortalProps {
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

const PopoverPortal: FC<PopoverPortalProps> = (props: ScopedProps<PopoverPortalProps>) => {
  const { __scopePopover, forceMount, children, container } = props;
  const context = usePopoverContext(PORTAL_NAME, __scopePopover);
  return (
    <PortalProvider scope={__scopePopover} forceMount={forceMount}>
      <Presence present={forceMount || context.open}>
        <PortalPrimitive asChild container={container}>
          {children}
        </PortalPrimitive>
      </Presence>
    </PortalProvider>
  );
};

PopoverPortal.displayName = PORTAL_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverContent
 * ----------------------------------------------------------------------------------------------- */

const CONTENT_NAME = 'PopoverContent';

type PopoverContentProps = ThemedClassName<PopoverContentTypeProps> & {
  /**
   * Used to force mounting when more control is needed. Useful when
   * controlling animation with React animation libraries.
   */
  forceMount?: boolean;
};

const PopoverContent = forwardRef<PopoverContentTypeElement, PopoverContentProps>(
  (props: ScopedProps<PopoverContentProps>, forwardedRef) => {
    const portalContext = usePortalContext(CONTENT_NAME, props.__scopePopover);
    const { forceMount = portalContext.forceMount, ...contentProps } = props;
    const context = usePopoverContext(CONTENT_NAME, props.__scopePopover);

    return (
      <Presence present={forceMount || context.open}>
        {context.modal ? (
          <PopoverContentModal {...contentProps} ref={forwardedRef} />
        ) : (
          <PopoverContentNonModal {...contentProps} ref={forwardedRef} />
        )}
      </Presence>
    );
  },
);

PopoverContent.displayName = CONTENT_NAME;

/* ----------------------------------------------------------------------------------------------- */

type PopoverContentTypeElement = PopoverContentImplElement;
export interface PopoverContentTypeProps
  extends Omit<PopoverContentImplProps, 'trapFocus' | 'disableOutsidePointerEvents'> {}

const PopoverContentModal = forwardRef<PopoverContentTypeElement, PopoverContentTypeProps>(
  (props: ScopedProps<PopoverContentTypeProps>, forwardedRef) => {
    const context = usePopoverContext(CONTENT_NAME, props.__scopePopover);
    const contentRef = useRef<HTMLDivElement>(null);
    const composedRefs = useComposedRefs(forwardedRef, contentRef);
    const isRightClickOutsideRef = useRef(false);

    // aria-hide everything except the content (better supported equivalent to setting aria-modal)
    useEffect(() => {
      const content = contentRef.current;
      if (content) {
        return hideOthers(content);
      }
    }, []);

    return (
      <RemoveScroll as={Slot} allowPinchZoom>
        <PopoverContentImpl
          {...props}
          ref={composedRefs}
          // we make sure we're not trapping once it's been closed
          // (closed !== unmounted when animating out)
          trapFocus={context.open}
          disableOutsidePointerEvents
          onCloseAutoFocus={composeEventHandlers(props.onCloseAutoFocus, (event) => {
            event.preventDefault();
            if (!isRightClickOutsideRef.current) {
              context.triggerRef.current?.focus();
            }
          })}
          onPointerDownOutside={composeEventHandlers(
            props.onPointerDownOutside,
            (event) => {
              const originalEvent = event.detail.originalEvent;
              const ctrlLeftClick = originalEvent.button === 0 && originalEvent.ctrlKey === true;
              const isRightClick = originalEvent.button === 2 || ctrlLeftClick;

              isRightClickOutsideRef.current = isRightClick;
            },
            { checkForDefaultPrevented: false },
          )}
          // When focus is trapped, a `focusout` event may still happen.
          // We make sure we don't trigger our `onDismiss` in such case.
          onFocusOutside={composeEventHandlers(props.onFocusOutside, (event) => event.preventDefault(), {
            checkForDefaultPrevented: false,
          })}
        />
      </RemoveScroll>
    );
  },
);

const PopoverContentNonModal = forwardRef<PopoverContentTypeElement, PopoverContentTypeProps>(
  (props: ScopedProps<PopoverContentTypeProps>, forwardedRef) => {
    const context = usePopoverContext(CONTENT_NAME, props.__scopePopover);
    const hasInteractedOutsideRef = useRef(false);
    const hasPointerDownOutsideRef = useRef(false);

    return (
      <PopoverContentImpl
        {...props}
        ref={forwardedRef}
        trapFocus={false}
        disableOutsidePointerEvents={false}
        onCloseAutoFocus={(event) => {
          props.onCloseAutoFocus?.(event);

          if (!event.defaultPrevented) {
            if (!hasInteractedOutsideRef.current) {
              context.triggerRef.current?.focus();
            }
            // Always prevent auto focus because we either focus manually or want user agent focus
            event.preventDefault();
          }

          hasInteractedOutsideRef.current = false;
          hasPointerDownOutsideRef.current = false;
        }}
        onInteractOutside={(event) => {
          props.onInteractOutside?.(event);

          if (!event.defaultPrevented) {
            hasInteractedOutsideRef.current = true;
            if (event.detail.originalEvent.type === 'pointerdown') {
              hasPointerDownOutsideRef.current = true;
            }
          }

          // Prevent dismissing when clicking the trigger.
          // As the trigger is already setup to close, without doing so would
          // cause it to close and immediately open.
          const target = event.target as HTMLElement;
          const targetIsTrigger = context.triggerRef.current?.contains(target);
          if (targetIsTrigger) {
            event.preventDefault();
          }

          // On Safari if the trigger is inside a container with tabIndex={0}, when clicked
          // we will get the pointer down outside event on the trigger, but then a subsequent
          // focus outside event on the container, we ignore any focus outside event when we've
          // already had a pointer down outside event.
          if (event.detail.originalEvent.type === 'focusin' && hasPointerDownOutsideRef.current) {
            event.preventDefault();
          }
        }}
      />
    );
  },
);

/* ----------------------------------------------------------------------------------------------- */

type PopoverContentImplElement = ElementRef<typeof PopperPrimitive.Content>;
type FocusScopeProps = ComponentPropsWithoutRef<typeof FocusScope>;
type DismissableLayerProps = ComponentPropsWithoutRef<typeof DismissableLayer>;
type PopperContentProps = ThemedClassName<ComponentPropsWithoutRef<typeof PopperPrimitive.Content>>;
interface PopoverContentImplProps
  extends Omit<PopperContentProps, 'onPlaced'>,
    Omit<DismissableLayerProps, 'onDismiss'> {
  /**
   * Whether focus should be trapped within the `Popover`
   * (default: false)
   */
  trapFocus?: FocusScopeProps['trapped'];

  /**
   * Event handler called when auto-focusing on open.
   * Can be prevented.
   */
  onOpenAutoFocus?: FocusScopeProps['onMountAutoFocus'];

  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  onCloseAutoFocus?: FocusScopeProps['onUnmountAutoFocus'];
}

const PopoverContentImpl = forwardRef<PopoverContentImplElement, PopoverContentImplProps>(
  (props: ScopedProps<PopoverContentImplProps>, forwardedRef) => {
    const {
      __scopePopover,
      trapFocus,
      onOpenAutoFocus,
      onCloseAutoFocus,
      disableOutsidePointerEvents,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      collisionPadding = 8,
      classNames,
      ...contentProps
    } = props;
    const context = usePopoverContext(CONTENT_NAME, __scopePopover);
    const popperScope = usePopperScope(__scopePopover);
    const { tx } = useThemeContext();
    const elevation = useElevationContext();
    const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);

    // Make sure the whole tree has focus guards as our `Popover` may be
    // the last element in the DOM (because of the `Portal`)
    useFocusGuards();

    return (
      <FocusScope
        asChild
        loop
        trapped={trapFocus}
        onMountAutoFocus={onOpenAutoFocus}
        onUnmountAutoFocus={onCloseAutoFocus}
      >
        <DismissableLayer
          asChild
          disableOutsidePointerEvents={disableOutsidePointerEvents}
          onInteractOutside={onInteractOutside}
          onEscapeKeyDown={onEscapeKeyDown}
          onPointerDownOutside={onPointerDownOutside}
          onFocusOutside={onFocusOutside}
          onDismiss={() => context.onOpenChange(false)}
        >
          <PopperPrimitive.Content
            data-state={getState(context.open)}
            role='dialog'
            id={context.contentId}
            {...popperScope}
            {...contentProps}
            collisionPadding={safeCollisionPadding}
            className={tx('popover.content', 'popover', { elevation }, classNames)}
            ref={forwardedRef}
            style={{
              ...contentProps.style,
              // re-namespace exposed content custom properties
              ...{
                '--radix-popover-content-transform-origin': 'var(--radix-popper-transform-origin)',
                '--radix-popover-content-available-width': 'var(--radix-popper-available-width)',
                '--radix-popover-content-available-height': 'var(--radix-popper-available-height)',
                '--radix-popover-trigger-width': 'var(--radix-popper-anchor-width)',
                '--radix-popover-trigger-height': 'var(--radix-popper-anchor-height)',
              },
            }}
          />
        </DismissableLayer>
      </FocusScope>
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * PopoverClose
 * ----------------------------------------------------------------------------------------------- */

const CLOSE_NAME = 'PopoverClose';

type PopoverCloseElement = ElementRef<typeof Primitive.button>;
interface PopoverCloseProps extends PrimitiveButtonProps {}

const PopoverClose = forwardRef<PopoverCloseElement, PopoverCloseProps>(
  (props: ScopedProps<PopoverCloseProps>, forwardedRef) => {
    const { __scopePopover, ...closeProps } = props;
    const context = usePopoverContext(CLOSE_NAME, __scopePopover);
    return (
      <Primitive.button
        type='button'
        {...closeProps}
        ref={forwardedRef}
        onClick={composeEventHandlers(props.onClick, () => context.onOpenChange(false))}
      />
    );
  },
);

PopoverClose.displayName = CLOSE_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverArrow
 * ----------------------------------------------------------------------------------------------- */

const ARROW_NAME = 'PopoverArrow';

type PopoverArrowElement = ElementRef<typeof PopperPrimitive.Arrow>;
type PopperArrowProps = ThemedClassName<ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>>;
interface PopoverArrowProps extends PopperArrowProps {}

const PopoverArrow = forwardRef<PopoverArrowElement, PopoverArrowProps>(
  (props: ScopedProps<PopoverArrowProps>, forwardedRef) => {
    const { __scopePopover, classNames, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopePopover);
    const { tx } = useThemeContext();
    return (
      <PopperPrimitive.Arrow
        {...popperScope}
        {...arrowProps}
        className={tx('popover.arrow', 'popover__arrow', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

PopoverArrow.displayName = ARROW_NAME;

/* -------------------------------------------------------------------------------------------------
 * PopoverViewport
 * ----------------------------------------------------------------------------------------------- */

type PopoverViewportProps = ThemedClassName<ComponentPropsWithRef<typeof Primitive.div>> & {
  asChild?: boolean;
  constrainInline?: boolean;
  constrainBlock?: boolean;
};

const PopoverViewport = forwardRef<HTMLDivElement, PopoverViewportProps>(
  ({ classNames, asChild, constrainInline = true, constrainBlock = true, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const Root = asChild ? Slot : Primitive.div;
    return (
      <Root
        {...props}
        className={tx('popover.viewport', 'popover__viewport', { constrainInline, constrainBlock }, classNames)}
        ref={forwardedRef}
      >
        {children}
      </Root>
    );
  },
);

/* ----------------------------------------------------------------------------------------------- */

const getState = (open: boolean) => (open ? 'open' : 'closed');

type PopoverContentInteractOutsideEvent = Parameters<NonNullable<PopoverContentProps['onInteractOutside']>>[0];

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

export { createPopoverScope };

export type {
  PopoverRootProps,
  PopoverAnchorProps,
  PopoverTriggerProps,
  PopoverVirtualTriggerProps,
  PopoverPortalProps,
  PopoverContentProps,
  PopoverCloseProps,
  PopoverArrowProps,
  PopoverViewportProps,
  PopoverContentInteractOutsideEvent,
};
