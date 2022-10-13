//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { ChangeEvent, ReactNode, useCallback, useState } from 'react';

import { defaultFocus } from '../../styles';
import { useId } from '../../util/useId';

export interface InputProps extends React.ComponentProps<'input'> {
  label: ReactNode;
  labelVisuallyHidden?: boolean;
  description?: ReactNode;
  descriptionVisuallyHidden?: boolean;
}

export const Input = ({
  label,
  labelVisuallyHidden,
  type,
  placeholder,
  description,
  required,
  value,
  onChange,
  ...props
}: InputProps) => {
  const inputId = useId('input');
  const descriptionId = useId('input-description');
  const [internalValue, setInternalValue] = useState<string>(
    value?.toString() || ''
  );
  const onInternalChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target?.value || '';
      setInternalValue(nextValue);
      onChange && onChange(e);
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
          'bg-neutral-50 border border-neutral-300 text-neutral-900 text-sm rounded-lg block w-full px-2.5 py-2 dark:bg-neutral-700 dark:border-neutral-600 dark:placeholder-neutral-400 dark:text-white'
        )}
        {...(required && { required: true })}
        {...(placeholder && { placeholder })}
        {...(description && { 'aria-describedby': descriptionId })}
        value={internalValue}
        onChange={onInternalChange}
      />
      {description && (
        <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
          {description}
        </p>
      )}
    </div>
  );
};
