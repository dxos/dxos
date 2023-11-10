//
// Copyright 2023 DXOS.org
// Based upon Radix UI:
// radix-ui/primitives/main/packages/react/select/src/Select.tsx
// as retrieved on 9 Nov 2023.
//

import { clamp } from '@radix-ui/number';
import { composeEventHandlers } from '@radix-ui/primitive';
import { createCollection } from '@radix-ui/react-collection';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContextScope } from '@radix-ui/react-context';
import type { Scope } from '@radix-ui/react-context';
import { useDirection } from '@radix-ui/react-direction';
import { DismissableLayer } from '@radix-ui/react-dismissable-layer';
import { useFocusGuards } from '@radix-ui/react-focus-guards';
import { FocusScope } from '@radix-ui/react-focus-scope';
import { useId } from '@radix-ui/react-id';
import * as PopperPrimitive from '@radix-ui/react-popper';
import { createPopperScope } from '@radix-ui/react-popper';
import { Portal as PortalPrimitive } from '@radix-ui/react-portal';
import { Primitive } from '@radix-ui/react-primitive';
import type * as Radix from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { useCallbackRef } from '@radix-ui/react-use-callback-ref';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { useLayoutEffect } from '@radix-ui/react-use-layout-effect';
import { usePrevious } from '@radix-ui/react-use-previous';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { hideOthers } from 'aria-hidden';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';

type Direction = 'ltr' | 'rtl';

const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown'];
const COMBOBOXION_KEYS = [' ', 'Enter'];

/* -------------------------------------------------------------------------------------------------
 * Combobox
 * ----------------------------------------------------------------------------------------------- */

const COMBOBOX_NAME = 'Combobox';

type ItemData = { value: string; disabled: boolean; textValue: string };
const [Collection, useCollection, createCollectionScope] = createCollection<ComboboxItemElement, ItemData>(
  COMBOBOX_NAME,
);

type ScopedProps<P> = P & { __scopeCombobox?: Scope };
const [createComboboxContext, createComboboxScope] = createContextScope(COMBOBOX_NAME, [
  createCollectionScope,
  createPopperScope,
]);
const usePopperScope = createPopperScope();

type ComboboxContextValue = {
  trigger: ComboboxTriggerElement | null;
  onTriggerChange(node: ComboboxTriggerElement | null): void;
  valueNode: ComboboxValueElement | null;
  onValueNodeChange(node: ComboboxValueElement): void;
  valueNodeHasChildren: boolean;
  onValueNodeHasChildrenChange(hasChildren: boolean): void;
  contentId: string;
  value?: string;
  onValueChange(value: string): void;
  open: boolean;
  required?: boolean;
  onOpenChange(open: boolean): void;
  dir: ComboboxProps['dir'];
  triggerPointerDownPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  disabled?: boolean;
};

const [ComboboxProvider, useComboboxContext] = createComboboxContext<ComboboxContextValue>(COMBOBOX_NAME);

type NativeOption = React.ReactElement<React.ComponentProps<'option'>>;

type ComboboxNativeOptionsContextValue = {
  onNativeOptionAdd(option: NativeOption): void;
  onNativeOptionRemove(option: NativeOption): void;
};
const [ComboboxNativeOptionsProvider, useComboboxNativeOptionsContext] =
  createComboboxContext<ComboboxNativeOptionsContextValue>(COMBOBOX_NAME);

interface ComboboxProps {
  children?: React.ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  dir?: Direction;
  name?: string;
  autoComplete?: string;
  disabled?: boolean;
  required?: boolean;
}

const Combobox: React.FC<ComboboxProps> = (props: ScopedProps<ComboboxProps>) => {
  const {
    __scopeCombobox,
    children,
    open: openProp,
    defaultOpen,
    onOpenChange,
    value: valueProp,
    defaultValue,
    onValueChange,
    dir,
    name,
    autoComplete,
    disabled,
    required,
  } = props;
  const popperScope = usePopperScope(__scopeCombobox);
  const [trigger, setTrigger] = React.useState<ComboboxTriggerElement | null>(null);
  const [valueNode, setValueNode] = React.useState<ComboboxValueElement | null>(null);
  const [valueNodeHasChildren, setValueNodeHasChildren] = React.useState(false);
  const direction = useDirection(dir);
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });
  const triggerPointerDownPosRef = React.useRef<{ x: number; y: number } | null>(null);

  // We set this to true by default so that events bubble to forms without JS (SSR)
  const isFormControl = trigger ? Boolean(trigger.closest('form')) : true;
  const [nativeOptionsSet, setNativeOptionsSet] = React.useState(new Set<NativeOption>());

  // The native `combobox` only associates the correct default value if the corresponding
  // `option` is rendered as a child **at the same time** as itself.
  // Because it might take a few renders for our items to gather the information to build
  // the native `option`(s), we generate a key on the `combobox` to make sure React re-builds it
  // each time the options change.
  const nativeComboboxKey = Array.from(nativeOptionsSet)
    .map((option) => option.props.value)
    .join(';');

  return (
    <PopperPrimitive.Root {...popperScope}>
      <ComboboxProvider
        required={required}
        scope={__scopeCombobox}
        trigger={trigger}
        onTriggerChange={setTrigger}
        valueNode={valueNode}
        onValueNodeChange={setValueNode}
        valueNodeHasChildren={valueNodeHasChildren}
        onValueNodeHasChildrenChange={setValueNodeHasChildren}
        contentId={useId()}
        value={value}
        onValueChange={setValue}
        open={open}
        onOpenChange={setOpen}
        dir={direction}
        triggerPointerDownPosRef={triggerPointerDownPosRef}
        disabled={disabled}
      >
        <Collection.Provider scope={__scopeCombobox}>
          <ComboboxNativeOptionsProvider
            scope={props.__scopeCombobox}
            onNativeOptionAdd={React.useCallback((option) => {
              setNativeOptionsSet((prev) => new Set(prev).add(option));
            }, [])}
            onNativeOptionRemove={React.useCallback((option) => {
              setNativeOptionsSet((prev) => {
                const optionsSet = new Set(prev);
                optionsSet.delete(option);
                return optionsSet;
              });
            }, [])}
          >
            {children}
          </ComboboxNativeOptionsProvider>
        </Collection.Provider>

        {isFormControl ? (
          <BubbleCombobox
            key={nativeComboboxKey}
            aria-hidden
            required={required}
            tabIndex={-1}
            name={name}
            autoComplete={autoComplete}
            value={value}
            // enable form autofill
            onChange={(event) => setValue(event.target.value)}
            disabled={disabled}
          >
            {value === undefined ? <option value='' /> : null}
            {Array.from(nativeOptionsSet)}
          </BubbleCombobox>
        ) : null}
      </ComboboxProvider>
    </PopperPrimitive.Root>
  );
};

Combobox.displayName = COMBOBOX_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxTrigger
 * ----------------------------------------------------------------------------------------------- */

const TRIGGER_NAME = 'ComboboxTrigger';

type ComboboxTriggerElement = React.ElementRef<typeof Primitive.button>;
type PrimitiveButtonProps = Radix.ComponentPropsWithoutRef<typeof Primitive.button>;
interface ComboboxTriggerProps extends PrimitiveButtonProps {}

