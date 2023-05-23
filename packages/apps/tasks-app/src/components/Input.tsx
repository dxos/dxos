//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, forwardRef, useEffect, useState } from 'react';

import { useThemeContext } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';

export type InputProps = ComponentProps<'input'>;

type Ref = HTMLInputElement;

export const Input = forwardRef<Ref, InputProps>((props, ref) => {
  const { className, disabled, value: propValue, onChange, ...rest } = props;
  // this is for supporting both sync & async updates:
  const [value, setValue] = useState(propValue);
  const { tx } = useThemeContext();
  useEffect(() => {
    value !== propValue && setValue(propValue);
  }, [propValue]);
  return (
    <div role='none' className={mx('mlb-4')}>
      <input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          setValue(v);
          onChange?.(e);
        }}
        ref={ref}
        className={tx(
          'input.input',
          'input__input',
          { disabled },
          'block w-full px-2.5 py-2 border-0 bg-transparent dark:bg-transparent',
          className,
        )}
        {...rest}
      ></input>
    </div>
  );
});
