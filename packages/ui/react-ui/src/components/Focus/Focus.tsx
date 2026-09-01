//
// Copyright 2026 DXOS.org
//

import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type FocusEvent, type KeyboardEvent, type MouseEvent, useCallback, useRef, useState } from 'react';

import { useFocusGroup } from '@dxos/react-focus';
import { type Axis } from '@dxos/ui-types';

import { useThemeContext } from '../../hooks/index.ts';
import { composableProps, slottable } from '../../util/index.ts';
import { FOCUS_STATE_ATTR, FocusContext, type FocusState } from './FocusContext.ts';

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
 * Provides arrow-key navigation across focusable children, and makes the group a single `Tab`
 * stop that `Enter` moves into and `Escape` leaves.
 * Does not manage `aria-current` — use `Focus.Item` on each child for that.
 */
// TODO(wittjosiah): Consider how this could integrate with with react-ui-attention.
//   Perhaps react-ui-attention comes under the mosaic umbrella as it supports selection?
const Group = slottable<HTMLDivElement, GroupProps>(
  ({ children, asChild, orientation = 'vertical', border = false, onKeyDown, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    const rootRef = useRef<HTMLDivElement>(null);
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ axis: orientation, tabBehavior: 'limited-trap-focus', memorizeCurrent: true });
    const [state, setState] = useState<FocusState | undefined>();
    const [groupHasFocus, setGroupHasFocus] = useState(false);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onFocusGroupKeyDown(event);
        onKeyDown?.(event);
      },
      [onFocusGroupKeyDown, onKeyDown],
    );

    const handleFocusIn = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onFocusGroupFocus(event);
        setGroupHasFocus(true);
      },
      [onFocusGroupFocus],
    );
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
          {...focusGroupAttrs}
          {...(state && {
            [`data-${FOCUS_STATE_ATTR}`]: state,
          })}
          onBlur={handleFocusOut}
          onFocus={handleFocusIn}
          onKeyDown={handleKeyDown}
          ref={useComposedRefs<HTMLDivElement>(rootRef, forwardedRef, focusGroupRef)}
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
 * Marks itself a focus group so the parent Group's arrow navigation treats it as a single unit
 * (internal buttons are not arrow-navigation targets; Escape returns focus to the item).
 * Supports controlled (`current` prop) and uncontrolled (focus-driven) `aria-current`.
 */
const Item = slottable<HTMLDivElement, ItemProps>(
  (
    { children, asChild, current, border = false, onCurrentChange, onClick, onFocus, onBlur, ...props },
    forwardedRef,
  ) => {
    const Comp = asChild ? Slot : Primitive.div;
    const { tx } = useThemeContext();
    // Enter selects the item rather than moving focus into it.
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: _onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ tabBehavior: 'unlimited', ignoreKeys: ['Enter'] });
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
        onFocusGroupKeyDown(event);
        if (event.key === 'Enter') {
          onCurrentChange?.();
        }
      },
      [onFocusGroupKeyDown, onCurrentChange],
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
        {...focusGroupAttrs}
        aria-current={isCurrent || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, focusGroupRef)}
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
