//
// Copyright 2026 DXOS.org
//

// `RowList` — Radix-style compound navigation list.
//
// Compound shape (matches Radix Select / Toolbar / Tabs):
//
//   <RowList.Root currentId={…} onCurrentChange={…}>
//     <RowList.Viewport thin padding>
//       <RowList.Content aria-label='Tools'>
//         <Row id='a'>…</Row>
//         <Row id='b'>…</Row>
//       </RowList.Content>
//     </RowList.Viewport>
//   </RowList.Root>
//
//   - `Root`     — headless context provider (no DOM). Owns the
//                  `currentId` model.
//   - `Viewport` — `ScrollArea.Root` + `ScrollArea.Viewport`. Always
//                  scrolls. Forwards ScrollArea knobs (`thin`, `padding`,
//                  `centered`) so callers don't have to wrap manually.
//   - `Content`  — the `<ul>` holding the items. Carries the listbox
//                  role, the tabster arrow-nav group, and the
//                  `aria-label`.
//   - `Row`      — option item (`<li>` with `aria-current` on the
//                  current row, paired with `dx-current` styling).
//
// Single visual variant. Card-style rendering, denser/wider rows,
// dividers, etc. are styling concerns layered on via `classNames` —
// not separate components. (An earlier draft exposed `Card`/`CardList`;
// pulled out so the layer has one shape and styling is a separate
// problem.)
//
// Current vs selection — what THIS layer tracks:
//
//   This layer tracks "current" — the item the user has navigated to
//   (via click, arrow keys, or focus). One item at a time.
//   `aria-current="true"` on the row, paired with `dx-current` styling.
//
//   "Selection" is a deliberately separate concern: an explicit action
//   on top of navigation (e.g. clicking a checkbox, double-clicking,
//   pressing Enter to commit), capable of multi-select. When that lands
//   it'll be a separate model property — likely a reactive atom owning
//   `Set<string>` — and pair with `aria-selected` / `dx-selected`. The
//   two can coexist on the same row (current ≠ selected). For now this
//   layer offers only the navigation half; selection is a future
//   expansion point.
//
// Composability:
//
//   `Viewport`, `Content`, and `Row` are all `slottable()` from
//   `@dxos/ui-theme` — accept `asChild`, merge `classNames` + parent-
//   Slot `className` via `composableProps()`. `Root` is plain React;
//   it renders no DOM, so there's nothing to slot.
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
//   `Content` redirects focus into the current option (or the first
//   one) so arrow keys have an immediate starting point.
//
// What this layer deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`.
//   - Multi-select / explicit-action selection (see "Current vs
//     selection" above; future expansion point).

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type FocusEvent,
  type ForwardedRef,
  type MouseEvent,
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import { ScrollArea, type ScrollAreaRootProps } from '@dxos/react-ui';
import { composableProps, slottable } from '@dxos/ui-theme';

const ROW_LIST_VIEWPORT_NAME = 'RowList.Viewport';
const ROW_LIST_CONTENT_NAME = 'RowList.Content';
const ROW_NAME = 'List.Row';

//
// Context.
//

type ListContextValue = {
  /** The currently-navigated / focused option id. */
  currentId?: string;
  /** Set the current option (called from click, arrow nav, focus). */
  setCurrent: (id: string) => void;
};

const ListContext = createContext<ListContextValue | null>(null);

const useListContext = (componentName: string): ListContextValue => {
  const ctx = useContext(ListContext);
  if (!ctx) {
    throw new Error(`<${componentName}> must be used inside <RowList.Root>`);
  }
  return ctx;
};

//
// Root — headless context provider. Renders no DOM.
//

type RootProps = PropsWithChildren<{
  /** Currently-navigated option id (controlled). */
  currentId?: string;
  /** Initial current option for uncontrolled mode. */
  defaultCurrentId?: string;
  /**
   * Called when the user navigates to a different option (click, arrow
   * keys, focus). Receives the option's `id` prop.
   */
  onCurrentChange?: (id: string) => void;
}>;

const Root = ({ currentId, defaultCurrentId, onCurrentChange, children }: RootProps) => {
  // `useControllableState`'s `onChange` is typed `(state: string | undefined) => void`,
  // but our public `onCurrentChange` is `(id: string) => void` (an `id` is always
  // a string when emitted). Wrap to satisfy the type without leaking
  // `undefined` to callers.
  const [resolved, setResolved] = useControllableState<string | undefined>({
    prop: currentId,
    defaultProp: defaultCurrentId,
    onChange: (next) => {
      if (next !== undefined) {
        onCurrentChange?.(next);
      }
    },
  });

  const setCurrent = useCallback((id: string) => setResolved(id), [setResolved]);

  const ctx = useMemo<ListContextValue>(
    () => ({ currentId: resolved, setCurrent }),
    [resolved, setCurrent],
  );

  return <ListContext.Provider value={ctx}>{children}</ListContext.Provider>;
};

