//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useState } from 'react';
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

export const Deck: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  const page = usePageHandler(slides.length);

  // TODO(burdon): Debounce.
  // TODO(burdon): Resize isn't called after size and scale is set.
  const { ref, width, height } = useResizeDetector();

  useEffect(() => {
    console.log('!');
    // TODO(burdon): Doesn't work.
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event
    document.addEventListener('fullscreenchange', (event) => {
      console.log('???');
    });
  }, []);

  useEffect(() => {
    return;

    // NOTE: This trick doesn't work due to the notch.
    // height: 1080 vs 1117 (36 + 1 pixels for notch).
    const [maxX, maxY] = [1728, 1080];
    console.log(window.innerHeight, window.screen.height);
    console.log(document.fullscreenElement);

    const scale = 0.9; // Scale when not maximized.
    const fullScreen = !!(window.screenTop && window.screenY);

    const ox = -(window.screen.availWidth - width) / 2;
    const oy = -(window.screen.availHeight - height) / 2;

    // TODO(burdon): Translate.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/transform
    // NOTE: Only transformable elements can be transformed (tables?)
    Object.assign(document.body.style, {
      width: `${window.screen.availWidth}px`,
      height: `${window.screen.availHeight}px`,
      transform: `scale(${scale})`
    });
  }, [width, height]);

  const Page = () => slides[page];

  // prettier-ignore
  return (
    <div
      ref={ref}

      // TODO(burdon): Use tailwind.
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'column',
        backgroundColor: 'white'
      }}
    >
      {/* TODO(burdon): Show/hide based on front-matter. */}
      <Pager page={page} length={slides.length} />

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <Page />
    </div>
  );
};
