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
// Behaviour is layered via aspect hooks:
//
//   - `useListSelection({ mode: 'single' })` — controlled selectedId model with
//     selection-follows-focus.
//   - `useListNavigation({ mode: 'listbox' })` — Tabster arrow-key traversal, role
//     bundling (listbox / option), and focus-on-entry redirect to the selected option
//     (or first enabled option).
//
// Single visual variant. Card-style rendering, denser/wider rows, dividers, etc. are
// styling concerns layered on via `classNames` — not separate components.
//
// Selection model: single-select (`selectedId: string | undefined`). Selection follows
// focus, so arrow keys + click both update it. Matches the codebase's existing
// `useSelected(_, 'single')` convention from `@dxos/react-ui-attention`.
//
// Multi-select (`selectedIds: ReadonlySet<string>` + per-row checkbox affordance) is a
// future expansion point — `useListSelection` already supports the mode at the aspect
// level, but `RowList` ships single-select for now.
//
// Composability: `Viewport`, `Content`, and `Row` are `composable()` from `@dxos/react-ui`.
// They merge classNames + parent-Slot className via `composableProps()` and accept any
// standard HTML attributes. None expose `asChild`.
//
// What this layer deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`.

import { createContextScope } from '@radix-ui/react-context';
import React, {
  type FocusEvent,
  type ForwardedRef,
  type MouseEvent,
  type PropsWithChildren,
  useCallback,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import { ScrollArea, type ScrollAreaRootProps, composable, composableProps } from '@dxos/react-ui';

import {
  type SelectionItemBinding,
  type UseListSelectionReturn,
  useListNavigation,
  useListSelection,
} from '../../aspects';

const ROW_LIST_NAME = 'RowList';
const ROW_LIST_ROOT_NAME = 'RowList.Root';
const ROW_LIST_VIEWPORT_NAME = 'RowList.Viewport';
const ROW_LIST_CONTENT_NAME = 'RowList.Content';
const ROW_NAME = 'List.Row';

//
// Context — Radix-scoped so future composition (a tree of nested RowLists, or a parent
// like a Combobox embedding RowList) can read the right scope.
//

type RowListContextValue = {
  /** Selection aspect binding factory; rows consume their own bindings from this. */
  selection: UseListSelectionReturn;
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
   * Called when the user picks a different option (click, arrow keys, focus). Receives
   * the option's `id` prop. Selection cannot clear to `undefined` from the UI in
   * single-select mode (clicking an already-selected row is a no-op), so the callback
   * always receives a defined id.
   */
  onSelectChange?: (id: string) => void;
}>;

const Root = ({ selectedId, defaultSelectedId, onSelectChange, children }: RootProps) => {
  // The selection aspect emits `string | undefined` because `useListSelection` is mode-
  // generic; in single-select the value only clears when the consumer drives it, never
  // from a row click. Filter to keep the public callback narrow.
  const selection = useListSelection({
    mode: 'single',
    value: selectedId,
    defaultValue: defaultSelectedId,
    onValueChange: (next) => {
      if (next !== undefined) {
        onSelectChange?.(next);
      }
    },
  });

  const context = useMemo(() => ({ selection }), [selection]);

  return (
    <RowListProvider scope={undefined} {...context}>
      {children}
    </RowListProvider>
  );
};

Root.displayName = ROW_LIST_ROOT_NAME;

//
// Viewport — ScrollArea wrapper. Always scrolls; forwards ScrollArea knobs.
//

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
// Content — the listbox `<ul>` (tabster arrow group + aria-label + role).
//

type ContentProps = {
  /**
   * Accessible label for the listbox. Strongly recommended; assistive tech announces this
   * when focus enters the list.
   */
  'aria-label'?: string;
};

const Content = composable<HTMLUListElement, ContentProps>((props, forwardedRef) => {
  // Touch the context so Content fails loudly if used outside Root.
  useRowListContext(ROW_LIST_CONTENT_NAME, undefined);

  // `useListNavigation` bundles role=listbox, aria-orientation, Tabster arrow nav,
  // and the focus-on-entry redirect (to selected, then first non-disabled option).
  const navigation = useListNavigation({ mode: 'listbox' });

  const { children, ...rest } = props as PropsWithChildren<ContentProps & Record<string, unknown>>;

  // We render via the primitive `<List>` so descendant `<ListItem>`s satisfy their Radix
  // context-scope check. The container's role/aria/tabster wiring comes from the
  // navigation aspect rather than the primitive's `selectable` plumbing — that keeps the
  // ARIA grammar (`aria-selected`) owned by `Row` below.
  const composed = composableProps<HTMLUListElement>(rest, { classNames: 'flex flex-col' });
  return (
    <List
      variant='unordered'
      {...composed}
      {...navigation.containerProps}
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

// `dx-selected` pairs with `aria-selected="true"` (set per-option below); see
// `ui-theme/src/css/components/selected.md`.
const ROW_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none';

const Row = composable<HTMLLIElement, RowProps>((props, forwardedRef) => {
  const { id, disabled, onClick, onFocus, children, ...rest } = props as RowProps & Record<string, unknown>;
  const { selection } = useRowListContext(ROW_NAME, undefined);
  const binding: SelectionItemBinding = selection.bind(id, { disabled });

  // Compose the selection aspect's click/focus handlers with the row's optional ones so
  // both wire-ups stay synchronized: selection happens before user code, matching the old
  // behaviour where the row's own state-update happened first.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLLIElement>) => {
      binding.rowProps.onClick(event);
      if (!disabled) {
        onClick?.(event);
      }
    },
    [binding, disabled, onClick],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLLIElement>) => {
      binding.rowProps.onFocus?.(event);
      onFocus?.(event);
    },
    [binding, onFocus],
  );

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: [ROW_BASE, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain keyboard-navigable for SR
  // announcement; the selection model is not updated for disabled rows (the aspect's
  // binding enforces that internally).
  return (
    <ListItem
      {...composed}
      role='option'
      tabIndex={0}
      aria-selected={binding.selected}
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
 * Read selection state for a single id from inside any descendant of `<RowList.Root>`.
 * Returns `true` when the row is currently selected. Lets composing components
 * (e.g. `Listbox.OptionIndicator`) react to selection without re-rendering on unrelated
 * changes.
 */
const useRowListSelection = (id: string): boolean => {
  const { selection } = useRowListContext('useRowListSelection', undefined);
  return selection.bind(id).selected;
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
