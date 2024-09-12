//
// Copyright 2018 DXOS.org
//

import '@dxos-theme';

import React, { useEffect, useRef } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { withFullscreen, withTheme } from '@dxos/storybook-utils';

export default {
  title: 'gem-globe/canvas',
  decorators: [withTheme, withFullscreen({ classNames: 'bg-[#111]' })],
};

export const Default = () => {
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!width || !height) {
      return;
    }

    const context = canvasRef.current.getContext('2d');
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);
  }, [width, height]);

  return (
    <div ref={ref} className='grow'>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};
