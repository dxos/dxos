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
  useState,
} from 'react';

import { type Axis } from '@dxos/react-ui';
import { composableProps, mx, slottable } from '@dxos/ui-theme';

// TODO(burdon): Move into react-ui.

//
// Context
//

type FocusState = 'active' | 'error';

const FOCUS_STATE_ATTR = 'focus-state';

type ContextValue = {
  setFocus?: (state: FocusState | undefined) => void;
};

const FocusContext = createContext<ContextValue>({});

const useFocus = () => useContext(FocusContext);

//
// Group
//

type GroupProps = {
  orientation?: Axis;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * Provides arrow-key navigation across focusable children via tabster.
 * Does not manage `aria-current` — use `Focus.Item` on each child for that.
 */
// TODO(wittjosiah): Consider how this could integrate with with react-ui-attention.
//   Perhaps react-ui-attention comes under the mosaic umbrella as it supports selection?
const Group = slottable<HTMLDivElement, GroupProps>(
  ({ children, asChild, orientation = 'vertical', ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited-trap-focus' });
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: orientation, memorizeCurrent: true });
    const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);
    const [state, setState] = useState<FocusState | undefined>();

    // TODO(burdon): Move into react-ui and use theme styles (focus.ts).
    // TODO(burdon): Ring (box-shadow) requires a margin.
    return (
      <FocusContext.Provider value={{ setFocus: setState }}>
        <Comp
          {...composableProps(props, {
            tabIndex: 0,
            className: mx([
              'ring-0 outline-hidden border border-separator rounded-xs',
              // Focus (e.g., via tabster).
              'focus:border-neutral-focus-indicator',
              // Active (e.g., drop target).
              'data-[focus-state=active]:border-neutral-focus-indicator',
              // Error
              'data-[focus-state=error]:border-rose-500',
            ]),
          })}
          {...tabsterAttrs}
          {...(state && { [`data-${FOCUS_STATE_ATTR}`]: state })}
          ref={useComposedRefs<HTMLDivElement>(forwardedRef)}
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
  onCurrentChange?: () => void;
};

/**
 * Focusable item within a `Focus.Group`.
 * Uses `useFocusableGroup` so the parent Group's arrow navigation treats this as a single unit
 * (internal buttons are not arrow-navigation targets; Enter/Escape to go in/out).
 * Supports controlled (`current` prop) and uncontrolled (focus-driven) `aria-current`.
 */
const Item = slottable<HTMLDivElement, ItemProps>(
  ({ children, asChild, current, onCurrentChange, onClick, onFocus, onBlur, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    const focusableGroupAttrs = useFocusableGroup();
    const controlled = current !== undefined;
    const [focused, setFocused] = useState(false);

    const handleClick = useCallback(
      (event: MouseEvent<HTMLDivElement>) => {
        onCurrentChange?.();
        onClick?.(event);
      },
      [onCurrentChange, onClick],
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        if (!controlled) {
          setFocused(true);
        }
        onFocus?.(event);
      },
      [controlled, onFocus],
    );

    const handleBlur = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        if (!controlled) {
          setFocused(false);
        }
        onBlur?.(event);
      },
      [controlled, onBlur],
    );

    const isCurrent = controlled ? current : focused;

    return (
      <Comp
        {...composableProps(props, {
          tabIndex: 0,
          className: 'outline-hidden',
        })}
        {...focusableGroupAttrs}
        aria-current={isCurrent || undefined}
        onClick={handleClick}
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