const ComboboxTrigger = React.forwardRef<ComboboxTriggerElement, ComboboxTriggerProps>(
  (props: ScopedProps<ComboboxTriggerProps>, forwardedRef) => {
    const { __scopeCombobox, disabled = false, ...triggerProps } = props;
    const popperScope = usePopperScope(__scopeCombobox);
    const context = useComboboxContext(TRIGGER_NAME, __scopeCombobox);
    const isDisabled = context.disabled || disabled;
    const composedRefs = useComposedRefs(forwardedRef, context.onTriggerChange);
    const getItems = useCollection(__scopeCombobox);

    const [searchRef, handleTypeaheadSearch, resetTypeahead] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.value === context.value);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem !== undefined) {
        context.onValueChange(nextItem.value);
      }
    });

    const handleOpen = () => {
      if (!isDisabled) {
        context.onOpenChange(true);
        // reset typeahead when we open
        resetTypeahead();
      }
    };

    return (
      <PopperPrimitive.Anchor asChild {...popperScope}>
        <Primitive.button
          type='button'
          role='combobox'
          aria-controls={context.contentId}
          aria-expanded={context.open}
          aria-required={context.required}
          aria-autocomplete='none'
          dir={context.dir}
          data-state={context.open ? 'open' : 'closed'}
          disabled={isDisabled}
          data-disabled={isDisabled ? '' : undefined}
          data-placeholder={shouldShowPlaceholder(context.value) ? '' : undefined}
          {...triggerProps}
          ref={composedRefs}
          // Enable compatibility with native label or custom `Label` "click" for Safari:
          onClick={composeEventHandlers(triggerProps.onClick, (event) => {
            // Whilst browsers generally have no issue focusing the trigger when clicking
            // on a label, Safari seems to struggle with the fact that there's no `onClick`.
            // We force `focus` in this case. Note: this doesn't create any other side-effect
            // because we are preventing default in `onPointerDown` so effectively
            // this only runs for a label "click"
            event.currentTarget.focus();
          })}
          onPointerDown={composeEventHandlers(triggerProps.onPointerDown, (event) => {
            // prevent implicit pointer capture
            // https://www.w3.org/TR/pointerevents3/#implicit-pointer-capture
            const target = event.target as HTMLElement;
            if (target.hasPointerCapture(event.pointerId)) {
              target.releasePointerCapture(event.pointerId);
            }

            // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
            // but not when the control key is pressed (avoiding MacOS right click)
            if (event.button === 0 && event.ctrlKey === false) {
              handleOpen();
              context.triggerPointerDownPosRef.current = {
                x: Math.round(event.pageX),
                y: Math.round(event.pageY),
              };
              // prevent trigger from stealing focus from the active item after opening.
              event.preventDefault();
            }
          })}
          onKeyDown={composeEventHandlers(triggerProps.onKeyDown, (event) => {
            const isTypingAhead = searchRef.current !== '';
            const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
            if (!isModifierKey && event.key.length === 1) {
              handleTypeaheadSearch(event.key);
            }
            if (isTypingAhead && event.key === ' ') {
              return;
            }
            if (OPEN_KEYS.includes(event.key)) {
              handleOpen();
              event.preventDefault();
            }
          })}
        />
      </PopperPrimitive.Anchor>
    );
  },
);

ComboboxTrigger.displayName = TRIGGER_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxValue
 * ----------------------------------------------------------------------------------------------- */

const VALUE_NAME = 'ComboboxValue';

type ComboboxValueElement = React.ElementRef<typeof Primitive.span>;
type PrimitiveSpanProps = Radix.ComponentPropsWithoutRef<typeof Primitive.span>;
interface ComboboxValueProps extends Omit<PrimitiveSpanProps, 'placeholder'> {
  placeholder?: React.ReactNode;
}

const ComboboxValue = React.forwardRef<ComboboxValueElement, ComboboxValueProps>(
  (props: ScopedProps<ComboboxValueProps>, forwardedRef) => {
    // We ignore `className` and `style` as this part shouldn't be styled.
    const { __scopeCombobox, className: _className, style: _style, children, placeholder = '', ...valueProps } = props;
    const context = useComboboxContext(VALUE_NAME, __scopeCombobox);
    const { onValueNodeHasChildrenChange } = context;
    const hasChildren = children !== undefined;
    const composedRefs = useComposedRefs(forwardedRef, context.onValueNodeChange);

    useLayoutEffect(() => {
      onValueNodeHasChildrenChange(hasChildren);
    }, [onValueNodeHasChildrenChange, hasChildren]);

    return (
      <Primitive.span
        {...valueProps}
        ref={composedRefs}
        // we don't want events from the portalled `ComboboxValue` children to bubble
        // through the item they came from
        style={{ pointerEvents: 'none' }}
      >
        {shouldShowPlaceholder(context.value) ? <>{placeholder}</> : children}
      </Primitive.span>
    );
  },
);

ComboboxValue.displayName = VALUE_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxIcon
 * ----------------------------------------------------------------------------------------------- */

const ICON_NAME = 'ComboboxIcon';

type ComboboxIconElement = React.ElementRef<typeof Primitive.span>;
interface ComboboxIconProps extends PrimitiveSpanProps {}

const ComboboxIcon = React.forwardRef<ComboboxIconElement, ComboboxIconProps>(
  (props: ScopedProps<ComboboxIconProps>, forwardedRef) => {
    const { __scopeCombobox, children, ...iconProps } = props;
    return (
      <Primitive.span aria-hidden {...iconProps} ref={forwardedRef}>
        {children || '▼'}
      </Primitive.span>
    );
  },
);

ComboboxIcon.displayName = ICON_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxPortal
 * ----------------------------------------------------------------------------------------------- */

const PORTAL_NAME = 'ComboboxPortal';

type PortalProps = React.ComponentPropsWithoutRef<typeof PortalPrimitive>;
interface ComboboxPortalProps {
  children?: React.ReactNode;
  /**
   * Specify a container element to portal the content into.
   */
  container?: PortalProps['container'];
}

const ComboboxPortal: React.FC<ComboboxPortalProps> = (props: ScopedProps<ComboboxPortalProps>) => {
  return <PortalPrimitive asChild {...props} />;
};

ComboboxPortal.displayName = PORTAL_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxContent
 * ----------------------------------------------------------------------------------------------- */

const CONTENT_NAME = 'ComboboxContent';

type ComboboxContentElement = ComboboxContentImplElement;
interface ComboboxContentProps extends ComboboxContentImplProps {}

const ComboboxContent = React.forwardRef<ComboboxContentElement, ComboboxContentProps>(
  (props: ScopedProps<ComboboxContentProps>, forwardedRef) => {
    const context = useComboboxContext(CONTENT_NAME, props.__scopeCombobox);
    const [fragment, setFragment] = React.useState<DocumentFragment>();

    // setting the fragment in `useLayoutEffect` as `DocumentFragment` doesn't exist on the server
    useLayoutEffect(() => {
      setFragment(new DocumentFragment());
    }, []);

    if (!context.open) {
      const frag = fragment as Element | undefined;
      return frag
        ? ReactDOM.createPortal(
            <ComboboxContentProvider scope={props.__scopeCombobox}>
              <Collection.Slot scope={props.__scopeCombobox}>
                <div>{props.children}</div>
              </Collection.Slot>
            </ComboboxContentProvider>,
            frag,
          )
        : null;
    }

    return <ComboboxContentImpl {...props} ref={forwardedRef} />;
  },
);

ComboboxContent.displayName = CONTENT_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxContentImpl
 * ----------------------------------------------------------------------------------------------- */

const CONTENT_MARGIN = 10;

type ComboboxContentContextValue = {
  content?: ComboboxContentElement | null;
  viewport?: ComboboxViewportElement | null;
  onViewportChange?: (node: ComboboxViewportElement | null) => void;
  itemRefCallback?: (node: ComboboxItemElement | null, value: string, disabled: boolean) => void;
  comboboxedItem?: ComboboxItemElement | null;
  onItemLeave?: () => void;
  itemTextRefCallback?: (node: ComboboxItemTextElement | null, value: string, disabled: boolean) => void;
  focusComboboxedItem?: () => void;
  comboboxedItemText?: ComboboxItemTextElement | null;
  position?: ComboboxContentProps['position'];
  isPositioned?: boolean;
  searchRef?: React.RefObject<string>;
};

const [ComboboxContentProvider, useComboboxContentContext] =
  createComboboxContext<ComboboxContentContextValue>(CONTENT_NAME);

const CONTENT_IMPL_NAME = 'ComboboxContentImpl';

type ComboboxContentImplElement = ComboboxPopperPositionElement | ComboboxItemAlignedPositionElement;
type DismissableLayerProps = React.ComponentPropsWithoutRef<typeof DismissableLayer>;
type FocusScopeProps = Radix.ComponentPropsWithoutRef<typeof FocusScope>;

type ComboboxPopperPrivateProps = { onPlaced?: PopperContentProps['onPlaced'] };

