//
// Copyright 2020 DXOS.org
//

import * as d3 from "d3";
import React, { useRef, useEffect } from 'react';

// const zoom = d3.zoom();

import { FullScreen, SvgContainer } from '../src';

export default {
  title: 'SVG'
};

export const Primary = () => {
  const ref = useRef<SVGSVGElement>();
  useEffect(() => {

  }, [ref]);

  const handleResize = (({ svg, width, height }) => {
    // Center.
    d3.select(svg)
      .attr('viewBox', `${-width / 2},${-height / 2},${width + 1},${height + 1}`);

    d3.select(ref.current)
      .append('text')
      .attr('x', 0)
      .attr('y', 0)
      .text('GEM');
  });

  return (
    <FullScreen style={{
      backgroundColor: '#EEE'
    }}>
      <SvgContainer
        ref={ref}
        style={{
          backgroundColor: '#FFF'
        }}
        onResize={handleResize}
      />
    </FullScreen>
  );
}
