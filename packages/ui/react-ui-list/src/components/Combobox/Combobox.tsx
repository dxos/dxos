//
// Copyright 2023 DXOS.org
//

// `Combobox` — popover-list with text input. Generic; no search-domain
// dependencies. Built on `Picker` (this same package) for the
// listbox-with-input pattern (registry, virtual highlight, keyboard
// nav, the two performance-split contexts) and `Popover` from
// `@dxos/react-ui` for the trigger/content/arrow.
//
// Filtering is the caller's responsibility — render only the matching
// `<Combobox.Item>` children. For fuzzy / search-domain filtering,
// pair with `useSearchListResults` from `@dxos/react-ui-search`.
//
// `Content` renders in place: wrap it in `Portal` whenever the trigger sits
// inside a clipping container (a toolbar, a scroll area, a plank), or the
// popover opens invisibly and the trigger reads as dead.
//
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';

import {
  Button,
  type ButtonProps,
  Icon,
  type IconProps,
  Popover,
  type PopoverArrowProps,
  type PopoverContentProps,
  type PopoverVirtualTriggerProps,
  ScrollArea,
  type ThemedClassName,
  composable,
  composableProps,
  useId,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { listTheme } from '../List.theme';
import { Picker, type PickerInputProps, type PickerItemProps } from '../Picker';

const styles = listTheme.styles();

const COMBOBOX_NAME = 'Combobox';
const COMBOBOX_CONTENT_NAME = 'ComboboxContent';
const COMBOBOX_ITEM_NAME = 'ComboboxItem';
const COMBOBOX_TRIGGER_NAME = 'ComboboxTrigger';

//
// Context — open/value state shared with Trigger and Item.
//

type ComboboxContextValue = {
  modalId: string;
  isCombobox: true;
  placeholder?: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  /** Chosen values. A single-select combobox holds at most one. */
  values: readonly string[];
  /** Whether several values may be chosen at once. */
  multiple: boolean;
  /** Human-readable text shown on the trigger for the current value(s) (defaults to the values). */
  displayValue?: string;
  /** Choose a value: replaces the selection when single, toggles membership when multiple. */
  onItemSelect: (value: string) => void;
};

const [ComboboxProvider, useComboboxContext] = createContext<Partial<ComboboxContextValue>>(COMBOBOX_NAME, {});

//
// Root
//

type ComboboxSharedRootProps = {
  modalId?: string;
  modal?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  displayValue?: string;
  placeholder?: string;
};

/** Single-select: one value, and choosing one closes the popover. */
type ComboboxSingleRootProps = ComboboxSharedRootProps & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

/**
 * Multi-select: an array of values, each item toggling its own membership. The popover stays open
 * across toggles — several values are set in one visit, unlike the pick-one-and-dismiss gesture.
 */
type ComboboxMultipleRootProps = ComboboxSharedRootProps & {
  multiple: true;
  value?: readonly string[];
  defaultValue?: readonly string[];
  onValueChange?: (value: readonly string[]) => void;
};

type ComboboxRootProps = PropsWithChildren<ComboboxSingleRootProps | ComboboxMultipleRootProps>;

const ComboboxRoot = ({
  children,
  modal,
  modalId: modalIdProp,
  open: openProp,
  defaultOpen,
  onOpenChange: propsOnOpenChange,
  displayValue,
  placeholder,
  ...valueProps
}: ComboboxRootProps) => {
  const modalId = useId(COMBOBOX_NAME, modalIdProp);
  const [open = false, onOpenChange] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: propsOnOpenChange,
  });
  // One controllable state for both shapes: the props union guarantees `value`, `defaultValue` and
  // `onValueChange` agree with `multiple`, so the array form is the single internal representation.
  const multiple = valueProps.multiple === true;
  // Memoized because the single-select form wraps a string in a fresh array: an unstable identity
  // here would re-render every item on every parent render.
  const value = useMemo(() => toValues(valueProps.value), [valueProps.value]);
  const defaultValue = useMemo(() => toValues(valueProps.defaultValue), [valueProps.defaultValue]);
  const [values = EMPTY_VALUES, setValues] = useControllableState<readonly string[]>({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (valueProps.multiple) {
        valueProps.onValueChange?.(next);
      } else {
        valueProps.onValueChange?.(next[0] ?? '');
      }
    },
  });

  const onItemSelect = useCallback(
    (value: string) =>
      setValues(multiple ? (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]) : [value]),
    [multiple, values, setValues],
  );

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <ComboboxProvider
        isCombobox
        modalId={modalId}
        placeholder={placeholder}
        open={open}
        onOpenChange={onOpenChange}
        values={values}
        multiple={multiple}
        displayValue={displayValue}
        onItemSelect={onItemSelect}
      >
        {children}
      </ComboboxProvider>
    </Popover.Root>
  );
};

