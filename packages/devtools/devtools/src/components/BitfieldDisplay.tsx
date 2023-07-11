import { range } from '@dxos/util';
import React, { useEffect, useRef, useState } from 'react';

const MIN_SUBDIVISION_PIXELS = 10;
const MAX_SUBDIVISIONS = 100;

export const BitfieldDisplay = ({ value, length }: { value: Uint8Array; length: number }) => {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!container.current) return;
    const resizeObserver = new ResizeObserver(() => {
      if (!container.current) return;

      const width = container.current.clientWidth;
      setWidth(width);
    });
    resizeObserver.observe(container.current);
    return () => resizeObserver.disconnect(); // clean up
  }, []);

  const subdivisions = Math.min(Math.min(Math.floor(width / MIN_SUBDIVISION_PIXELS), MAX_SUBDIVISIONS), length);

  const getColor = (index: number): string => {
    const feedBegin = Math.floor((index * length) / subdivisions);
    let feedEnd = Math.ceil(((index + 1) * length) / subdivisions);
    if (feedEnd === feedBegin) feedEnd = feedBegin + 1;

    let count = 0;
    for (let i = feedBegin; i < feedEnd; i++) {
      const bit = (value[Math.floor(i / 8)] >> (7 - (i % 8))) & 0x1;
      if (bit) count++;
    }

    const percent = count / (feedEnd - feedBegin);

    if (percent === 1) {
      return 'darkgreen';
    } else if (percent > 0) {
      return 'green';
    } else {
      return 'gray';
    }
  };

  return (
    <div ref={container} className='h-10 m-2 flex flex-row'>
      {range(subdivisions).map((index) => (
        <div key={index} className='h-full flex-1' style={{ backgroundColor: getColor(index), minWidth: 1 }} />
      ))}
    </div>
  );
};
