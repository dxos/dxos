//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
// NOTE: We use command-score for fuzzy matching because:
// 1. It's the same algorithm used by cmdk, providing consistency with SearchList.
// 2. It's extremely lightweight (~390 bytes minified).
// 3. Simple API: just score(string, query) → number.
// For more advanced needs (highlighting, out-of-order matching, large datasets),
// consider uFuzzy (https://github.com/leeoniya/uFuzzy) instead.
import commandScore from 'command-score';
import React, {
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  type Density,
  type Elevation,
  Icon,
  type ThemedClassName,
  useDensityContext,
  useElevationContext,
  useThemeContext,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '../meta';

//
// Styling
//

const searchItem =
  'plb-1 pli-2 rounded-sm select-none cursor-pointer data-[selected=true]:bg-hoverOverlay hover:bg-hoverOverlay';

//
// Context
//

type ItemData = {
  element: HTMLElement;
  onSelect?: () => void;
  disabled?: boolean;
};

type SearchContextValue = {
  /** Current search query. */
  query: string;
  /** Update the query value. */
  onQueryChange: (query: string) => void;
  /** Currently selected item value for keyboard navigation. */
  selectedValue: string | undefined;
  /** Update the selected value. */
  onSelectedValueChange: (value: string | undefined) => void;
  /** Register an item for keyboard navigation. */
  registerItem: (
    value: string,
    element: HTMLElement | null,
    onSelect: (() => void) | undefined,
    disabled?: boolean,
  ) => void;
  /** Unregister an item. */
  unregisterItem: (value: string) => void;
  /** Get ordered list of registered item values (excludes disabled items). */
  getItemValues: () => string[];
  /** Trigger selection of the currently highlighted item. */
  triggerSelect: () => void;
};

const [SearchContextProvider, useSearchContext] = createContext<SearchContextValue>('Search');

//
// Root
//

type SearchRootProps = PropsWithChildren<{
  /** Callback when search query changes (debounced). */
  onSearch?: (query: string) => void;
  /** Controlled query value. */
  value?: string;
  /** Default query value for uncontrolled mode. */
  defaultValue?: string;
  /** Debounce delay in milliseconds. */
  debounceMs?: number;
}>;

const SearchRoot = ({ children, onSearch, value: valueProp, defaultValue = '', debounceMs = 200 }: SearchRootProps) => {
  const [query = '', setQuery] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: undefined,
  });

  const [selectedValue, setSelectedValue] = React.useState<string | undefined>(undefined);

  // Track registered items: value -> { element, onSelect, disabled }.
  const itemsRef = useRef<Map<string, ItemData>>(new Map());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      // Results will change, so we'll let item registration handle selecting the first item.
      // Clear current selection - first registered item will become selected.
      setSelectedValue(undefined);

      // Debounce onSearch callback.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onSearch?.(newQuery);
      }, debounceMs);
    },
    [setQuery, onSearch, debounceMs],
  );

  // Track when items change to trigger first-item selection.
  const [itemVersion, setItemVersion] = React.useState(0);

  // Cleanup debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Auto-select first non-disabled item when items change and no valid selection exists.
  useEffect(() => {
    // Check if current selection is still valid (exists and not disabled).
    const currentItem = selectedValue !== undefined ? itemsRef.current.get(selectedValue) : undefined;
    const isSelectionValid = currentItem !== undefined && !currentItem.disabled;
    if (!isSelectionValid && itemsRef.current.size > 0) {
      // Get first non-disabled item in DOM order.
      const entries = Array.from(itemsRef.current.entries()).filter(([, data]) => !data.disabled);
      if (entries.length > 0) {
        entries.sort(([, a], [, b]) => {
          const position = a.element.compareDocumentPosition(b.element);
          if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
            return -1;
          }
          if (position & Node.DOCUMENT_POSITION_PRECEDING) {
            return 1;
          }
          return 0;
        });
        const firstValue = entries[0]?.[0];
        if (firstValue !== undefined) {
          setSelectedValue(firstValue);
        }
      }
    }
  }, [itemVersion, selectedValue]);

  const registerItem = useCallback(
    (value: string, element: HTMLElement | null, onSelect: (() => void) | undefined, disabled?: boolean) => {
      if (element) {
        itemsRef.current.set(value, { element, onSelect, disabled });
        setItemVersion((v) => v + 1);
      }
    },
    [],
  );

  const unregisterItem = useCallback((value: string) => {
    itemsRef.current.delete(value);
    setItemVersion((v) => v + 1);
  }, []);

  // Get item values in DOM order by sorting registered elements (excludes disabled items).
  const getItemValues = useCallback(() => {
    const entries = Array.from(itemsRef.current.entries()).filter(([, data]) => !data.disabled);
    // Sort by DOM position using compareDocumentPosition.
    entries.sort(([, a], [, b]) => {
      const position = a.element.compareDocumentPosition(b.element);
      if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
      }
      if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
      }
      return 0;
    });
    return entries.map(([value]) => value);
  }, []);

  const triggerSelect = useCallback(() => {
    if (selectedValue !== undefined) {
      const item = itemsRef.current.get(selectedValue);
      item?.onSelect?.();
    }
  }, [selectedValue]);

  return (
    <SearchContextProvider
      query={query}
      onQueryChange={handleQueryChange}
      selectedValue={selectedValue}
      onSelectedValueChange={setSelectedValue}
      registerItem={registerItem}
      unregisterItem={unregisterItem}
      getItemValues={getItemValues}
      triggerSelect={triggerSelect}
    >
      {children}
    </SearchContextProvider>
  );
};

