//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, InputHTMLAttributes, FC, useEffect, useRef, useState, KeyboardEvent } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> {
  value?: string;
  onChange?: (value: string) => void;
  onEnter?: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onBlur?: () => void;
  delay?: number;
}

/**
 * Input element that updates when losing focus or after a delay.
 */
// TODO(burdon): Constrain input.
export const Input: FC<InputProps> = ({
  value: initialValue,
  onKeyDown,
  onChange,
  onEnter,
  onBlur,
  // delay = 1000,
  ...props
}) => {
  const delay = 0;
  const t = useRef<ReturnType<typeof setTimeout>>();
  // const [value, setValue] = useState<string | undefined>(initialValue);

  // TODO(burdon): How to check if value has been updated? Controlled vs. uncontrolled!
  // useEffect(() => {
  //   setValue((initialValue as string) ?? '');
  // }, [initialValue]);
  console.log('input render', JSON.stringify(initialValue));
  
  const handleUpdate = (value?: string) => {
    console.log('updating', value);
    // clearTimeout(t.current);
    // setValue(value);
    onChange?.(value ?? '');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    // console.log('changing', value);
    // clearTimeout(t.current);
    // setValue(event.target.value);
    if (delay > 0) {
      t.current = setTimeout(() => handleUpdate(event.target.value), delay);
    } else {
      onChange?.(event.target.value ?? '');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const value = (event.target as any).value;
    switch (event.key) {
      case 'Enter': {
        clearTimeout(t.current);
        if (onEnter?.(value ?? '')) {
          // setValue('');
        } else {
          handleUpdate(value);
        }
        break;
      }

      case 'Escape': {
        handleUpdate(initialValue);
        break;
      }

      default: {
        onKeyDown?.(event);
      }
    }
  };

  // const handleBlur = (e) => {
  //   handleUpdate(value);
  //   onBlur?.();
  // };

  return (
    <input
      value={initialValue ?? ''}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={(e) => {
        handleUpdate(e.target.value);
        onBlur?.();
      }}
      {...props}
    />
  );
};
