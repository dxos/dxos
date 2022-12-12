import React, { ComponentProps } from 'react';
import { mx, defaultInput } from '@dxos/react-ui';

export type InputProps = ComponentProps<'input'>;

export const Input = (props: InputProps) => {
  const { className, disabled, ...rest } = props;
  return (
    <div role='none' className={mx('mlb-4')}>
      <input
        className={mx(
          defaultInput({ disabled }),
          'block w-full px-2.5 py-2 border-0 bg-transparent dark:bg-transparent focus:outline-0 focus:outline-b-3',
          className
        )}
        {...rest}
      ></input>
    </div>
  );
};
