//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import { descriptionText, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';

import {
  SearchListInputContextProvider,
  SearchListItemContextProvider,
  useSearchListInputContext,
  useSearchListItemContext,
} from './context';

//
// Styling
//

export const searchListItem =
  'plb-1 pli-2 rounded-sm select-none cursor-pointer data-[selected=true]:bg-hoverOverlay hover:bg-hoverOverlay';

//
// Internal types
//

type ItemData = {
  element: HTMLElement;
  onSelect?: () => void;
  disabled?: boolean;
};

//
// Root
//

type SearchListRootProps = ThemedClassName<
  PropsWithChildren<{
    /** Callback when search query changes (debounced). */
    onSearch?: (query: string) => void;
    /** Controlled query value. */
    value?: string;
    /** Default query value for uncontrolled mode. */
    defaultValue?: string;
    /** Debounce delay in milliseconds. */
    debounceMs?: number;
    /** Accessibility label for the search list. */
    label?: string;
  }>
>;

const SearchListRoot = ({
  children,
  onSearch,
  value: valueProp,
  defaultValue = '',
  debounceMs = 200,
  label,
  classNames,
  ...props
}: SearchListRootProps) => {
  const [query = '', setQuery] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: undefined,
  });

  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);

  // Track registered items: value -> { element, onSelect, disabled }.
  const itemsRef = useRef<Map<string, ItemData>>(new Map());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      // Don't update selectedValue here - let the effect handle it when items actually change
      // This prevents unnecessary re-renders of items when query changes

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
  const [itemVersion, setItemVersion] = useState(0);

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
        if (firstValue !== undefined && firstValue !== selectedValue) {
          setSelectedValue(firstValue);
        }
      } else if (selectedValue !== undefined) {
        // No valid items available, clear selection
        setSelectedValue(undefined);
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

  // Item context - stable, doesn't change when query changes
  const itemContextValue = useMemo(
    () => ({
      selectedValue,
      onSelectedValueChange: setSelectedValue,
      registerItem,
      unregisterItem,
    }),
    [selectedValue, registerItem, unregisterItem], // setSelectedValue is stable, don't include it
  );

  // Input context - can change when query changes
  const inputContextValue = useMemo(
    () => ({
      query,
      onQueryChange: handleQueryChange,
      selectedValue,
      onSelectedValueChange: setSelectedValue,
      getItemValues,
      triggerSelect,
    }),
    [query, handleQueryChange, selectedValue, getItemValues, triggerSelect], // setSelectedValue is stable
  );

  return (
    <SearchListItemContextProvider
      selectedValue={itemContextValue.selectedValue}
      onSelectedValueChange={itemContextValue.onSelectedValueChange}
      registerItem={itemContextValue.registerItem}
      unregisterItem={itemContextValue.unregisterItem}
    >
      <SearchListInputContextProvider
        query={inputContextValue.query}
        onQueryChange={inputContextValue.onQueryChange}
        selectedValue={inputContextValue.selectedValue}
        onSelectedValueChange={inputContextValue.onSelectedValueChange}
        getItemValues={inputContextValue.getItemValues}
        triggerSelect={inputContextValue.triggerSelect}
      >
        <div {...props} className={mx(classNames)} aria-label={label} role='combobox' aria-expanded='true'>
          {children}
        </div>
      </SearchListInputContextProvider>
    </SearchListItemContextProvider>
  );
};

SearchListRoot.displayName = 'SearchList.Root';

//
// Viewport
//

type SearchListViewportProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Scrollable viewport wrapper for Content.
 * Only Content wrapped in Viewport will be scrollable.
 */
const SearchListViewport = ({ classNames, children }: SearchListViewportProps) => {
  return (
    <div role='none' className={mx('is-full min-bs-0 grow overflow-y-auto', classNames)}>
      {children}
    </div>
  );
};

SearchListViewport.displayName = 'SearchList.Viewport';

//
// Content
//

type SearchListContentProps = ThemedClassName<PropsWithChildren<{}>>;

/**
 * Container for search results. Does not scroll by default.
 * Wrap in Viewport for scrollable content.
 */
const SearchListContent = forwardRef<HTMLDivElement, SearchListContentProps>(
  ({ classNames, children }, forwardedRef) => {
    return (
      <div
        ref={forwardedRef}
        role='listbox'
        className={mx('flex flex-col is-full min-bs-0 grow overflow-hidden', classNames)}
      >
        {children}
      </div>
    );
  },
);

SearchListContent.displayName = 'SearchList.Content';

//
// Input
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
  (
    { classNames, density: propsDensity, elevation: propsElevation, variant, placeholder, onChange, ...props },
    forwardedRef,
  ) => {
    const { query, onQueryChange, selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
      useSearchListInputContext('SearchList.Input');
    const { t } = useTranslation(translationKey);
    const { hasIosKeyboard, tx } = useThemeContext();
    const density = useDensityContext(propsDensity);
    const elevation = useElevationContext(propsElevation);
    const defaultPlaceholder = t('search.placeholder');

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
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

SearchListInput.displayName = 'SearchList.Input';

//
// Item
//

type SearchListItemProps = ThemedClassName<{
  /** Unique identifier for the item. */
  value: string;
  /** Display label for the item. */
  label: string;
  /** Icon to display (string identifier for Icon component). */
  icon?: string;
  /** Whether to show a check icon. */
  checked?: boolean;
  /** Suffix text to display after the label. */
  suffix?: string;
  /** Callback when item is selected. */
  onSelect?: () => void;
  /** Whether the item is disabled. */
  disabled?: boolean;
}>;

const SearchListItem = forwardRef<HTMLDivElement, SearchListItemProps>(
  ({ classNames, value, label, icon, checked, suffix, onSelect, disabled }, forwardedRef) => {
    const { selectedValue, registerItem, unregisterItem } = useSearchListItemContext('SearchList.Item');
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
          searchListItem,
          disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent data-[selected=true]:bg-transparent',
          classNames,
        )}
        onClick={handleClick}
      >
        {icon && <Icon icon={icon} size={5} />}
        <span className='is-0 grow truncate'>{label}</span>
        {suffix && <span className={mx('shrink-0', descriptionText)}>{suffix}</span>}
        {checked && <Icon icon='ph--check--regular' size={5} />}
      </div>
    );
  },
);

SearchListItem.displayName = 'SearchList.Item';

//
// Empty
//

type SearchListEmptyProps = ThemedClassName<PropsWithChildren<{}>>;

const SearchListEmpty = ({ classNames, children }: SearchListEmptyProps) => {
  return (
    <div role='status' className={mx('flex flex-col is-full pli-2 plb-1', classNames)}>
      {children}
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

/**
 * Groups related search items with an optional heading.
 */
const SearchListGroup = forwardRef<HTMLDivElement, SearchListGroupProps>(
  ({ classNames, heading, children }, forwardedRef) => {
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
  },
);

SearchListGroup.displayName = 'SearchList.Group';

//
// SearchList
//

export const SearchList = {
  Root: SearchListRoot,
  Viewport: SearchListViewport,
  Content: SearchListContent,
  Input: SearchListInput,
  Item: SearchListItem,
  Empty: SearchListEmpty,
  Group: SearchListGroup,
};

export type {
  SearchListRootProps,
  SearchListViewportProps,
  SearchListContentProps,
  SearchListInputProps,
  SearchListItemProps,
  SearchListEmptyProps,
  SearchListGroupProps,
};
