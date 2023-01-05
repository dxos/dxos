//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, InputHTMLAttributes, FC, useEffect, useRef, useState, KeyboardEvent } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur'> {
  onChange: (value: string) => void;
  onEnter?: (value: string) => void;
  delay?: number;
}

/**
 * Input element that updates when losing focus or after a delay.
 */
export const Input: FC<InputProps> = ({ value: initialValue, onChange, onEnter, delay = 1000, ...props }) => {
  const t = useRef<ReturnType<typeof setTimeout>>();
  const [value, setValue] = useState<string>('');
  useEffect(() => {
    setValue((initialValue as string) ?? '');
  }, [initialValue]);

  const handleUpdate = (value: string) => {
    if (value !== initialValue) {
      clearTimeout(t.current);
      onChange(value);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    clearTimeout(t.current);
    if (delay > 0) {
      t.current = setTimeout(() => handleUpdate(event.target.value), delay);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Enter': {
        handleUpdate(value);
        onEnter?.(value);
        break;
      }
    }
  };

  return (
    <input
      value={value}
      spellCheck={true}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={() => handleUpdate(value)}
      {...props}
    />
  );
};
