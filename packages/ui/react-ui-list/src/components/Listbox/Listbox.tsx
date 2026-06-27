//
// Copyright 2026 DXOS.org
//

// `Listbox` — the package's general styled list, with **opt-in selection**. One compound for
// both the picker / option-list pattern (full-pane with `Listbox.Viewport`, or compact popover
// without) and plain styled content rows.
//
// Selection is inferred from props: pass `value`/`defaultValue`/`onValueChange` on `Root` and
// it's a single-select `role=listbox` (options carry `aria-selected` + `dx-selected`, selection
// follows focus); omit them and it's a plain `role=list` of `role=listitem` rows (hover only, no
// selection semantics) — the shape the deprecated `@dxos/react-ui` `List`/`ListItem` filled.
// (`Listbox` is slated to be renamed `List` once that legacy component is deleted.)
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
//    `dx-selected` styling. See `ui-theme/src/css/components/state.md`.
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
import { listTheme } from '../List.theme';
import { ItemContent, type ItemContentProps } from '../ItemContent';

const styles = listTheme.styles();

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
  /**
   * Whether the list participates in selection. Inferred on `Root` from the presence of
   * `value`/`defaultValue`/`onValueChange`. Drives `role` (listbox/option vs list/listitem),
   * `aria-selected`, and whether row clicks update the selection model.
   */
  selectable: boolean;
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
  /**
   * Currently-selected option id (controlled). Supplying any of `value`/`defaultValue`/
   * `onValueChange` makes the list selectable; omitting all three renders plain rows.
   */
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
  // Selection is opt-in: a list is selectable only when the consumer wires the value model.
  // Plain content lists (the migrated `@dxos/react-ui` `List` call sites) pass none of these
  // and render as `role=list`/`listitem` rows.
  const selectable = value !== undefined || defaultValue !== undefined || onValueChange !== undefined;

  // `useListSelection` is a hook, so it is always called (stable hook order); `selectable`
  // gates whether items actually consume the binding. The aspect emits `string | undefined`
  // because it is mode-generic; in single-select the value only clears when the consumer
  // drives it, never from a row click — filter to keep the public callback narrow.
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

  const context = useMemo(() => ({ selectable, selection }), [selectable, selection]);

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
      {...composableProps<HTMLDivElement>(rest, { classNames: styles.listboxViewport() })}
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
  const { selectable } = useListboxContext(LISTBOX_CONTENT_NAME);

  // `useListNavigation` bundles role + aria-orientation + Tabster arrow nav. In `listbox` mode
  // it also adds the focus-on-entry redirect (to selected, then first non-disabled option);
  // `list` mode is for the non-selectable rows (arrow nav across interactive descendants only).
  const navigation = useListNavigation({ mode: selectable ? 'listbox' : 'list' });

  const { children, ...rest } = props as PropsWithChildren<ContentProps & Record<string, unknown>>;

  // We render via the primitive `<List>` so descendant `<ListItem>`s satisfy their Radix
  // context-scope check. The container's role/aria/Tabster wiring comes from the navigation
  // aspect rather than the primitive's `selectable` plumbing — that keeps the ARIA grammar
  // (`aria-selected`) owned by `Item` below.
  const composed = composableProps<HTMLUListElement>(rest, { classNames: styles.listboxContent() });
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

const Item = composable<HTMLLIElement, ItemProps>((props, forwardedRef) => {
  const { id, disabled, onClick, onFocus, children, ...rest } = props as ItemProps & Record<string, unknown>;
  const { selectable, selection } = useListboxContext(LISTBOX_ITEM_NAME);
  const binding: SelectionItemBinding = selection.bind(id, { disabled });
  const selected = selectable && binding.selected;
  // A non-selectable row is interactive only if the caller wired a click; otherwise it's a
  // plain display row (no pointer affordance).
  const interactive = selectable || onClick != null;

  // Compose the selection aspect's click/focus handlers with the row's optional ones so both
  // wire-ups stay synchronized: selection happens before user code so a click that also runs
  // imperative side effects sees the selected value first. Skipped entirely when not selectable
  // so a plain row click doesn't mutate hidden selection state.
  const handleClick = useCallback(
    (event: MouseEvent<HTMLLIElement>) => {
      if (selectable) {
        binding.rowProps.onClick(event);
      }
      if (!disabled) {
        onClick?.(event);
      }
    },
    [selectable, binding, disabled, onClick],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLLIElement>) => {
      if (selectable) {
        binding.rowProps.onFocus?.(event);
      }
      onFocus?.(event);
    },
    [selectable, binding, onFocus],
  );

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: styles.listboxItem({
      class: [!interactive && 'cursor-default', disabled && 'opacity-50 cursor-not-allowed'],
    }),
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain keyboard-navigable for SR
  // announcement; the selection model is not updated for disabled rows (the aspect's binding
  // enforces that internally). Non-selectable rows are `role=listitem` with no `aria-selected`.
  return (
    <ListItemProviderHost id={id} selected={selected}>
      <ListItem
        {...composed}
        role={selectable ? 'option' : 'listitem'}
        tabIndex={selectable ? 0 : -1}
        aria-selected={selectable ? selected : undefined}
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
  <span {...rest} className={styles.listboxItemLabel({ class: mx(classNames) })} ref={forwardedRef}>
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
  ItemContent,
  Indicator,
};

export { Listbox, useListboxSelection };
export type {
  ItemContentProps,
  RootProps as ListboxRootProps,
  ViewportProps as ListboxViewportProps,
  ContentProps as ListboxContentProps,
  ItemProps as ListboxItemProps,
  ItemLabelProps as ListboxItemLabelProps,
  IndicatorProps as ListboxIndicatorProps,
};
