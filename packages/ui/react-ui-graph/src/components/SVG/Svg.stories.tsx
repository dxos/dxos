//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { useRef } from 'react';

import { type Meta, withLayout, withTheme } from '@dxos/storybook-utils';

import { type SVGContext, useGrid, useZoom } from '../../hooks';

import { SVG } from './SVG';

import '../../../styles/graph.css';

type ComponentProps = {
  grid?: boolean;
  zoom?: boolean;
};

const DefaultStory = (props: ComponentProps) => {
  const context = useRef<SVGContext>(null);

  return (
    <SVG.Root ref={context}>
      <Component {...props} />
    </SVG.Root>
  );
};

const Component = (options: ComponentProps) => {
  const grid = useGrid({ visible: options.grid, axis: true });
  const zoom = useZoom({ enabled: options.zoom });

  return (
    <>
      <g ref={grid.ref} className='dx-grid' />
      <g ref={zoom.ref} className='[&>circle]:stroke-red-500'>
        <circle cx={0} cy={0} r={128} />
      </g>
    </>
  );
};

const meta: Meta<typeof Component> = {
  title: 'ui/react-ui-graph/SVGRoot',
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = {
  args: {
    grid: true,
  },
};
