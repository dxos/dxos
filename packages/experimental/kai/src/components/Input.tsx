//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, InputHTMLAttributes, FC, useEffect, useRef, useState } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<string>, 'onChange'> {
  onChange: (value: string) => void;
  delay?: number;
}

/**
 * Input element that updates when losing focus or after a delay.
 */
export const Input: FC<InputProps> = ({ className, value: initialValue, onChange, delay = 1000 }) => {
  const t = useRef<ReturnType<typeof setTimeout>>();
  const [value, setValue] = useState<string>('');
  useEffect(() => {
    setValue((initialValue as string) ?? '');
  }, [initialValue]);

  const handleUpdate = (value: string) => {
    if (value !== initialValue) {
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

  return (
    <input
      spellCheck={true}
      className={className}
      value={value}
      onChange={handleChange}
      onBlur={() => handleUpdate(value)}
    />
  );
};
