//
// Copyright 2022 DXOS.org
//

import React, { ComponentProps, forwardRef } from 'react';

import { mx, defaultInput } from '@dxos/react-components';

export type InputProps = ComponentProps<'input'>;

export type Ref = HTMLInputElement;

export const Input = forwardRef<Ref, InputProps>((props, ref) => {
  const { className, disabled, ...rest } = props;
  return (
    <div role='none' className={mx('mlb-4')}>
      <input
        ref={ref}
        className={mx(
          defaultInput({ disabled }),
          'block w-full px-2.5 py-2 border-0 bg-transparent dark:bg-transparent focus:outline-0 focus:outline-b-3',
          className
        )}
        {...rest}
      ></input>
    </div>
  );
});
