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

import { useFocusableGroup } from '@fluentui/react-tabster';
import React, {
  type ComponentPropsWithRef,
  type FocusEvent,
  type ForwardedRef,
  type KeyboardEvent,
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

import { type SelectionItemBinding, useListNavigation, useListSelection } from '../../hooks';
import { listTheme } from '../List.theme';
import {
  LISTBOX_ITEM_NAME,
  type ListboxItemContextValue,
  ListboxItemProvider,
  ListboxProvider,
  useListboxContext,
  useListboxItemContext,
} from './ListboxContext';
import { ListItemContent, type ListItemContentProps } from './ListItemContent';

const styles = listTheme.styles();

const LISTBOX_ROOT_NAME = 'Listbox.Root';
const LISTBOX_VIEWPORT_NAME = 'Listbox.Viewport';
const LISTBOX_CONTENT_NAME = 'Listbox.Content';
const LISTBOX_ITEM_LABEL_NAME = 'Listbox.ItemLabel';
const LISTBOX_INDICATOR_NAME = 'Listbox.Indicator';

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
  /**
   * Called when the user clears the selection (Escape on a focused option). Fires only when
   * something was selected — repeated Escapes are a no-op — and keeps `onValueChange` narrow.
   */
  onDeselect?: () => void;
  /**
   * Externally-managed multi-select (e.g. a machine owns the selection): options + arrow
   * navigation without the internal single-select value model.
   */
  multiselectable?: boolean;
  /** Reserved for parity with the prior `Listbox.Root`; focus-on-entry already covers most cases. */
  autoFocus?: boolean;
}>;

const Root = ({
  value,
  defaultValue,
  onValueChange,
  onDeselect,
  multiselectable = false,
  autoFocus: _autoFocus,
  children,
}: RootProps) => {
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
      } else {
        // The aspect emits `undefined` only from `clear` (Escape), never from a row click.
        onDeselect?.();
      }
    },
  });

  const context = useMemo(() => ({ selectable, multiselectable, selection }), [selectable, multiselectable, selection]);

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
  const { selectable, multiselectable } = useListboxContext(LISTBOX_CONTENT_NAME);

  // `useListNavigation` bundles role + aria-orientation + Tabster arrow nav. In `listbox` mode
  // it also adds the focus-on-entry redirect (to selected, then first non-disabled option);
  // `list` mode is for the non-selectable rows (arrow nav across interactive descendants only).
  // External multi-select is still a listbox per WAI-ARIA, so it keeps option navigation.
  const navigation = useListNavigation({ mode: selectable || multiselectable ? 'listbox' : 'list' });

  const { children, ...rest } = props as PropsWithChildren<ContentProps & Record<string, unknown>>;

  // We render via the primitive `<List>` so descendant `<ListItem>`s satisfy their Radix
  // context-scope check. The container's role/aria/Tabster wiring comes from the navigation
  // aspect rather than the primitive's `selectable` plumbing — that keeps the ARIA grammar
  // (`aria-selected`) owned by `Item` below.
  const composed = composableProps<HTMLUListElement>(rest, { classNames: styles.listboxContent() });
  const multiselectableProps = multiselectable ? { 'aria-multiselectable': true } : null;
  return (
    <List
      variant='unordered'
      {...composed}
      {...multiselectableProps}
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
  /** Externally-managed selection state (multiselectable lists); overrides the internal model. */
  selected?: boolean;
  /** Disable the row — focusable but doesn't update selection, dimmed. */
  disabled?: boolean;
  /** Optional click handler in addition to selection; also fired by Enter/Space when interactive. */
  onClick?: (event: MouseEvent<HTMLLIElement>) => void;
  /** Optional focus handler in addition to selection-follows-focus. */
  onFocus?: (event: FocusEvent<HTMLLIElement>) => void;
  /**
   * Optional pointer-down handler. Fires before focus (and therefore before selection-follows-focus
   * mutates the value), so consumers can observe the pre-gesture selection — e.g. to implement
   * click-to-toggle without the focus-then-click double count.
   */
  onMouseDown?: (event: MouseEvent<HTMLLIElement>) => void;
  /**
   * Optional key handler, run before the row's own Enter/Space activation so a consumer key binding
   * can claim the event (`preventDefault`) rather than firing alongside it.
   */
  onKeyDown?: (event: KeyboardEvent<HTMLLIElement>) => void;
}>;

