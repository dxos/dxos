//
// Copyright 2025 DXOS.org
//

// `SearchList` — search-themed wrapper around `Picker` (this same package).
//
// What `SearchList` adds on top of `Picker`:
//
//   - Query state (controllable / uncontrolled).
//   - Debounced `onSearch` callback.
//   - Default placeholder from translation (`search.placeholder`).
//   - `Empty` placeholder with translation (`empty-results.message`).
//   - `Group` heading layout helper.
//   - Convenience `Item` renderer (icon + label + suffix + check).
//
// Everything else (registry, virtual highlight, keyboard nav, auto-
// select-first, scroll-into-view) comes from `Picker`. This file is a
// thin search-domain wrapper; the heavy lifting is in `../Picker`.

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import { type Density, type Elevation, type ThemedClassName, Icon, ScrollArea, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Picker, usePickerInputContext, usePickerItemContext } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { SearchListInputContextProvider, SearchListItemContextProvider, useSearchListInputContext } from './context';

//
// Root — wraps `Picker.Root` and adds query state + debounced onSearch.
//

type SearchListRootProps = PropsWithChildren<{
  /** Controlled query value. */
  value?: string;
  /** Default query value for uncontrolled mode. */
  defaultValue?: string;
  /** Debounce delay in milliseconds. */
  debounceMs?: number;
  /** Callback when search query changes (debounced). */
  onSearch?: (query: string) => void;
}>;

const SearchListRoot = ({
  children,
  value: valueProp,
  defaultValue = '',
  debounceMs = 200,
  onSearch,
}: SearchListRootProps) => {
  const [query = '', setQuery] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: undefined,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch?.(newQuery);
      }, debounceMs);
    },
    [setQuery, onSearch, debounceMs],
  );

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <Picker.Root>
      <SearchListContextBridge query={query} onQueryChange={handleQueryChange}>
        {children}
      </SearchListContextBridge>
    </Picker.Root>
  );
};

SearchListRoot.displayName = 'SearchList.Root';

// Re-publishes `Picker`'s contexts with the search-specific `query` /
// `onQueryChange` fields tacked on, so the existing
// `SearchListInputContextValue` / `SearchListItemContextValue` shapes
// (and the public `useSearchListInput` / `useSearchListItem` hooks)
// keep working unchanged.
type SearchListContextBridgeProps = PropsWithChildren<{
  query: string;
  onQueryChange: (value: string) => void;
}>;

const SearchListContextBridge = ({ query, onQueryChange, children }: SearchListContextBridgeProps) => {
  const picker = usePickerInputContext('SearchList.Root');
  const itemCtx = usePickerItemContext('SearchList.Root');
  return (
    <SearchListInputContextProvider
      query={query}
      onQueryChange={onQueryChange}
      selectedValue={picker.selectedValue}
      onSelectedValueChange={picker.onSelectedValueChange}
      getItemValues={picker.getItemValues}
      triggerSelect={picker.triggerSelect}
    >
      <SearchListItemContextProvider
        selectedValue={itemCtx.selectedValue}
        onSelectedValueChange={itemCtx.onSelectedValueChange}
        registerItem={itemCtx.registerItem}
        unregisterItem={itemCtx.unregisterItem}
      >
        {children}
      </SearchListItemContextProvider>
    </SearchListInputContextProvider>
  );
};

//
// Content
//

type SearchListContentProps = {};

/**
 * Optional styling wrapper that groups `SearchList.Input` and `SearchList.Viewport` into a single
 * `dx-expander` container. Layout-neutral: it does NOT participate in any column/grid placement.
 *
 * When hosting `SearchList` inside a `Column.Root` (e.g. `Dialog.Body`), the parent propagator
 * handles column placement for SearchList's children automatically.
 */
const SearchListContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...composableProps(props, { role: 'none', classNames: 'dx-expander' })} ref={forwardedRef}>
      {children}
    </div>
  );
});

SearchListContent.displayName = 'SearchList.Content';

//
// Input — search-themed wrapper around Picker.Input. Adds default
// placeholder translation; reads/writes the query from search context.
//

type InputVariant = 'default' | 'subdued';

type SearchListInputProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'value'> & {
    density?: Density;
    elevation?: Elevation;
    variant?: InputVariant;
  }
