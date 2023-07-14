//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { BitField, range } from '@dxos/util';

const MIN_SUBDIVISION_PIXELS = 8;
const MAX_SUBDIVISIONS = 400;

export const BitfieldDisplay = ({ value, length }: { value: Uint8Array; length: number }) => {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!container.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!container.current) {
        return;
      }

      const width = container.current.clientWidth;
      setWidth(width);
    });

    resizeObserver.observe(container.current);
    return () => resizeObserver.disconnect();
  }, []);

  const subdivisions = Math.min(Math.min(Math.floor(width / MIN_SUBDIVISION_PIXELS), MAX_SUBDIVISIONS), length);

  const getColor = (index: number): string => {
    const feedBegin = Math.floor((index * length) / subdivisions);
    let feedEnd = Math.ceil(((index + 1) * length) / subdivisions);
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
    <div ref={container} className='flex flex-row shrink-0 h-6 my-2 p-1'>
      {range(subdivisions).map((index) => (
        <div key={index} className='h-full flex-1 mr-[1px]' style={{ backgroundColor: getColor(index), minWidth: 1 }} />
      ))}
    </div>
  );
};
