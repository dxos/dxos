//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';

// TODO(burdon): Insert React control via remark layout plugin?
export const Pager: FC<{ page: number; length: number }> = ({ page, length }) => {
  return (
    <div className='absolute bottom-1 right-1 font-mono text-3xl'>
      {page + 1}/{length}
    </div>
  );
};

// TODO(burdon): Factor out hooks.
export const usePageHandler = (length: number) => {
  const [page, setPage] = useState<number>(0);
  useEffect(() => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    const handler = (ev: KeyboardEvent) => {
      switch (ev.key) {
        case 'ArrowLeft': {
          setPage((page) => (page > 0 ? page - 1 : page));
          break;
        }
        case 'ArrowRight': {
          setPage((page) => (page === length - 1 ? page : page + 1));
          break;
        }
        default: {
          // console.log(ev.key);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return page;
};

const count = 0;

export const Deck: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  /*
  useEffect(() => {
    console.log('!');
    // TODO(burdon): Doesn't work.
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event
    document.addEventListener('fullscreenchange', (event) => {
      console.log('???');
    });
  }, []);
  */

  /*
  useEffect(() => {
    return;

    // NOTE: This trick doesn't work due to the notch.
    // height: 1080 vs 1117 (36 + 1 pixels for notch).
    const [maxX, maxY] = [1728, 1080];
    console.log(window.innerHeight, window.screen.height);
    console.log(document.fullscreenElement);

    // const scale = 0.9; // Scale when not maximized.
    // const fullScreen = !!(window.screenTop && window.screenY);

    // const ox = -(window.screen.availWidth - width) / 2;
    // const oy = -(window.screen.availHeight - height) / 2;

    // TODO(burdon): Translate.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
    // NOTE: Only transformable elements can be transformed (tables?)
    // Object.assign(outerRef.current.body.style, {
    //   width: `${window.screen.availWidth}px`,
    //   height: `${window.screen.availHeight}px`,
    //   transform: `scale(${scale})`
    // });
  }, [width, height]);
  */

  const page = usePageHandler(slides.length);

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

      // TODO(burdon): If not fullscreen then make scale slightly smaller.
      const scale = Math.min(width / nominalWidth, height / nominalHeight);

      // Offset.
      const dx = (width - nominalWidth) / 2;
      const dy = (height - nominalHeight) / 2;

      setProps({
        left: dx,
        top: dy,
        width: nominalWidth,
        height: nominalHeight,
        transform: `scale(${scale})`
      });
    }
  });

  const Page = () => slides[page];

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
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
        backgroundColor: '#333'
      }}
    >
      <div
        ref={contentRef}
        style={{
          position: 'absolute',
          display: 'flex',
          backgroundColor: '#FFF', // TODO(burdon): Theme.
          ...props
        }}
      >
        {/* <div style={{ position: 'absolute' }}>{JSON.stringify(props)}</div> */}

        {/* TODO(burdon): Show/hide based on front-matter. */}
        <Pager page={page} length={slides.length} />

        {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
        {/* @ts-ignore */}
        <Page />
      </div>
    </div>
  );
};
