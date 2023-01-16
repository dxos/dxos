//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Selector, SelectorOption } from './Selector';
import '@dxosTheme';

export default {
  component: Selector,
  argTypes: {}
};

const options: SelectorOption[] = [
  { id: '1', title: 'One' },
  { id: '2', title: 'Two' },
  { id: '3', title: 'Three' },
  { id: '4', title: 'Four' },
  { id: '5', title: 'Five' }
];

const Test = () => {
  const [value, setValue] = useState<string>();

  return (
    <div>
      <div className='flex items-center'>
        <div className='w-[300px]'>
          <Selector options={options} value={value} onChange={setValue} />
        </div>
        <div className='p-1 ml-4'>{value ?? 'undefined'}</div>
      </div>
    </div>
  );
};

export const Default = {
  render: () => {
    return <Test />;
  }
};
