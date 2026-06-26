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
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, {
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type PropsWithChildren,
  forwardRef,
  useCallback,
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
  useId,
} from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { Picker, type PickerInputProps, type PickerItemProps } from '../Picker';

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
  value: string;
  onValueChange: (nextValue: string) => void;
};

const [ComboboxProvider, useComboboxContext] = createContext<Partial<ComboboxContextValue>>(COMBOBOX_NAME, {});

//
// Root
//

type ComboboxRootProps = PropsWithChildren<
  Partial<
    ComboboxContextValue & {
      modal: boolean;
      defaultOpen: boolean;
      defaultValue: string;
      placeholder: string;
    }
  >
>;

const ComboboxRoot = ({
  children,
  modal,
  modalId: modalIdProp,
  open: openProp,
  defaultOpen,
  onOpenChange: propsOnOpenChange,
  value: valueProp,
  defaultValue,
  onValueChange: propsOnValueChange,
  placeholder,
}: ComboboxRootProps) => {
  const modalId = useId(COMBOBOX_NAME, modalIdProp);
  const [open = false, onOpenChange] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: propsOnOpenChange,
  });
  const [value = '', onValueChange] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: propsOnValueChange,
  });

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <ComboboxProvider
        isCombobox
        modalId={modalId}
        placeholder={placeholder}
        open={open}
        onOpenChange={onOpenChange}
        value={value}
        onValueChange={onValueChange}
      >
        {children}
      </ComboboxProvider>
    </Popover.Root>
  );
};

//
// Content — Popover.Content + Picker.Root.
//
// Filtering is caller-driven: pass already-matching <Combobox.Item> children.
//

type ComboboxContentProps = PopoverContentProps;

const ComboboxContent = composable<HTMLDivElement, ComboboxContentProps>(({ children, ...props }, forwardedRef) => {
  const { modalId } = useComboboxContext(COMBOBOX_CONTENT_NAME);

  return (
    <Popover.Content {...composableProps(props, { id: modalId })} ref={forwardedRef}>
      <Popover.Viewport classNames='w-(--radix-popover-trigger-width)'>
        <Picker.Root>{children}</Picker.Root>
      </Popover.Viewport>
    </Popover.Content>
  );
});

ComboboxContent.displayName = COMBOBOX_CONTENT_NAME;

//
// Trigger — the button that opens the popover.
//

type ComboboxTriggerProps = ButtonProps;

const ComboboxTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ children, onClick, ...props }, forwardedRef) => {
    const { modalId, open, onOpenChange, placeholder, value } = useComboboxContext(COMBOBOX_TRIGGER_NAME);
    const handleClick = useCallback(
      (event: Parameters<Exclude<ButtonProps['onClick'], undefined>>[0]) => {
        onClick?.(event);
        onOpenChange?.(true);
      },
      [onClick, onOpenChange],
    );

    return (
      <Popover.Trigger asChild>
        <Button
          {...props}
          role='combobox'
          aria-expanded={open}
          aria-controls={modalId}
          aria-haspopup='dialog'
          onClick={handleClick}
          ref={forwardedRef}
        >
          {children ?? (
            <>
              <span className={mx('font-normal text-start flex-1 min-w-0 truncate me-2', !value && 'text-subdued')}>
                {value || placeholder}
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
  Omit<ComponentPropsWithRef<'input'>, 'value'> & Pick<PickerInputProps, 'value' | 'onValueChange'>
>;

const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(({ classNames, ...props }, forwardedRef) => {
  return (
    <Picker.Input
      {...props}
      classNames={['m-form-chrome mb-0 w-[calc(100%-2*var(--spacing-form-chrome))]', classNames]}
      ref={forwardedRef}
    />
  );
});

ComboboxInput.displayName = 'Combobox.Input';

//
// List — scroll wrapper around items.
//

type ComboboxListProps = PropsWithChildren<{ classNames?: string | string[] }>;

const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <ScrollArea.Root
        {...composableProps(props, { classNames: ['py-form-chrome', classNames] })}
        role='listbox'
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
    /** Show a check icon on the right (commonly used for confirming the picked item). */
    checked?: boolean;
    /** Suffix text after the label. */
    suffix?: string;
    /** Disabled. */
    disabled?: boolean;
    /** Caller-supplied select handler in addition to value-commit. */
    onSelect?: () => void;
    /** Whether to close the popover when this item is selected. Defaults to true. */
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
      checked,
      suffix,
      disabled,
      closeOnSelect = true,
      children,
    },
    forwardedRef,
  ) => {
    const { onValueChange, onOpenChange } = useComboboxContext(COMBOBOX_ITEM_NAME);
    const handleSelect = useCallback<NonNullable<PickerItemProps['onSelect']>>(() => {
      onSelect?.();
      if (value !== undefined) {
        onValueChange?.(value);
      }
      if (closeOnSelect) {
        onOpenChange?.(false);
      }
    }, [onSelect, onValueChange, onOpenChange, value, closeOnSelect]);

    return (
      <Picker.Item
        value={value}
        disabled={disabled}
        onSelect={handleSelect}
        ref={forwardedRef}
        classNames={[
          // Full width inside the viewport (no horizontal margin).
          // `px-3 py-1`, `cursor-pointer`, `select-none` and the
          // `dx-hover` / `dx-selected` pairing come from `Picker.Item`'s
          // defaults; we only add the row-shape (flex / icons + label)
          // and the disabled overrides on top.
          'flex w-full gap-2 items-center',
          disabled && 'hover:bg-transparent data-[selected=true]:bg-transparent',
          classNames,
        ]}
      >
        {children ?? (
          <>
            {icon && <Icon icon={icon} classNames={iconClassNames} />}
            {description ? (
              <span className='w-0 grow flex flex-col'>
                <span className='truncate'>{label}</span>
                <span className='text-sm text-description truncate'>{description}</span>
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
  ComboboxRootProps,
  ComboboxPortalProps,
  ComboboxContentProps,
  ComboboxTriggerProps,
  ComboboxVirtualTriggerProps,
  ComboboxInputProps,
  ComboboxListProps,
  ComboboxItemProps,
  ComboboxArrowProps,
  ComboboxEmptyProps,
};
