//
// Copyright 2023 DXOS.org
//

// `Listbox` — single-select listbox with optional check indicator.
//
// Internally composes `RowList` from this same package: `Listbox.Root`
// is `RowList.Root` + `RowList.Content`, and `Listbox.Option` is `Row`.
// The compound API (`Listbox.Root` / `.Option` / `.OptionLabel` /
// `.OptionIndicator`) is preserved so existing call sites keep working.
//
// Why this shape (when `RowList` is right there): `Listbox` historically
// rendered as a flat `<ul>` with no `ScrollArea` wrapper — it's used
// inside dialogs / popovers / panels that own their own scroll. Skipping
// `RowList.Viewport` keeps that behaviour. If a caller wants the styled
// scroll surface, they wrap the listbox in `RowList.Viewport` themselves.

import { type Scope, createContextScope } from '@radix-ui/react-context';
import React, { type ComponentPropsWithRef, type ReactNode, forwardRef } from 'react';

import { Icon, type IconProps, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Row, RowList, createRowListScope, useRowListSelection } from '../RowList';

const commandItem = 'flex items-center overflow-hidden';

const LISTBOX_NAME = 'Listbox';
const LISTBOX_OPTION_NAME = 'ListboxOption';
const LISTBOX_OPTION_LABEL_NAME = 'ListboxOptionLabel';
const LISTBOX_OPTION_INDICATOR_NAME = 'ListboxOptionIndicator';

//
// Context — only used to thread `value` through to `OptionIndicator` so
// it knows whether to show the checkmark. Selection state itself lives
// in `RowList`'s context (we delegate to it via composition).
//

type ListboxScopedProps<P> = P & { __listboxScope?: Scope };
type ListboxOptionScopedProps<P> = P & { __listboxOptionScope?: Scope };

const [createListboxContext, createListboxScope] = createContextScope(LISTBOX_NAME, [createRowListScope]);
const [createListboxOptionContext, createListboxOptionScope] = createContextScope(LISTBOX_OPTION_NAME, [
  createListboxScope,
]);

type ListboxOptionContextValue = {
  value: string;
  isSelected: boolean;
};

const [ListboxOptionProvider, useListboxOptionContext] =
  createListboxOptionContext<ListboxOptionContextValue>(LISTBOX_OPTION_NAME);

//
// Root — composes `RowList.Root` + `RowList.Content`.
//
// Maps the public `value` / `onValueChange` API to RowList's
// `selectedId` / `onSelectChange` so existing consumers don't change.
//

type ListboxRootProps = ThemedClassName<ComponentPropsWithRef<'ul'>> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Reserved — autoFocus on mount. RowList's focus-on-entry covers the typical case. */
  autoFocus?: boolean;
};

const ListboxRoot = forwardRef<HTMLUListElement, ListboxRootProps>(
  (props: ListboxScopedProps<ListboxRootProps>, forwardedRef) => {
    const {
      __listboxScope: _scope,
      children,
      classNames,
      value,
      defaultValue,
      onValueChange,
      autoFocus: _autoFocus,
      ...rootProps
    } = props;

    return (
      <RowList.Root selectedId={value} defaultSelectedId={defaultValue} onSelectChange={onValueChange}>
        <RowList.Content {...rootProps} classNames={mx('w-full', classNames)} ref={forwardedRef}>
          {children}
        </RowList.Content>
      </RowList.Root>
    );
  },
);

ListboxRoot.displayName = 'Listbox.Root';

//
// Option — composes `Row`. Adds the listbox-specific styling and
// publishes `{ value, isSelected }` so `OptionIndicator` can render a
// checkmark.
//

type ListboxOptionProps = ThemedClassName<ComponentPropsWithRef<'li'>> & {
  value: string;
};

const ListboxOption = forwardRef<HTMLLIElement, ListboxOptionProps>(
  (props: ListboxScopedProps<ListboxOptionProps>, forwardedRef) => {
    const { __listboxScope, children, classNames, value, ...rootProps } = props;

    // Selection state is read inside `ListboxOptionProviderHost` via
    // the public `useRowListSelection` hook and republished on the
    // listbox-option scope so `OptionIndicator` can render its
    // checkmark synchronously.
    return (
      <Row
        id={value}
        {...rootProps}
        classNames={mx('dx-focus-ring rounded-xs', commandItem, classNames)}
        ref={forwardedRef}
      >
        <ListboxOptionProviderHost value={value}>{children}</ListboxOptionProviderHost>
      </Row>
    );
  },
);

ListboxOption.displayName = 'Listbox.Option';

// Reads selection state from RowList's context (via `useRowListSelection`)
// and publishes it on the listbox-option scope so `OptionIndicator` can
// render its checkmark. Tiny adapter — keeps Listbox's public option API
// intact while delegating the actual state to RowList.
const ListboxOptionProviderHost = ({
  value,
  children,
}: ListboxScopedProps<{ value: string; children?: ReactNode }>) => {
  const isSelected = useRowListSelection(value);
  return (
    <ListboxOptionProvider scope={undefined} value={value} isSelected={isSelected}>
      {children}
    </ListboxOptionProvider>
  );
};

//
// OptionLabel
//

const ListboxOptionLabel = forwardRef<HTMLDivElement, ThemedClassName<ComponentPropsWithRef<'div'>>>(
  ({ children, classNames, ...rootProps }, forwardedRef) => {
    return (
      <span {...rootProps} className={mx('grow truncate', classNames)} ref={forwardedRef}>
        {children}
      </span>
    );
  },
);

ListboxOptionLabel.displayName = 'Listbox.OptionLabel';

//
// OptionIndicator — checkmark for the selected option.
//
// Reads `isSelected` from the option context. The visual indicator is
// also covered by `dx-selected` on the row, so the checkmark is purely
// confirmatory.
//

type ListboxOptionIndicatorProps = Omit<IconProps, 'icon'> & Partial<Pick<IconProps, 'icon'>>;

const ListboxOptionIndicator = forwardRef<SVGSVGElement, ListboxOptionIndicatorProps>(
  (props: ListboxOptionScopedProps<ListboxOptionIndicatorProps>, forwardedRef) => {
    const { __listboxOptionScope, classNames, ...rootProps } = props;
    const { isSelected } = useListboxOptionContext(LISTBOX_OPTION_INDICATOR_NAME, __listboxOptionScope);

    return (
      <Icon
        icon='ph--check--regular'
        {...rootProps}
        classNames={mx(!isSelected && 'invisible', classNames)}
        ref={forwardedRef}
      />
    );
  },
);

ListboxOptionIndicator.displayName = 'Listbox.OptionIndicator';

//
// Listbox
//

export const Listbox = {
  Root: ListboxRoot,
  Option: ListboxOption,
  OptionLabel: ListboxOptionLabel,
  OptionIndicator: ListboxOptionIndicator,
};

export { createListboxScope };

export type { ListboxRootProps, ListboxOptionProps, ListboxScopedProps };