interface ComboboxContentImplProps
  extends Omit<ComboboxPopperPositionProps, keyof ComboboxPopperPrivateProps>,
    Omit<ComboboxItemAlignedPositionProps, keyof ComboboxPopperPrivateProps> {
  /**
   * Event handler called when auto-focusing on close.
   * Can be prevented.
   */
  onCloseAutoFocus?: FocusScopeProps['onUnmountAutoFocus'];
  /**
   * Event handler called when the escape key is down.
   * Can be prevented.
   */
  onEscapeKeyDown?: DismissableLayerProps['onEscapeKeyDown'];
  /**
   * Event handler called when the a `pointerdown` event happens outside of the `DismissableLayer`.
   * Can be prevented.
   */
  onPointerDownOutside?: DismissableLayerProps['onPointerDownOutside'];

  position?: 'item-aligned' | 'popper';
}

const ComboboxContentImpl = React.forwardRef<ComboboxContentImplElement, ComboboxContentImplProps>(
  (props: ScopedProps<ComboboxContentImplProps>, forwardedRef) => {
    const {
      __scopeCombobox,
      position = 'item-aligned',
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      //
      // PopperContent props
      side,
      sideOffset,
      align,
      alignOffset,
      arrowPadding,
      collisionBoundary,
      collisionPadding,
      sticky,
      hideWhenDetached,
      avoidCollisions,
      //
      ...contentProps
    } = props;
    const context = useComboboxContext(CONTENT_NAME, __scopeCombobox);
    const [content, setContent] = React.useState<ComboboxContentImplElement | null>(null);
    const [viewport, setViewport] = React.useState<ComboboxViewportElement | null>(null);
    const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
    const [comboboxedItem, setComboboxedItem] = React.useState<ComboboxItemElement | null>(null);
    const [comboboxedItemText, setComboboxedItemText] = React.useState<ComboboxItemTextElement | null>(null);
    const getItems = useCollection(__scopeCombobox);
    const [isPositioned, setIsPositioned] = React.useState(false);
    const firstValidItemFoundRef = React.useRef(false);

    // aria-hide everything except the content (better supported equivalent to setting aria-modal)
    React.useEffect(() => {
      if (content) {
        return hideOthers(content);
      }
    }, [content]);

    // Make sure the whole tree has focus guards as our `Combobox` may be
    // the last element in the DOM (because of the `Portal`)
    useFocusGuards();

    const focusFirst = React.useCallback(
      (candidates: Array<HTMLElement | null>) => {
        const [firstItem, ...restItems] = getItems().map((item) => item.ref.current);
        const [lastItem] = restItems.slice(-1);

        const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement;
        for (const candidate of candidates) {
          // if focus is already where we want to go, we don't want to keep going through the candidates
          if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) {
            return;
          }
          candidate?.scrollIntoView({ block: 'nearest' });
          // viewport might have padding so scroll to its edges when focusing first/last items.
          if (candidate === firstItem && viewport) {
            viewport.scrollTop = 0;
          }
          if (candidate === lastItem && viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
          candidate?.focus();
          if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) {
            return;
          }
        }
      },
      [getItems, viewport],
    );

    const focusComboboxedItem = React.useCallback(
      () => focusFirst([comboboxedItem, content]),
      [focusFirst, comboboxedItem, content],
    );

    // Since this is not dependent on layout, we want to ensure this runs at the same time as
    // other effects across components. Hence why we don't call `focusComboboxedItem` inside `position`.
    React.useEffect(() => {
      if (isPositioned) {
        focusComboboxedItem();
      }
    }, [isPositioned, focusComboboxedItem]);

    // prevent comboboxing items on `pointerup` in some cases after opening from `pointerdown`
    // and close on `pointerup` outside.
    const { onOpenChange, triggerPointerDownPosRef } = context;
    React.useEffect(() => {
      if (content) {
        let pointerMoveDelta = { x: 0, y: 0 };

        const handlePointerMove = (event: PointerEvent) => {
          pointerMoveDelta = {
            x: Math.abs(Math.round(event.pageX) - (triggerPointerDownPosRef.current?.x ?? 0)),
            y: Math.abs(Math.round(event.pageY) - (triggerPointerDownPosRef.current?.y ?? 0)),
          };
        };
        const handlePointerUp = (event: PointerEvent) => {
          // If the pointer hasn't moved by a certain threshold then we prevent comboboxing item on `pointerup`.
          if (pointerMoveDelta.x <= 10 && pointerMoveDelta.y <= 10) {
            event.preventDefault();
          } else {
            // otherwise, if the event was outside the content, close.
            if (!content.contains(event.target as HTMLElement)) {
              onOpenChange(false);
            }
          }
          document.removeEventListener('pointermove', handlePointerMove);
          triggerPointerDownPosRef.current = null;
        };

        if (triggerPointerDownPosRef.current !== null) {
          document.addEventListener('pointermove', handlePointerMove);
          document.addEventListener('pointerup', handlePointerUp, { capture: true, once: true });
        }

        return () => {
          document.removeEventListener('pointermove', handlePointerMove);
          document.removeEventListener('pointerup', handlePointerUp, { capture: true });
        };
      }
    }, [content, onOpenChange, triggerPointerDownPosRef]);

    React.useEffect(() => {
      const close = () => onOpenChange(false);
      window.addEventListener('blur', close);
      window.addEventListener('resize', close);
      return () => {
        window.removeEventListener('blur', close);
        window.removeEventListener('resize', close);
      };
    }, [onOpenChange]);

    const [searchRef, handleTypeaheadSearch] = useTypeaheadSearch((search) => {
      const enabledItems = getItems().filter((item) => !item.disabled);
      const currentItem = enabledItems.find((item) => item.ref.current === document.activeElement);
      const nextItem = findNextItem(enabledItems, search, currentItem);
      if (nextItem) {
        /**
         * Imperative focus during keydown is risky so we prevent React's batching updates
         * to avoid potential bugs. See: https://github.com/facebook/react/issues/20332
         */
        setTimeout(() => (nextItem.ref.current as HTMLElement).focus());
      }
    });

    const itemRefCallback = React.useCallback(
      (node: ComboboxItemElement | null, value: string, disabled: boolean) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isComboboxedItem = context.value !== undefined && context.value === value;
        if (isComboboxedItem || isFirstValidItem) {
          setComboboxedItem(node);
          if (isFirstValidItem) {
            firstValidItemFoundRef.current = true;
          }
        }
      },
      [context.value],
    );
    const handleItemLeave = React.useCallback(() => content?.focus(), [content]);
    const itemTextRefCallback = React.useCallback(
      (node: ComboboxItemTextElement | null, value: string, disabled: boolean) => {
        const isFirstValidItem = !firstValidItemFoundRef.current && !disabled;
        const isComboboxedItem = context.value !== undefined && context.value === value;
        if (isComboboxedItem || isFirstValidItem) {
          setComboboxedItemText(node);
        }
      },
      [context.value],
    );

    const ComboboxPosition = position === 'popper' ? ComboboxPopperPosition : ComboboxItemAlignedPosition;

    // Silently ignore props that are not supported by `ComboboxItemAlignedPosition`
    const popperContentProps =
      ComboboxPosition === ComboboxPopperPosition
        ? {
            side,
            sideOffset,
            align,
            alignOffset,
            arrowPadding,
            collisionBoundary,
            collisionPadding,
            sticky,
            hideWhenDetached,
            avoidCollisions,
          }
        : {};

    return (
      <ComboboxContentProvider
        scope={__scopeCombobox}
        content={content}
        viewport={viewport}
        onViewportChange={setViewport}
        itemRefCallback={itemRefCallback}
        comboboxedItem={comboboxedItem}
        onItemLeave={handleItemLeave}
        itemTextRefCallback={itemTextRefCallback}
        focusComboboxedItem={focusComboboxedItem}
        comboboxedItemText={comboboxedItemText}
        position={position}
        isPositioned={isPositioned}
        searchRef={searchRef}
      >
        <RemoveScroll as={Slot} allowPinchZoom>
          <FocusScope
            asChild
            // we make sure we're not trapping once it's been closed
            // (closed !== unmounted when animating out)
            trapped={context.open}
            onMountAutoFocus={(event) => {
              // we prevent open autofocus because we manually focus the comboboxed item
              event.preventDefault();
            }}
            onUnmountAutoFocus={composeEventHandlers(onCloseAutoFocus, (event) => {
              context.trigger?.focus({ preventScroll: true });
              event.preventDefault();
            })}
          >
            <DismissableLayer
              asChild
              disableOutsidePointerEvents
              onEscapeKeyDown={onEscapeKeyDown}
              onPointerDownOutside={onPointerDownOutside}
              // When focus is trapped, a focusout event may still happen.
              // We make sure we don't trigger our `onDismiss` in such case.
              onFocusOutside={(event) => event.preventDefault()}
              onDismiss={() => context.onOpenChange(false)}
            >
              <ComboboxPosition
                role='listbox'
                id={context.contentId}
                data-state={context.open ? 'open' : 'closed'}
                dir={context.dir}
                onContextMenu={(event) => event.preventDefault()}
                {...contentProps}
                {...popperContentProps}
                onPlaced={() => setIsPositioned(true)}
                ref={composedRefs}
                style={{
                  // flex layout so we can place the scroll buttons properly
                  display: 'flex',
                  flexDirection: 'column',
                  // reset the outline by default as the content MAY get focused
                  outline: 'none',
                  ...contentProps.style,
                }}
                onKeyDown={composeEventHandlers(contentProps.onKeyDown, (event) => {
                  const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;

                  // combobox should not be navigated using tab key so we prevent it
                  if (event.key === 'Tab') {
                    event.preventDefault();
                  }

                  if (!isModifierKey && event.key.length === 1) {
                    handleTypeaheadSearch(event.key);
                  }

                  if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
                    const items = getItems().filter((item) => !item.disabled);
                    let candidateNodes = items.map((item) => item.ref.current!);

                    if (['ArrowUp', 'End'].includes(event.key)) {
                      candidateNodes = candidateNodes.slice().reverse();
                    }
                    if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
                      const currentElement = event.target as ComboboxItemElement;
                      const currentIndex = candidateNodes.indexOf(currentElement);
                      candidateNodes = candidateNodes.slice(currentIndex + 1);
                    }

                    /**
                     * Imperative focus during keydown is risky so we prevent React's batching updates
                     * to avoid potential bugs. See: https://github.com/facebook/react/issues/20332
                     */
                    setTimeout(() => focusFirst(candidateNodes));

                    event.preventDefault();
                  }
                })}
              />
            </DismissableLayer>
          </FocusScope>
        </RemoveScroll>
      </ComboboxContentProvider>
    );
  },
);

