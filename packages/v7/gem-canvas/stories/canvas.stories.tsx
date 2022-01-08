//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { useScale, FullScreen, SvgContainer } from '@dxos/gem-x';

import { Canvas, Element, Tool, createKeyHandlers } from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Need to keep original size (Don't change element.data until commit).
//  - Save items (model).

// TODO(burdon): Implement path to test model.

// TODO(burdon): Info panel with element info.
// TODO(burdon): Use debug for logging.

// TODO(burdon): Think about undo.
// TODO(burdon): Factor out special cases for path (in handlers).
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)
// TODO(burdon): Style objects.

const initial: Element<any>[] = [
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: { cx: 0, cy: 0, rx: 2, ry: 2 }
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: { cx: 4, cy: 4, rx: 1, ry: 1 }
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: { cx: -8, cy: 0, rx: 1, ry: 1 }
  }
]

export const Primary = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });
  const [elements, setElements] = useState<Element<any>[]>(initial);
  const [selected, setSelected] = useState<Element<any>>();
  const [tool, setTool] = useState<Tool>('ellipse');

  // TODO(burdon): Randomizer.
  // useEffect(() => {
  //   setTimeout(() => {
  //     setElements(elements => {
  //       elements.splice(0, 1);
  //       elements[0].data = { cx: 6, cy: 4, rx: 1, ry: 1 };
  //       return [...elements];
  //     });
  //   }, 1000);
  // }, []);

  // Keys.
  useEffect(() => {
    d3.select(svgRef.current).call(createKeyHandlers);
  }, []);

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        zoom={[1/4, 8]}
        grid
      >
        <Canvas
          svgRef={svgRef}
          scale={scale}
          tool={tool}
          elements={elements}
          selected={selected}
          onSelect={element => setSelected(element)}
          onUpdate={element => setElements(elements => [...elements.filter(({ id }) => element.id !== id), element])}
          onCreate={(type, data) => {
            // TODO(burdon):
            setElements(elements => {
              const element = {
                id: faker.datatype.uuid(),
                type,
                data
              };

              return [...elements, element];
            })
          }}
          onDelete={id => setElements(elements.filter(element => element.id !== id))}
        />
      </SvgContainer>
    </FullScreen>
  );
};
