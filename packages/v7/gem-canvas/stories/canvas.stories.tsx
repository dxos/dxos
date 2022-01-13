//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer, useScale, useStateRef, Vector } from '@dxos/gem-x';

import { Canvas, Element, ElementId, ElementType, ElementDataType, Tool, Toolbar, createKeyHandlers } from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Fix event x, y for drag/move (when moved/scaled: require grid to translate point).
// TODO(burdon): Use debug for logging (check perf.)

// TODO(burdon): Show connect points on hightlight.
// TODO(burdon): Drag to draw line.
// TODO(burdon): Text.

// TODO(burdon): Items (model update) and basic frame.

// TODO(burdon): Copy/paste.
// TODO(burdon): Undo.

// TODO(burdon): Constrain on resize.
// TODO(burdon): Snap center/bounds on move.
// TODO(burdon): Implement path to test model.
// TODO(burdon): Info panel with element info.
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)
// TODO(burdon): Styles and style objects.

const initial: Element<any>[] = [
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: { center: Vector.toVertex({ x: 2, y: 3 }), rx: [1, 1], ry: [1, 1] }
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: { center: Vector.toVertex({ x: 6, y: 3 }), rx: [1, 2], ry: [1, 2] }
  },
  {
    id: faker.datatype.uuid(),
    type: 'rect',
    data: { bounds: Vector.toBounds({ x: 1, y: -4, width: 2, height: 2 }) }
  }
];

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
  const [tool, setTool] = useState<Tool>();

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
