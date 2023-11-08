//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useEffect, useState } from 'react';

import { BitField } from '@dxos/util';

import { Bitbar } from './Bitbar';

const length = 80;

const TestStory = () => {
  const [series] = useState([new Uint8Array(length), new Uint8Array(length)]);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const total = series[0].length * 8;
    let i = 0;
    const t = setInterval(() => {
      if (i >= total) {
        clearInterval(t);
        return;
      }

      BitField.set(series[1], i, true);
      Array.from({ length: 4 }).forEach(() => {
        BitField.set(series[0], Math.floor(Math.random() * series[0].length * 8), true);
      });

      forceUpdate({});
      i++;
    }, 10);

    return () => clearInterval(t);
  }, []);

  return (
    <div className='flex flex-col gap-16 bg-white p-4'>
      {series.map((series, i) => (
        <div key={i}>
          <div className='flex flex-col gap-4'>
            <Bitbar value={series} size={8} margin={1} height={20} />
            <Bitbar value={series} />
            <Bitbar value={series} size={64} margin={0} className='h-4' />
          </div>
          <span className='flex my-4 font-mono'>
            {JSON.stringify({
              length: series.length,
              count: BitField.count(series, 0, series.length * 8),
              total: series.length * 8,
            })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default {
  component: TestStory,
};

export const Default = {
  args: {},
};
