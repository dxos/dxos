//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React from 'react';

import {
  FullScreen,
  SVGContextProvider,
  defaultGridStyles,
  useGrid,
  useSvgContext,
  useZoom,
  createSvgContext
} from '../src';

// Pros
// - Natural layout and control of DOM (incl. SVG element).
// - Natural CSS styling.
// - Allows access to state from external component (e.g., zoom, start/stop).
// - More obvious event handling.
// - Pure functions.
// - Allows creation of HOCs for convenience.
// Cons
// - Requires external provider.

export default {
  title: 'gem-core/SvgContextProvider'
};

interface ComponentProps {
  options?: {
    grid?: boolean;
    zoom?: boolean;
  };
}

const Component = ({
  options = { grid: true, zoom: true }
}: ComponentProps) => {
  const context = useSvgContext();

  // Grid
  const grid = useGrid({ visible: options.grid, axis: true });

  // Zoom
  const zoom = useZoom({ enabled: options.zoom });

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      ref={context.ref}
      className={css`
        rect,
        circle {
          stroke: darkblue;
          stroke-width: 2px;
          fill: none;
        }
      `}
    >
      <g ref={grid?.ref} className={defaultGridStyles} />
      <g ref={zoom?.ref}>
        <circle cx={0} cy={0} r={100} />
      </g>
    </svg>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <SVGContextProvider>
        <Component />
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Secondary = () => {
  const context = createSvgContext();

  return (
    <FullScreen>
      <SVGContextProvider context={context}>
        <Component />
      </SVGContextProvider>
    </FullScreen>
  );
};
