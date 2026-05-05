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
// What it deliberately does NOT do:
//
//   - Virtualization or drag-and-drop. Reach for `@dxos/react-ui-mosaic`
//     when you need either.
//   - Multi-select. The current API exposes a single `selectedId`. A
//     `selectedIds: Set<string>` mode can be added when there's a real
//     consumer; the underlying primitive already supports it.
//   - Wrapping in a `ScrollArea`. Pass one in around the list if needed
//     (most callers do).

import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type ReactNode,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { List, ListItem } from '@dxos/react-list';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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

type ListContainerOwnProps = {
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
  children?: ReactNode;
};

type RowListProps = ThemedClassName<ListContainerOwnProps> &
  Omit<ComponentPropsWithoutRef<'ol'>, keyof ListContainerOwnProps | 'role' | 'className'>;

const ListContainer = forwardRef<
  HTMLOListElement,
  RowListProps & { variant: 'row' | 'card'; baseClassName: string }
>(
  (
    {
      selectedId,
      defaultSelectedId,
      onSelectChange,
      classNames,
      variant,
      baseClassName,
      children,
      ...rootProps
    },
    forwardedRef,
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

    return (
      <RowListContext.Provider value={ctx}>
        <List
          variant='unordered'
          selectable
          {...rootProps}
          {...arrowGroup}
          ref={forwardedRef}
          className={mx(baseClassName, classNames)}
        >
          {children}
        </List>
      </RowListContext.Provider>
    );
  },
);

ListContainer.displayName = 'RowList.Container';

const RowList = forwardRef<HTMLOListElement, RowListProps>((props, forwardedRef) => (
  <ListContainer {...props} variant='row' baseClassName='flex flex-col' ref={forwardedRef} />
));
RowList.displayName = ROW_LIST_NAME;

const CardList = forwardRef<HTMLOListElement, RowListProps>((props, forwardedRef) => (
  <ListContainer {...props} variant='card' baseClassName='flex flex-col gap-2' ref={forwardedRef} />
));
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
  onClick?: (event: React.MouseEvent<HTMLLIElement>) => void;
  children?: ReactNode;
};

type RowProps = ThemedClassName<ItemOwnProps> &
  Omit<ComponentPropsWithoutRef<'li'>, keyof ItemOwnProps | 'role' | 'className'>;

// Row paddings are tighter than Card's; rows touch with a divider, cards
// gap with their own surface (matches the gap on the container above).
const ROW_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none border-b border-separator last:border-b-0';
const CARD_BASE = 'dx-hover dx-selected px-3 py-2 cursor-pointer outline-none rounded-md bg-baseSurface';

const Item = forwardRef<HTMLLIElement, RowProps & { contextName: string; baseClassName: string }>(
  ({ id, disabled, onClick, classNames, contextName, baseClassName, children, ...rest }, forwardedRef) => {
    const { selectedId, onSelect } = useRowListContext(contextName);
    const isSelected = selectedId === id;

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLLIElement>) => {
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

    return (
      <ListItem
        {...rest}
        // Tabster focuses each option as you arrow through; without
        // tabIndex the option isn't reachable. Disabled items stay in the
        // tab order so users can read them but can't pick.
        tabIndex={disabled ? -1 : 0}
        selected={isSelected}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        ref={forwardedRef}
        className={mx(baseClassName, disabled && 'opacity-50 cursor-not-allowed', classNames)}
      >
        {children}
      </ListItem>
    );
  },
);

Item.displayName = 'RowList.Item';

const Row = forwardRef<HTMLLIElement, RowProps>((props, forwardedRef) => (
  <Item {...props} contextName={ROW_NAME} baseClassName={ROW_BASE} ref={forwardedRef} />
));
Row.displayName = ROW_NAME;

const Card = forwardRef<HTMLLIElement, RowProps>((props, forwardedRef) => (
  <Item {...props} contextName={CARD_NAME} baseClassName={CARD_BASE} ref={forwardedRef} />
));
Card.displayName = CARD_NAME;

export { RowList, CardList, Row, Card };
export type { RowListProps, RowProps };
