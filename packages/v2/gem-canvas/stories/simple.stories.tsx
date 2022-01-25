//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import React, { useRef } from 'react';

import { FullScreen, SvgContainer, useScale } from '@dxos/gem-core';

import { Canvas, useMemoryElementModel } from '../src';

import { generator } from './helpers';

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:render');

export default {
  title: 'gem-canvas/Simple'
};

const Container = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  // TODO(burdon): Factor out.
  const [elements] = useMemoryElementModel(() => generator());

  return (
    <FullScreen>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/4, 8]}
        grid
      >
        <Canvas
          svgRef={svgRef}
          scale={scale}
          elements={elements}
        />
      </SvgContainer>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <Container />
  );
}
