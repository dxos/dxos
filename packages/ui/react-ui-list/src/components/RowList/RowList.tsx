//
// Copyright 2026 DXOS.org
//

// `RowList` — Radix-style compound listbox / single-select picker.
//
// Compound shape (matches Radix Select / Toolbar / Tabs):
//
//   <RowList.Root selectedId={…} onSelectChange={…}>
//     <RowList.Viewport thin padding>
//       <RowList.Content aria-label='Tools'>
//         <Row id='a'>…</Row>
//         <Row id='b'>…</Row>
//       </RowList.Content>
//     </RowList.Viewport>
//   </RowList.Root>
//
//   - `Root`     — headless context provider (no DOM). Owns the
//                  single-select `selectedId` model.
//   - `Viewport` — `ScrollArea.Root` + `ScrollArea.Viewport`. Always
//                  scrolls. Forwards ScrollArea knobs (`thin`, `padding`,
//                  `centered`).
//   - `Content`  — the `<ul role="listbox">` holding the items. Carries
//                  the tabster arrow-nav group and the `aria-label`.
//   - `Row`      — `<li role="option">` with `aria-selected` on the
//                  selected row, paired with `dx-selected` styling. See
//                  `ui-theme/src/css/components/selected.md`.
//
// Single visual variant. Card-style rendering, denser/wider rows,
// dividers, etc. are styling concerns layered on via `classNames` —
// not separate components.
//
// Selection model:
//
//   This layer ships single-select (`selectedId: string | undefined`).
//   Selection follows focus, so arrow keys + click both update it. This
//   matches the codebase's existing `useSelection(_, 'single')` convention
//   from `@dxos/react-ui-attention`.
//
//   Multi-select (`selectedIds: ReadonlySet<string>` + per-row checkbox
//   affordance) is a future expansion point. When it lands it'll likely
//   plumb through `react-ui-attention`'s `ViewStateManager` for
//   cross-context state sharing — but RowList itself can stay
//   provider-agnostic, with consumers wiring it as they need.
//
// Composability:
//
//   `Viewport`, `Content`, and `Row` are all `composable()` from
//   `@dxos/ui-theme` — they merge `classNames` + parent-Slot
//   `className` via `composableProps()` and accept any standard HTML
//   attributes. None expose `asChild`: Viewport can't (two nested
//   elements, no coherent slot target), and Content / Row would need
//   to abandon the `@dxos/react-list` primitive's context to honor it
//   — not worth the complexity for this layer. If a consumer needs a
//   `<button>`-as-row or a `<div>`-as-listbox, drop down to
//   `@dxos/react-list` directly.
//
// Keyboard:
//
//   `useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true })`
//   from `@fluentui/react-tabster` is applied to `Content`. Tabster
//   auto-initializes (`useTabster` lazy-creates the runtime) so no
//   provider setup is required at the app/storybook level. ArrowUp /
//   ArrowDown move focus among options.
//
//   When focus first lands on the `<ul>` itself (e.g. user tabs in),
//   `Content` redirects focus into the selected option (or the first
//   one) so arrow keys have an immediate starting point.
//
// What this layer deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`.
//   - Multi-select (see "Selection model" above; future expansion).

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type FocusEvent, type ForwardedRef, type MouseEvent, type PropsWithChildren, useCallback } from 'react';

import { List, ListItem } from '@dxos/react-list';
import { ScrollArea, type ScrollAreaRootProps } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';

const ROW_LIST_NAME = 'RowList';
const ROW_LIST_ROOT_NAME = 'RowList.Root';
const ROW_LIST_VIEWPORT_NAME = 'RowList.Viewport';
const ROW_LIST_CONTENT_NAME = 'RowList.Content';
const ROW_NAME = 'List.Row';

//
// Context — Radix-scoped so future composition (a tree of nested
// RowLists, or a parent like a Combobox embedding RowList) can read
// the right scope.
//

type RowListContextValue = {
  /** The currently-selected option id. */
  selectedId?: string;
  /** Set the selected option (called from click, arrow nav, focus). */
  setSelected: (id: string) => void;
};