/** Stable ref, so an unset selection doesn't re-render every consumer. */
const EMPTY_VALUES: readonly string[] = [];

const toValues = (value: string | readonly string[] | undefined): readonly string[] | undefined =>
  value === undefined ? undefined : typeof value !== 'string' ? value : value === '' ? EMPTY_VALUES : [value];

//
// Content — Popover.Content + Picker.Root.
//
// Filtering is caller-driven: pass already-matching <Combobox.Item> children.
//

type ComboboxContentProps = PopoverContentProps & {
  /** Snap the highlight to the first item whenever the list changes (type-to-filter lists). */
  resetSelectionOnChange?: boolean;
};

const ComboboxContent = composable<HTMLDivElement, ComboboxContentProps>(
  ({ children, resetSelectionOnChange, ...props }, forwardedRef) => {
    const { modalId, multiple } = useComboboxContext(COMBOBOX_CONTENT_NAME);

    return (
      <Popover.Content {...composableProps(props, { id: modalId })} ref={forwardedRef}>
        <Popover.Viewport classNames='w-(--radix-popover-trigger-width)'>
          <Picker.Root id={modalId} multiselectable={multiple} resetSelectionOnChange={resetSelectionOnChange}>
            {children}
          </Picker.Root>
        </Popover.Viewport>
      </Popover.Content>
    );
  },
);

ComboboxContent.displayName = COMBOBOX_CONTENT_NAME;

//
// Trigger — the button that opens the popover.
//

type ComboboxTriggerProps = ButtonProps & {
  /**
   * Render the caller's own control instead of the default `Button`, receiving the combobox's
   * trigger props. Use when the surrounding chrome owns the control's metrics — a toolbar's
   * icon button, say — so the trigger doesn't read as a foreign element in it.
   */
  asChild?: boolean;
};

const ComboboxTrigger = composable<HTMLButtonElement, ComboboxTriggerProps>(
  ({ children, onClick, asChild, ...props }, forwardedRef) => {
    const { modalId, open, onOpenChange, placeholder, values, displayValue } =
      useComboboxContext(COMBOBOX_TRIGGER_NAME);
    // The Root only knows values, not the labels its items render, so a caller wanting prettier
    // chrome than the raw values passes `displayValue`.
    const summary = displayValue || values?.join(', ');
    const handleClick = useCallback(
      (event: Parameters<Exclude<ButtonProps['onClick'], undefined>>[0]) => {
        onClick?.(event);
        onOpenChange?.(true);
      },
      [onClick, onOpenChange],
    );

    const triggerProps = {
      'role': 'combobox' as const,
      'aria-expanded': open,
      'aria-controls': modalId,
      'aria-haspopup': 'dialog' as const,
      'onClick': handleClick,
    };

    if (asChild) {
      return (
        <Popover.Trigger asChild {...triggerProps} {...props} ref={forwardedRef}>
          {children}
        </Popover.Trigger>
      );
    }

    return (
      <Popover.Trigger asChild>
        <Button {...props} {...triggerProps} ref={forwardedRef}>
          {children ?? (
            <>
              <span className={styles.comboboxTriggerText({ class: !summary && 'text-subdued' })}>
                {summary || placeholder}
              </span>
              <Icon icon='ph--caret-down--bold' size={3} />
            </>
          )}
        </Button>
      </Popover.Trigger>
    );
  },
);

ComboboxTrigger.displayName = COMBOBOX_TRIGGER_NAME;

//
// VirtualTrigger
//

type ComboboxVirtualTriggerProps = PopoverVirtualTriggerProps;

const ComboboxVirtualTrigger = Popover.VirtualTrigger;

//
// Input — text input wired to Picker.Input. Caller controls value.
//

type ComboboxInputProps = ThemedClassName<
  Omit<ComponentPropsWithRef<'input'>, 'value'> &
    Pick<PickerInputProps, 'value' | 'onValueChange' | 'density' | 'elevation' | 'variant'>
>;

const ComboboxInput = composable<HTMLInputElement, ComboboxInputProps>(({ classNames, ...props }, forwardedRef) => {
  return <Picker.Input {...props} classNames={styles.comboboxInput({ class: classNames })} ref={forwardedRef} />;
});

ComboboxInput.displayName = 'Combobox.Input';

//
// List — scroll wrapper around items.
//

type ComboboxListProps = PropsWithChildren<{ classNames?: string | string[] }>;

const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { multiple } = useComboboxContext('Combobox.List');
    return (
      <ScrollArea.Root
        {...composableProps(props, { classNames: styles.comboboxList({ class: classNames }) })}
        role='listbox'
        aria-multiselectable={multiple || undefined}
        centered
        padding
        thin
        ref={forwardedRef}
      >
        <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  },
);

ComboboxList.displayName = 'Combobox.List';

//
// Item — wraps Picker.Item; commits value + closes popover on select.
//

