//
// Copyright 2026 DXOS.org
//

// `Listbox` — single-select selectable list. Single canonical compound for the picker /
// option-list pattern: full-pane (with `Listbox.Viewport` ScrollArea wrapper) and compact
// popover (no Viewport) usage share the same shape and selection model.
//
// Compound shape (matches Radix Select / Toolbar / Tabs):
//
//   <Listbox.Root value={…} onValueChange={…}>
//     {/* Viewport is optional — include for full-pane pickers, omit for popovers. */}
//     <Listbox.Viewport thin padding>
//       <Listbox.Content aria-label='Tools'>
//         <Listbox.Item id='a'>
//           <Listbox.ItemLabel>Alpha</Listbox.ItemLabel>
//           <Listbox.Indicator />
//         </Listbox.Item>
//         <Listbox.Item id='b'>…</Listbox.Item>
//       </Listbox.Content>
//     </Listbox.Viewport>
//   </Listbox.Root>
//
// - `Root` — headless context provider (no DOM). Owns the single-selection `value` model.
// - `Viewport` — optional `ScrollArea.Root` + `ScrollArea.Viewport`. Always scrolls when
//    present. Forwards ScrollArea knobs (`thin`, `padding`, `centered`).
// - `Content` — the `<ul role='listbox'>` holding the items. Applies the navigation aspect's
//    container props (Tabster arrow nav, focus-on-entry redirect, role + aria-orientation).
// - `Item` — `<li role='option'>` with `aria-selected` on the selected row, paired with
//    `dx-selected` styling. See `ui-theme/src/css/components/selected.md`.
// - `ItemLabel` — text helper that truncates and takes most of the row width.
// - `Indicator` — optional checkmark icon next to the selected item (confirmatory, since
//    `dx-selected` already styles the row).
//
// Selection model: single-select (`value: string | undefined`). Selection follows focus,
// so arrow keys + click both update it. Matches the codebase's existing
// `useSelected(_, 'single')` convention from `@dxos/react-ui-attention`.
//
// What this layer deliberately does NOT do:
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`.
//   - Multi-select. Future expansion — the aspect (`useListSelection`) already supports it.

import { createContext } from '@radix-ui/react-context';
import React, {
  type ComponentPropsWithRef,
  type FocusEvent,
  type ForwardedRef,
  type MouseEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import {
  Icon,
  type IconProps,
  ScrollArea,
  type ScrollAreaRootProps,
  type ThemedClassName,
  composable,
  composableProps,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  type SelectionItemBinding,
  type UseListSelectionReturn,
  useListNavigation,
  useListSelection,
} from '../../aspects';

const LISTBOX_NAME = 'Listbox';
const LISTBOX_ROOT_NAME = 'Listbox.Root';
const LISTBOX_VIEWPORT_NAME = 'Listbox.Viewport';
const LISTBOX_CONTENT_NAME = 'Listbox.Content';
const LISTBOX_ITEM_NAME = 'Listbox.Item';
const LISTBOX_ITEM_LABEL_NAME = 'Listbox.ItemLabel';
const LISTBOX_INDICATOR_NAME = 'Listbox.Indicator';

//
// Contexts — plain Radix contexts (un-scoped). Scoped composition (nested Listboxes,
// Combobox embeddings) is a future expansion; when needed, switch to `createContextScope`
// and thread `__listboxScope` through every subcomponent's props in one focused PR.
//

type ListboxContextValue = {
  /** Selection aspect binding factory; items consume their own bindings from this. */
  selection: UseListSelectionReturn;
};

type ListboxItemContextValue = {
  id: string;
  selected: boolean;
};

const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>(LISTBOX_NAME);
const [ListboxItemProvider, useListboxItemContext] = createContext<ListboxItemContextValue>(LISTBOX_ITEM_NAME);

//
// Root — headless context provider. Renders no DOM.
//

type RootProps = PropsWithChildren<{
  /** Currently-selected option id (controlled). */
  value?: string;
  /** Initial selected option for uncontrolled mode. */
  defaultValue?: string;
  /**
   * Called when the user picks a different option (click, arrow keys, focus). Receives the
   * option's `id` prop. Selection cannot clear to `undefined` from the UI in single-select
   * mode (clicking an already-selected row is a no-op), so the callback always receives a
   * defined id.
   */
  onValueChange?: (value: string) => void;
  /** Reserved for parity with the prior `Listbox.Root`; focus-on-entry already covers most cases. */
  autoFocus?: boolean;
}>;

const Root = ({ value, defaultValue, onValueChange, autoFocus: _autoFocus, children }: RootProps) => {
  // The selection aspect emits `string | undefined` because `useListSelection` is mode-
  // generic; in single-select the value only clears when the consumer drives it, never from
  // a row click. Filter to keep the public callback narrow.
  const selection = useListSelection({
    mode: 'single',
    value,
    defaultValue,
    onValueChange: (next) => {
      if (next !== undefined) {
        onValueChange?.(next);
      }
    },
  });

  const context = useMemo(() => ({ selection }), [selection]);

  return <ListboxProvider {...context}>{children}</ListboxProvider>;
};

Root.displayName = LISTBOX_ROOT_NAME;

//
// Viewport — ScrollArea wrapper. Always scrolls; forwards ScrollArea knobs.
//
// Optional — popover/dialog consumers can skip it and provide their own scroll container.
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

Viewport.displayName = LISTBOX_VIEWPORT_NAME;

//
// Content — the listbox `<ul>` (Tabster arrow group + aria-label + role).
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
  useListboxContext(LISTBOX_CONTENT_NAME);

  // `useListNavigation` bundles role=listbox, aria-orientation, Tabster arrow nav, and the
  // focus-on-entry redirect (to selected, then first non-disabled option).
  const navigation = useListNavigation({ mode: 'listbox' });

  const { children, ...rest } = props as PropsWithChildren<ContentProps & Record<string, unknown>>;

  // We render via the primitive `<List>` so descendant `<ListItem>`s satisfy their Radix
  // context-scope check. The container's role/aria/Tabster wiring comes from the navigation
  // aspect rather than the primitive's `selectable` plumbing — that keeps the ARIA grammar
  // (`aria-selected`) owned by `Item` below.
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

Content.displayName = LISTBOX_CONTENT_NAME;

//
// Item — option row.
//

type ItemProps = PropsWithChildren<{
  /** Stable identifier; matched against the parent's `value`. */
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
const ITEM_BASE = 'flex items-center dx-hover dx-selected px-3 py-2 cursor-pointer outline-none';

const Item = composable<HTMLLIElement, ItemProps>((props, forwardedRef) => {
  const { id, disabled, onClick, onFocus, children, ...rest } = props as ItemProps & Record<string, unknown>;
  const { selection } = useListboxContext(LISTBOX_ITEM_NAME);
  const binding: SelectionItemBinding = selection.bind(id, { disabled });

  // Compose the selection aspect's click/focus handlers with the row's optional ones so
  // both wire-ups stay synchronized: selection happens before user code so a click that
  // also runs imperative side effects sees the selected value first.
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
    classNames: [ITEM_BASE, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain keyboard-navigable for SR
  // announcement; the selection model is not updated for disabled rows (the aspect's
  // binding enforces that internally).
  return (
    <ListItemProviderHost id={id} selected={binding.selected}>
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
    </ListItemProviderHost>
  );
});

Item.displayName = LISTBOX_ITEM_NAME;

/**
 * Publishes the item context so `Indicator` (and any future per-item descendant) can read
 * selection state without a second hook subscription. Tiny adapter — separated so `Item`'s
 * own composition stays a single component.
 */
const ListItemProviderHost = ({ id, selected, children }: PropsWithChildren<ListboxItemContextValue>) => (
  <ListboxItemProvider id={id} selected={selected}>
    {children}
  </ListboxItemProvider>
);

//
// ItemLabel — text content for the item; grows and truncates.
//

type ItemLabelProps = ThemedClassName<ComponentPropsWithRef<'span'>>;

const ItemLabel = forwardRef<HTMLSpanElement, ItemLabelProps>(({ classNames, children, ...rest }, forwardedRef) => (
  <span {...rest} className={mx('grow truncate', classNames)} ref={forwardedRef}>
    {children}
  </span>
));

ItemLabel.displayName = LISTBOX_ITEM_LABEL_NAME;

//
// Indicator — checkmark icon for the selected item.
//

type IndicatorProps = Omit<IconProps, 'icon'> & Partial<Pick<IconProps, 'icon'>>;

const Indicator = forwardRef<SVGSVGElement, IndicatorProps>(({ classNames, ...rootProps }, forwardedRef) => {
  const { selected } = useListboxItemContext(LISTBOX_INDICATOR_NAME);
  return (
    <Icon
      icon='ph--check--regular'
      {...rootProps}
      classNames={mx(!selected && 'invisible', classNames)}
      ref={forwardedRef}
    />
  );
});

Indicator.displayName = LISTBOX_INDICATOR_NAME;

/**
 * Read selection state for a single id from inside any descendant of `<Listbox.Root>`.
 * Returns `true` when the row is currently selected. Lets composing components react to
 * selection without re-rendering on unrelated changes.
 */
const useListboxSelection = (id: string): boolean => {
  const { selection } = useListboxContext('useListboxSelection');
  return selection.bind(id).selected;
};

//
// Public namespace.
//

const Listbox = {
  Root,
  Viewport,
  Content,
  Item,
  ItemLabel,
  Indicator,
};

export { Listbox, useListboxSelection };
export type {
  RootProps as ListboxRootProps,
  ViewportProps as ListboxViewportProps,
  ContentProps as ListboxContentProps,
  ItemProps as ListboxItemProps,
  ItemLabelProps as ListboxItemLabelProps,
  IndicatorProps as ListboxIndicatorProps,
};
