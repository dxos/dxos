//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, {
  ChangeEvent,
  ComponentProps,
  ReactNode,
  useCallback,
  useState,
  useTransition
} from 'react';

import { useId } from '../../hooks';
import { MessageValence } from '../../props';
import {
  defaultDescription,
  defaultDisabled,
  defaultFocus,
  defaultHover,
  defaultPlaceholder,
  valenceColorText,
  valenceInputBorder
} from '../../styles';

export type InputSize = 'md' | 'lg'

export interface InputProps
  extends Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'size'> {
  label: ReactNode
  labelVisuallyHidden?: boolean
  description?: ReactNode
  descriptionVisuallyHidden?: boolean
  initialValue?: string
  onChange?: (value: string) => void
  disabled?: boolean
  size?: InputSize
  validationMessage?: ReactNode
  validationValence?: MessageValence
}

const sizeMap = new Map<InputSize, string>([
  ['md', ''],
  ['lg', 'text-base']
]);

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
  validationMessage,
  validationValence,
  ...inputProps
}: InputProps) => {
  const inputId = inputProps.id || useId('input');
  const descriptionId = useId('input-description');
  const validationId = useId('input-validation');

  const [_isPending, startTransition] = useTransition();

  const [internalValue, setInternalValue] = useState<string>(
    initialValue?.toString() || ''
  );

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

  const isInvalid =
    !!validationMessage && validationValence === 'error';

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
      <input
        id={inputId}
        {...inputProps}
        className={cx(
          defaultFocus,
          defaultPlaceholder,
          defaultHover({ disabled }),
          sizeMap.get(size ?? 'md'),
          'bg-white/50 border text-neutral-900 text-sm rounded-lg block w-full px-2.5 py-2 dark:bg-neutral-700/50 dark:text-white',
          valenceInputBorder(validationMessage ? validationValence : undefined),
          disabled && defaultDisabled
        )}
        {...(required && { required: true })}
        {...(disabled && { disabled: true })}
        {...(placeholder && { placeholder })}
        {...(description && { 'aria-describedby': descriptionId })}
        {...(isInvalid && {
          'aria-invalid': 'true',
          'aria-errormessage': validationId
        })}
        value={internalValue}
        onChange={onInternalChange}
      />
      {(description || validationMessage) && (
        <p
          {...(!isInvalid && { id: descriptionId })}
          className={cx(
            descriptionVisuallyHidden && !isInvalid && 'sr-only'
          )}
        >
          {validationMessage && (
            <span
              id={validationId}
              className={valenceColorText(validationValence)}
            >
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