const [createRowListContext, createRowListScope] = createContextScope(ROW_LIST_NAME, []);
const [RowListProvider, useRowListContext] = createRowListContext<RowListContextValue>(ROW_LIST_NAME);

//
// Root — headless context provider. Renders no DOM.
//

type RootProps = PropsWithChildren<{
  /** Currently-selected option id (controlled). */
  selectedId?: string;
  /** Initial selected option for uncontrolled mode. */
  defaultSelectedId?: string;
  /**
   * Called when the user picks a different option (click, arrow keys,
   * focus). Receives the option's `id` prop.
   */
  onSelectChange?: (id: string) => void;
}>;

const Root = ({ selectedId, defaultSelectedId, onSelectChange, children }: RootProps) => {
  // `useControllableState`'s `onChange` is typed `(state: string | undefined) => void`,
  // but our public `onSelectChange` is `(id: string) => void` (an `id` is always
  // a string when emitted). Wrap to satisfy the type without leaking
  // `undefined` to callers.
  const [resolved, setResolved] = useControllableState<string | undefined>({
    prop: selectedId,
    defaultProp: defaultSelectedId,
    onChange: (next) => {
      if (next !== undefined) {
        onSelectChange?.(next);
      }
    },
  });

  const setSelected = useCallback((id: string) => setResolved(id), [setResolved]);

  return (
    <RowListProvider scope={undefined} selectedId={resolved} setSelected={setSelected}>
      {children}
    </RowListProvider>
  );
};

Root.displayName = ROW_LIST_ROOT_NAME;

//
// Viewport — ScrollArea wrapper. Always scrolls; forwards ScrollArea knobs.
//

// Subset of ScrollArea.Root props that make sense on a list viewport.
// `orientation` is fixed to 'vertical' — for other knobs (autoHide,
// snap, …) build your own ScrollArea wrapper and skip Viewport.
//
// `Viewport` is `composable()` rather than `slottable()` because there
// is no coherent `asChild` semantic for a wrapper that always renders
// two nested elements (`ScrollArea.Root` containing `ScrollArea.Viewport`).
type ViewportProps = Pick<ScrollAreaRootProps, 'thin' | 'padding' | 'centered'>;

