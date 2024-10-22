//
// Copyright 2024 DXOS.org
//

import React from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

// TODO(burdon): Create generic container with wireframe mode.
export type WireframeProps = ThemedClassName<{
  label?: string;
  object?: any;
}>;

// TODO(burdon): Make focusable and attendable with input.
export const Wireframe = ({ classNames, label, object }: WireframeProps) => {
  const attendableAttrs = useAttendableAttributes(fullyQualifiedId(object));
  const { width, height, ref } = useResizeDetector();
  return (
    <div ref={ref} className={mx('relative grow min-bs-96', classNames)} {...attendableAttrs}>
      <div className='absolute inset-2 flex flex-col gap-2 overflow-hidden font-mono'>
        <div className='flex justify-between'>
          <div>{label}</div>
          <div>{`[${width}x${height}]`}</div>
        </div>
        {object && (
          <SyntaxHighlighter language='json' classNames='flex w-full text-xs opacity-75 rounded'>
            {JSON.stringify(object, undefined, 2)}
          </SyntaxHighlighter>
        )}
      </div>
      <svg width={width} height={height} className='bg-transparent [&>*]:text-subdued'>
        <rect x={0} y={0} width={width} height={height} strokeWidth={1} fill='none' />
        <line x1={0} y1={0} x2={width} y2={height} strokeWidth={1} />
        <line x1={0} y1={height} x2={width} y2={0} strokeWidth={1} />
      </svg>
    </div>
  );
};
