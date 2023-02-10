//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, InputHTMLAttributes, KeyboardEvent, forwardRef, useEffect, useRef, useState } from 'react';

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
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ value: initialValue, onKeyDown, onChange, onEnter, onBlur, delay = 1000, ...props }, ref) => {
    const t = useRef<ReturnType<typeof setTimeout>>();
    const [value, setValue] = useState<string | undefined>(initialValue);

    // TODO(burdon): How to check if value has been updated? Controlled vs. uncontrolled!
    useEffect(() => {
      setValue((initialValue as string) ?? '');
    }, [initialValue]);

    const handleUpdate = (value?: string) => {
      clearTimeout(t.current);
      setValue(value);
      onChange?.(value ?? '');
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
      clearTimeout(t.current);
      setValue(event.target.value);
      if (delay > 0) {
        t.current = setTimeout(() => handleUpdate(event.target.value), delay);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          clearTimeout(t.current);
          if (onEnter?.(value ?? '')) {
            setValue('');
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

    const handleBlur = () => {
      handleUpdate(value);
      onBlur?.();
    };

    return (
      <input
        ref={ref}
        value={value ?? ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);
