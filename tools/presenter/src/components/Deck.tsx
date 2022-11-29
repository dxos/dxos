//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { usePageHandler } from '../hooks';

export const Pager: FC<{ page: number; length: number }> = ({ page, length }) => {
  return (
    <div className='absolute bottom-1 right-1 font-mono text-3xl'>
      {page + 1}/{length}
    </div>
  );
};

/**
 * Main slide deck container.
 */
export const Deck: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  useEffect(() => {
    // TODO(burdon): This isn't working.
    // TODO(burdon): Key hook to trigger fullscreen model.
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event
    document.addEventListener('fullscreenchange', (event) => {
      console.log('fullscreenchange');
    });
  }, []);

  // Current page.
  const page = usePageHandler(slides.length);
  const Page = () => slides[page];

  // Scaled props.
  const contentRef = useRef<HTMLDivElement>(null);
  const [props, setProps] = useState({});

  // https://www.npmjs.com/package/react-resize-detector
  const { ref: containerRef } = useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 200,
    onResize: (width, height) => {
      if (!width || !height) {
        return;
      }

      // Display resolutions:
      //          5K Studio       16.2-inch Macbook Pro
      // Max      5120 x 2880     3456 x 2234
      // Default  2560 x 1440     1728 x 1117 (Actual height 1080 - 37 pixel notch)
      // Aspect   1.77 (16/9)     1.54

      // Config.
      const aspectRatio = 16 / 9;
      const nominalWidth = 2560;
      const nominalHeight = nominalWidth / aspectRatio;

      // Compute scaling factor required.
      // TODO(burdon): If not fullscreen then make scale slightly smaller.
      const scale = Math.min(width / nominalWidth, height / nominalHeight);

      setProps({
        left: (width - nominalWidth) / 2,
        top: (height - nominalHeight) / 2,
        width: nominalWidth,
        height: nominalHeight,
        transform: `scale(${scale})`
      });
    }
  });

  // prettier-ignore
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      <div
        ref={contentRef}
        className='bg-slide'
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          ...props
        }}
      >
        {/* TODO(burdon): Show/hide based on front-matter. */}
        <Pager page={page} length={slides.length} />

        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <Page />
      </div>
    </div>
  );
};
