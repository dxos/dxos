//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer } from '@dxos/gem-core';

import { createText } from '../src';

export default {
  title: 'gem-canvas/Text',
};

export const Primary = () => {
  const textGroup = useRef();
  const [text, setText] = useState('Test');

  useEffect(() => {
    const callable = createText({
      bounds: { x: -64, y: -16, width: 128, height: 32 },
      text,
      editable: true,
      onUpdate: (text: string) => setText(text),
      onCancel: () => setText('')
    });

    // TODO(burdon): Pass args to call.
    d3.select(textGroup.current).call(callable);
  }, [textGroup, text]);

  return (
    <FullScreen>
      <SvgContainer>
        <g ref={textGroup} />
      </SvgContainer>
    </FullScreen>
  );
};