ComboboxContentImpl.displayName = CONTENT_IMPL_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxItemAlignedPosition
 * ----------------------------------------------------------------------------------------------- */

const ITEM_ALIGNED_POSITION_NAME = 'ComboboxItemAlignedPosition';

type ComboboxItemAlignedPositionElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxItemAlignedPositionProps extends PrimitiveDivProps, ComboboxPopperPrivateProps {}

const ComboboxItemAlignedPosition = React.forwardRef<
  ComboboxItemAlignedPositionElement,
  ComboboxItemAlignedPositionProps
>((props: ScopedProps<ComboboxItemAlignedPositionProps>, forwardedRef) => {
  const { __scopeCombobox, onPlaced, ...popperProps } = props;
  const context = useComboboxContext(CONTENT_NAME, __scopeCombobox);
  const contentContext = useComboboxContentContext(CONTENT_NAME, __scopeCombobox);
  const [contentWrapper, setContentWrapper] = React.useState<HTMLDivElement | null>(null);
  const [content, setContent] = React.useState<ComboboxItemAlignedPositionElement | null>(null);
  const composedRefs = useComposedRefs(forwardedRef, (node) => setContent(node));
  const getItems = useCollection(__scopeCombobox);
  const shouldExpandOnScrollRef = React.useRef(false);
  const shouldRepositionRef = React.useRef(true);

  const { viewport, comboboxedItem, comboboxedItemText, focusComboboxedItem } = contentContext;
  const position = React.useCallback(() => {
    if (
      context.trigger &&
      context.valueNode &&
      contentWrapper &&
      content &&
      viewport &&
      comboboxedItem &&
      comboboxedItemText
    ) {
      const triggerRect = context.trigger.getBoundingClientRect();

      // -----------------------------------------------------------------------------------------
      //  Horizontal positioning
      // -----------------------------------------------------------------------------------------
      const contentRect = content.getBoundingClientRect();
      const valueNodeRect = context.valueNode.getBoundingClientRect();
      const itemTextRect = comboboxedItemText.getBoundingClientRect();

      if (context.dir !== 'rtl') {
        const itemTextOffset = itemTextRect.left - contentRect.left;
        const left = valueNodeRect.left - itemTextOffset;
        const leftDelta = triggerRect.left - left;
        const minContentWidth = triggerRect.width + leftDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const rightEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedLeft = clamp(left, [CONTENT_MARGIN, rightEdge - contentWidth]);

        contentWrapper.style.minWidth = minContentWidth + 'px';
        contentWrapper.style.left = clampedLeft + 'px';
      } else {
        const itemTextOffset = contentRect.right - itemTextRect.right;
        const right = window.innerWidth - valueNodeRect.right - itemTextOffset;
        const rightDelta = window.innerWidth - triggerRect.right - right;
        const minContentWidth = triggerRect.width + rightDelta;
        const contentWidth = Math.max(minContentWidth, contentRect.width);
        const leftEdge = window.innerWidth - CONTENT_MARGIN;
        const clampedRight = clamp(right, [CONTENT_MARGIN, leftEdge - contentWidth]);

        contentWrapper.style.minWidth = minContentWidth + 'px';
        contentWrapper.style.right = clampedRight + 'px';
      }

      // -----------------------------------------------------------------------------------------
      // Vertical positioning
      // -----------------------------------------------------------------------------------------
      const items = getItems();
      const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
      const itemsHeight = viewport.scrollHeight;

      const contentStyles = window.getComputedStyle(content);
      const contentBorderTopWidth = parseInt(contentStyles.borderTopWidth, 10);
      const contentPaddingTop = parseInt(contentStyles.paddingTop, 10);
      const contentBorderBottomWidth = parseInt(contentStyles.borderBottomWidth, 10);
      const contentPaddingBottom = parseInt(contentStyles.paddingBottom, 10);
      const fullContentHeight = contentBorderTopWidth + contentPaddingTop + itemsHeight + contentPaddingBottom + contentBorderBottomWidth; // prettier-ignore
      const minContentHeight = Math.min(comboboxedItem.offsetHeight * 5, fullContentHeight);

      const viewportStyles = window.getComputedStyle(viewport);
      const viewportPaddingTop = parseInt(viewportStyles.paddingTop, 10);
      const viewportPaddingBottom = parseInt(viewportStyles.paddingBottom, 10);

      const topEdgeToTriggerMiddle = triggerRect.top + triggerRect.height / 2 - CONTENT_MARGIN;
      const triggerMiddleToBottomEdge = availableHeight - topEdgeToTriggerMiddle;

      const comboboxedItemHalfHeight = comboboxedItem.offsetHeight / 2;
      const itemOffsetMiddle = comboboxedItem.offsetTop + comboboxedItemHalfHeight;
      const contentTopToItemMiddle = contentBorderTopWidth + contentPaddingTop + itemOffsetMiddle;
      const itemMiddleToContentBottom = fullContentHeight - contentTopToItemMiddle;

      const willAlignWithoutTopOverflow = contentTopToItemMiddle <= topEdgeToTriggerMiddle;

      if (willAlignWithoutTopOverflow) {
        const isLastItem = comboboxedItem === items[items.length - 1].ref.current;
        contentWrapper.style.bottom = 0 + 'px';
        const viewportOffsetBottom = content.clientHeight - viewport.offsetTop - viewport.offsetHeight;
        const clampedTriggerMiddleToBottomEdge = Math.max(
          triggerMiddleToBottomEdge,
          comboboxedItemHalfHeight +
            // viewport might have padding bottom, include it to avoid a scrollable viewport
            (isLastItem ? viewportPaddingBottom : 0) +
            viewportOffsetBottom +
            contentBorderBottomWidth,
        );
        const height = contentTopToItemMiddle + clampedTriggerMiddleToBottomEdge;
        contentWrapper.style.height = height + 'px';
      } else {
        const isFirstItem = comboboxedItem === items[0].ref.current;
        contentWrapper.style.top = 0 + 'px';
        const clampedTopEdgeToTriggerMiddle = Math.max(
          topEdgeToTriggerMiddle,
          contentBorderTopWidth +
            viewport.offsetTop +
            // viewport might have padding top, include it to avoid a scrollable viewport
            (isFirstItem ? viewportPaddingTop : 0) +
            comboboxedItemHalfHeight,
        );
        const height = clampedTopEdgeToTriggerMiddle + itemMiddleToContentBottom;
        contentWrapper.style.height = height + 'px';
        viewport.scrollTop = contentTopToItemMiddle - topEdgeToTriggerMiddle + viewport.offsetTop;
      }

      contentWrapper.style.margin = `${CONTENT_MARGIN}px 0`;
      contentWrapper.style.minHeight = minContentHeight + 'px';
      contentWrapper.style.maxHeight = availableHeight + 'px';
      // -----------------------------------------------------------------------------------------

      onPlaced?.();

      // we don't want the initial scroll position adjustment to trigger "expand on scroll"
      // so we explicitly turn it on only after they've registered.
      requestAnimationFrame(() => (shouldExpandOnScrollRef.current = true));
    }
  }, [
    getItems,
    context.trigger,
    context.valueNode,
    contentWrapper,
    content,
    viewport,
    comboboxedItem,
    comboboxedItemText,
    context.dir,
    onPlaced,
  ]);

  useLayoutEffect(() => position(), [position]);

  // copy z-index from content to wrapper
  const [contentZIndex, setContentZIndex] = React.useState<string>();
  useLayoutEffect(() => {
    if (content) {
      setContentZIndex(window.getComputedStyle(content).zIndex);
    }
  }, [content]);

  // When the viewport becomes scrollable at the top, the scroll up button will mount.
  // Because it is part of the normal flow, it will push down the viewport, thus throwing our
  // trigger => comboboxedItem alignment off by the amount the viewport was pushed down.
  // We wait for this to happen and then re-run the positining logic one more time to account for it.
  const handleScrollButtonChange = React.useCallback(
    (node: ComboboxScrollButtonImplElement | null) => {
      if (node && shouldRepositionRef.current === true) {
        position();
        focusComboboxedItem?.();
        shouldRepositionRef.current = false;
      }
    },
    [position, focusComboboxedItem],
  );

  return (
    <ComboboxViewportProvider
      scope={__scopeCombobox}
      contentWrapper={contentWrapper}
      shouldExpandOnScrollRef={shouldExpandOnScrollRef}
      onScrollButtonChange={handleScrollButtonChange}
    >
      <div
        ref={setContentWrapper}
        style={{
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          zIndex: contentZIndex,
        }}
      >
        <Primitive.div
          {...popperProps}
          ref={composedRefs}
          style={{
            // When we get the height of the content, it includes borders. If we were to set
            // the height without having `boxSizing: 'border-box'` it would be too big.
            boxSizing: 'border-box',
            // We need to ensure the content doesn't get taller than the wrapper
            maxHeight: '100%',
            ...popperProps.style,
          }}
        />
      </div>
    </ComboboxViewportProvider>
  );
});

