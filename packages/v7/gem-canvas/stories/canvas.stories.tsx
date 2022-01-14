//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer, useScale, useStateRef, Vector } from '@dxos/gem-x';

import {
  Canvas,
  Element,
  ElementId,
  ElementType,
  ElementDataType,
  Ellipse,
  Line,
  Path,
  Rect,
  Tool,
  Toolbar,
  createKeyHandlers,
} from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Commit/update model (update/reset element._data).
// TODO(burdon): Items (model update) and basic frame.
// TODO(burdon): Refresh/render button.

// TODO(burdon): Perf avoid re-render everything on every update.
// TODO(burdon): Use debug for logging (check perf.)

// TODO(burdon): Temporariliy move element to top when active.
// TODO(burdon): Drag to draw line.
// TODO(burdon): Show connect points on hightlight.
// TODO(burdon): Drag line.
// TODO(burdon): Create path.
// TODO(burdon): Drag path.
// TODO(burdon): Text element and editor.

// TODO(burdon): Select all (copy, move, delete).
// TODO(burdon): Copy/paste.
// TODO(burdon): Undo.

// TODO(burdon): Constrain on resize.
// TODO(burdon): Snap center/bounds on move.
// TODO(burdon): Info panel with element info.
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)
// TODO(burdon): Styles and style objects.

const check = <T extends any>(value: T): T => value;

const initial: Element<any>[] = [
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 2, y: 3 }), rx: [1, 1], ry: [1, 1]
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 6, y: 5 }), rx: [1, 2], ry: [1, 2]
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 10, y: -2 }), rx: [1, 2], ry: [1, 2]
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: -1, y: 3 }), rx: [1, 2], ry: [1, 2]
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: 6, y: 5 })
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: 10, y: -2 })
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      pos1: Vector.toVertex({ x: 2, y: 3 }), pos2: Vector.toVertex({ x: -1, y: 3 })
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: 1, y: -4, width: 2, height: 2 })
    })
  },

  {
    id: faker.datatype.uuid(),
    type: 'path',
    data: check<Path>({
      points: [
        Vector.toVertex({ x: -8, y: 4 }),
        Vector.toVertex({ x: -6, y: 6 }),
        Vector.toVertex({ x: -4, y: 2 }),
        Vector.toVertex({ x: -5, y: -1 }),
        Vector.toVertex({ x: -7, y: 1 }),
      ],
      curve: 'cardinal',
      closed: true
    })
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

  const handleUpdate = (element: Element<any>, commit?: boolean) => {
    // TODO(burdon): Chance to reject commit.
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
          case 'cancel': {
            setTool(undefined);
            setSelected(undefined);
            break;
          }

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
