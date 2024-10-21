//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { type ThemedClassName } from '@dxos/react-ui';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Create generic container with wireframe mode.
export type WireframeProps = ThemedClassName<{
  label?: string;
  data?: any;
}>;

// TODO(burdon): Make focusable and attendable with input.
export const Wireframe = ({ classNames, label, data }: WireframeProps) => {
  const attendableAttrs = useAttendableAttributes(data);
  const { width, height, ref } = useResizeDetector();
  return (
    <div ref={ref} className={mx('relative grow min-bs-96', classNames)} {...attendableAttrs}>
      <div className='absolute inset-2 flex flex-col overflow-hidden font-mono'>
        <div className='flex justify-between'>
          <div>{label}</div>
          <div>{`[${width}x${height}]`}</div>
        </div>
        <div className='flex grow overflow-auto'>
          {data && <pre className='text-subdued text-sm whitespace-pre-line'>{JSON.stringify(data, undefined, 1)}</pre>}
        </div>
      </div>
      <svg width={width} height={height} className='bg-transparent [&>*]:text-subdued'>
        <rect x={0} y={0} width={width} height={height} strokeWidth={1} fill='none' />
        <line x1={0} y1={0} x2={width} y2={height} strokeWidth={1} />
        <line x1={0} y1={height} x2={width} y2={0} strokeWidth={1} />
      </svg>
    </div>
  );
};