ComboboxItemAlignedPosition.displayName = ITEM_ALIGNED_POSITION_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxPopperPosition
 * ----------------------------------------------------------------------------------------------- */

const POPPER_POSITION_NAME = 'ComboboxPopperPosition';

type ComboboxPopperPositionElement = React.ElementRef<typeof PopperPrimitive.Content>;
type PopperContentProps = React.ComponentPropsWithoutRef<typeof PopperPrimitive.Content>;
interface ComboboxPopperPositionProps extends PopperContentProps, ComboboxPopperPrivateProps {}

const ComboboxPopperPosition = React.forwardRef<ComboboxPopperPositionElement, ComboboxPopperPositionProps>(
  (props: ScopedProps<ComboboxPopperPositionProps>, forwardedRef) => {
    const { __scopeCombobox, align = 'start', collisionPadding = CONTENT_MARGIN, ...popperProps } = props;
    const popperScope = usePopperScope(__scopeCombobox);

    return (
      <PopperPrimitive.Content
        {...popperScope}
        {...popperProps}
        ref={forwardedRef}
        align={align}
        collisionPadding={collisionPadding}
        style={{
          // Ensure border-box for floating-ui calculations
          boxSizing: 'border-box',
          ...popperProps.style,
          // re-namespace exposed content custom properties
          ...{
            '--radix-combobox-content-transform-origin': 'var(--radix-popper-transform-origin)',
            '--radix-combobox-content-available-width': 'var(--radix-popper-available-width)',
            '--radix-combobox-content-available-height': 'var(--radix-popper-available-height)',
            '--radix-combobox-trigger-width': 'var(--radix-popper-anchor-width)',
            '--radix-combobox-trigger-height': 'var(--radix-popper-anchor-height)',
          },
        }}
      />
    );
  },
);

ComboboxPopperPosition.displayName = POPPER_POSITION_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxViewport
 * ----------------------------------------------------------------------------------------------- */

type ComboboxViewportContextValue = {
  contentWrapper?: HTMLDivElement | null;
  shouldExpandOnScrollRef?: React.RefObject<boolean>;
  onScrollButtonChange?: (node: ComboboxScrollButtonImplElement | null) => void;
};

const [ComboboxViewportProvider, useComboboxViewportContext] = createComboboxContext<ComboboxViewportContextValue>(
  CONTENT_NAME,
  {},
);

const VIEWPORT_NAME = 'ComboboxViewport';

type ComboboxViewportElement = React.ElementRef<typeof Primitive.div>;
type PrimitiveDivProps = Radix.ComponentPropsWithoutRef<typeof Primitive.div>;
interface ComboboxViewportProps extends PrimitiveDivProps {}

const ComboboxViewport = React.forwardRef<ComboboxViewportElement, ComboboxViewportProps>(
  (props: ScopedProps<ComboboxViewportProps>, forwardedRef) => {
    const { __scopeCombobox, ...viewportProps } = props;
    const contentContext = useComboboxContentContext(VIEWPORT_NAME, __scopeCombobox);
    const viewportContext = useComboboxViewportContext(VIEWPORT_NAME, __scopeCombobox);
    const composedRefs = useComposedRefs(forwardedRef, contentContext.onViewportChange);
    const prevScrollTopRef = React.useRef(0);
    return (
      <>
        {/* Hide scrollbars cross-browser and enable momentum scroll for touch devices */}
        <style
          dangerouslySetInnerHTML={{
            __html:
              '[data-radix-combobox-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-combobox-viewport]::-webkit-scrollbar{display:none}',
          }}
        />
        <Collection.Slot scope={__scopeCombobox}>
          <Primitive.div
            data-radix-combobox-viewport=''
            role='presentation'
            {...viewportProps}
            ref={composedRefs}
            style={{
              // we use position: 'relative' here on the `viewport` so that when we call
              // `comboboxedItem.offsetTop` in calculations, the offset is relative to the viewport
              // (independent of the scrollUpButton).
              position: 'relative',
              flex: 1,
              overflow: 'auto',
              ...viewportProps.style,
            }}
            onScroll={composeEventHandlers(viewportProps.onScroll, (event) => {
              const viewport = event.currentTarget;
              const { contentWrapper, shouldExpandOnScrollRef } = viewportContext;
              if (shouldExpandOnScrollRef?.current && contentWrapper) {
                const scrolledBy = Math.abs(prevScrollTopRef.current - viewport.scrollTop);
                if (scrolledBy > 0) {
                  const availableHeight = window.innerHeight - CONTENT_MARGIN * 2;
                  const cssMinHeight = parseFloat(contentWrapper.style.minHeight);
                  const cssHeight = parseFloat(contentWrapper.style.height);
                  const prevHeight = Math.max(cssMinHeight, cssHeight);

                  if (prevHeight < availableHeight) {
                    const nextHeight = prevHeight + scrolledBy;
                    const clampedNextHeight = Math.min(availableHeight, nextHeight);
                    const heightDiff = nextHeight - clampedNextHeight;

                    contentWrapper.style.height = clampedNextHeight + 'px';
                    if (contentWrapper.style.bottom === '0px') {
                      viewport.scrollTop = heightDiff > 0 ? heightDiff : 0;
                      // ensure the content stays pinned to the bottom
                      contentWrapper.style.justifyContent = 'flex-end';
                    }
                  }
                }
              }
              prevScrollTopRef.current = viewport.scrollTop;
            })}
          />
        </Collection.Slot>
      </>
    );
  },
);

