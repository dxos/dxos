//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer, useScale, useStateRef } from '@dxos/gem-x';

import {
  Canvas,
  ElementData,
  ElementId,
  ElementType,
  ElementDataType,
  ControlState,
  SelectionModel,
  Tool,
  Toolbar,
  createKeyHandlers,
  useRepaint,
} from '../src';
import { generator } from './helpers';

export default {
  title: 'gem-canvas/Canvas'
};

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:debug');

// TODO(burdon): Remove links when delete item that is source/target.
// TODO(burdon): Line snap to connector (on create).

// TODO(burdon): Commit/update model (update/reset element._data).
// TODO(burdon): Items (model update) and basic frame.
// TODO(burdon): Refresh/render button.

// TODO(burdon): Merge line, polyline.
// TODO(burdon): Create path (multi-point).
// TODO(burdon): Drag path.
// TODO(burdon): Text element and editor.

// TODO(burdon): Only repaint if modified (incl. connected lines).
// TODO(burdon): Drag to select.
// TODO(burdon): Select all (copy, move, delete).
// TODO(burdon): Copy/paste.
// TODO(burdon): Undo.
// TODO(burdon): Order.

// TODO(burdon): Use debug for logging (check perf.)
// TODO(burdon): Constrain on resize.
// TODO(burdon): Snap center/bounds on move.
// TODO(burdon): Info panel with element info.
// TODO(burdon): Toolbar panel (color, line weight, path type, etc.)
// TODO(burdon): Styles and style objects.

// Clean-up
// TODO(burdon): Consistent join pattern to avoid recreating closures (e.g., frame createControlPoints)
// TODO(burdon): D3Callable as functions.

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
  const [elements, setElements] = useState<ElementData<any>[]>(() => generator());
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();
  const [tool, setTool] = useState<Tool>();
  const [debug, setDebug, debugRef] = useStateRef(false);
  const [repaint, handleRepaint] = useRepaint();

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

  const handleUpdate = (element: ElementData<any>, commit?: boolean) => {
    // TODO(burdon): Chance to reject commit.
    commit && log('update', element.type, element.id);
    setElements(elements => [...elements.filter(({ id }) => element.id !== id), element]);
    return true;
  };

  const handleCreate = (type: ElementType, data: ElementDataType) => {
    setElements(elements => {
      setSelection(undefined);
      const element = {
        id: faker.datatype.uuid(),
        type,
        data
      };

      log('created', element.type, element.id);
      setSelection({ element, state: ControlState.SELECTED });
      return [...elements, element];
    });

    return true;
  }

  const handleDelete = (id: ElementId) => {
    setSelection(undefined);
    log('delete', id);
    // TODO(burdon): Remove dangling links (or set point to current).
    setElements(elements => elements.filter(element => {
      return element.id !== id;
    }));

    return true;
  };

  // Reset selection.
  useEffect(() => {
    setSelection(undefined);
  }, [tool]);

  //
  // Keys.
  //
  useEffect(() => {
    d3.select(document.body)
      .call(createKeyHandlers(({ action, tool }) => {
        switch (action) {
          case 'debug': {
            setDebug(!debugRef.current);
            break;
          }

          case 'tool': {
            setTool(tool);
            break;
          }

          case 'cut': {
            setElements([]);
            setTool(undefined);
            setSelection(undefined);
            break;
          }

          case 'reset': {
            setTool(undefined);
            setSelection(undefined);
            handleRepaint();
            const updated = elements.map(({ id, type, ...rest }) => `${id}[${type}]: ${JSON.stringify(rest)}`);
            log(`Elements (${elements.length}):\n${updated.join('\n')}`);
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
  }, [elements]); // TODO(burdon): Since stale element (fix this).

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
            options={{
              debug,
              repaint
            }}
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
