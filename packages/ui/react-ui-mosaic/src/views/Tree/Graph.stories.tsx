//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

// import React from 'react';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Tree } from './Tree';
// import { GraphTree } from './testing';
// import { Mosaic } from '../../mosaic';
import { FullscreenDecorator } from '../../testing';

faker.seed(3);

export default {
  title: 'react-ui-mosaic/Tree',
  component: Tree,
  // render: ({ id = 'tree', debug }: { id: string; debug: boolean }) => {
  //   return (
  //     <Mosaic.Root debug={debug}>
  //       <Mosaic.DragOverlay />
  //       <GraphTree id={id} debug={debug} />
  //     </Mosaic.Root>
  //   );
  // },
  decorators: [withTheme, FullscreenDecorator()],
  parameters: {
    layout: 'fullscreen',
  },
};

// export const Graph = {
//   args: { debug: true },
// };