ComboboxViewport.displayName = VIEWPORT_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxGroup
 * ----------------------------------------------------------------------------------------------- */

const GROUP_NAME = 'ComboboxGroup';

type ComboboxGroupContextValue = { id: string };

const [ComboboxGroupContextProvider, useComboboxGroupContext] =
  createComboboxContext<ComboboxGroupContextValue>(GROUP_NAME);

type ComboboxGroupElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxGroupProps extends PrimitiveDivProps {}

const ComboboxGroup = React.forwardRef<ComboboxGroupElement, ComboboxGroupProps>(
  (props: ScopedProps<ComboboxGroupProps>, forwardedRef) => {
    const { __scopeCombobox, ...groupProps } = props;
    const groupId = useId();
    return (
      <ComboboxGroupContextProvider scope={__scopeCombobox} id={groupId}>
        <Primitive.div role='group' aria-labelledby={groupId} {...groupProps} ref={forwardedRef} />
      </ComboboxGroupContextProvider>
    );
  },
);

ComboboxGroup.displayName = GROUP_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxLabel
 * ----------------------------------------------------------------------------------------------- */

const LABEL_NAME = 'ComboboxLabel';

type ComboboxLabelElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxLabelProps extends PrimitiveDivProps {}

const ComboboxLabel = React.forwardRef<ComboboxLabelElement, ComboboxLabelProps>(
  (props: ScopedProps<ComboboxLabelProps>, forwardedRef) => {
    const { __scopeCombobox, ...labelProps } = props;
    const groupContext = useComboboxGroupContext(LABEL_NAME, __scopeCombobox);
    return <Primitive.div id={groupContext.id} {...labelProps} ref={forwardedRef} />;
  },
);

ComboboxLabel.displayName = LABEL_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxItem
 * ----------------------------------------------------------------------------------------------- */

const ITEM_NAME = 'ComboboxItem';

type ComboboxItemContextValue = {
  value: string;
  disabled: boolean;
  textId: string;
  isComboboxed: boolean;
  onItemTextChange(node: ComboboxItemTextElement | null): void;
};

const [ComboboxItemContextProvider, useComboboxItemContext] =
  createComboboxContext<ComboboxItemContextValue>(ITEM_NAME);

type ComboboxItemElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxItemProps extends PrimitiveDivProps {
  value: string;
  disabled?: boolean;
  textValue?: string;
}

const ComboboxItem = React.forwardRef<ComboboxItemElement, ComboboxItemProps>(
  (props: ScopedProps<ComboboxItemProps>, forwardedRef) => {
    const { __scopeCombobox, value, disabled = false, textValue: textValueProp, ...itemProps } = props;
    const context = useComboboxContext(ITEM_NAME, __scopeCombobox);
    const contentContext = useComboboxContentContext(ITEM_NAME, __scopeCombobox);
    const isComboboxed = context.value === value;
    const [textValue, setTextValue] = React.useState(textValueProp ?? '');
    const [isFocused, setIsFocused] = React.useState(false);
    const composedRefs = useComposedRefs(forwardedRef, (node) =>
      contentContext.itemRefCallback?.(node, value, disabled),
    );
    const textId = useId();

    const handleCombobox = () => {
      if (!disabled) {
        context.onValueChange(value);
        context.onOpenChange(false);
      }
    };

    if (value === '') {
      throw new Error(
        'A <Combobox.Item /> must have a value prop that is not an empty string. This is because the Combobox value can be set to an empty string to clear the comboboxion and show the placeholder.',
      );
    }

    return (
      <ComboboxItemContextProvider
        scope={__scopeCombobox}
        value={value}
        disabled={disabled}
        textId={textId}
        isComboboxed={isComboboxed}
        onItemTextChange={React.useCallback((node) => {
          setTextValue((prevTextValue) => prevTextValue || (node?.textContent ?? '').trim());
        }, [])}
      >
        <Collection.ItemSlot scope={__scopeCombobox} value={value} disabled={disabled} textValue={textValue}>
          <Primitive.div
            role='option'
            aria-labelledby={textId}
            data-highlighted={isFocused ? '' : undefined}
            // `isFocused` caveat fixes stuttering in VoiceOver
            aria-comboboxed={isComboboxed && isFocused}
            data-state={isComboboxed ? 'checked' : 'unchecked'}
            aria-disabled={disabled || undefined}
            data-disabled={disabled ? '' : undefined}
            tabIndex={disabled ? undefined : -1}
            {...itemProps}
            ref={composedRefs}
            onFocus={composeEventHandlers(itemProps.onFocus, () => setIsFocused(true))}
            onBlur={composeEventHandlers(itemProps.onBlur, () => setIsFocused(false))}
            onPointerUp={composeEventHandlers(itemProps.onPointerUp, handleCombobox)}
            onPointerMove={composeEventHandlers(itemProps.onPointerMove, (event) => {
              if (disabled) {
                contentContext.onItemLeave?.();
              } else {
                // even though safari doesn't support this option, it's acceptable
                // as it only means it might scroll a few pixels when using the pointer.
                event.currentTarget.focus({ preventScroll: true });
              }
            })}
            onPointerLeave={composeEventHandlers(itemProps.onPointerLeave, (event) => {
              if (event.currentTarget === document.activeElement) {
                contentContext.onItemLeave?.();
              }
            })}
            onKeyDown={composeEventHandlers(itemProps.onKeyDown, (event) => {
              const isTypingAhead = contentContext.searchRef?.current !== '';
              if (isTypingAhead && event.key === ' ') {
                return;
              }
              if (COMBOBOXION_KEYS.includes(event.key)) {
                handleCombobox();
              }
              // prevent page scroll if using the space key to combobox an item
              if (event.key === ' ') {
                event.preventDefault();
              }
            })}
          />
        </Collection.ItemSlot>
      </ComboboxItemContextProvider>
    );
  },
);

ComboboxItem.displayName = ITEM_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxItemText
 * ----------------------------------------------------------------------------------------------- */

const ITEM_TEXT_NAME = 'ComboboxItemText';

type ComboboxItemTextElement = React.ElementRef<typeof Primitive.span>;
interface ComboboxItemTextProps extends PrimitiveSpanProps {}

const ComboboxItemText = React.forwardRef<ComboboxItemTextElement, ComboboxItemTextProps>(
  (props: ScopedProps<ComboboxItemTextProps>, forwardedRef) => {
    // We ignore `className` and `style` as this part shouldn't be styled.
    const { __scopeCombobox, className: _className, style: _style, ...itemTextProps } = props;
    const context = useComboboxContext(ITEM_TEXT_NAME, __scopeCombobox);
    const contentContext = useComboboxContentContext(ITEM_TEXT_NAME, __scopeCombobox);
    const itemContext = useComboboxItemContext(ITEM_TEXT_NAME, __scopeCombobox);
    const nativeOptionsContext = useComboboxNativeOptionsContext(ITEM_TEXT_NAME, __scopeCombobox);
    const [itemTextNode, setItemTextNode] = React.useState<ComboboxItemTextElement | null>(null);
    const composedRefs = useComposedRefs(
      forwardedRef,
      (node) => setItemTextNode(node),
      itemContext.onItemTextChange,
      (node) => contentContext.itemTextRefCallback?.(node, itemContext.value, itemContext.disabled),
    );

    const textContent = itemTextNode?.textContent;
    const nativeOption = React.useMemo(
      () => (
        <option key={itemContext.value} value={itemContext.value} disabled={itemContext.disabled}>
          {textContent}
        </option>
      ),
      [itemContext.disabled, itemContext.value, textContent],
    );

    const { onNativeOptionAdd, onNativeOptionRemove } = nativeOptionsContext;
    useLayoutEffect(() => {
      onNativeOptionAdd(nativeOption);
      return () => onNativeOptionRemove(nativeOption);
    }, [onNativeOptionAdd, onNativeOptionRemove, nativeOption]);

    return (
      <>
        <Primitive.span id={itemContext.textId} {...itemTextProps} ref={composedRefs} />

        {/* Portal the combobox item text into the trigger value node */}
        {itemContext.isComboboxed && context.valueNode && !context.valueNodeHasChildren
          ? ReactDOM.createPortal(itemTextProps.children, context.valueNode)
          : null}
      </>
    );
  },
);

