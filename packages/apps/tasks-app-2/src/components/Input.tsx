//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, forwardRef, useEffect, useState } from 'react';

import { mx, defaultInput } from '@dxos/react-components';

export type InputProps = ComponentProps<'input'>;

type Ref = HTMLInputElement;

export const Input = forwardRef<Ref, InputProps>((props, ref) => {
  const { className, disabled, value: propValue, onChange, ...rest } = props;
  // this is for supporting both sync & async updates:
  const [value, setValue] = useState(propValue);
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
        className={mx(
          defaultInput({ disabled }),
          'block w-full px-2.5 py-2 border-0 bg-transparent dark:bg-transparent',
          className
        )}
        {...rest}
      ></input>
    </div>
  );
});
