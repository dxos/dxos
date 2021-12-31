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
  Path,
  Point,
  Shape,
  Shapes,
  SvgContainer,
  useScale,
} from '../src';

// TODO(burdon): If zoomed then can be too small.
// TODO(burdon): Normalized [x, y] over {x, y}
// TODO(burdon): Delete shapes if removed from model.
// TODO(burdon): Mapping bug (based on scale).
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
      id: 'circle'
    },
    {
      id: 'rect'
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

const createShape = (id: string, tool: string, start?: Point, end?: Point): Shape => {
  switch (tool) {
    case 'circle': {
      return {
        id,
        type: 'circle',
        data: {
          x: start[0],
          y: start[1],
          r: Math.sqrt(Math.pow(Math.abs(start[0] - end[0]), 2) + Math.pow(Math.abs(start[1] - end[1]), 2))
        }
      };
    }

    case 'rect': {
      const width = end[0] - start[0];
      const height = end[1] - start[1]

      return {
        id,
        type: 'rect',
        data: {
          x: start[0] + (width < 0 ? width : 0),
          y: start[1] + (height < 0 ? height : 0),
          width: Math.abs(width),
          height: Math.abs(height)
        }
      };
    }

    case 'line': {
      return {
        id,
        type: 'line',
        data: {
          x1: start[0],
          y1: start[1],
          x2: end[0],
          y2: end[1]
        }
      };
    }

    case 'path': {
      return {
        id,
        type: 'path',
        data: {
          points: []
        }
      }
    }
  }
}

const initialShapes: Shape[] = [
  {
    id: faker.datatype.uuid(), type: 'circle', data: { x: 0, y: 0, r: [1, 1] }
  },
  /*
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
  const [shapes, setShapes] = useState<Shape[]>(initialShapes);
  const [cursor, setCursor, cursorRef] = useStateRef<Shape>(undefined);
  useEffect(() => {
    let start: Point = undefined;
    let end: Point = undefined;

    const drag = d3.drag()
      .filter(() => {
        // Filter unless tool selected (since clashes with zoom).
        return Boolean(toolRef.current);
      })

      .on('start', (event: D3DragEvent<any, any, any>) => {
        if (toolRef.current === 'path') {
          return;
        }

        start = scale.mapToModel([event.x, event.y], true);
      })

      .on('drag', (event: D3DragEvent<any, any, any>) => {
        if (toolRef.current === 'path') {
          return;
        }

        end = scale.mapToModel([event.x, event.y]);

        // TODO(burdon): Update existing?
        const shape = createShape('_', toolRef.current, start, end);
        setCursor(shape);
      })

      .on('end', (event: D3DragEvent<any, any, any>) => {
        if (toolRef.current === 'path') {
          return;
        }

        end = scale.mapToModel([event.x, event.y], true);
        setCursor(undefined);

        // Check non-zero size.
        // TODO(burdon): Depends on zoom.
        const d = Math.sqrt(Math.pow(Math.abs(start[0] - end[0]), 2) + Math.pow(Math.abs(start[1] - end[1]), 2));
        if (d === 0) {
          return;
        }

        const shape = createShape(faker.datatype.uuid(), toolRef.current, start, end);
        if (shape) {
          setShapes(shapes => [...shapes, shape]);
        }
      });

    d3.select(document.body)
      .on('keydown', (event: KeyboardEvent) => {
        switch (event.key) {
          case 'Enter': {
            if (toolRef.current === 'path') {
              const data = cursorRef.current.data as Path;
              data.type = 'cardinal';
              data.closed = true;
              data.points.splice(data.points.length - 1, 1);
              setShapes(shapes => [...shapes, {...cursorRef.current}]);
              setCursor(undefined);
            }
            break;
          }

          case 'Escape': {
            setCursor(undefined);
            break;
          }
        }
      });

    d3.select(svgRef.current)
      // https://github.com/d3/d3-selection#handling-events
      .on('click', (event: MouseEvent) => {
        if (toolRef.current === 'path') {
          const [x, y] = scale.mapToModel([event.x, event.y]);
          if (!cursorRef.current) {
            const cursor = createShape(faker.datatype.uuid(), toolRef.current);
            const data = cursor.data as Path;
            data.points.push([x, y]);
            setCursor(cursor);
          } else {
            const data = cursorRef.current.data as Path;
            setCursor(cursor => {
              data.points.push([x, y]);
              return {...cursor};
            });
          }
        }
      })
      // TODO(burdon): Disable zoom/drag.
      .on('mousemove', (event: MouseEvent) => {
        if (toolRef.current === 'path') {
          const [x, y] = scale.mapToModel([event.x, event.y]);
          if (cursorRef.current) {
            setCursor(cursor => {
              const data = cursorRef.current.data as Path;
              const points = data.points;
              if (points.length === 1) {
                points.push([x, y]);
              } else {
                points.splice(points.length - 1, 1, [x, y]);
              }
              return {...cursor};
            });
          }
        }
      })
      .call(drag);
  }, [svgRef]);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <Shapes
          scale={scale}
          cursor={cursor}
          shapes={shapes}
          className={styles}
        />
      </SvgContainer>

      <Toolbar
        active={tool}
        onSelect={(tool) => setTool(tool)}
      />
    </FullScreen>
  );
}
