//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { useStateRef } from './helpers';

import {
  Canvas,
  Element,
  FullScreen,
  SvgContainer,
  Toolbar,
  createMouseHandlers,
  createKeyHandlers,
  useScale
} from '../src';

// TODO(burdon): If zoomed then can be too small.
// TODO(burdon): Normalized [x, y] over {x, y}
// TODO(burdon): Delete elements if removed from model.
// TODO(burdon): Mapping bug (based on scale).
// TODO(burdon): Resize (handles).
// TODO(burdon): Delete.

export default {
  title: 'gem-x/Canvas'
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: #EEE;
    opacity: 0.4;
  }

  rect {
    stroke: orange;
    stroke-width: 2;
    fill: #EEE;
    opacity: 0.4;
  }

  line {
    stroke: darkred;
    stroke-width: 2;
    fill: none;
  }

  path {
    stroke: darkblue;
    stroke-width: 2;
    fill: none;
  }
`;

const model: Element[] = [
  {
    id: faker.datatype.uuid(), type: 'rect', data: { x: -2, y: -1, width: 4, height: 2 }
  },
  /*
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 0, y: 0, r: [1, 1] }
  },
  {
    id: faker.datatype.uuid(), type: 'rect', data: { x: [4, 1], y: [-2, 1], width: [8, 2], height: [12, 3] }
  },
  {
    id: faker.datatype.uuid(), type: 'line', data: { x1: 0, y1: 0, x2: 6, y2: 0 }
  },
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 0, y: 0, r: [1, 4] }
  },
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 6, y: 0, r: [1, 4] }
  },
  {
    id: faker.datatype.uuid(), type: 'path', data: {
      type: 'basis',
      closed: true,
      points: [
        [3, 5],
        [4, 9],
        [-2, 7],
        [-1, 4]
      ]
    }
  }
  */
];

export const Primary = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  // TODO(burdon): Factor out.
  const [tool, setTool, toolRef] = useStateRef<string>(undefined);

  // TODO(burdon): Factor out.
  const [elements, setElements] = useState<Element[]>(model);
  const [cursor, setCursor, cursorRef] = useStateRef<Element>(undefined);

  useEffect(() => {
    const addElement = (element: Element) => setElements(elements => [...elements, element]);

    d3.select(svgRef.current)
      .call(createMouseHandlers(scale, toolRef, cursorRef, setCursor, addElement));

    d3.select(document.body)
      .call(createKeyHandlers(scale, toolRef, cursorRef, setCursor, addElement));
  }, [svgRef]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <Canvas
          scale={scale}
          cursor={cursor}
          elements={elements}
          className={styles}
        />
      </SvgContainer>

      <Toolbar
        active={tool}
        onSelect={(tool) => setTool(tool)}
      />
    </FullScreen>
  );
};
