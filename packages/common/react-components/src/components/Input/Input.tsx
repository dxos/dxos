//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useId, useThemeContext } from '../../hooks';
import { defaultDescription, valenceColorText } from '../../styles';
import { mx } from '../../util';
import { BarePinInput } from './BarePinInput';
import { BareTextInput } from './BareTextInput';
import { BareTextareaInput, BareTextareaInputProps } from './BareTextareaInput';
import { InputProps as NaturalInputProps, InputSize } from './InputProps';

export type InputProps = NaturalInputProps;

// TODO(burdon): Default standard height, padding for controls (2.5rem) to enable embedding in list rows, tables, etc.
// TODO(burdon): Allow placement of Icon at end of input (e.g., search, open/close button).
export const Input = ({
  label,
  labelVisuallyHidden,
  description,
  descriptionVisuallyHidden,
  value,
  defaultValue,
  onChange,
  disabled,
  placeholder,
  size,
  length = 6,
  validationMessage,
  validationValence,
  variant = 'default',
  slots = {}
}: InputProps) => {
  const internalInputId = useId('input');
  const descriptionId = useId('input-description');
  const validationId = useId('input-validation');
  const { hasIosKeyboard } = useThemeContext();

  const inputId = slots.input?.id ?? internalInputId;

  const isInvalid = !!validationMessage && validationValence === 'error';

  const { autoFocus, ...inputSlot } = slots.input ?? {};

  const bareInputBaseProps = {
    ...inputSlot,
    id: inputId,
    ...(slots.input?.required && { required: true }),
    ...(description && { 'aria-describedby': descriptionId }),
    ...(isInvalid && {
      'aria-invalid': 'true' as const,
      'aria-errormessage': validationId
    }),
    ...(autoFocus && !hasIosKeyboard && { autoFocus: true }),
    disabled,
    placeholder,
    value,
    defaultValue,
    onChange,
    validationMessage,
    validationValence,
    variant
  };

  const bareInput =
    size === 'pin' ? (
      <BarePinInput {...bareInputBaseProps} length={length} />
    ) : size === 'textarea' ? (
      <BareTextareaInput {...(bareInputBaseProps as BareTextareaInputProps)} />
    ) : (
      <BareTextInput {...bareInputBaseProps} size={size as Exclude<InputSize, 'pin' | 'textarea'>} />
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
          className={mx(descriptionVisuallyHidden && !isInvalid && 'sr-only', slots.description?.className)}
        >
          {validationMessage && (
            <span id={validationId} className={mx(valenceColorText(validationValence), slots.validation?.className)}>
              {validationMessage}{' '}
            </span>
          )}
          <span
            {...(isInvalid && { id: descriptionId })}
            className={mx(defaultDescription, descriptionVisuallyHidden && 'sr-only')}
          >
            {description}
          </span>
        </p>
      )}
    </div>
  );
};
