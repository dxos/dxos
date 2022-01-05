//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { Bounds, FullScreen, SvgContainer, useScale } from '@dxos/gem-x';

import {
  Canvas,
  Cursor,
  Editor,
  Element,
  Tool,
  Toolbar,
  createMouseHandlers,
  createKeyHandlers
} from '../src';

// Priority
// TODO(burdon): Start to factor out this class (move handlers into Canvas).
// TODO(burdon): Find element on click (iterate DOM).

// Next
// TODO(burdon): Show cursor for circle, line, path.
// TODO(burdon): Delete.
// TODO(burdon): Clean-up scale mapping functions.

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
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });
  const editor = useMemo(() => new Editor(scale), [scale]);

  const [tool, setTool] = useState<Tool>(undefined);

  // TODO(burdon): Move to canvas wrapper.
  const [elements, setElements] = useState<Element[]>();
  const [cursor, setCursor] = useState<Cursor>(undefined);

  // TODO(burdon): Items vs elements.
  useEffect(() => {
    setElements(testElements);
  }, []);

  // TODO(burdon): Determine relationship between editor and state in this class.
  useEffect(() => {
    editor.setTool(tool);
    editor.setCursor(cursor);
    editor.setElements(elements);
  }, [tool, cursor, elements]);

  // TODO(burdon): Move handlers into canvas.
  useEffect(() => {
    const addElement = (element: Element) => setElements(elements => [...elements, element]);

    d3.select(svgRef.current)
      .call(createMouseHandlers(editor, setCursor, addElement));

    d3.select(document.body)
      .call(createKeyHandlers(editor, setCursor, addElement));
  }, [svgRef]);

  const handleUpdateCursor = (bounds: Bounds, end: boolean) => {
    const [x, y, width, height] = bounds;

    // Snap to fractions.
    const pos = scale.mapToModel([x, y]);
    const size = scale.mapToModel([width, height]);

    setCursor(cursor => {
      let { x, y, width, height } = cursor.bounds;

      // Clamp width.
      if (size[0] >= 1) {
        x = pos[0];
        width = size[0];
      }

      // Clamp height.
      if (size[1] >= 1) {
        y = pos[1];
        height = size[1];
      }

      if (end) {
        // Update element.
        setElements(elements => {
          const idx = elements.findIndex(element => element.id === editor.selected.id);
          if (idx !== -1) {
            const element = elements[idx];
            elements.splice(idx, 1, {
              ...element,
              data: { x, y, width, height }
            });

            return [...elements];
          }
        });

        return undefined;
      }

      return {
        ...cursor,
        bounds: { x, y, width, height }
      }
    });
  };

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/8, 8]}
        grid
      >
        <Canvas
          className={styles}
          scale={scale}
          cursor={cursor}
          elements={elements}
          onUpdateCursor={handleUpdateCursor}
        />
      </SvgContainer>

      <Toolbar
        active={tool}
        onSelect={(tool) => setTool(tool)}
      />
    </FullScreen>
  );
};
