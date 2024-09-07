//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { withFullscreen, withTheme } from '@dxos/storybook-utils';

import { SVGRoot } from './SVGRoot';
import { useGrid, useZoom, createSvgContext, useSvgContext } from '../hooks';
import { defaultGridStyles } from '../styles';

interface ComponentProps {
  grid?: boolean;
  zoom?: boolean;
}

const Story = (props: ComponentProps) => {
  const context = createSvgContext();
  return (
    <SVGRoot context={context}>
      <Component {...props} />
    </SVGRoot>
  );
};

const Component = (options: ComponentProps) => {
  const { themeMode } = useThemeContext();
  const context = useSvgContext();
  const grid = useGrid({ visible: options.grid, axis: true });
  const zoom = useZoom({ enabled: options.zoom });

  return (
    <svg ref={context.ref} xmlns='http://www.w3.org/2000/svg'>
      <g ref={grid.ref} className={defaultGridStyles(themeMode)} />
      <g ref={zoom.ref} className='[&>circle]:stroke-red-500'>
        <circle cx={0} cy={0} r={128} />
      </g>
    </svg>
  );
};

export default {
  title: 'gem-core/SVGRoot',
  component: SVGRoot,
  render: (props: ComponentProps) => <Story {...props} />,
  decorators: [withTheme, withFullscreen()],
};

export const Default = {
  args: {
    grid: true,
  },
};
