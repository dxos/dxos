//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

// TODO(burdon): Move to tailwind.
import { css } from '@emotion/css';
import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { SVGRoot } from './SVGRoot';
import { useGrid, useZoom, createSvgContext, useSvgContext } from '../hooks';
import { darkGridStyles, defaultGridStyles } from '../styles';

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
  title: 'gem-core/SVGRoot',
  decorators: [withTheme, withFullscreen()],
};

interface ComponentProps {
  options?: {
    grid?: boolean;
    zoom?: boolean;
  };
}

const Component = ({ options = { grid: true, zoom: true } }: ComponentProps) => {
  const { themeMode } = useThemeContext();
  const context = useSvgContext();
  const grid = useGrid({ visible: options.grid, axis: true });
  const zoom = useZoom({ enabled: options.zoom });

  return (
    <svg
      ref={context.ref}
      xmlns='http://www.w3.org/2000/svg'
      className={css`
        rect,
        circle {
          stroke: darkblue;
          stroke-width: 2px;
          fill: none;
        }
      `}
    >
      <g ref={grid.ref} className={themeMode === 'dark' ? darkGridStyles : defaultGridStyles} />
      <g ref={zoom.ref}>
        <circle cx={0} cy={0} r={100} />
      </g>
    </svg>
  );
};

export const Default = () => {
  return (
    <SVGRoot>
      <Component />
    </SVGRoot>
  );
};

export const Context = () => {
  const context = createSvgContext();
  return (
    <SVGRoot context={context}>
      <Component />
    </SVGRoot>
  );
};
