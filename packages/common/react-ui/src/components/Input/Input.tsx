//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, {
  ChangeEvent,
  ReactNode,
  ComponentProps,
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

export enum InputSize {
  md = 'md',
  lg = 'lg'
}

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
}

const sizeMap = new Map<InputSize, string>([
  [InputSize.md, ''],
  [InputSize.lg, 'text-base']
]);

export const Input = ({
  label,
  labelVisuallyHidden,
  placeholder,
  description,
  required,
  initialValue,
  onChange,
  disabled,
  className,
  size,
  ...inputProps
}: InputProps) => {
  const inputId = inputProps.id || useId('input');
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
    <div className={cx('my-4', className)} role='none'>
      <label
        htmlFor={inputId}
        className={cx(
          'block mb-1 text-sm font-medium text-neutral-900 dark:text-neutral-300',
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
          sizeMap.get(size || InputSize.md),
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
        <p className={cx(defaultDescription, 'mt-1')}>
          {description}
        </p>
      )}
    </div>
  );
};