SearchRoot.displayName = 'Search.Root';

//
// Viewport
//

type SearchViewportProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Scrollable viewport wrapper for Content.
 * Only Content wrapped in Viewport will be scrollable.
 */
const SearchViewport = ({ classNames, children }: SearchViewportProps) => {
  return (
    <div role='none' className={mx('is-full min-bs-0 grow overflow-y-auto', classNames)}>
      {children}
    </div>
  );
};

SearchViewport.displayName = 'Search.Viewport';

//
// Content
//

type SearchContentProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Container for search results. Does not scroll by default.
 * Wrap in Viewport for scrollable content.
 */
const SearchContent = forwardRef<HTMLDivElement, SearchContentProps>(({ classNames, children }, forwardedRef) => {
  return (
    <div
      ref={forwardedRef}
      role='listbox'
      className={mx('flex flex-col is-full min-bs-0 grow overflow-hidden', classNames)}
    >
      {children}
    </div>
  );
});

SearchContent.displayName = 'Search.Content';

//
// Input
//

type InputVariant = 'default' | 'subdued';

type SearchInputProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'value'> & {
    density?: Density;
    elevation?: Elevation;
    variant?: InputVariant;
  }
>;

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    { classNames, density: propsDensity, elevation: propsElevation, variant, placeholder, onChange, ...props },
    forwardedRef,
  ) => {
    const { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
      useSearchContext('Search.Input');
    const { t } = useTranslation(meta.id);
    const { hasIosKeyboard, tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const defaultPlaceholder = t('search placeholder');

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onQueryChange(event.target.value);
        onChange?.(event);
      },
      [onQueryChange, onChange],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        const values = getItemValues();
        if (values.length === 0) {
          if (event.key === 'Escape') {
            onQueryChange('');
          }
          return;
        }

        const currentIndex = selectedValue !== undefined ? values.indexOf(selectedValue) : -1;

        switch (event.key) {
          case 'ArrowDown': {
            event.preventDefault();
            const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, values.length - 1);
            const nextValue = values[nextIndex];
            if (nextValue !== undefined) {
              onSelectedValueChange(nextValue);
            }
            break;
          }
          case 'ArrowUp': {
            event.preventDefault();
            const prevIndex = currentIndex === -1 ? values.length - 1 : Math.max(currentIndex - 1, 0);
            const prevValue = values[prevIndex];
            if (prevValue !== undefined) {
              onSelectedValueChange(prevValue);
            }
            break;
          }
          case 'Enter': {
            if (selectedValue !== undefined) {
              event.preventDefault();
              triggerSelect();
            }
            break;
          }
          case 'Home': {
            event.preventDefault();
            const firstValue = values[0];
            if (firstValue !== undefined) {
              onSelectedValueChange(firstValue);
            }
            break;
          }
          case 'End': {
            event.preventDefault();
            const lastValue = values[values.length - 1];
            if (lastValue !== undefined) {
              onSelectedValueChange(lastValue);
            }
            break;
          }
          case 'Escape': {
            event.preventDefault();
            if (selectedValue !== undefined) {
              onSelectedValueChange(undefined);
            } else {
              onQueryChange('');
            }
            break;
          }
        }
      },
      [selectedValue, onSelectedValueChange, getItemValues, triggerSelect, onQueryChange],
    );

    return (
      <input
        {...props}
        type='text'
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? defaultPlaceholder}
        className={tx(
          'input.input',
          'input',
          {
            variant,
            disabled: props.disabled,
            density,
            elevation,
          },
          classNames,
        )}
        {...(props.autoFocus && !hasIosKeyboard && { autoFocus: true })}
        ref={forwardedRef}
      />
    );
  },
);

