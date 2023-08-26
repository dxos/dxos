//
// Copyright 2023 DXOS.org
//

import React from 'react';
import useResizeObserver from 'use-resize-observer';

import { BitField, range } from '@dxos/util';

const MIN_SUBDIVISION_PIXELS = 8;
const MAX_SUBDIVISIONS = 400;

export const BitfieldDisplay = ({ value, length }: { value: Uint8Array; length: number }) => {
  const { ref, width } = useResizeObserver();

  const size = 8;
  const margin = 2;
  const buckets = Math.min(Math.floor((width ?? 0) / (size + margin)), length);

  const getColor = (index: number): string => {
    const feedBegin = Math.floor((index * length) / buckets);
    let feedEnd = Math.ceil(((index + 1) * length) / buckets);
    if (feedEnd === feedBegin) {
      feedEnd = feedBegin + 1;
    }

    const count = BitField.count(value, feedBegin, feedEnd);
    const percent = count / (feedEnd - feedBegin);
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
          <div
            key={index}
            style={{ width: size, marginRight: margin, backgroundColor: getColor(index), minWidth: 1 }}
          />
        ))}
      </div>
    </div>
  );
};
