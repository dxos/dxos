//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { useMemo } from 'react';

import { FullScreen, SvgContainer, SvgContext } from '@dxos/gem-core';

import { Canvas, useMemoryElementModel } from '../src';

import { generator } from './helpers';

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:render');

export default {
  title: 'gem-canvas/Simple'
};

const Container = () => {
  const context = useMemo(() => new SvgContext(), []);

  // TODO(burdon): Factor out.
  const [elements] = useMemoryElementModel(() => generator());

  return (
    <FullScreen>
      <SvgContainer context={context}>
        <Canvas
          svgContext={context}
          elements={elements}
          grid
        />
      </SvgContainer>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <Container />
  );
};
