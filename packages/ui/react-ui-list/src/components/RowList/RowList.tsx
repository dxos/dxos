//
// Copyright 2026 DXOS.org
//

// `RowList` / `CardList` — opinionated, ARIA-correct, keyboard-navigable
// list containers built on `@dxos/react-list`.
//
// The split between "row" and "card" is purely visual: both expose the
// same `role="listbox"` / `role="option"` semantics, the same controlled-
// or-uncontrolled `selectedId` model, and the same arrow-key navigation
// from `@fluentui/react-tabster`. Pick the variant that matches the
// content density:
//
//   - `RowList` / `Row`   — dense rows with bottom dividers; for tool
//                           pickers, file lists, settings rows, etc.
//   - `CardList` / `Card` — gapped cards with their own surface; for
//                           message previews, search results, etc.
//
// What this layer guarantees by construction (so call sites can't drift):
//
//   - `aria-selected` is set on the option whose id matches `selectedId`.
//   - `dx-selected` and `dx-hover` are applied automatically — pair is
//     correct (see `ui-theme/src/css/components/selected.md`).
//   - The container is `role="listbox"` and supports up/down arrow keys.
//   - Enter / Space on the focused option commits selection.
//
// Container sizing:
//
//   The base class includes `dx-container` (= `flex-1 min-h-0 min-w-0
//   h-full w-full overflow-hidden`), so when the list is the only child
//   of a flex column it fills the available space. For master/detail
//   layouts where the list is one pane, override `classNames` or wrap
//   in your own sized container.
//
// Composability:
//
//   `RowList`, `CardList`, `Row`, and `Card` are all built with
//   `slottable()` from `@dxos/ui-theme` — they accept `asChild` to
//   delegate rendering and `classNames` for theme overrides.
//
// What it deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`
//     when you need either.
//   - Multi-select. The current API exposes a single `selectedId`. A
//     `selectedIds: Set<string>` mode can be added when there's a real
//     consumer; the underlying primitive already supports it.
//   - Wrapping in a `ScrollArea`. Pass one in around the list if needed
//     (most callers don't, since `dx-container`'s overflow:hidden +
//     a child `overflow:auto` element handles long lists).

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { Slot } from '@radix-ui/react-slot';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import { composableProps, slottable } from '@dxos/ui-theme';

const ROW_LIST_NAME = 'RowList';
const ROW_NAME = 'Row';
const CARD_LIST_NAME = 'CardList';
const CARD_NAME = 'Card';

type RowListContextValue = {
  selectedId?: string;
  onSelect: (id: string) => void;
  variant: 'row' | 'card';
};

const RowListContext = createContext<RowListContextValue | null>(null);

const useRowListContext = (componentName: string): RowListContextValue => {
  const ctx = useContext(RowListContext);
  if (!ctx) {
    throw new Error(`<${componentName}> must be used inside <RowList> or <CardList>`);
  }
  return ctx;
};

//
// RowList / CardList container.
//

// Base classes shared by both variants — fills available space and
// participates in scroll if a parent constrains height. Variant-specific
// gap/layout is appended below.
const CONTAINER_BASE = 'dx-container flex flex-col';
const ROW_LIST_BASE = `${CONTAINER_BASE}`;
// Cards gap on their own surface; container is padded so the cards float.
const CARD_LIST_BASE = `${CONTAINER_BASE} gap-2`;

type RowListOwnProps = {
  /**
   * Currently-selected option id. Pair with `onSelectChange` for a
   * controlled list. Omit (and pass `defaultSelectedId` instead) for
   * uncontrolled.
   */
  selectedId?: string;
  /** Initial selection for uncontrolled mode. */
  defaultSelectedId?: string;
  /**
   * Called when the user picks a different option (click, Enter, or
   * Space). Receives the option's `id` prop.
   */
  onSelectChange?: (id: string) => void;
  /**
   * Accessible label for the listbox. Strongly recommended; assistive
   * tech announces this when focus enters the list.
   */
  'aria-label'?: string;
};

const renderListContainer = (
  variant: 'row' | 'card',
  baseClassName: string,
  {
    asChild,
    selectedId,
    defaultSelectedId,
    onSelectChange,
    children,
    ...props
  }: RowListOwnProps & { asChild?: boolean; children?: ReactNode } & Record<string, unknown>,
  forwardedRef: React.ForwardedRef<HTMLOListElement>,
) => {
  const arrowGroup = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });

  const [resolvedSelected, setResolvedSelected] = useControllableState({
    prop: selectedId,
    defaultProp: defaultSelectedId,
    onChange: onSelectChange,
  });

  const handleSelect = useCallback(
    (id: string) => {
      setResolvedSelected(id);
    },
    [setResolvedSelected],
  );

  const ctx = useMemo<RowListContextValue>(
    () => ({ selectedId: resolvedSelected, onSelect: handleSelect, variant }),
    [resolvedSelected, handleSelect, variant],
  );

  // Reconciles classNames + className (from a parent Slot) with our base.
  const composed = composableProps<HTMLOListElement>({ ...props } as any, { classNames: baseClassName });

  return (
    <RowListContext.Provider value={ctx}>
      {asChild ? (
        <Slot {...composed} {...arrowGroup} ref={forwardedRef}>
          {children as React.ReactElement}
        </Slot>
      ) : (
        <List variant='unordered' selectable {...composed} {...arrowGroup} ref={forwardedRef}>
          {children}
        </List>
      )}
    </RowListContext.Provider>
  );
};

const RowList = slottable<HTMLOListElement, RowListOwnProps>((props, forwardedRef) =>
  renderListContainer('row', ROW_LIST_BASE, props as any, forwardedRef),
);
RowList.displayName = ROW_LIST_NAME;

const CardList = slottable<HTMLOListElement, RowListOwnProps>((props, forwardedRef) =>
  renderListContainer('card', CARD_LIST_BASE, props as any, forwardedRef),
);
CardList.displayName = CARD_LIST_NAME;

//
// Row / Card option.
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
// gap with their own surface (matches the gap on the container above).
const ROW_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none border-b border-separator last:border-b-0';
const CARD_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none rounded-md bg-baseSurface';

const renderItem = (
  contextName: string,
  baseClassName: string,
  {
    asChild,
    id,
    disabled,
    onClick,
    children,
    ...props
  }: ItemOwnProps & { asChild?: boolean; children?: ReactNode } & Record<string, unknown>,
  forwardedRef: React.ForwardedRef<HTMLLIElement>,
) => {
  const { selectedId, onSelect } = useRowListContext(contextName);
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

  const composed = composableProps<HTMLLIElement>({ ...props } as any, {
    classNames: [baseClassName, disabled && 'opacity-50 cursor-not-allowed'],
  });

  // Tabster focuses each option as you arrow through; without tabIndex
  // the option isn't reachable. Disabled items stay in the tab order so
  // users can read them but can't pick.
  const tabIndex = disabled ? -1 : 0;

  if (asChild) {
    return (
      <Slot
        {...composed}
        tabIndex={tabIndex}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={forwardedRef}
      >
        {children as React.ReactElement}
      </Slot>
    );
  }

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

export { RowList, CardList, Row, Card };
export type { RowListOwnProps as RowListProps, ItemOwnProps as RowProps };
