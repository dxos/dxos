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

import { composableProps, slottable } from '@dxos/ui-theme';
import { type Axis } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks';

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
    const { tx } = useThemeContext();
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

    const { className, ...rest } = composableProps(props);
    return (
      <FocusContext.Provider value={{ setFocus: setState, groupHasFocus }}>
        <Comp
          {...rest}
          tabIndex={0}
          className={tx('focus.group', { border }, className)}
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
    const { tx } = useThemeContext();
    // Tell tabster's groupper to ignore Enter so it doesn't move focus into the group.
    const focusableGroupAttrs = useFocusableGroup({ ignoreDefaultKeydown: { Enter: true } });
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

    // Controlled `current` prop takes precedence (e.g., virtualized items that scroll back into view).
    // Otherwise fall back to DOM focus state.
    const isCurrent = current ?? focused;

    const { className, ...rest } = composableProps(props);
    return (
      <Comp
        {...rest}
        tabIndex={0}
        className={tx('focus.item', { border }, className)}
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