Root.displayName = 'RowList.Root';

//
// Viewport — ScrollArea wrapper. Always scrolls; forwards ScrollArea knobs.
//

// Subset of ScrollArea.Root props that make sense on a list viewport.
// `orientation` is fixed to 'vertical' — pass other knobs (autoHide,
// snap, …) directly via `<RowList.Viewport asChild><ScrollArea.Root …>`.
type ViewportOwnProps = Pick<ScrollAreaRootProps, 'thin' | 'padding' | 'centered'>;

const Viewport = slottable<HTMLDivElement, ViewportOwnProps>((props, forwardedRef) => {
  const { thin, padding, centered, children, ...rest } = props as PropsWithChildren<
    ViewportOwnProps & Record<string, unknown>
  >;
  const composed = composableProps<HTMLDivElement>(rest, { classNames: 'dx-container' });
  return (
    <ScrollArea.Root
      orientation='vertical'
      thin={thin}
      padding={padding}
      centered={centered}
      {...composed}
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

type ContentOwnProps = {
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

const Content = slottable<HTMLUListElement, ContentOwnProps>((props, forwardedRef) => {
  // Touch the context so Content fails loudly if used outside Root.
  useListContext(ROW_LIST_CONTENT_NAME);

  // Tabster arrow-key navigation. `useTabster` auto-initializes the
  // runtime on first call, so no app/storybook-level setup is required.
  // The data attributes returned here go onto the focusable container
  // — the `<ul>` rendered by the primitive `<List>`.
  const arrowGroup = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });

  const { children, ...rest } = props as PropsWithChildren<ContentOwnProps & Record<string, unknown>>;

  // When focus first enters the `<ul>` itself (e.g. user tabs in),
  // redirect into the current option (or the first enabled one) so
  // arrow keys have an immediate starting point. Tabster doesn't do
  // this — it manages traversal once focus is already on a child.
  const handleFocus = useCallback((event: FocusEvent<HTMLUListElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    const ul = event.currentTarget;
    const current = ul.querySelector<HTMLLIElement>(
      '[role="option"][aria-current="true"]:not([aria-disabled="true"])',
    );
    const target = current ?? firstEnabledOption(ul);
    target?.focus();
  }, []);

  // Render via the primitive `<List>` so descendant `<ListItem>`s
  // satisfy their Radix context-scope check. We don't pass `selectable`
  // — this layer tracks `aria-current`, not `aria-selected` (see header
  // "Current vs selection"); the primitive only sets `aria-selected`
  // when `selectable` is true.
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
  /** Stable identifier; matched against the parent's `currentId`. */
  id: string;
  /** Disable the row — focusable but doesn't update current, dimmed. */
  disabled?: boolean;
  /** Optional click handler in addition to navigation. */
  onClick?: (event: MouseEvent<HTMLLIElement>) => void;
  /** Optional focus handler in addition to current-follows-focus. */
  onFocus?: (event: FocusEvent<HTMLLIElement>) => void;
}>;

// `dx-current` pairs with `aria-current="true"` (set per-option below);
// see `ui-theme/src/css/components/selected.md`.
const ROW_BASE = 'dx-hover dx-current px-3 py-2 cursor-pointer outline-none border-b border-separator last:border-b-0';

const Row = slottable<HTMLLIElement, RowProps>((props, forwardedRef) => {
  const { id, disabled, onClick, onFocus, children, ...rest } = props as RowProps & Record<string, unknown>;
  const { currentId, setCurrent } = useListContext(ROW_NAME);
  const isCurrent = currentId === id;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLLIElement>) => {
      if (disabled) {
        return;
      }
      setCurrent(id);
      onClick?.(event);
    },
    [disabled, id, setCurrent, onClick],
  );

  // Current-follows-focus: arrow nav (and any focus path) updates
  // `currentId` so the model stays in sync with what the user is
  // looking at. Disabled rows are still focusable for screen-reader
  // announcement but don't update the current model.
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLLIElement>) => {
      if (!disabled && currentId !== id) {
        setCurrent(id);
      }
      onFocus?.(event);
    },
    [disabled, currentId, id, setCurrent, onFocus],
  );

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: [ROW_BASE, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain
  // keyboard-navigable for SR announcement; the current model is not
  // updated for disabled rows (see `handleFocus` / `handleClick` above).
  return (
    <ListItem
      {...composed}
      role='option'
      tabIndex={0}
      aria-current={isCurrent ? 'true' : undefined}
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

//
// Public namespace.
//

const RowList = {
  Root,
  Viewport,
  Content,
};

export { RowList, Row };
export type {
  RootProps as RowListRootProps,
  ViewportOwnProps as RowListViewportProps,
  ContentOwnProps as RowListContentProps,
  RowProps,
};
