//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
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
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

//
// Styling
//

const searchItem =
  'plb-1 pli-2 rounded-sm select-none cursor-pointer data-[selected=true]:bg-hoverOverlay hover:bg-hoverOverlay';

//
// Context
//

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
  registerItem: (value: string, element: HTMLElement | null, onSelect: (() => void) | undefined) => void;
  /** Unregister an item. */
  unregisterItem: (value: string) => void;
  /** Get ordered list of registered item values. */
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

  // Track registered items: value -> { element, onSelect }.
  const itemsRef = useRef<Map<string, { element: HTMLElement; onSelect?: () => void }>>(new Map());

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

  // Auto-select first item when items change and no valid selection exists.
  useEffect(() => {
    // Check if current selection is still valid.
    const isSelectionValid = selectedValue !== undefined && itemsRef.current.has(selectedValue);
    if (!isSelectionValid && itemsRef.current.size > 0) {
      // Get first item in DOM order.
      const entries = Array.from(itemsRef.current.entries());
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

  const registerItem = useCallback((value: string, element: HTMLElement | null, onSelect: (() => void) | undefined) => {
    if (element) {
      itemsRef.current.set(value, { element, onSelect });
      setItemVersion((v) => v + 1);
    }
  }, []);

  const unregisterItem = useCallback((value: string) => {
    itemsRef.current.delete(value);
    setItemVersion((v) => v + 1);
  }, []);

  // Get item values in DOM order by sorting registered elements.
  const getItemValues = useCallback(() => {
    const entries = Array.from(itemsRef.current.entries());
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
    const { hasIosKeyboard, tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);

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
        placeholder={placeholder ?? 'Search...'}
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
}>;

const SearchItem = forwardRef<HTMLDivElement, SearchItemProps>(
  ({ classNames, value, label, icon, onSelect }, forwardedRef) => {
    const { selectedValue, registerItem, unregisterItem } = useSearchContext('Search.Item');
    const internalRef = useRef<HTMLDivElement>(null);

    const isSelected = selectedValue === value;

    // Register this item.
    useEffect(() => {
      const element = internalRef.current;
      if (element) {
        registerItem(value, element, onSelect);
      }
      return () => unregisterItem(value);
    }, [value, onSelect, registerItem, unregisterItem]);

    // Scroll into view when selected.
    useEffect(() => {
      if (isSelected && internalRef.current) {
        internalRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [isSelected]);

    const handleClick = useCallback(() => {
      onSelect?.();
    }, [onSelect]);

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
        data-selected={isSelected}
        data-value={value}
        tabIndex={-1}
        className={mx('flex gap-2 items-center', searchItem, classNames)}
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
};

export { useSearchContext, useSearchInput, useSearchItem };

export type {
  SearchRootProps,
  SearchViewportProps,
  SearchContentProps,
  SearchInputProps,
  SearchItemProps,
  SearchEmptyProps,
};
