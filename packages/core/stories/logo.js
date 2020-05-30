//
// Copyright 2020 DxOS
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';
import useResizeAware from 'react-resize-aware';
import { withKnobs } from "@storybook/addon-knobs";

import { FullScreen, SVG } from '../src/components';

import { PATH } from '../src/icons/Fold';

export default {
  title: 'Core',
  decorators: [withKnobs]
};

export const withLogo = () => {
  const [resizeListener, size] = useResizeAware();
  const { width, height } = size;
  const group1 = useRef();
  const group2 = useRef();

  useEffect(() => {
    if (size.width === null || size.height === null) {
      return;
    }

    // TODO(burdon): Import size.

    d3.select(group1.current)
      .attr('transform', 'translate(-128, -128)')
      .append('path')
        .attr('d', PATH)
        .attr('fill', '#EEEEEE');

    d3.select(group2.current)
      .attr('transform-origin', '128 128')
      .attr('transform', 'translate(-128, -128)')
      .append('path')
        .attr('d', PATH)
        .attr('fill', '#333333');

    const i = d3.interval(() => {
      const deg = Math.random() * 360;
      d3.select(group2.current)
        .transition()
        .duration(500)
        .attr('transform', `translate(-128, -128) rotate(${deg})`)
        .transition()
        .duration(500)
        .attr('transform', 'translate(-128, -128) rotate(0)');
    }, 2000);

    return () => i.stop();
  }, [group1, group2, size]);

  return (
    <FullScreen>
      {resizeListener}
      <SVG width={width} height={height}>
        <g ref={group1} />
        <g ref={group2} />
      </SVG>
    </FullScreen>
  );
};