type ComboboxItemProps = ThemedClassName<
  PropsWithChildren<{
    /** Unique identifier. */
    value: string;
    /** Display label (used when `children` are not provided). */
    label?: string;
    /** Optional secondary line shown beneath the label (muted, smaller). */
    description?: string;
    /** Optional icon id (Phosphor) shown before the label. */
    icon?: string;
    /** Additional class names for the icon. */
    iconClassNames?: IconProps['classNames'];
    /**
     * Show a check icon on the right (commonly used for confirming the picked item).
     * Defaults to whether this item is in the Root's selection.
     */
    checked?: boolean;
    /** Suffix text after the label. */
    suffix?: string;
    /** Disabled. */
    disabled?: boolean;
    /** Caller-supplied select handler in addition to value-commit. */
    onSelect?: () => void;
    /**
     * Whether to close the popover when this item is selected.
     * Defaults to true for a single-select combobox, false for a multi-select one.
     */
    closeOnSelect?: boolean;
  }>
>;

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  (
    {
      classNames,
      onSelect,
      value,
      label,
      description,
      icon,
      iconClassNames,
      checked: checkedProp,
      suffix,
      disabled,
      closeOnSelect,
      children,
    },
    forwardedRef,
  ) => {
    const { values, multiple, onItemSelect, onOpenChange } = useComboboxContext(COMBOBOX_ITEM_NAME);
    const checked = checkedProp ?? values?.includes(value) ?? false;
    // Toggling several values is the whole point of a multi-select, so it keeps the popover open.
    const close = closeOnSelect ?? !multiple;
    const handleSelect = useCallback<NonNullable<PickerItemProps['onSelect']>>(() => {
      onSelect?.();
      if (value !== undefined) {
        onItemSelect?.(value);
      }
      if (close) {
        onOpenChange?.(false);
      }
    }, [onSelect, onItemSelect, onOpenChange, value, close]);

    return (
      <Picker.Item
        value={value}
        checked={checked}
        disabled={disabled}
        onSelect={handleSelect}
        ref={forwardedRef}
        classNames={styles.comboboxItem({
          // Row height/inset, `cursor-pointer`, `select-none` and the `dx-hover` / `dx-selected` /
          // `dx-highlighted` pairing come from `Picker.Item`'s defaults; the slot only adds
          // row-shape (flex / icons + label). Disabled overrides are layered on per-instance.
          class: mx(disabled && 'hover:bg-transparent data-highlighted:bg-transparent', classNames),
        })}
      >
        {children ?? (
          <>
            {icon && <Icon icon={icon} classNames={iconClassNames} />}
            {description ? (
              <span className='w-0 grow flex flex-col'>
                <span className='truncate'>{label}</span>
                <span className={styles.comboboxItemDescription()}>{description}</span>
              </span>
            ) : (
              <span className='w-0 grow truncate'>{label}</span>
            )}
            {suffix && <span className='shrink-0 text-description'>{suffix}</span>}
            {checked && <Icon icon='ph--check--regular' />}
          </>
        )}
      </Picker.Item>
    );
  },
);

ComboboxItem.displayName = COMBOBOX_ITEM_NAME;

//
// Arrow
//

type ComboboxArrowProps = PopoverArrowProps;

const ComboboxArrow = Popover.Arrow;

//
// Empty — passthrough placeholder. No translation; caller supplies copy.
//

type ComboboxEmptyProps = ThemedClassName<PropsWithChildren>;

const ComboboxEmpty = forwardRef<HTMLDivElement, ComboboxEmptyProps>(({ classNames, children }, forwardedRef) => {
  return (
    <div ref={forwardedRef} role='status' className={mx(classNames)}>
      {children}
    </div>
  );
});

ComboboxEmpty.displayName = 'Combobox.Empty';

//
// Portal
//

type ComboboxPortalProps = ComponentPropsWithoutRef<typeof Popover.Portal>;

const ComboboxPortal = Popover.Portal;

//
// Combobox
//

export const Combobox = {
  Root: ComboboxRoot,
  Portal: ComboboxPortal,
  Content: ComboboxContent,
  Trigger: ComboboxTrigger,
  VirtualTrigger: ComboboxVirtualTrigger,
  Input: ComboboxInput,
  List: ComboboxList,
  Item: ComboboxItem,
  Arrow: ComboboxArrow,
  Empty: ComboboxEmpty,
};

export type {
  ComboboxArrowProps,
  ComboboxContentProps,
  ComboboxEmptyProps,
  ComboboxInputProps,
  ComboboxItemProps,
  ComboboxListProps,
  ComboboxMultipleRootProps,
  ComboboxPortalProps,
  ComboboxRootProps,
  ComboboxSingleRootProps,
  ComboboxTriggerProps,
  ComboboxVirtualTriggerProps,
};