const Item = composable<HTMLLIElement, ItemProps>((props, forwardedRef) => {
  const {
    id,
    disabled,
    selected: selectedProp,
    onClick,
    onFocus,
    onMouseDown,
    onKeyDown,
    children,
    ...rest
  } = props as ItemProps & Record<string, unknown>;
  const { selectable, multiselectable, selection } = useListboxContext(LISTBOX_ITEM_NAME);
  const binding: SelectionItemBinding = selection.bind(id, { disabled });
  const selected = selectedProp ?? (selectable && binding.selected);
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

  // Options aren't natively-interactive elements (unlike `<button>`), so the browser won't fire
  // Enter/Space clicks on their own — wire that up for every interactive row (selectable or not),
  // matching `<button>`'s native activation keys per WAI-ARIA APG listbox guidance. Dispatches a
  // real click (rather than calling `handleClick` directly) so `onClick` keeps its native
  // `MouseEvent` type — matches the same `.click()` pattern `MessageStack`'s row navigation uses.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>) => {
      onKeyDown?.(event);
      if (
        event.defaultPrevented ||
        !interactive ||
        disabled ||
        // Bubbled from a control inside the row — the groupper puts focus there deliberately, and
        // its Enter belongs to it, not to the row (and its Escape is the groupper's exit).
        event.target !== event.currentTarget
      ) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.currentTarget.click();
      } else if (event.key === 'Escape' && selectable) {
        // Deselect; a no-op (no emission, no preventDefault) when nothing is selected, so the
        // event still reaches an enclosing dismissable.
        selection.clear();
      }
    },
    [onKeyDown, interactive, disabled, selectable, selection],
  );

  // A row that holds its own controls (a toggle, a delete button) would otherwise take the arrow
  // keys one focusable at a time, stepping INTO the row instead of on to the next option. The
  // groupper makes the row a single stop for the container's mover; `Enter` enters its controls and
  // `Escape` returns. Rows with no focusable children are unaffected — there is nothing to enter.
  const groupProps = useFocusableGroup({ tabBehavior: 'limited' });

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: styles.listboxItem({
      class: [!interactive && 'cursor-default', disabled && 'opacity-50 cursor-not-allowed'],
    }),
  });

  // Per WAI-ARIA APG listbox guidance, disabled options remain keyboard-navigable for SR
  // announcement; the selection model is not updated for disabled rows (the aspect's binding
  // enforces that internally). Non-selectable rows are `role=listitem` with no `aria-selected`;
  // a plain row with an `onClick` (no selection model) is still keyboard-focusable so Enter/Space
  // can activate it, matching `<button>`'s native behaviour.
  return (
    <ListItemProviderHost id={id} selected={selected}>
      <ListItem
        {...groupProps}
        {...composed}
        role={selectable || multiselectable ? 'option' : 'listitem'}
        tabIndex={interactive ? 0 : -1}
        aria-selected={selectable || multiselectable ? selected : undefined}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        onMouseDown={onMouseDown}
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

const ItemLabel = composable<HTMLSpanElement, ItemLabelProps>(({ children, ...rest }, forwardedRef) => (
  <span {...composableProps<HTMLSpanElement>(rest, { classNames: styles.listboxItemLabel() })} ref={forwardedRef}>
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

//
// Public namespace.
//

const Listbox = {
  Root,
  Viewport,
  Content,
  Item,
  ItemLabel,
  ItemContent: ListItemContent,
  Indicator,
};

export { Listbox };

export type {
  ListItemContentProps as ItemContentProps,
  ContentProps as ListboxContentProps,
  IndicatorProps as ListboxIndicatorProps,
  ItemLabelProps as ListboxItemLabelProps,
  ItemProps as ListboxItemProps,
  RootProps as ListboxRootProps,
  ViewportProps as ListboxViewportProps,
};