ComboboxItemText.displayName = ITEM_TEXT_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxItemIndicator
 * ----------------------------------------------------------------------------------------------- */

const ITEM_INDICATOR_NAME = 'ComboboxItemIndicator';

type ComboboxItemIndicatorElement = React.ElementRef<typeof Primitive.span>;
interface ComboboxItemIndicatorProps extends PrimitiveSpanProps {}

const ComboboxItemIndicator = React.forwardRef<ComboboxItemIndicatorElement, ComboboxItemIndicatorProps>(
  (props: ScopedProps<ComboboxItemIndicatorProps>, forwardedRef) => {
    const { __scopeCombobox, ...itemIndicatorProps } = props;
    const itemContext = useComboboxItemContext(ITEM_INDICATOR_NAME, __scopeCombobox);
    return itemContext.isComboboxed ? <Primitive.span aria-hidden {...itemIndicatorProps} ref={forwardedRef} /> : null;
  },
);

ComboboxItemIndicator.displayName = ITEM_INDICATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxScrollUpButton
 * ----------------------------------------------------------------------------------------------- */

const SCROLL_UP_BUTTON_NAME = 'ComboboxScrollUpButton';

type ComboboxScrollUpButtonElement = ComboboxScrollButtonImplElement;
interface ComboboxScrollUpButtonProps extends Omit<ComboboxScrollButtonImplProps, 'onAutoScroll'> {}

const ComboboxScrollUpButton = React.forwardRef<ComboboxScrollUpButtonElement, ComboboxScrollUpButtonProps>(
  (props: ScopedProps<ComboboxScrollUpButtonProps>, forwardedRef) => {
    const contentContext = useComboboxContentContext(SCROLL_UP_BUTTON_NAME, props.__scopeCombobox);
    const viewportContext = useComboboxViewportContext(SCROLL_UP_BUTTON_NAME, props.__scopeCombobox);
    const [canScrollUp, setCanScrollUp] = React.useState(false);
    const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);

    useLayoutEffect(() => {
      if (contentContext.viewport && contentContext.isPositioned) {
        const viewport = contentContext.viewport;
        const handleScroll = () => {
          const canScrollUp = viewport.scrollTop > 0;
          setCanScrollUp(canScrollUp);
        };
        handleScroll();
        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
      }
    }, [contentContext.viewport, contentContext.isPositioned]);

    return canScrollUp ? (
      <ComboboxScrollButtonImpl
        {...props}
        ref={composedRefs}
        onAutoScroll={() => {
          const { viewport, comboboxedItem } = contentContext;
          if (viewport && comboboxedItem) {
            viewport.scrollTop = viewport.scrollTop - comboboxedItem.offsetHeight;
          }
        }}
      />
    ) : null;
  },
);

ComboboxScrollUpButton.displayName = SCROLL_UP_BUTTON_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxScrollDownButton
 * ----------------------------------------------------------------------------------------------- */

const SCROLL_DOWN_BUTTON_NAME = 'ComboboxScrollDownButton';

type ComboboxScrollDownButtonElement = ComboboxScrollButtonImplElement;
interface ComboboxScrollDownButtonProps extends Omit<ComboboxScrollButtonImplProps, 'onAutoScroll'> {}

const ComboboxScrollDownButton = React.forwardRef<ComboboxScrollDownButtonElement, ComboboxScrollDownButtonProps>(
  (props: ScopedProps<ComboboxScrollDownButtonProps>, forwardedRef) => {
    const contentContext = useComboboxContentContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeCombobox);
    const viewportContext = useComboboxViewportContext(SCROLL_DOWN_BUTTON_NAME, props.__scopeCombobox);
    const [canScrollDown, setCanScrollDown] = React.useState(false);
    const composedRefs = useComposedRefs(forwardedRef, viewportContext.onScrollButtonChange);

    useLayoutEffect(() => {
      if (contentContext.viewport && contentContext.isPositioned) {
        const viewport = contentContext.viewport;
        const handleScroll = () => {
          const maxScroll = viewport.scrollHeight - viewport.clientHeight;
          // we use Math.ceil here because if the UI is zoomed-in
          // `scrollTop` is not always reported as an integer
          const canScrollDown = Math.ceil(viewport.scrollTop) < maxScroll;
          setCanScrollDown(canScrollDown);
        };
        handleScroll();
        viewport.addEventListener('scroll', handleScroll);
        return () => viewport.removeEventListener('scroll', handleScroll);
      }
    }, [contentContext.viewport, contentContext.isPositioned]);

    return canScrollDown ? (
      <ComboboxScrollButtonImpl
        {...props}
        ref={composedRefs}
        onAutoScroll={() => {
          const { viewport, comboboxedItem } = contentContext;
          if (viewport && comboboxedItem) {
            viewport.scrollTop = viewport.scrollTop + comboboxedItem.offsetHeight;
          }
        }}
      />
    ) : null;
  },
);

ComboboxScrollDownButton.displayName = SCROLL_DOWN_BUTTON_NAME;

type ComboboxScrollButtonImplElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxScrollButtonImplProps extends PrimitiveDivProps {
  onAutoScroll(): void;
}