SearchInput.displayName = 'Search.Input';

//
// Item
//

type SearchItemProps = ThemedClassName<{
  /** Unique identifier for the item. */
  value: string;
  /** Display label for the item. */
  label: string;
  /** Icon to display (string for Icon component, or ReactNode for custom). */
  icon?: string | ReactNode;
  /** Callback when item is selected. */
  onSelect?: () => void;
  /** Whether the item is disabled. */
  disabled?: boolean;
}>;

const SearchItem = forwardRef<HTMLDivElement, SearchItemProps>(
  ({ classNames, value, label, icon, onSelect, disabled }, forwardedRef) => {
    const { selectedValue, registerItem, unregisterItem } = useSearchContext('Search.Item');
    const internalRef = useRef<HTMLDivElement>(null);

    const isSelected = selectedValue === value && !disabled;

    // Register this item.
    useEffect(() => {
      const element = internalRef.current;
      if (element) {
        registerItem(value, element, onSelect, disabled);
      }
      return () => unregisterItem(value);
    }, [value, onSelect, disabled, registerItem, unregisterItem]);

    // Scroll into view when selected.
    useEffect(() => {
      if (isSelected && internalRef.current) {
        internalRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [isSelected]);

    const handleClick = useCallback(() => {
      if (!disabled) {
        onSelect?.();
      }
    }, [onSelect, disabled]);

    // Render icon.
    const iconElement = icon === undefined ? null : typeof icon === 'string' ? <Icon icon={icon} size={5} /> : icon;

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof forwardedRef === 'function') {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        role='option'
        aria-selected={isSelected}
        aria-disabled={disabled}
        data-selected={isSelected}
        data-disabled={disabled}
        data-value={value}
        tabIndex={-1}
        className={mx(
          'flex gap-2 items-center',
          searchItem,
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent data-[selected=true]:bg-transparent',
          classNames,
        )}
        onClick={handleClick}
      >
        {iconElement}
        <span className='is-0 grow truncate'>{label}</span>
      </div>
    );
  },
);

SearchItem.displayName = 'Search.Item';

//
// Empty
//

type SearchEmptyProps = ThemedClassName<PropsWithChildren<{}>>;

const SearchEmpty = ({ classNames, children }: SearchEmptyProps) => {
  return (
    <div role='status' className={mx('flex flex-col is-full pli-2 plb-1', classNames)}>
      {children}
    </div>
  );
};

SearchEmpty.displayName = 'Search.Empty';

//
// Group
//

type SearchGroupProps = ThemedClassName<
  PropsWithChildren<{
    /** Heading for the group. */
    heading?: ReactNode;
  }>
>;

/**
 * Groups related search items with an optional heading.
 */
const SearchGroup = forwardRef<HTMLDivElement, SearchGroupProps>(({ classNames, heading, children }, forwardedRef) => {
  return (
    <div ref={forwardedRef} role='group' className={mx('flex flex-col', classNames)}>
      {heading && (
        <div role='presentation' className='pli-2 plb-1 text-xs font-medium text-description'>
          {heading}
        </div>
      )}
      {children}
    </div>
  );
});

SearchGroup.displayName = 'Search.Group';

//
// Hooks
//

/**
 * Hook to access the search context for custom input implementations.
 */
const useSearchInput = () => {
  const { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
    useSearchContext('useSearchInput');
  return { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect };
};

/**
 * Hook to access selection state for custom item renderers.
 * Returns the current selected value and registration functions.
 */
const useSearchItem = () => {
  const { selectedValue, registerItem, unregisterItem } = useSearchContext('useSearchItem');
  return { selectedValue, registerItem, unregisterItem };
};

type UseSearchResultsOptions<T> = {
  /** Items to filter. */
  items: T[];
  /** Custom filter function. Defaults to filtering by 'label' property. */
  filter?: (item: T, query: string) => boolean;
  /** Enable fuzzy filtering using command-score algorithm (used by cmdk). Defaults to true. */
  fuzzy?: boolean;
  /** Custom function to extract the searchable string from an item. Defaults to 'label' property. */
  extract?: (item: T) => string;
  /** Minimum score threshold for fuzzy matches (0-1). Defaults to 0. */
  minScore?: number;
};

/**
 * Hook to manage search results with fuzzy filtering (enabled by default).
 * Returns filtered results and a handleSearch function to pass to Search.Root.
 *
 * @example
 * // Default fuzzy filtering using command-score
 * const { results, handleSearch } = useSearchResults({ items });
 *
 * @example
 * // Disable fuzzy for basic case-insensitive substring match
 * const { results, handleSearch } = useSearchResults({ items, fuzzy: false });
 *
 * @example
 * // Custom extraction for fuzzy filtering
 * const { results, handleSearch } = useSearchResults({
 *   items,
 *   extract: (item) => `${item.name} ${item.description}`,
 * });
 */
const useSearchResults = <T extends { label?: string }>({
  items,
  filter,
  fuzzy = true,
  extract,
  minScore = 0,
}: UseSearchResultsOptions<T>) => {
  const [results, setResults] = React.useState<T[]>(items);

  // Update results when items change.
  useEffect(() => {
    setResults(items);
  }, [items]);

  const defaultExtract = useCallback((item: T) => item.label ?? '', []);
  const extractFn = extract ?? defaultExtract;

  const defaultFilter = useCallback((item: T, query: string) => {
    const label = item.label ?? '';
    return label.toLowerCase().includes(query.toLowerCase());
  }, []);

  const filterFn = filter ?? defaultFilter;

  const handleSearch = useCallback(
    (query: string) => {
      if (!query) {
        setResults(items);
        return;
      }

      if (fuzzy) {
        // Score and filter items using command-score.
        const scored = items
          .map((item) => ({
            item,
            score: commandScore(extractFn(item), query) as number,
          }))
          .filter(({ score }) => score > minScore)
          .sort((a, b) => b.score - a.score);

        setResults(scored.map(({ item }) => item));
      } else {
        const filtered = items.filter((item) => filterFn(item, query));
        setResults(filtered);
      }
    },
    [items, filterFn, fuzzy, extractFn, minScore],
  );

  return { results, handleSearch };
};

//
// Search
//

export const Search = {
  Root: SearchRoot,
  Viewport: SearchViewport,
  Content: SearchContent,
  Input: SearchInput,
  Item: SearchItem,
  Empty: SearchEmpty,
  Group: SearchGroup,
};

export { useSearchContext, useSearchInput, useSearchItem, useSearchResults };

export type {
  SearchRootProps,
  SearchViewportProps,
  SearchContentProps,
  SearchInputProps,
  SearchItemProps,
  SearchEmptyProps,
  SearchGroupProps,
};