>;

const SearchListInput = forwardRef<HTMLInputElement, SearchListInputProps>(
  ({ density, elevation, variant = 'subdued', placeholder, onChange, ...props }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    const { query, onQueryChange } = useSearchListInputContext('SearchList.Input');
    const defaultPlaceholder = t('search.placeholder');

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        // Picker.Input drives its own keyboard handling; we let the
        // inner change handler also fire by chaining via onChange (the
        // Picker's onValueChange path is what updates query).
        onChange?.(event);
      },
      [onChange],
    );

    return (
      <Picker.Input
        {...props}
        density={density}
        elevation={elevation}
        variant={variant}
        placeholder={placeholder ?? defaultPlaceholder}
        value={query}
        onValueChange={onQueryChange}
        onChange={handleChange}
        ref={forwardedRef}
      />
    );
  },
);

SearchListInput.displayName = 'SearchList.Input';

//
// Viewport — scroll surface; carries `role='listbox'`.
//

type SearchListViewportProps = {};

const SearchListViewport = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  return (
    <ScrollArea.Root {...composableProps(props)} role='listbox' centered padding thin ref={forwardedRef}>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

SearchListViewport.displayName = 'SearchList.Viewport';

//
// Item — search-themed convenience wrapper around `Picker.Item`.
//

type SearchListItemProps = ThemedClassName<{
  /** Unique identifier. */
  value: string;
  /** Display label. */
  label: string;
  /** Icon id. */
  icon?: string;
  /** Additional class names for the icon. */
  iconClassNames?: string;
  /** Show a check icon to the right. */
  checked?: boolean;
  /** Suffix text after the label. */
  suffix?: string;
  /** Callback when item is selected. */
  onSelect?: () => void;
  /** Disabled. */
  disabled?: boolean;
}>;

const SearchListItem = forwardRef<HTMLDivElement, SearchListItemProps>(
  ({ classNames, value, label, icon, iconClassNames, checked, suffix, onSelect, disabled }, forwardedRef) => {
    return (
      <Picker.Item
        value={value}
        onSelect={onSelect}
        disabled={disabled}
        classNames={mx('flex gap-2 items-center px-2 rounded-xs', classNames)}
        ref={forwardedRef}
      >
        {icon && <Icon icon={icon} classNames={iconClassNames} />}
        <span className='w-0 grow truncate'>{label}</span>
        {suffix && <span className='shrink-0 text-description'>{suffix}</span>}
        {checked && <Icon icon='ph--check--regular' />}
      </Picker.Item>
    );
  },
);

SearchListItem.displayName = 'SearchList.Item';

//
// Empty
//

type SearchListEmptyProps = ThemedClassName;

const SearchListEmpty = ({ classNames }: SearchListEmptyProps) => {
  const { t } = useTranslation(translationKey);
  return (
    <div role='status' className={mx(classNames)}>
      {t('empty-results.message')}
    </div>
  );
};

SearchListEmpty.displayName = 'SearchList.Empty';

//
// Group
//

type SearchListGroupProps = ThemedClassName<
  PropsWithChildren<{
    /** Heading for the group. */
    heading?: ReactNode;
  }>
>;

const SearchListGroup = forwardRef<HTMLDivElement, SearchListGroupProps>(
  ({ classNames, heading, children }, forwardedRef) => {
    return (
      <div ref={forwardedRef} role='group' className={mx('flex flex-col', classNames)}>
        {heading && (
          <div role='presentation' className='px-2 py-1 text-xs font-medium text-description'>
            {heading}
          </div>
        )}
        {children}
      </div>
    );
  },
);

SearchListGroup.displayName = 'SearchList.Group';

//
// SearchList
//

export const SearchList = {
  Root: SearchListRoot,
  Content: SearchListContent,
  Viewport: SearchListViewport,
  Input: SearchListInput,
  Item: SearchListItem,
  Empty: SearchListEmpty,
  Group: SearchListGroup,
};

export type {
  SearchListContentProps,
  SearchListEmptyProps,
  SearchListGroupProps,
  SearchListInputProps,
  SearchListItemProps,
  SearchListRootProps,
  SearchListViewportProps,
};
