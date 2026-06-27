//
// Copyright 2026 DXOS.org
//

// `Picker` — generic listbox-with-input compound implementing the
// WAI-ARIA combobox keyboard pattern. Search / filtering live one layer
// up in `@dxos/react-ui-search`.
//
// The two contexts (Input / Item) are split so items don't re-render on
// every keystroke and the input doesn't re-render on every (un)register.

import { Slot } from '@radix-ui/react-slot';
import React, {
  type ChangeEvent,
  type ComponentPropsWithRef,
  type ElementType,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PropsWithChildren,
  type ReactNode,
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

type ItemData = {
  element: HTMLElement;
  disabled?: boolean;
  onSelect?: () => void;
};

//
// Root
//

type PickerRootProps = PropsWithChildren<{
  /**
   * When the item set changes, snap the highlight back to the first item (command-palette behavior),
   * instead of only re-selecting when the current selection disappears. Use for type-to-filter lists so
   * the top result stays highlighted as results update. Does not fire on keyboard navigation (which
   * changes the selection, not the item set). Defaults to false.
   */
  resetSelectionOnChange?: boolean;
}>;

const PickerRoot = ({ children, resetSelectionOnChange = false }: PickerRootProps) => {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const itemsRef = useRef<Map<string, ItemData>>(new Map());
  // Bumped on every (un)register to retrigger auto-select.
  const [itemVersion, setItemVersion] = useState(0);
  // Tracks the last-seen item set so a reset fires only when items change, not on selection change.
  const prevItemVersionRef = useRef(itemVersion);

  // Auto-select the first non-disabled item when the current selection is gone or disabled — or, when
  // `resetSelectionOnChange`, whenever the item set itself changes.
  useEffect(() => {
    const itemsChanged = prevItemVersionRef.current !== itemVersion;
    prevItemVersionRef.current = itemVersion;

    const current = selectedValue !== undefined ? itemsRef.current.get(selectedValue) : undefined;
    const isValid = current !== undefined && !current.disabled;
    if ((!isValid || (resetSelectionOnChange && itemsChanged)) && itemsRef.current.size > 0) {
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
  }, [itemVersion, selectedValue, resetSelectionOnChange]);

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

  // DOM-order list of enabled item values.
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

  // Stable values items subscribe to.
  const itemContextValue = useMemo(
    () => ({
      selectedValue,
      onSelectedValueChange: setSelectedValue,
      registerItem,
      unregisterItem,
    }),
    [selectedValue, registerItem, unregisterItem],
  );

  // Volatile values the input subscribes to (keyboard helpers).
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
// Input
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

    // Only force-control when `value` is provided; otherwise leave the
    // input uncontrolled so it accepts keystrokes without `onValueChange`.
    return (
      <Input.Root>
        <Input.TextInput
          {...props}
          autoFocus={autoFocus && !hasIosKeyboard}
          {...(value !== undefined && { value })}
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
// Item
//

type PickerItemProps = ThemedClassName<{
  /** Unique identifier; used by the registry and DOM-order traversal. */
  value: string;
  /** Callback when the item is committed (click, or Enter while highlighted). */
  onSelect?: () => void;
  /** Disable the item — registry-visible but not focusable, not navigable, not clickable. */
  disabled?: boolean;
  asChild?: boolean;
  children?: ReactNode;
}>;

const PickerItem = forwardRef<HTMLDivElement, PickerItemProps>(
  ({ classNames, value, onSelect, disabled, asChild, children, ...props }, forwardedRef) => {
    const { selectedValue, onSelectedValueChange, registerItem, unregisterItem } = usePickerItemContext('Picker.Item');
    const internalRef = useRef<HTMLDivElement>(null);

    const isSelected = selectedValue === value && !disabled;

    useEffect(() => {
      const element = internalRef.current;
      if (element) {
        registerItem(value, element, onSelect, disabled);
      }
      return () => unregisterItem(value);
    }, [value, onSelect, disabled, registerItem, unregisterItem]);

    useEffect(() => {
      if (isSelected && internalRef.current) {
        internalRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, [isSelected]);

    const handleClick = useCallback(() => {
      if (disabled) {
        return;
      }
      onSelectedValueChange(value);
      onSelect?.();
    }, [disabled, value, onSelectedValueChange, onSelect]);

    // Keep focus on `Picker.Input`: any `tabIndex` (incl. `-1`) would
    // steal focus on click and break the input's arrow-key handler.
    const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
    }, []);

    const Comp: ElementType = asChild ? Slot : 'div';

    // Padding follows `--gutter` to align with sibling `Column.Center`
    // content; falls back to `0.75rem` when not nested under `Column.Root`.
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
        // Browser focus stays on the input; highlight is via `aria-selected`.
        tabIndex={-1}
        className={mx(
          'dx-hover dx-selected px-[var(--gutter,0.75rem)] py-1 cursor-pointer select-none',
          disabled && 'opacity-50 cursor-not-allowed',
          classNames,
        )}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {children}
      </Comp>
    );
  },
);

PickerItem.displayName = 'Picker.Item';

export const Picker = {
  Root: PickerRoot,
  Input: PickerInput,
  Item: PickerItem,
};

export type { PickerRootProps, PickerInputProps, PickerItemProps };

export { usePickerInputContext, usePickerItemContext } from './context';
