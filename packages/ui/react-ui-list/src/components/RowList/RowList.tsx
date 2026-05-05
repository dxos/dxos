//
// Copyright 2026 DXOS.org
//

// `RowList` / `CardList` — Radix-style compound list components.
//
// Two namespaces, same shape: a headless `Root` and a scrollable
// `Viewport`. The split between row and card is purely visual — both
// expose the same `role="listbox"` / `role="option"` semantics, the
// same `selectedId` model, and the same arrow-key navigation via
// `@fluentui/react-tabster`. Pick the variant by the item component
// you nest inside the viewport:
//
//   <RowList.Root selectedId={…} onSelectChange={…}>
//     <RowList.Viewport aria-label='Tools'>
//       <Row id='a'>…</Row>
//       <Row id='b'>…</Row>
//     </RowList.Viewport>
//   </RowList.Root>
//
//   <CardList.Root selectedId={…} onSelectChange={…}>
//     <CardList.Viewport aria-label='Results'>
//       <Card id='a'>…</Card>
//     </CardList.Viewport>
//   </CardList.Root>
//
// Why headless Root + a Viewport (and not a single component):
//
//   - `Root` is headless (renders no DOM, just a context provider).
//     Matches Radix Select / Dialog / Tabs. Selection state lives here
//     so any descendant — Viewport, Toolbar, Footer — can read it.
//   - `Viewport` owns the listbox role, the scroll surface, the
//     `aria-label`, and `dx-container` for filling its parent. It
//     wraps `ScrollArea.Root` + `ScrollArea.Viewport` so long lists
//     scroll with DXOS-styled scrollbars by default. Set
//     `scroll={false}` to opt out (popover-style usage).
//
// Toolbars, footers, and other non-listbox chrome are caller-supplied
// siblings around `Viewport` inside `Root` (see story `WithToolbar`).
// Wrap them in your own `dx-container flex flex-col` div — Root is
// intentionally headless so layout is the caller's responsibility.
//
// `Viewport`, `Row`, and `Card` are `slottable()` from `@dxos/ui-theme`
// — they accept `asChild` to delegate rendering and merge `classNames`
// + parent-Slot `className` via `composableProps()`. (`Root` is plain
// React; no DOM = nothing to slot.)
//
// Keyboard:
//
//   Per AUDIT.md, list-shaped components in this layer use tabster's
//   `useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true })`
//   only. No bespoke `onKeyDown` arrow handlers. Enter / Space on the
//   focused option commits selection.
//
// What this layer deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`.
//   - Multi-select. Single `selectedId` for now.

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ForwardedRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import { ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { composableProps, slottable } from '@dxos/ui-theme';

const ROW_LIST_VIEWPORT_NAME = 'RowList.Viewport';
const CARD_LIST_VIEWPORT_NAME = 'CardList.Viewport';
const ROW_NAME = 'Row';
const CARD_NAME = 'Card';

//
// Context.
//

type Variant = 'row' | 'card';

type ListContextValue = {
  selectedId?: string;
  onSelect: (id: string) => void;
  variant: Variant;
};

const ListContext = createContext<ListContextValue | null>(null);

const useListContext = (componentName: string): ListContextValue => {
  const ctx = useContext(ListContext);
  if (!ctx) {
    throw new Error(`<${componentName}> must be used inside <RowList.Root> or <CardList.Root>`);
  }
  return ctx;
};

//
// Root — headless context provider. Renders no DOM.
//

type RootProps = {
  /** Currently-selected option id (controlled). */
  selectedId?: string;
  /** Initial selection for uncontrolled mode. */
  defaultSelectedId?: string;
  /** Called when the user picks a different option. */
  onSelectChange?: (id: string) => void;
  children?: ReactNode;
};

const RootImpl = ({
  variant,
  selectedId,
  defaultSelectedId,
  onSelectChange,
  children,
}: RootProps & { variant: Variant }) => {
  // `useControllableState`'s `onChange` is typed `(state: string | undefined) => void`,
  // but our public `onSelectChange` is `(id: string) => void` (an `id` is always
  // a string when emitted from a click / Enter). Wrap to satisfy the type
  // without leaking `undefined` to callers.
  const [resolvedSelected, setResolvedSelected] = useControllableState<string | undefined>({
    prop: selectedId,
    defaultProp: defaultSelectedId,
    onChange: (next) => {
      if (next !== undefined) {
        onSelectChange?.(next);
      }
    },
  });

  const handleSelect = useCallback((id: string) => setResolvedSelected(id), [setResolvedSelected]);

  const ctx = useMemo<ListContextValue>(
    () => ({ selectedId: resolvedSelected, onSelect: handleSelect, variant }),
    [resolvedSelected, handleSelect, variant],
  );

  return <ListContext.Provider value={ctx}>{children}</ListContext.Provider>;
};

const RowListRoot = (props: RootProps) => <RootImpl {...props} variant='row' />;
RowListRoot.displayName = 'RowList.Root';

const CardListRoot = (props: RootProps) => <RootImpl {...props} variant='card' />;
CardListRoot.displayName = 'CardList.Root';

//
// Viewport — listbox + ScrollArea + dx-container.
//

// Variant-specific layout for the listbox `<ul>`. Rows touch (no gap;
// items carry the divider). Cards float on the surface with a small gap.
const ROW_VIEWPORT_LIST_BASE = 'flex flex-col';
const CARD_VIEWPORT_LIST_BASE = 'flex flex-col gap-2 p-2';

type ViewportOwnProps = {
  /**
   * Disable the ScrollArea wrapper (e.g. when the list lives inside a
   * popover that owns its own scroll). The listbox still renders.
   */
  scroll?: boolean;
  /**
   * Accessible label for the listbox. Strongly recommended; assistive
   * tech announces this when focus enters the list. Falls onto the
   * listbox `<ul>` where `role="listbox"` lives.
   */
  'aria-label'?: string;
};

const renderViewport = (
  componentName: string,
  props: ThemedClassName<ViewportOwnProps & { children?: ReactNode }> & Record<string, unknown>,
  forwardedRef: ForwardedRef<HTMLUListElement>,
) => {
  // Touch the context to fail loudly if Viewport is used outside Root.
  useListContext(componentName);
  const arrowGroup = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });

  const { scroll = true, children, ...rest } = props as any;
  const variant = componentName === ROW_LIST_VIEWPORT_NAME ? 'row' : 'card';
  const listClassNames = variant === 'row' ? ROW_VIEWPORT_LIST_BASE : CARD_VIEWPORT_LIST_BASE;

  // The listbox itself comes from `@dxos/react-list`'s `<List>`.
  // Without it, descendant `<ListItem>`s (used by `Row` / `Card`) fail
  // their Radix context-scope check. `selectable` flips `<List>` to
  // `<ul role='listbox'>` and gates the `role='option'` + `aria-selected`
  // on `<ListItem>`. The arrow-nav group lands on this ul because it's
  // the focusable container.
  const composedListProps = composableProps<HTMLUListElement>(rest, { classNames: listClassNames });
  const listbox = (
    <List
      variant='unordered'
      selectable
      {...composedListProps}
      {...arrowGroup}
      ref={forwardedRef as unknown as ForwardedRef<HTMLOListElement>}
    >
      {children}
    </List>
  );

  if (!scroll) {
    return listbox;
  }

  return (
    <ScrollArea.Root orientation='vertical' classNames='dx-container'>
      <ScrollArea.Viewport>{listbox}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const RowListViewport = slottable<HTMLUListElement, ViewportOwnProps>((props, forwardedRef) =>
  renderViewport(ROW_LIST_VIEWPORT_NAME, props as any, forwardedRef),
);
RowListViewport.displayName = ROW_LIST_VIEWPORT_NAME;

const CardListViewport = slottable<HTMLUListElement, ViewportOwnProps>((props, forwardedRef) =>
  renderViewport(CARD_LIST_VIEWPORT_NAME, props as any, forwardedRef),
);
CardListViewport.displayName = CARD_LIST_VIEWPORT_NAME;

//
// Row / Card — option items.
//

type ItemOwnProps = {
  /** Stable identifier; matched against the parent's `selectedId`. */
  id: string;
  /** Disable selection / dim the row. */
  disabled?: boolean;
  /** Optional click handler in addition to selection. */
  onClick?: (event: MouseEvent<HTMLLIElement>) => void;
};

// Row paddings are tighter than Card's; rows touch with a divider, cards
// sit on their own surface with rounded corners.
const ROW_BASE =
  'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none border-b border-separator last:border-b-0';
const CARD_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none rounded-md bg-baseSurface';

const renderItem = (
  contextName: string,
  baseClassName: string,
  props: ThemedClassName<ItemOwnProps & { children?: ReactNode }> & Record<string, unknown>,
  forwardedRef: ForwardedRef<HTMLLIElement>,
) => {
  const { id, disabled, onClick, children, ...rest } = props as any;
  const { selectedId, onSelect } = useListContext(contextName);
  const isSelected = selectedId === id;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLLIElement>) => {
      if (disabled) {
        return;
      }
      onSelect(id);
      onClick?.(event);
    },
    [disabled, id, onSelect, onClick],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLLIElement>) => {
      if (disabled) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(id);
      }
    },
    [disabled, id, onSelect],
  );

  const composed = composableProps<HTMLLIElement>(rest, {
    classNames: [baseClassName, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Tabster focuses each option as you arrow through; without tabIndex
  // the option isn't reachable. Disabled items stay in the tab order so
  // users can read them but can't pick.
  const tabIndex = disabled ? -1 : 0;

  return (
    <ListItem
      {...composed}
      tabIndex={tabIndex}
      selected={isSelected}
      aria-disabled={disabled || undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      ref={forwardedRef}
    >
      {children}
    </ListItem>
  );
};

const Row = slottable<HTMLLIElement, ItemOwnProps>((props, forwardedRef) =>
  renderItem(ROW_NAME, ROW_BASE, props as any, forwardedRef),
);
Row.displayName = ROW_NAME;

const Card = slottable<HTMLLIElement, ItemOwnProps>((props, forwardedRef) =>
  renderItem(CARD_NAME, CARD_BASE, props as any, forwardedRef),
);
Card.displayName = CARD_NAME;

//
// Public namespaces.
//

const RowList = {
  Root: RowListRoot,
  Viewport: RowListViewport,
};

const CardList = {
  Root: CardListRoot,
  Viewport: CardListViewport,
};

export { RowList, CardList, Row, Card };
export type { RootProps as RowListRootProps, ViewportOwnProps as RowListViewportProps, ItemOwnProps as RowProps };
