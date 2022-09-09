//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React  from 'react';

import { FullScreen, SVGContextProvider } from '@dxos/gem-core';

import { Canvas, useMemoryElementModel } from '../src';

import { generator } from './helpers';

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:render');

export default {
  title: 'gem-canvas/Simple'
};

const Container = () => {
  // TODO(burdon): Factor out.
  const [elements] = useMemoryElementModel(() => generator());

  return (
    <FullScreen>
      <SVGContextProvider>
        <Canvas
          elements={elements}
          grid
        />
      </SVGContextProvider>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <Container />
  );
};
