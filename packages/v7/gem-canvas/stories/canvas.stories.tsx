//
// Copyright 2020 DXOS.org
//

import faker from 'faker';
import React, { useRef, useState } from 'react';
import { css } from '@emotion/css';

import { FullScreen, SvgContainer, useScale } from '@dxos/gem-x';

import {
  Canvas,
  Element,
  Tool,
  Toolbar
} from '../src';

// TODO(burdon): Move items.
// TODO(burdon): Items vs elements (save?)
// TODO(burdon): Think about undo.
// TODO(burdon): Factor out special cases for path (in handlers).
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)

export default {
  title: 'gem-canvas/Canvas'
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

// TODO(burdon): Hook.
const testElements: Element[] = [
  {
    id: faker.datatype.uuid(), type: 'rect', data: { x: -2, y: -1, width: 4, height: 2 }
  },
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 5, y: 0, r: [1, 1] }
  },
  /*
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
  const svg = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });
  const [tool, setTool] = useState<Tool>(undefined);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svg}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <Canvas
          className={styles}
          svgRef={svg}
          scale={scale}
          tool={tool}
          elements={testElements}
        />
      </SvgContainer>

      <Toolbar
        active={tool}
        onSelect={(tool) => setTool(tool)}
      />
    </FullScreen>
  );
};
