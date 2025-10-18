//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren, forwardRef, useCallback } from 'react';

import { Button, type ButtonProps, Icon, useId } from '@dxos/react-ui';
import { mx, staticPlaceholderText } from '@dxos/react-ui-theme';

// TOOD(burdon): Merge with PopoverCombobox.

type ComboboxContextValue = {
  modalId: string;
  isCombobox: true;
  placeholder?: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  value: string;
  onValueChange: (nextValue: string) => void;
};

const COMBOBOX_NAME = 'Combobox';
const COMBOBOX_TRIGGER_NAME = 'ComboboxTrigger';

const [ComboboxProvider, useComboboxContext] = createContext<Partial<ComboboxContextValue>>(COMBOBOX_NAME, {});

//
// Root
//

type ComboboxRootProps = PropsWithChildren<
  Partial<ComboboxContextValue & { defaultOpen: boolean; defaultValue: string; placeholder: string }>
>;

const ComboboxRoot = ({
  modalId: propsModalId,
  open: propsOpen,
  defaultOpen,
  onOpenChange: propsOnOpenChange,
  value: propsValue,
  defaultValue,
  onValueChange: propsOnValueChange,
  placeholder,
  children,
}: ComboboxRootProps) => {
  const modalId = useId(COMBOBOX_NAME, propsModalId);
  const [open = false, onOpenChange] = useControllableState({
    prop: propsOpen,
    onChange: propsOnOpenChange,
    defaultProp: defaultOpen,
  });
  const [value = '', onValueChange] = useControllableState({
    prop: propsValue,
    onChange: propsOnValueChange,
    defaultProp: defaultValue,
  });
  return (
    <ComboboxProvider
      isCombobox
      modalId={modalId}
      open={open}
      onOpenChange={onOpenChange}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder}
    >
      {children}
    </ComboboxProvider>
  );
};

ComboboxRoot.displayName = COMBOBOX_NAME;

//
// Trigger
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
            <span
              className={mx('font-normal text-start flex-1 min-is-0 truncate mie-2', !value && staticPlaceholderText)}
            >
              {value || placeholder}
            </span>
            <Icon icon='ph--caret-down--bold' size={3} />
          </>
        )}
      </Button>
    );
  },
);

ComboboxTrigger.displayName = COMBOBOX_TRIGGER_NAME;

//
// Combobox
//

export const Combobox = {
  Root: ComboboxRoot,
  Trigger: ComboboxTrigger,
};

export { useComboboxContext };

export type { ComboboxRootProps, ComboboxTriggerProps };
