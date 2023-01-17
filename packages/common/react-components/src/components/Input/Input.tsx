//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, useCallback, useState, useTransition } from 'react';

import { useId, useThemeContext } from '../../hooks';
import { defaultDescription, valenceColorText } from '../../styles';
import { mx } from '../../util';
import { BarePinInput } from './BarePinInput';
import { BareTextInput } from './BareTextInput';
import { BareTextareaInput, BareTextareaInputProps } from './BareTextareaInput';
import { InputProps as NaturalInputProps } from './InputProps';

export type InputProps = NaturalInputProps;

export const Input = ({
  label,
  labelVisuallyHidden,
  description,
  descriptionVisuallyHidden,
  initialValue,
  onChange,
  disabled,
  placeholder,
  size,
  length = 6,
  validationMessage,
  validationValence,
  slots = {}
}: InputProps) => {
  const inputId = slots.input?.id ?? useId('input');
  const descriptionId = useId('input-description');
  const validationId = useId('input-validation');
  const { hasIosKeyboard } = useThemeContext();

  const isInvalid = !!validationMessage && validationValence === 'error';

  const [_isPending, startTransition] = useTransition();

  const [internalValue, setInternalValue] = useState<string>(initialValue?.toString() || '');

  const onInternalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const nextValue = e.target?.value || '';
      setInternalValue(nextValue);
      onChange &&
        startTransition(() => {
          onChange(nextValue);
        });
    },
    [onChange]
  );

  const { autoFocus, ...inputSlot } = slots.input ?? {};

  const bareInputBaseProps = {
    id: inputId,
    ...(slots.input?.required && { required: true }),
    ...(disabled && { disabled: true }),
    ...(description && { 'aria-describedby': descriptionId }),
    ...(isInvalid && {
      'aria-invalid': 'true' as const,
      'aria-errormessage': validationId
    }),
    placeholder,
    value: internalValue,
    onChange: onInternalChange,
    inputSlot: {
      ...inputSlot,
      ...(autoFocus && !hasIosKeyboard && { autoFocus: true })
    },
    validationMessage,
    validationValence
  };

  const bareInput =
    size === 'pin' ? (
      <BarePinInput {...bareInputBaseProps} length={length} />
    ) : size === 'textarea' ? (
      <BareTextareaInput {...(bareInputBaseProps as BareTextareaInputProps)} />
    ) : (
      <BareTextInput {...bareInputBaseProps} size={size} />
    );

  return (
    <div role='none' className={mx('mlb-4', slots.root?.className)}>
      <label
        {...slots.label}
        htmlFor={inputId}
        className={mx(
          'block pbe-1 text-sm font-medium text-neutral-900 dark:text-neutral-100',
          labelVisuallyHidden && 'sr-only',
          slots.label?.className
        )}
      >
        {label}
      </label>
      {bareInput}
      {(description || validationMessage) && (
        <p
          {...(!isInvalid && { id: descriptionId })}
          className={mx(descriptionVisuallyHidden && !isInvalid && 'sr-only')}
        >
          {validationMessage && (
            <span id={validationId} className={mx(valenceColorText(validationValence), slots.validation?.className)}>
              {validationMessage}{' '}
            </span>
          )}
          <span
            {...(isInvalid && { id: descriptionId })}
            className={mx(defaultDescription, descriptionVisuallyHidden && 'sr-only', slots.description?.className)}
          >
            {description}
          </span>
        </p>
      )}
    </div>
  );
};
