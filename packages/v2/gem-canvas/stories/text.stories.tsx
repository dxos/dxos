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
      center: [-64, -16],
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
      <SvgContainer grid>
        <g ref={textGroup} />
      </SvgContainer>
    </FullScreen>
  );
};
