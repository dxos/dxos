//
// Copyright 2023 DXOS.org
//

import React from 'react';
import useResizeObserver from 'use-resize-observer';

import { BitField, range } from '@dxos/util';

export const BitfieldDisplay = ({ value, length }: { value: Uint8Array; length: number }) => {
  const { ref, width } = useResizeObserver();

  const size = 8;
  const margin = 2;
  const buckets = Math.min(Math.floor((width ?? 0) / (size + margin)), length);
  const getColor = (index: number): string => {
    const start = Math.floor((index * length) / buckets);
    let end = Math.ceil(((index + 1) * length) / buckets);
    if (end === start) {
      end = start + 1;
    }

    const count = BitField.count(value, start, end);
    const percent = count / (end - start);
    if (percent === 1) {
      return 'green';
    } else if (percent > 0) {
      return 'orange';
    } else {
      return 'lightgray';
    }
  };

  return (
    <div ref={ref} className='flex shrink-0 p-4'>
      <div className='flex' style={{ height: size * 2 }}>
        {range(buckets).map((index) => (
          <div key={index} style={{ width: size, marginRight: margin, backgroundColor: getColor(index) }} />
        ))}
      </div>
    </div>
  );
};
