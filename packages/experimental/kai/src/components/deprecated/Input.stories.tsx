//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Input } from './Input';
import '@dxosTheme';

export default {
  component: Input
};

const Test = () => {
  const [value, setValue] = useState<string>();
  const [values, setValues] = useState<string[]>([]);

  return (
    <div>
      <div className='flex items-center'>
        <Input
          className='p-1'
          value={value}
          onChange={setValue}
          onEnter={(value?: string) => {
            setValue('');
            if (value !== undefined) {
              setValues((values) => {
                values.push(value);
                return [...values];
              });
            }
          }}
          spellCheck={false}
          autoFocus
          placeholder='Enter value'
        />

        <div className='p-1 ml-4'>{value ?? 'undefined'}</div>
      </div>

      <div className='p-1'>
        {values.map((value, i) => (
          <div key={i}>
            [{i}]:{value}
          </div>
        ))}
      </div>
    </div>
  );
};

export const Default = () => <Test />;
