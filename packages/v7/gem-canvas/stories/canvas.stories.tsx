//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { useScale, FullScreen, SvgContainer } from '@dxos/gem-x';

import { Canvas, Element } from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Need to keep original size (Don't change element.data until commit).
//  - Save items (model).

//  - Implement path to test model.

// TODO(burdon): Performance?
//   Re-usable closure that is just passed the data (and ID)?
//   E.g., Prevent re-render if only one element is updated. Optimize join (enter, update, delete) call.
//   When is update called? (check if data has changed?)
//   Split function calls (e.g., for basic vs. editable) to minimize unnecessary closures.
//   Make callable?

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

  return (
    <FullScreen style={{ backgroundColor: '#F9F9F9' }}>
      <SvgContainer
        ref={svgRef}
        scale={scale}
        grid
      >
        <Canvas
          svgRef={svgRef}
          scale={scale}
          tool='ellipse'
          elements={elements}
          selected={selected}
          onSelect={element => setSelected(element)}
          onCreate={element => setElements(elements => [...elements, element])}
          onUpdate={element => setElements(elements => [...elements.filter(({ id }) => element.id !== id), element])}
          onDelete={id => setElements(elements.filter(element => element.id !== id))}
        />
      </SvgContainer>
    </FullScreen>
  );
};
