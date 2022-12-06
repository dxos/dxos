//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useRef, useState } from 'react';
import { useResizeDetector } from 'react-resize-detector';
import { HashRouter, Navigate, useRoutes } from 'react-router-dom';

import { SlideContainer } from './SlideContainer';
import { SlideIndex } from './SlideIndex';
import { PresentationProps } from './types';

/**
 * Router
 */
const Routes: FC<PresentationProps> = ({ title, slides }) => {
  return useRoutes([
    {
      path: '/',
      element: <Navigate to={'/index'} />
    },
    {
      path: '/index',
      element: <SlideIndex title={title} slides={slides} />
    },
    {
      path: '/slide/:slide',
      element: <SlideContainer slides={slides} />
    }
  ]);
};

/**
 * Main slide deck container.
 */
// TODO(burdon): Create context for content.
export const SlideDeck: FC<PresentationProps> = ({ title, slides }) => {
  useEffect(() => {
    // TODO(burdon): This isn't working (not triggered if via key?)
    // TODO(burdon): Key hook to trigger fullscreen model.
    // https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide (fullscreenElement is null).
    // https://developer.mozilla.org/en-US/docs/Web/API/Document/fullscreenchange_event
    document.addEventListener('fullscreenchange', (event) => {
      console.log('fullscreenchange');
    });

    // TODO(burdon): Can't use iOS safe-area-inset to detect notch.
    // https://developer.mozilla.org/en-US/docs/Web/CSS/env
    //  https://github.com/john-doherty/notch-detected-event/tree/master/src
    // const root = document.documentElement;
    // root.style.setProperty('--notch-top', 'env(safe-area-inset-top)');
    // const computedStyle = window.getComputedStyle(root);
    // console.log(computedStyle.getPropertyValue('--notch-top'));
  }, []);

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
      // window.screen.{availWidth, availHeight}
      //          5K Studio       16.2-inch Macbook Pro
      // Max      5120 x 2880     3456 x 2234
      // Default  2560 x 1440     1728 x 1117 (Actual height 1080 - 37 pixel notch)
      // Aspect   1.77 (16/9)     1.54

      // Config.
      const aspectRatio = 16 / 9;
      const nominalWidth = 2560;
      const nominalHeight = nominalWidth / aspectRatio;

      // NOTE: Hack to detect full height on Macbook Pro due to notch.
      const macIntelNotch = 1117 - 1080;
      const fullscreen =
        height === screen.availHeight ||
        (window.navigator.platform === 'MacIntel' && height === screen.availHeight - macIntelNotch);

      // If not fullscreen then make scale slightly smaller so there's a natural border.
      const scaleFactor = fullscreen ? 1 : 0.9;

      // Compute scaling factor required.
      const scale = Math.min(width / nominalWidth, height / nominalHeight) * scaleFactor;

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
      {Object.keys(props).length !== 0 &&
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
          <HashRouter>
            <Routes title={title} slides={slides} />
          </HashRouter>
        </div>
      }
    </div>
  );
};
