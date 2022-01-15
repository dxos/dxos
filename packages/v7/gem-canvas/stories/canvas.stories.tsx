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
  ElementState,
  Ellipse,
  Line,
  Path,
  Rect,
  SelectionModel,
  Tool,
  Toolbar,
  createKeyHandlers,
} from '../src';

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Line snap to connector.

// TODO(burdon): Commit/update model (update/reset element._data).
// TODO(burdon): Items (model update) and basic frame.
// TODO(burdon): Refresh/render button.

// TODO(burdon): Merge line, polyline.
// TODO(burdon): Create path (multi-point).
// TODO(burdon): Drag path.
// TODO(burdon): Text element and editor.

// TODO(burdon): Drag to select.
// TODO(burdon): Select all (copy, move, delete).
// TODO(burdon): Copy/paste.
// TODO(burdon): Undo.

// TODO(burdon): Use debug for logging (check perf.)
// TODO(burdon): Constrain on resize.
// TODO(burdon): Snap center/bounds on move.
// TODO(burdon): Info panel with element info.
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)
// TODO(burdon): Styles and style objects.

const check = <T extends any>(value: T): T => value;

const ids = [
  faker.datatype.uuid(),
  faker.datatype.uuid(),
  faker.datatype.uuid()
];

const initial: Element<any>[] = [
  {
    id: ids[0],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -6, y: -4, width: 4, height: 2 }),
      text: 'DXOS'
    })
  },
  {
    id: ids[1],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: 2, y: -4, width: 4, height: 2 }),
      text: 'ECHO'
    })
  },
  {
    id: ids[2],
    type: 'rect',
    data: check<Rect>({
      bounds: Vector.toBounds({ x: -12, y: -4, width: 4, height: 2 }),
      text: 'HALO'
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      source: {
        id: ids[0]
      },
      target: {
        id: ids[1]
      }
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'line',
    data: check<Line>({
      source: {
        id: ids[0]
      },
      target: {
        id: ids[2]
      }
    })
  },

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
      center: Vector.toVertex({ x: 6, y: 5 }), rx: [1, 2], ry: [1, 2],
      text: 'A'
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: 10, y: -2 }), rx: [1, 2], ry: [1, 2],
      text: 'B'
    })
  },
  {
    id: faker.datatype.uuid(),
    type: 'ellipse',
    data: check<Ellipse>({
      center: Vector.toVertex({ x: -1, y: 3 }), rx: [1, 2], ry: [1, 2],
      text: 'C'
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
    type: 'path',
    data: check<Path>({
      points: [
        Vector.toVertex({ x: -8, y: 8 }),
        Vector.toVertex({ x: -6, y: 10 }),
        Vector.toVertex({ x: -4, y: 4 }),
        Vector.toVertex({ x: -5, y: 3 }),
        Vector.toVertex({ x: -7, y: 5 }),
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
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();
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

  const handleSelect = (selection: SelectionModel) => {
    setSelection(selection);
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

      setSelection({ element, state: ElementState.SELECTED });
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
      .call(createKeyHandlers(({ action, tool }) => {
        switch (action) {
          case 'tool': {
            setTool(tool);
            break;
          }

          case 'cancel': {
            setTool(undefined);
            setSelection(undefined);
            break;
          }

          case 'delete': {
            if (selectionRef.current) {
              handleDelete(selectionRef.current!.element.id);
              setSelection(undefined);
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
            selection={selection}
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
          selected: selection?.element?.id
        }}
      />

      <Toolbar
        tool={tool}
        onSelect={tool => setTool(tool)}
      />
    </FullScreen>
  );
};
