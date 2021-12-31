//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { D3DragEvent } from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { useStateRef } from './helpers';

import {
  FullScreen,
  Shape,
  Shapes,
  SvgContainer,
  useScale,
} from '../src';

// TODO(burdon): Delete shapes if removed from model.
// TODO(burdon): Mapping bug (based on scale).
// TODO(burdon): Path.
// TODO(burdon): Resize (handles).
// TODO(burdon): Delete.

export default {
  title: 'gem-x/Shapes'
};

interface ToolbarProps {
  active?: string
  onSelect?: (tool?: string) => void
}

const Toolbar = ({
  active,
  onSelect
}: ToolbarProps) => {
  const styles = css`
    position: absolute;
    top: 0;
    left: 0;
    padding: 8px;
    
    button {
      color: #999;
      margin-right: 4px;
    }
    button.active {
      color: #000;
    }
  `;

  const tools = [
    {
      id: 'rect'
    },
    {
      id: 'circle'
    },
    {
      id: 'line'
    },
    {
      id: 'path'
    }
  ]

  return (
    <div className={styles}>
      {tools.map(({ id }) => (
        <button
          key={id}
          className={active === id ? 'active' : ''}
          onClick={() => onSelect(active === id ? undefined : id)}
        >
          {id}
        </button>
      ))}
    </div>
  );
};

const styles = css`
  circle {
    stroke: seagreen;
    stroke-width: 2;
    fill: none;
  }
  rect {
    stroke: orange;
    stroke-width: 1;
    fill: none;
  }
  line {
    stroke: orange;
    stroke-width: 4;
    fill: none;
  }
  path {
    stroke: orange;
    stroke-width: 4;
    fill: none;
  }
`;

const createShape = (id, start, end, tool): Shape => {
  switch (tool) {
    case 'rect': {
      const width = end.x - start.x;
      const height = end.y - start.y
      return {
        id,
        type: 'rect',
        data: {
          x: start.x + (width < 0 ? width : 0),
          y: start.y + (height < 0 ? height : 0),
          width: Math.abs(width),
          height: Math.abs(height)
        }
      };
    }

    case 'circle': {
      return {
        id,
        type: 'circle',
        data: {
          x: start.x,
          y: start.y,
          r: Math.sqrt(Math.pow(Math.abs(start.x - end.x), 2) + Math.pow(Math.abs(start.y - end.y), 2))
        }
      };
    }

    case 'line': {
      return {
        id,
        type: 'line',
        data: {
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y
        }
      };
    }
  }
}

const initialShapes: Shape[] = [
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 0, y: 0, r: [3, 1] }
  },
  {
    id: faker.datatype.uuid(), type: 'rect', data: { x: -1, y: -1, width: 2, height: 2 }
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
  }
];

export const Primary = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  // TODO(burdon): Factor out.
  const [tool, setTool, toolRef] = useStateRef<string>(undefined);

  // TODO(burdon): Factor out.
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [cursor, setCursor] = useState<Shape>(undefined);
  useEffect(() => {
    let start = undefined;
    let end = undefined;

    const drag = d3.drag()
      .filter(() => {
        // Filter unless tool selected (since clashes with zoom).
        return Boolean(toolRef.current);
      })
      .on('start', (event: D3DragEvent<any, any, any>) => {
        start = scale.map({ x: event.x, y: event.y }, true);
      })
      .on('drag', (event: D3DragEvent<any, any, any>) => {
        end = scale.map({ x: event.x, y: event.y });
        const shape = createShape('_', start, end, toolRef.current);
        setCursor(shape);
      })
      .on('end', (event: D3DragEvent<any, any, any>) => {
        end = scale.map({ x: event.x, y: event.y }, true);
        setCursor(undefined);

        // Check non-zero size.
        const d = Math.sqrt(Math.pow(Math.abs(start.x - end.x), 2) + Math.pow(Math.abs(start.y - end.y), 2));
        if (d === 0) {
          return;
        }

        const shape = createShape(faker.datatype.uuid(), start, end, toolRef.current);
        if (shape) {
          setShapes(shapes => [...shapes, shape]);
        }
      });

    d3.select(svgRef.current).call(drag);
  }, [svgRef]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <g className={styles}>
          <Shapes
            scale={scale}
            cursor={cursor}
            shapes={shapes}
          />
        </g>
      </SvgContainer>

      <Toolbar
        active={tool}
        onSelect={(tool) => setTool(tool)}
      />
    </FullScreen>
  );
}
