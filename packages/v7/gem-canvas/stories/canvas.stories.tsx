//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer, useScale, useStateRef } from '@dxos/gem-x';

import { Canvas, Element, ElementId, ElementType, ElementDataType, Tool, Toolbar, createKeyHandlers } from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Need to keep original size (Don't change element.data until commit).
//  - Constraints.
//  - Save items (model).

// TODO(burdon): Snap.

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
    data: { cx: 0, cy: 0, rx: [2, 1], ry: [2, 1] }
  },
  // {
  //   id: faker.datatype.uuid(),
  //   type: 'ellipse',
  //   data: { cx: 4, cy: 4, rx: 1, ry: 1 }
  // },
  // {
  //   id: faker.datatype.uuid(),
  //   type: 'ellipse',
  //   data: { cx: -8, cy: 0, rx: 1, ry: 1 }
  // }
]

const Info = ({ data = {} }) => (
  <div style={{
    backgroundColor: '#666',
    color: '#EEE',
    padding: 4,
    fontFamily: 'sans-serif',
    fontWeight: 100
  }}>
    {JSON.stringify(data)}
  </div>
);

export const Primary = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });
  const [elements, setElements] = useState<Element<any>[]>(initial);
  const [selected, setSelected, selectedRef] = useStateRef<Element<any>>();
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

  const handleSelect = (element: Element<any>) => {
    setSelected(element);
  };

  const handleUpdate = (element: Element<any>) => {
    setElements(elements => [...elements.filter(({ id }) => element.id !== id), element])
  };

  const handleCreate = (type: ElementType, data: ElementDataType) => {
    setElements(elements => {
      const element = {
        id: faker.datatype.uuid(),
        type,
        data
      };

      setSelected(element);
      return [...elements, element];
    })
  }

  const handleDelete = (id: ElementId) => {
    setElements(elements => elements.filter(element => {
      return element.id !== id
    }));
  };

  // Keys.
  useEffect(() => {
    d3.select(document.body)
      .call(createKeyHandlers(({ action }) => {
        switch (action) {
          case 'delete': {
            if (selectedRef.current) {
              handleDelete(selectedRef.current.id);
              setSelected(undefined);
            }
          }
        }
      }));
  }, []);

  return (
    <FullScreen
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F9F9F9'
      }}
    >
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
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
            onSelect={handleSelect}
            onUpdate={handleUpdate}
            onCreate={handleCreate}
            onDelete={handleDelete}
          />
        </SvgContainer>
      </div>

      <Info
        data={{
          elements: elements.length,
          selected: selected?.id
        }}
      />

      <Toolbar
        tool={tool}
        onSelect={tool => setTool(tool)}
      />
    </FullScreen>
  );
};
