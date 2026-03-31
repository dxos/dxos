//
// Copyright 2026 DXOS.org
//

import {
  useArrowNavigationGroup,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';

import { type Axis } from '@dxos/ui-types';
import { composableProps, mx, slottable } from '@dxos/ui-theme';

//
// Context
//

type FocusState = 'active' | 'error';

const FOCUS_STATE_ATTR = 'focus-state';

type ContextValue = {
  setFocus?: (state: FocusState | undefined) => void;
  /** True when any item within the group has DOM focus. */
  groupHasFocus?: boolean;
};

const FocusContext = createContext<ContextValue>({});

const useFocus = () => useContext(FocusContext);

/**
 * Focus ring styles shared by Group and Item.
 * Uses a `::after` pseudo-element overlay so the ring paints above child content
 * (inset box-shadow alone is obscured by children with backgrounds).
 * The pseudo-element is `pointer-events-none` and absolutely positioned over the element.
 * When `border` is true, a subdued CSS border is always visible (e.g., for grid cell edges).
 */
const focusRingStyles = (border: boolean) =>
  mx(
    // Base: relative for pseudo-element positioning, suppress default outline.
    'relative outline-hidden',
    // Optional always-visible border.
    border && 'border border-separator',
    // Pseudo-element overlay for focus ring.
    'after:content-[""] after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:ring after:ring-inset after:ring-transparent',
    'focus:after:ring-neutral-focus-indicator',
    'data-[focus-state=active]:after:ring-neutral-focus-indicator',
    'data-[focus-state=error]:after:ring-rose-500',
  );

//
// Group
//

type GroupProps = {
  orientation?: Axis;
  /** Show a subdued ring when unfocused (e.g., as a cell border). */
  border?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * Provides arrow-key navigation across focusable children via tabster.
 * Does not manage `aria-current` — use `Focus.Item` on each child for that.
 */
// TODO(wittjosiah): Consider how this could integrate with with react-ui-attention.
//   Perhaps react-ui-attention comes under the mosaic umbrella as it supports selection?
const Group = slottable<HTMLDivElement, GroupProps>(
  ({ children, asChild, orientation = 'vertical', border = false, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    const rootRef = useRef<HTMLDivElement>(null);
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: orientation, memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);
    const [state, setState] = useState<FocusState | undefined>();
    const [groupHasFocus, setGroupHasFocus] = useState(false);

    const handleFocusIn = useCallback(() => setGroupHasFocus(true), []);
    const handleFocusOut = useCallback((event: FocusEvent<HTMLDivElement>) => {
      const related = event.relatedTarget as HTMLElement | null;
      if (!related || !rootRef.current?.contains(related)) {
        setGroupHasFocus(false);
      }
    }, []);

    return (
      <FocusContext.Provider value={{ setFocus: setState, groupHasFocus }}>
        <Comp
          {...composableProps(props, { tabIndex: 0, className: focusRingStyles(border) })}
          {...tabsterAttrs}
          {...(state && {
            [`data-${FOCUS_STATE_ATTR}`]: state,
          })}
          onBlur={handleFocusOut}
          onFocus={handleFocusIn}
          ref={useComposedRefs<HTMLDivElement>(rootRef, forwardedRef)}
        >
          {children}
        </Comp>
      </FocusContext.Provider>
    );
  },
);

//
// Item
//

type ItemProps = {
  current?: boolean;
  /** Show a subdued ring when unfocused (e.g., as a cell border). */
  border?: boolean;
  onCurrentChange?: () => void;
};

/**
 * Focusable item within a `Focus.Group`.
 * Uses `useFocusableGroup` so the parent Group's arrow navigation treats this as a single unit
 * (internal buttons are not arrow-navigation targets; Enter/Escape to go in/out).
 * Supports controlled (`current` prop) and uncontrolled (focus-driven) `aria-current`.
 */
const Item = slottable<HTMLDivElement, ItemProps>(
  (
    { children, asChild, current, border = false, onCurrentChange, onClick, onFocus, onBlur, ...props },
    forwardedRef,
  ) => {
    const Comp = asChild ? Slot : Primitive.div;
    // Tell tabster's groupper to ignore Enter so it doesn't move focus into the group.
    const focusableGroupAttrs = useFocusableGroup({ ignoreDefaultKeydown: { Enter: true } });
    const { groupHasFocus } = useFocus();
    const [focused, setFocused] = useState(false);

    const handleClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        onCurrentChange?.();
        onClick?.(event);
      },
      [onCurrentChange, onClick],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter') {
          onCurrentChange?.();
        }
      },
      [onCurrentChange],
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        setFocused(true);
        onFocus?.(event);
      },
      [onFocus],
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        setFocused(false);
        onBlur?.(event);
      },
      [onBlur],
    );

    // When navigating (group has focus), only the focused item is current.
    // When the group loses focus, fall back to the controlled `current` prop.
    const isCurrent = groupHasFocus ? focused : (current ?? focused);

    return (
      <Comp
        {...composableProps(props, { tabIndex: 0, className: focusRingStyles(border) })}
        {...focusableGroupAttrs}
        aria-current={isCurrent || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

//
// Focus
//

export const Focus = {
  Group,
  Item,
};

export type { GroupProps as FocusGroupProps, ItemProps as FocusItemProps };

export { useFocus };
