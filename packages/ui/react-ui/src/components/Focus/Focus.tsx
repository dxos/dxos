//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

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

import { recipes } from '../../recipes.ts';
import { composableProps, slottable } from '../../util/slots.ts';
import { FocusContext, type FocusState } from './FocusContext.ts';

//
// Group
//

type FocusGroupProps = {
  /** `grid` moves to the member on screen in the arrow's direction; `grid-linear` does so for up and down only. */
  orientation?: Axis | 'grid' | 'grid-linear';
  /** Names the members at any depth, instead of the group's top-level focusables (e.g. a board's cards). */
  itemSelector?: string;
  /** A separator-coloured border while unfocused (e.g. a grid cell's edge). */
  border?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * One `Tab` stop over focusable children: arrow keys move between them, `Enter` moves into the group and `Escape`
 * leaves it. Members report a state (`useFocus().setFocus`) that colours the group's ring.
 */
const FocusGroup = slottable<HTMLDivElement, FocusGroupProps>(
  ({ children, asChild, orientation = 'vertical', itemSelector, border, onKeyDown, ...props }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ axis: orientation, itemSelector, tabBehavior: 'limited-trap-focus', memorizeCurrent: true });
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
  /** `aria-current`: the item is where the user is ("you are here"), set by the caller; focus alone does not set it. */
  current?: boolean;
  /**
   * `aria-selected`: the item is selected in its collection, drawn by the shared selected edge (`focus.css`). A selectable
   * item is an `option` unless it names its own role (e.g. `gridcell`); its collection must be the matching `listbox` or
   * `grid`.
   */
  selected?: boolean;
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
  (
    { children, asChild, current, selected, border, onCurrentChange, onClick, onFocus, onBlur, ...props },
    forwardedRef,
  ) => {
    const {
      ref: focusGroupRef,
      onKeyDown: onFocusGroupKeyDown,
      onFocus: _onFocusGroupFocus,
      ...focusGroupAttrs
    } = useFocusGroup({ tabBehavior: 'unlimited', ignoreKeys: ['Enter'] });

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
        // Focus is drawn by the focus ring; `current` and `selected` are the caller's states, never inferred from it.
        aria-current={current || undefined}
        // `aria-selected` is only valid on a selectable role, so a selectable item without one is an option.
        role={rest.role ?? (selected === undefined ? undefined : 'option')}
        aria-selected={selected}
        className={className}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={useComposedRefs<HTMLDivElement>(forwardedRef, focusGroupRef)}
      >
        {children}
      </ark.div>
    );
  },
);

FocusItem.displayName = 'Focus.Item';

//
// ItemBinding
//

/**
 * A collection item's selection and activation, as a selection hook (`useListSelection`) gives it. Every collection
 * (a list, a masonry, a mosaic stack or board) takes one per item as `itemProps(id)`, so they select alike.
 */
type FocusItemBinding = {
  'aria-selected'?: boolean;
  'onClick'?: (event: MouseEvent) => void;
  'onFocus'?: (event: FocusEvent) => void;
  /** Clicked, or Enter pressed while the item itself has focus (e.g. to open it). */
  'onActivate'?: (event: MouseEvent | KeyboardEvent) => void;
};

/** The item element's props for a binding: activation fires on click and on the item's own Enter, not a control's. */
const bindItem = (binding: FocusItemBinding | undefined) => ({
  'aria-selected': binding?.['aria-selected'],
  'onClick': (event: MouseEvent) => {
    binding?.onClick?.(event);
    binding?.onActivate?.(event);
  },
  'onFocus': binding?.onFocus,
  'onKeyDown': (event: KeyboardEvent) => {
    if (event.key === 'Enter' && event.target === event.currentTarget) {
      binding?.onActivate?.(event);
    }
  },
});

export type { FocusGroupProps as GroupProps, FocusItemBinding as ItemBinding, FocusItemProps as ItemProps };

export { FocusGroup as Group, FocusItem as Item, bindItem };
export { type FocusContextValue, type FocusState, useFocus } from './FocusContext.ts';
