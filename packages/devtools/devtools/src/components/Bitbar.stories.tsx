//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { BitField } from '@dxos/util';

import '@dxosTheme';

import { Bitbar } from './Bitbar';

const length = 100;

const TestStory = () => {
  const [value] = useState(new Uint8Array(length));
  const [, forceUpdate] = useState({});
  useEffect(() => {
    let i = value.length * 8 * 2;
    const t = setInterval(() => {
      if (i-- === 0) {
        clearInterval(t);
      }

      const idx = Math.floor(Math.random() * value.length * 8);
      BitField.set(value, idx, true);
      forceUpdate({});
    }, 10);

    return () => clearInterval(t);
  }, []);

  return (
    <div className='flex flex-col gap-16 bg-white p-4'>
      <Bitbar value={value} length={value.length} size={8} margin={1} height={20} />
      <Bitbar value={value} length={value.length} />
      <Bitbar value={value} length={value.length} size={64} margin={0} className='h-4' />
      <span className='font-mono'>
        {JSON.stringify({
          length: value.length,
          count: BitField.count(value, 0, value.length * 8),
          total: value.length * 8,
        })}
      </span>
    </div>
  );
};

export default {
  component: TestStory,
};

export const Default = {
  args: {},
};