const Viewport = composable<HTMLDivElement, ViewportProps>((props, forwardedRef) => {
  const { thin, padding, centered, children, ...rest } = props as PropsWithChildren<
    ViewportProps & Record<string, unknown>
  >;
  return (
    <ScrollArea.Root
      {...composableProps<HTMLDivElement>(rest, { classNames: 'dx-container' })}
      {...{ thin, padding, centered }}
      orientation='vertical'
      ref={forwardedRef}
    >
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

Viewport.displayName = ROW_LIST_VIEWPORT_NAME;

//
// Content — the listbox `<ul>` (tabster arrow group + aria-label).
//

type ContentProps = {
  /**
   * Accessible label for the listbox. Strongly recommended; assistive
   * tech announces this when focus enters the list.
   */
  'aria-label'?: string;
};

// Find the first non-disabled `role='option'` descendant in DOM order.
// Used as the focus-on-entry target so we don't land on a disabled row.
const firstEnabledOption = (ul: HTMLElement | null): HTMLLIElement | null => {
  if (!ul) {
    return null;
  }
  return ul.querySelector<HTMLLIElement>('[role="option"]:not([aria-disabled="true"])');
};

const Content = composable<HTMLUListElement, ContentProps>((props, forwardedRef) => {
  // Touch the context so Content fails loudly if used outside Root.
  useRowListContext(ROW_LIST_CONTENT_NAME, undefined);

  // Tabster arrow-key navigation. `useTabster` auto-initializes the
  // runtime on first call, so no app/storybook-level setup is required.
  // The data attributes returned here go onto the focusable container —
  // the `<ul>` rendered by the primitive `<List>`.
  const arrowGroup = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });

  const { children, ...rest } = props as PropsWithChildren<ContentProps & Record<string, unknown>>;

  // When focus first enters the `<ul>` itself (e.g. user tabs in),
  // redirect into the selected option (or the first enabled one) so
  // arrow keys have an immediate starting point. Tabster doesn't do
  // this — it manages traversal once focus is already on a child.
  const handleFocus = useCallback((event: FocusEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const ul = event.currentTarget;
    const selected = ul.querySelector<HTMLLIElement>(
      '[role="option"][aria-selected="true"]:not([aria-disabled="true"])',
    );
    const target = selected ?? firstEnabledOption(ul);
    target?.focus();
  }, []);

  // Render via the primitive `<List>` so descendant `<ListItem>`s
  // satisfy their Radix context-scope check. We don't pass `selectable`
  // — we set `role='listbox'` and `aria-selected` ourselves in `Row`,
  // so the primitive's listbox-mode plumbing isn't needed.
  const composed = composableProps<HTMLUListElement>(rest, { classNames: 'flex flex-col' });
  return (
    <List
      variant='unordered'
      {...composed}
      {...arrowGroup}
      role='listbox'
      onFocus={handleFocus}
      ref={forwardedRef as unknown as ForwardedRef<HTMLOListElement>}
    >
      {children}
    </List>
  );
});

Content.displayName = ROW_LIST_CONTENT_NAME;

//
// Row — option item.
//

type RowProps = PropsWithChildren<{
  /** Stable identifier; matched against the parent's `selectedId`. */
  id: string;
  /** Disable the row — focusable but doesn't update selection, dimmed. */
  disabled?: boolean;
  /** Optional click handler in addition to selection. */
  onClick?: (event: MouseEvent<HTMLLIElement>) => void;
  /** Optional focus handler in addition to selection-follows-focus. */
  onFocus?: (event: FocusEvent<HTMLLIElement>) => void;
}>;

// `dx-selected` pairs with `aria-selected="true"` (set per-option below);
// see `ui-theme/src/css/components/selected.md`.
const ROW_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none'; // border-b border-separator last:border-b-0';

const Row = composable<HTMLLIElement, RowProps>((props, forwardedRef) => {
  const { id, disabled, onClick, onFocus, children, ...rest } = props as RowProps & Record<string, unknown>;
  const { selectedId, setSelected } = useRowListContext(ROW_NAME, undefined);
  const isSelected = selectedId === id;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLLIElement>) => {
      if (disabled) {
        return;
      }
      setSelected(id);
      onClick?.(event);
    },
    [disabled, id, setSelected, onClick],
  );

  // Selection-follows-focus: arrow nav (and any focus path) updates
  // `selectedId` so the model stays in sync with what the user is
  // looking at. Disabled rows are still focusable for screen-reader
  // announcement but don't update the selection model.
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLLIElement>) => {
      if (!disabled && selectedId !== id) {
        setSelected(id);
      }
      onFocus?.(event);
    },
    [disabled, selectedId, id, setSelected, onFocus],
  );

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: [ROW_BASE, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain
  // keyboard-navigable for SR announcement; the selection model is not
  // updated for disabled rows (see `handleFocus` / `handleClick` above).
  return (
    <ListItem
      {...composed}
      role='option'
      tabIndex={0}
      aria-selected={isSelected}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onFocus={handleFocus}
      ref={forwardedRef}
    >
      {children}
    </ListItem>
  );
});

Row.displayName = ROW_NAME;

/**
 * Read selection state for a single id, from inside any descendant of
 * `<RowList.Root>`. Returns `true` when the row is currently selected.
 * Lets composing components (e.g. `Listbox.OptionIndicator`) react to
 * selection without re-rendering on unrelated changes.
 */
const useRowListSelection = (id: string): boolean => {
  const { selectedId } = useRowListContext('useRowListSelection', undefined);
  return selectedId === id;
};

//
// Public namespace.
//

const RowList = {
  Root,
  Viewport,
  Content,
};

export { RowList, Row, createRowListScope, useRowListSelection };
export type {
  RootProps as RowListRootProps,
  ViewportProps as RowListViewportProps,
  ContentProps as RowListContentProps,
  RowProps,
};
