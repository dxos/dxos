//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import useResizeObserver from 'use-resize-observer';

import { mx } from '@dxos/react-ui-theme';
import { BitField, range } from '@dxos/util';

export type BitbarParams = {
  value: Uint8Array;
  length?: number;
  size?: number;
  height?: number;
  margin?: number;
  className?: string;
};

export const Bitbar: FC<BitbarParams> = ({
  value,
  length = value.length * 8,
  size = 16,
  margin = 2,
  height = size,
  className,
}) => {
  const { ref, width } = useResizeObserver();

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
      return 'bg-green-500';
    } else if (percent > 0.5) {
      return 'bg-green-300';
    } else if (percent > 0) {
      return 'bg-green-100';
    } else {
      return 'bg-transparent';
    }
  };

  return (
    <div ref={ref} className={mx('flex shrink-0 w-full', className)} style={{ minHeight: height }}>
      {range(buckets).map((index) => (
        <div key={index} style={{ width: size, marginRight: margin }} className={getColor(index)} />
      ))}
    </div>
  );
};