const ComboboxScrollButtonImpl = React.forwardRef<ComboboxScrollButtonImplElement, ComboboxScrollButtonImplProps>(
  (props: ScopedProps<ComboboxScrollButtonImplProps>, forwardedRef) => {
    const { __scopeCombobox, onAutoScroll, ...scrollIndicatorProps } = props;
    const contentContext = useComboboxContentContext('ComboboxScrollButton', __scopeCombobox);
    const autoScrollTimerRef = React.useRef<number | null>(null);
    const getItems = useCollection(__scopeCombobox);

    const clearAutoScrollTimer = React.useCallback(() => {
      if (autoScrollTimerRef.current !== null) {
        window.clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    }, []);

    React.useEffect(() => {
      return () => clearAutoScrollTimer();
    }, [clearAutoScrollTimer]);

    // When the viewport becomes scrollable on either side, the relevant scroll button will mount.
    // Because it is part of the normal flow, it will push down (top button) or shrink (bottom button)
    // the viewport, potentially causing the active item to now be partially out of view.
    // We re-run the `scrollIntoView` logic to make sure it stays within the viewport.
    useLayoutEffect(() => {
      const activeItem = getItems().find((item) => item.ref.current === document.activeElement);
      activeItem?.ref.current?.scrollIntoView({ block: 'nearest' });
    }, [getItems]);

    return (
      <Primitive.div
        aria-hidden
        {...scrollIndicatorProps}
        ref={forwardedRef}
        style={{ flexShrink: 0, ...scrollIndicatorProps.style }}
        onPointerDown={composeEventHandlers(scrollIndicatorProps.onPointerDown, () => {
          if (autoScrollTimerRef.current === null) {
            autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
          }
        })}
        onPointerMove={composeEventHandlers(scrollIndicatorProps.onPointerMove, () => {
          contentContext.onItemLeave?.();
          if (autoScrollTimerRef.current === null) {
            autoScrollTimerRef.current = window.setInterval(onAutoScroll, 50);
          }
        })}
        onPointerLeave={composeEventHandlers(scrollIndicatorProps.onPointerLeave, () => {
          clearAutoScrollTimer();
        })}
      />
    );
  },
);

/* -------------------------------------------------------------------------------------------------
 * ComboboxSeparator
 * ----------------------------------------------------------------------------------------------- */

const SEPARATOR_NAME = 'ComboboxSeparator';

type ComboboxSeparatorElement = React.ElementRef<typeof Primitive.div>;
interface ComboboxSeparatorProps extends PrimitiveDivProps {}

const ComboboxSeparator = React.forwardRef<ComboboxSeparatorElement, ComboboxSeparatorProps>(
  (props: ScopedProps<ComboboxSeparatorProps>, forwardedRef) => {
    const { __scopeCombobox, ...separatorProps } = props;
    return <Primitive.div aria-hidden {...separatorProps} ref={forwardedRef} />;
  },
);

ComboboxSeparator.displayName = SEPARATOR_NAME;

/* -------------------------------------------------------------------------------------------------
 * ComboboxArrow
 * ----------------------------------------------------------------------------------------------- */

const ARROW_NAME = 'ComboboxArrow';

type ComboboxArrowElement = React.ElementRef<typeof PopperPrimitive.Arrow>;
type PopperArrowProps = Radix.ComponentPropsWithoutRef<typeof PopperPrimitive.Arrow>;
interface ComboboxArrowProps extends PopperArrowProps {}

const ComboboxArrow = React.forwardRef<ComboboxArrowElement, ComboboxArrowProps>(
  (props: ScopedProps<ComboboxArrowProps>, forwardedRef) => {
    const { __scopeCombobox, ...arrowProps } = props;
    const popperScope = usePopperScope(__scopeCombobox);
    const context = useComboboxContext(ARROW_NAME, __scopeCombobox);
    const contentContext = useComboboxContentContext(ARROW_NAME, __scopeCombobox);
    return context.open && contentContext.position === 'popper' ? (
      <PopperPrimitive.Arrow {...popperScope} {...arrowProps} ref={forwardedRef} />
    ) : null;
  },
);

ComboboxArrow.displayName = ARROW_NAME;

/* ----------------------------------------------------------------------------------------------- */

const shouldShowPlaceholder = (value?: string) => value === '' || value === undefined;

const BubbleCombobox = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  (props, forwardedRef) => {
    const { value, ...comboboxProps } = props;
    const ref = React.useRef<HTMLInputElement>(null);
    const composedRefs = useComposedRefs(forwardedRef, ref);
    const prevValue = usePrevious(value);

    // Bubble value change to parents (e.g form change event)
    React.useEffect(() => {
      const combobox = ref.current!;
      const comboboxProto = window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(comboboxProto, 'value') as PropertyDescriptor;
      const setValue = descriptor.set;
      if (prevValue !== value && setValue) {
        const event = new Event('change', { bubbles: true });
        setValue.call(combobox, value);
        combobox.dispatchEvent(event);
      }
    }, [prevValue, value]);

    /**
     * We purposefully use a `combobox` here to support form autofill as much
     * as possible.
     *
     * We purposefully do not add the `value` attribute here to allow the value
     * to be set programatically and bubble to any parent form `onChange` event.
     * Adding the `value` will cause React to consider the programatic
     * dispatch a duplicate and it will get swallowed.
     *
     * We use `VisuallyHidden` rather than `display: "none"` because Safari autofill
     * won't work otherwise.
     */
    return (
      <VisuallyHidden asChild>
        <input {...comboboxProps} ref={composedRefs} defaultValue={value} />
      </VisuallyHidden>
    );
  },
);

BubbleCombobox.displayName = 'BubbleCombobox';

const useTypeaheadSearch = (onSearchChange: (search: string) => void) => {
  const handleSearchChange = useCallbackRef(onSearchChange);
  const searchRef = React.useRef('');
  const timerRef = React.useRef(0);

  const handleTypeaheadSearch = React.useCallback(
    (key: string) => {
      const search = searchRef.current + key;
      handleSearchChange(search);

      const updateSearch = (value: string) => {
        searchRef.current = value;
        window.clearTimeout(timerRef.current);
        // Reset `searchRef` 1 second after it was last updated
        if (value !== '') {
          timerRef.current = window.setTimeout(() => updateSearch(''), 1000);
        }
      };
      updateSearch(search);
    },
    [handleSearchChange],
  );

  const resetTypeahead = React.useCallback(() => {
    searchRef.current = '';
    window.clearTimeout(timerRef.current);
  }, []);

  React.useEffect(() => {
    return () => window.clearTimeout(timerRef.current);
  }, []);

  return [searchRef, handleTypeaheadSearch, resetTypeahead] as const;
};

/**
 * This is the "meat" of the typeahead matching logic. It takes in a list of items,
 * the search and the current item, and returns the next item (or `undefined`).
 *
 * We normalize the search because if a user has repeatedly pressed a character,
 * we want the exact same behavior as if we only had that one character
 * (ie. cycle through items starting with that character)
 *
 * We also reorder the items by wrapping the array around the current item.
 * This is so we always look forward from the current item, and picking the first
 * item will always be the correct one.
 *
 * Finally, if the normalized search is exactly one character, we exclude the
 * current item from the values because otherwise it would be the first to match always
 * and focus would never move. This is as opposed to the regular case, where we
 * don't want focus to move if the current item still matches.
 */
const findNextItem = <T extends { textValue: string }>(items: T[], search: string, currentItem?: T) => {
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0]);
  const normalizedSearch = isRepeated ? search[0] : search;
  const currentItemIndex = currentItem ? items.indexOf(currentItem) : -1;
  let wrappedItems = wrapArray(items, Math.max(currentItemIndex, 0));
  const excludeCurrentItem = normalizedSearch.length === 1;
  if (excludeCurrentItem) {
    wrappedItems = wrappedItems.filter((v) => v !== currentItem);
  }
  const nextItem = wrappedItems.find((item) => item.textValue.toLowerCase().startsWith(normalizedSearch.toLowerCase()));
  return nextItem !== currentItem ? nextItem : undefined;
};

/**
 * Wraps an array around itself at a given start index
 * Example: `wrapArray(['a', 'b', 'c', 'd'], 2) === ['c', 'd', 'a', 'b']`
 */
const wrapArray = <T,>(array: T[], startIndex: number) =>
  array.map((_, index) => array[(startIndex + index) % array.length]);

const Root = Combobox;
const Trigger = ComboboxTrigger;
const Value = ComboboxValue;
const Icon = ComboboxIcon;
const Portal = ComboboxPortal;
const Content = ComboboxContent;
const Viewport = ComboboxViewport;
const Group = ComboboxGroup;
const Label = ComboboxLabel;
const Item = ComboboxItem;
const ItemText = ComboboxItemText;
const ItemIndicator = ComboboxItemIndicator;
const ScrollUpButton = ComboboxScrollUpButton;
const ScrollDownButton = ComboboxScrollDownButton;
const Separator = ComboboxSeparator;
const Arrow = ComboboxArrow;

export {
  createComboboxScope,
  //
  Combobox,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxIcon,
  ComboboxPortal,
  ComboboxContent,
  ComboboxViewport,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxItem,
  ComboboxItemText,
  ComboboxItemIndicator,
  ComboboxScrollUpButton,
  ComboboxScrollDownButton,
  ComboboxSeparator,
  ComboboxArrow,
  //
  Root,
  Trigger,
  Value,
  Icon,
  Portal,
  Content,
  Viewport,
  Group,
  Label,
  Item,
  ItemText,
  ItemIndicator,
  ScrollUpButton,
  ScrollDownButton,
  Separator,
  Arrow,
};
export type {
  ComboboxProps,
  ComboboxTriggerProps,
  ComboboxValueProps,
  ComboboxIconProps,
  ComboboxPortalProps,
  ComboboxContentProps,
  ComboboxViewportProps,
  ComboboxGroupProps,
  ComboboxLabelProps,
  ComboboxItemProps,
  ComboboxItemTextProps,
  ComboboxItemIndicatorProps,
  ComboboxScrollUpButtonProps,
  ComboboxScrollDownButtonProps,
  ComboboxSeparatorProps,
  ComboboxArrowProps,
};
