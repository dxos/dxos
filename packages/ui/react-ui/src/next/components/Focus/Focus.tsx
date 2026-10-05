//
// Copyright 2026 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import React, {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useFocusGroup } from '@dxos/react-focus';
import { useComposedRefs } from '@dxos/react-hooks';
import { type Axis } from '@dxos/ui-types';

import { composableProps, slottable } from '../../../util/index.ts';
import { recipes } from '../../recipes.ts';
import { FocusContext, type FocusState } from './FocusContext.ts';

//
// Group
//

type FocusGroupProps = {
  orientation?: Axis;
  /** A separator-coloured border while unfocused (e.g. a grid cell's edge). */
  border?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * One `Tab` stop over focusable children: arrow keys move between them, `Enter` moves into the group and `Escape`
 * leaves it. Members report a state (`useFocus().setFocus`) that colours the group's ring.
 */
const FocusGroup = slottable<HTMLDivElement, FocusGroupProps>(
  ({ children, asChild, orientation = 'vertical', border, onKeyDown, ...props }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ axis: orientation, tabBehavior: 'limited-trap-focus', memorizeCurrent: true });
    const [state, setState] = useState<FocusState | undefined>();
    const [groupHasFocus, setGroupHasFocus] = useState(false);
    const context = useMemo(() => ({ setFocus: setState, groupHasFocus }), [groupHasFocus]);

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLDivElement>) => {
        onFocusGroupKeyDown(event);
        onKeyDown?.(event);
      },
      [onFocusGroupKeyDown, onKeyDown],
    );

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLDivElement>) => {
        onFocusGroupFocus(event);
        setGroupHasFocus(true);
      },
      [onFocusGroupFocus],
    );

    // Focus moving between members bubbles a blur too; only focus leaving the group clears it.
    const handleBlur = useCallback((event: FocusEvent<HTMLDivElement>) => {
      if (!(event.relatedTarget instanceof Node) || !rootRef.current?.contains(event.relatedTarget)) {
        setGroupHasFocus(false);
      }
    }, []);

    const { className, ...rest } = composableProps(props, { classNames: recipes.focusGroup() });
    return (
      <FocusContext.Provider value={context}>
        <ark.div
          asChild={asChild}
          {...rest}
          tabIndex={0}
          {...focusGroupAttrs}
          data-scope='focus'
          data-part='group'
          data-orientation={orientation}
          data-border={border ? '' : undefined}
          data-focus-state={state}
          className={className}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={useComposedRefs<HTMLDivElement>(rootRef, forwardedRef, focusGroupRef)}
        >
          {children}
        </ark.div>
      </FocusContext.Provider>
    );
  },
);

FocusGroup.displayName = 'Focus.Group';

//
// Item
//

type FocusItemProps = {
  /** Controlled `aria-current`; otherwise the item is current while it has focus. */
  current?: boolean;
  /** A separator-coloured border while unfocused. */
  border?: boolean;
  /** Called on click and on `Enter`. */
  onCurrentChange?: () => void;
};

/**
 * A member of a `Focus.Group`, moved between as one unit: its own controls are not arrow targets, `Enter` selects it
 * rather than moving into it, and `Escape` returns focus to it.
 */
const FocusItem = slottable<HTMLDivElement, FocusItemProps>(
  ({ children, asChild, current, border, onCurrentChange, onClick, onFocus, onBlur, ...props }, forwardedRef) => {
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

    // A controlled `current` wins, so a virtualized item scrolled back into view keeps its state.
    const isCurrent = current ?? focused;

    const { className, ...rest } = composableProps(props, { classNames: recipes.focusItem() });
    return (
      <ark.div
        asChild={asChild}
        {...rest}
        tabIndex={0}
        {...focusGroupAttrs}
        data-scope='focus'
        data-part='item'
        data-border={border ? '' : undefined}
        aria-current={isCurrent || undefined}
        className={className}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, focusGroupRef)}
      >
        {children}
      </ark.div>
    );
  },
);

FocusItem.displayName = 'Focus.Item';

export const Focus = {
  Group: FocusGroup,
  Item: FocusItem,
};

export type { FocusGroupProps, FocusItemProps };
