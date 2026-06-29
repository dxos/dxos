//
// Copyright 2026 DXOS.org
//

import { type TabsterDOMAttribute, useArrowNavigationGroup } from '@fluentui/react-tabster';
import { type FocusEvent, useCallback, useMemo } from 'react';

export type ListNavigationMode = 'list' | 'listbox' | 'grid';

export type UseListNavigationOptions = {
  /**
   * Determines the bundled ARIA role + keyboard wiring.
   *
   * - `list` — `role='list'` items are `role='listitem'`. Arrow keys move focus among
   *   interactive descendants of the row (handles, buttons). No selection semantics.
   * - `listbox` — `role='listbox'` items are `role='option'`. Arrow keys move focus
   *   between options; `memorizeCurrent` keeps the last-focused option when re-entering.
   * - `grid` — `role='grid'` items are `role='row'`. Two-axis arrow navigation.
   */
  mode: ListNavigationMode;
  /**
   * Override default axis. `list` and `listbox` default to `'vertical'`; `grid`
   * defaults to `'grid'` (two-axis). Set explicitly when a horizontal list is needed.
   */
  axis?: 'vertical' | 'horizontal' | 'grid' | 'grid-linear' | 'both';
  /**
   * Remember the last-focused item when re-entering the group. Defaults to `true`.
   * Only meaningful for `listbox` mode.
   */
  memorizeCurrent?: boolean;
};

type ContainerRole = 'list' | 'listbox' | 'grid';
type ItemRole = 'listitem' | 'option' | 'row';

export type UseListNavigationReturn = {
  /**
   * Spread onto the container element to apply role + ARIA + Tabster attributes.
   * Also wires a focus-on-entry handler that redirects to the selected or first
   * focusable item — Tabster doesn't cover initial focus, only traversal.
   *
   * The shape is intentionally open — Tabster's `useArrowNavigationGroup` returns
   * `TabsterDOMAttribute` (one or more `data-tabster*` attributes that may be undefined
   * when the runtime is disabled), and the precise key set isn't part of Tabster's
   * stable contract.
   */
  containerProps: TabsterDOMAttribute & {
    role: ContainerRole;
    'aria-orientation'?: 'vertical' | 'horizontal';
    onFocus: (event: FocusEvent<HTMLElement>) => void;
  };
  /**
   * Apply to each item. Returns role, tabIndex, and aria-disabled. Disabled options remain
   * focusable so screen readers can announce them, per WAI-ARIA listbox guidance.
   */
  itemProps: (opts?: { disabled?: boolean }) => {
    role: ItemRole;
    tabIndex: number;
    'aria-disabled'?: true;
  };
};

const containerRoleByMode: Record<ListNavigationMode, ContainerRole> = {
  list: 'list',
  listbox: 'listbox',
  grid: 'grid',
};

const itemRoleByMode: Record<ListNavigationMode, ItemRole> = {
  list: 'listitem',
  listbox: 'option',
  grid: 'row',
};

const defaultAxisByMode: Record<ListNavigationMode, 'vertical' | 'horizontal' | 'grid'> = {
  list: 'vertical',
  listbox: 'vertical',
  grid: 'grid',
};

/**
 * Find the focus-on-entry target inside a listbox container: the currently-selected
 * option, or the first non-disabled option. Used to give arrow-key navigation a
 * meaningful starting point when focus first lands on the listbox itself.
 */
const findListboxEntryTarget = (container: HTMLElement): HTMLElement | null => {
  return (
    container.querySelector<HTMLElement>('[role="option"][aria-selected="true"]:not([aria-disabled="true"])') ??
    container.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])')
  );
};

/**
 * Keyboard navigation + ARIA role aspect for list-shaped surfaces. Wraps Tabster's
 * `useArrowNavigationGroup` with a `mode` that selects the appropriate role bundle
 * and adds a focus-on-entry redirect (Tabster handles traversal once focus is on a
 * child; first-entry is the consumer's responsibility).
 *
 * The canonical roving-tabindex keyboard aspect. Currently consumed by `Listbox` and
 * `OrderedList`; `Tree` (Treegrid), `Picker`/`Combobox` (input-driven virtual focus), and
 * `Mosaic.Stack` still ship bespoke navigation — see `react-ui-list/AUDIT.md` for the
 * convergence analysis. Non-list focus zones — e.g. Composer's multi-pane chrome — keep
 * their own Tabster wiring (`Focus.Group`).
 */
export const useListNavigation = ({
  mode,
  axis,
  memorizeCurrent = true,
}: UseListNavigationOptions): UseListNavigationReturn => {
  const tabsterAttrs = useArrowNavigationGroup({
    axis: axis ?? defaultAxisByMode[mode],
    memorizeCurrent,
  });

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) {
        // Focus is already on a descendant; Tabster handles traversal from here.
        return;
      }
      if (mode !== 'listbox') {
        return;
      }
      // First-time entry on the listbox itself: redirect focus into a meaningful child
      // so arrow keys have an immediate starting point.
      const target = findListboxEntryTarget(event.currentTarget);
      target?.focus();
    },
    [mode],
  );

  // `aria-orientation` only accepts 'vertical' or 'horizontal'. Tabster's `axis` permits
  // grid-shaped values too ('grid', 'grid-linear', 'both'); collapse those (and the grid mode
  // itself) so we never leak an invalid ARIA value into the DOM.
  const orientation: 'vertical' | 'horizontal' | undefined =
    mode === 'grid' ? undefined : axis === 'horizontal' ? 'horizontal' : 'vertical';

  const containerProps = useMemo(
    () => ({
      role: containerRoleByMode[mode],
      ...(orientation && { 'aria-orientation': orientation }),
      ...tabsterAttrs,
      onFocus: handleFocus,
    }),
    [mode, orientation, tabsterAttrs, handleFocus],
  );

  // Listbox items need tabIndex=0 so Tabster can focus them; list/grid items inherit
  // their tabIndex from their interactive descendants (button-shaped handles, links).
  const itemRole = itemRoleByMode[mode];
  const itemTabIndex = mode === 'listbox' ? 0 : -1;
  const itemProps = useCallback(
    ({ disabled }: { disabled?: boolean } = {}) => ({
      role: itemRole,
      tabIndex: itemTabIndex,
      ...(disabled && { 'aria-disabled': true as const }),
    }),
    [itemRole, itemTabIndex],
  );

  return { containerProps, itemProps };
};
