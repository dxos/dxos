//
// Copyright 2026 DXOS.org
//

// `Picker` — generic listbox-with-input compound (the WAI-ARIA combobox
// keyboard pattern, sans the search-domain bits).
//
// Owns:
//   - The virtual-highlight selection model (`selectedValue` updated by
//     arrow keys; items don't receive browser focus, the input retains it).
//   - An item registry (`registerItem` / `unregisterItem`) used by the
//     input's keyboard handler to walk DOM-order siblings.
//   - Auto-select-first-when-items-change behaviour.
//   - `triggerSelect` so Enter from the input fires the highlighted
//     item's `onSelect`.
//
// Does NOT own:
//   - Query / search state (`query`, `onSearch`, `debounceMs`) — that
//     lives in `@dxos/react-ui-search`'s `SearchList`, which composes
//     `Picker` + adds the search-themed wrapper.
//   - Filtering / ranking — same, see `useSearchListResults`.
//   - The `<ul role='listbox'>` wrapper. Caller provides one (today's
//     `SearchList.Viewport` / future `Combobox.Content` puts the role
//     on the scroll surface).
//   - Translations.
//
// Compound shape (matches Radix Select / Combobox patterns):
//
//   <Picker.Root>
//     <Picker.Input value={query} onValueChange={setQuery} />
//     <YourScrollWrapper role='listbox'>
//       {items.map(item => (
//         <Picker.Item key={item.id} value={item.id} onSelect={…}>
//           {item.label}
//         </Picker.Item>
//       ))}
//     </YourScrollWrapper>
//   </Picker.Root>
//
// Why two contexts (Item / Input) — performance: items don't re-render
// when the input value changes; the input doesn't re-render when an
// item registers / unregisters.

import { Slot } from '@radix-ui/react-slot';
import React, {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type KeyboardEvent,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type Density, type Elevation, Input, type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  PickerInputContextProvider,
  PickerItemContextProvider,
  usePickerInputContext,
  usePickerItemContext,
} from './context';

//
// Internal types.
//

type ItemData = {
  element: HTMLElement;
  disabled?: boolean;
  onSelect?: () => void;
};

//
// Root — context provider; renders no DOM.
//

type PickerRootProps = PropsWithChildren<{}>;

const PickerRoot = ({ children }: PickerRootProps) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);

  // Item registry: value → { element, onSelect, disabled }.
  const itemsRef = useRef<Map<string, ItemData>>(new Map());

  // Bumped on every (un)register so the auto-select-first effect can fire.
  const [itemVersion, setItemVersion] = useState(0);

  // Auto-select first non-disabled item when the registry changes and the
  // current selection is no longer valid (gone or disabled).
  useEffect(() => {
    const current = selectedValue !== undefined ? itemsRef.current.get(selectedValue) : undefined;
    const isValid = current !== undefined && !current.disabled;
    if (!isValid && itemsRef.current.size > 0) {
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

  // DOM-order traversal of registered items (excludes disabled).
  const getItemValues = useCallback(() => {
    return Array.from(itemsRef.current.entries())
      .filter(([, data]) => !data.disabled)
      .sort(([, a], [, b]) => {
        const position = a.element.compareDocumentPosition(b.element);
        return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : position & Node.DOCUMENT_POSITION_PRECEDING ? 1 : 0;
      })
      .map(([value]) => value);
  }, []);

  const triggerSelect = useCallback(() => {
    if (selectedValue !== undefined) {
      const item = itemsRef.current.get(selectedValue);
      item?.onSelect?.();
    }
  }, [selectedValue]);

  // Stable: items subscribe to this. Excludes the volatile bits (input
  // helpers) that change with every keystroke.
  const itemContextValue = useMemo(
    () => ({
      selectedValue,
      onSelectedValueChange: setSelectedValue,
      registerItem,
      unregisterItem,
    }),
    [selectedValue, registerItem, unregisterItem],
  );

  // Volatile: input subscribes to this. Includes the keyboard helpers.
  const inputContextValue = useMemo(
    () => ({
      selectedValue,
      onSelectedValueChange: setSelectedValue,
      getItemValues,
      triggerSelect,
    }),
    [selectedValue, getItemValues, triggerSelect],
  );

  return (
    <PickerInputContextProvider {...inputContextValue}>
      <PickerItemContextProvider {...itemContextValue}>{children}</PickerItemContextProvider>
    </PickerInputContextProvider>
  );
};

PickerRoot.displayName = 'Picker.Root';

//
// Input — text input with virtual-highlight keyboard handling.
//

type InputVariant = 'default' | 'subdued';

type PickerInputProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'value'> & {
    /** Controlled input value. Caller owns this — e.g. binds to query state. */
    value?: string;
    /** Called on every keystroke with the new input string. */
    onValueChange?: (value: string) => void;
    density?: Density;
    elevation?: Elevation;
    variant?: InputVariant;
  }
>;

const PickerInput = forwardRef<HTMLInputElement, PickerInputProps>(
  ({ value, onValueChange, onChange, onKeyDown, autoFocus, ...props }, forwardedRef) => {
    const { hasIosKeyboard } = useThemeContext();
    const { selectedValue, onSelectedValueChange, getItemValues, triggerSelect } =
      usePickerInputContext('Picker.Input');

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLInputElement>) => {
        onValueChange?.(event.target.value);
        onChange?.(event);
      },
      [onValueChange, onChange],
    );

    const handleKeyDown = useCallback(
      (event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) {
          return;
        }
        const values = getItemValues();
        if (values.length === 0) {
          if (event.key === 'Escape') {
            onValueChange?.('');
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
              onValueChange?.('');
            }
            break;
          }
        }
      },
      [selectedValue, onSelectedValueChange, getItemValues, triggerSelect, onValueChange, onKeyDown],
    );

    return (
      <Input.Root>
        <Input.TextInput
          {...props}
          autoFocus={autoFocus && !hasIosKeyboard}
          value={value ?? ''}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={forwardedRef}
        />
      </Input.Root>
    );
  },
);

