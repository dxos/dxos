//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, {
  ChangeEvent,
  ReactNode,
  useCallback,
  useState,
  useTransition
} from 'react';

import {
  defaultDescription,
  defaultDisabled,
  defaultFocus,
  defaultHover,
  defaultPlaceholder
} from '../../styles';
import { useId } from '../../util/useId';

export interface InputProps
  extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  label: ReactNode
  labelVisuallyHidden?: boolean
  description?: ReactNode
  descriptionVisuallyHidden?: boolean
  initialValue?: string
  onChange?: (value: string) => void
  disabled?: boolean
}

export const Input = ({
  label,
  labelVisuallyHidden,
  type,
  placeholder,
  description,
  required,
  initialValue,
  onChange,
  disabled,
  ...props
}: InputProps) => {
  const inputId = useId('input');
  const descriptionId = useId('input-description');

  const [_isPending, startTransition] = useTransition();

  const [internalValue, setInternalValue] = useState<string>(
    initialValue?.toString() || ''
  );

  const onInternalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target?.value || '';
      setInternalValue(nextValue);
      onChange && startTransition(() => {
        onChange(nextValue);
      });
    },
    [onChange]
  );

  return (
    <div {...props} role='none'>
      <label
        htmlFor={inputId}
        className={cx(
          'block mb-2 text-sm font-medium text-neutral-900 dark:text-neutral-300',
          labelVisuallyHidden && 'sr-only'
        )}
      >
        {label}
      </label>
      <input
        type={type}
        id={inputId}
        className={cx(
          defaultFocus,
          defaultPlaceholder,
          defaultHover({ disabled }),
          'bg-white/50 border border-neutral-300 text-neutral-900 text-sm rounded-lg block w-full px-2.5 py-2 dark:bg-neutral-700/50 dark:border-neutral-600 dark:text-white',
          disabled && defaultDisabled
        )}
        {...(required && { required: true })}
        {...(disabled && { disabled: true })}
        {...(placeholder && { placeholder })}
        {...(description && { 'aria-describedby': descriptionId })}
        value={internalValue}
        onChange={onInternalChange}
      />
      {description && (
        <p className={cx(defaultDescription, 'mt-2')}>
          {description}
        </p>
      )}
    </div>
  );
};
