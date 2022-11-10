//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ChangeEvent, useCallback, useState, useTransition } from 'react';

import { useId } from '../../hooks';
import { defaultDescription, valenceColorText } from '../../styles';
import { BarePinInput } from './BarePinInput';
import { BareTextInput } from './BareTextInput';
import { InputProps as NaturalInputProps } from './InputProps';

export type InputProps = NaturalInputProps;

export const Input = ({
  label,
  labelVisuallyHidden,
  placeholder,
  description,
  descriptionVisuallyHidden,
  required,
  initialValue,
  onChange,
  disabled,
  className,
  size,
  length = 6,
  validationMessage,
  validationValence,
  ...inputProps
}: InputProps) => {
  const inputId = inputProps.id || useId('input');
  const descriptionId = useId('input-description');
  const validationId = useId('input-validation');

  const isInvalid = !!validationMessage && validationValence === 'error';

  const [_isPending, startTransition] = useTransition();

  const [internalValue, setInternalValue] = useState<string>(initialValue?.toString() || '');

  const onInternalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target?.value || '';
      setInternalValue(nextValue);
      onChange &&
        startTransition(() => {
          onChange(nextValue);
        });
    },
    [onChange]
  );

  const bareInputBaseProps = {
    ...inputProps,
    id: inputId,
    ...(required && { required: true }),
    ...(disabled && { disabled: true }),
    ...(description && { 'aria-describedby': descriptionId }),
    ...(isInvalid && {
      'aria-invalid': 'true' as const,
      'aria-errormessage': validationId
    }),
    ...(placeholder && { placeholder }),
    value: internalValue,
    onChange: onInternalChange
  };

  const bareInput =
    size === 'pin' ? (
      <BarePinInput {...bareInputBaseProps} length={length} />
    ) : (
      <BareTextInput {...bareInputBaseProps} />
    );

  return (
    <div className={cx('my-4', className)} role='none'>
      <label
        htmlFor={inputId}
        className={cx(
          'block mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-100',
          labelVisuallyHidden && 'sr-only'
        )}
      >
        {label}
      </label>
      {bareInput}
      {(description || validationMessage) && (
        <p
          {...(!isInvalid && { id: descriptionId })}
          className={cx(descriptionVisuallyHidden && !isInvalid && 'sr-only')}
        >
          {validationMessage && (
            <span id={validationId} className={valenceColorText(validationValence)}>
              {validationMessage}{' '}
            </span>
          )}
          <span
            {...(isInvalid && { id: descriptionId })}
            className={cx(defaultDescription, descriptionVisuallyHidden && 'sr-only')}
          >
            {description}
          </span>
        </p>
      )}
    </div>
  );
};