PickerInput.displayName = 'Picker.Input';

//
// Item — option that registers in the parent's registry.
//

type PickerItemProps = ThemedClassName<{
  /** Unique identifier; used by the registry and DOM-order traversal. */
  value: string;
  /** Callback when the item is committed (click, or Enter while highlighted). */
  onSelect?: () => void;
  /** Disable the item — registry-visible but not focusable, not navigable, not clickable. */
  disabled?: boolean;
  asChild?: boolean;
  children?: React.ReactNode;
}>;

const PickerItem = forwardRef<HTMLDivElement, PickerItemProps>(
  ({ classNames, value, onSelect, disabled, asChild, children, ...props }, forwardedRef) => {
    const { selectedValue, registerItem, unregisterItem } = usePickerItemContext('Picker.Item');
    const internalRef = useRef<HTMLDivElement>(null);

    const isSelected = selectedValue === value && !disabled;

    // Register on mount, unregister on unmount.
    useEffect(() => {
      const element = internalRef.current;
      if (element) {
        registerItem(value, element, onSelect, disabled);
      }
      return () => unregisterItem(value);
    }, [value, onSelect, disabled, registerItem, unregisterItem]);

    // Smooth-scroll the selected option into view.
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

    const Comp: any = asChild ? Slot : 'div';

    // Default styling: pair `aria-selected` with `dx-selected` and add
    // `dx-hover` for the standard hover affordance. Same grammar `Row`
    // uses (see `ui-theme/src/css/components/selected.md`); callers can
    // append / override via `classNames`. `dx-selected` only fires when
    // `aria-selected="true"`, which we set below from the virtual
    // highlight — so unfocused items render plain.
    return (
      <Comp
        {...props}
        ref={(node: HTMLDivElement | null) => {
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
        // tabIndex={-1} — combobox pattern keeps browser focus on the
        // input; the selected option is highlighted via `aria-selected`,
        // not via DOM focus. Differs from `Row` (listbox pattern,
        // tabIndex={0}). See header comment.
        tabIndex={-1}
        className={mx('dx-hover dx-selected', disabled && 'opacity-50 cursor-not-allowed', classNames)}
        onClick={handleClick}
      >
        {children}
      </Comp>
    );
  },
);

PickerItem.displayName = 'Picker.Item';

//
// Public namespace.
//

export const Picker = {
  Root: PickerRoot,
  Input: PickerInput,
  Item: PickerItem,
};

export type { PickerRootProps, PickerInputProps, PickerItemProps };

// Re-export context hooks for higher layers (SearchList) that need to
// compose: `useSearchListInputContext` etc. previously read these
// values; they now route through Picker.
export { usePickerInputContext, usePickerItemContext } from './context';
