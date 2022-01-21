//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import faker from 'faker';
import React, { useEffect, useRef, useState } from 'react';

import { FullScreen, SvgContainer, useScale, useStateRef } from '@dxos/gem-core';

import {
  ActionType,
  Canvas,
  ControlState,
  createKeyHandlers,
  ElementData,
  ElementDataType,
  ElementId,
  ElementType,
  SelectionModel,
  StatusBar,
  Tool,
  Toolbar
} from '../src';
import { generator } from './helpers';

export default {
  title: 'gem-canvas/Canvas'
};

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:debug');

/**
 *
 */
// TODO(burdon): Prototype before changing story.
class ElementModel {
  // TODO(burdon): Replaces useSelection hook (i.e., requires database instance)? Or meta hook?
  // TODO(burdon): Provide subscription?
  _elements = new Map<ElementId, ElementData<any>>();

  async create (type: ElementType, data: ElementDataType): Promise<ElementData<any>> {
    const element = {
      id: faker.datatype.uuid(),
      type,
      data
    };

    this._elements.set(element.id, element);
    return element;
  }

  async update (element: ElementData<any>): Promise<ElementData<any>> {
    this._elements.set(element.id, element);
    return element;
  };

  async delete (id: ElementId): Promise<ElementId> {
    this._elements.delete(id);
    return id;
  };
}

const Container = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });

  // State.
  const [elements, setElements] = useState<ElementData<any>[]>(() => generator());
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();
  const [tool, setTool] = useState<Tool>();
  const [showGrid, setShowGrid, showGridRef] = useStateRef(true); // TODO(burdon): Generalize to options.
  const [debug, setDebug, debugRef] = useStateRef(false);

  const handleSelect = (selection: SelectionModel) => {
    setSelection(selection);
  };

  const handleUpdate = (element: ElementData<any>, commit?: boolean) => {
    commit && log('update', element.type, element.id);
    setElements(elements => [...elements.filter(({ id }) => element.id !== id), element]);

    // TODO(burdon): Chance to reject commit.
    return true;
  };

  const handleCreate = (type: ElementType, data: ElementDataType) => {
    setElements(elements => {
      const element = {
        id: faker.datatype.uuid(),
        type,
        data
      };

      log('created', element.type, element.id);
      setSelection({ element, state: ControlState.SELECTED });
      setTool(undefined);
      return [...elements, element];
    });

    // TODO(burdon): Chance to reject commit.
    return true;
  }

  const handleDelete = (id: ElementId) => {
    setSelection(undefined);
    log('delete', id);
    const remove = elements.find(element => element.id === id);
    if (remove) {
      setElements(elements => elements.filter(element => {
        if (element.id === id) {
          return false;
        }

        if (element.type === 'line') {
          if (element.data.source.id === id || element.data.target.id === id) {
            return false;
          }
        }

        return true;
      }));
    }

    // TODO(burdon): Chance to reject commit.
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
          case ActionType.DEBUG: {
            setDebug(!debugRef.current);
            break;
          }

          case ActionType.RESET: {
            setTool(undefined);
            setSelection(undefined);
            const updated = elements.map(({ id, type, ...rest }) => `${id}[${type}]: ${JSON.stringify(rest)}`);
            log(`Elements (${elements.length}):\n${updated.join('\n')}`);
            break;
          }

          case ActionType.TOGGLE_GRID: {
            setShowGrid(!showGridRef.current);
            break;
          }

          case ActionType.TOOL_SELECT: {
            setTool(tool);
            break;
          }

          case ActionType.CUT: {
            setElements([]);
            setTool(undefined);
            setSelection(undefined);
            break;
          }

          case ActionType.CANCEL: {
            setTool(undefined);
            setSelection(undefined);
            break;
          }

          case ActionType.DELETE: {
            if (selectionRef.current) {
              handleDelete(selectionRef.current!.element.id);
              setSelection(undefined);
            }
          }
        }
      }));
  }, [elements]);

  return (
    <FullScreen>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>
        <div style={{ display: 'flex', flex: 1 }}>
          <Toolbar
            tool={tool}
            onSelect={tool => setTool(tool)}
          />

          <SvgContainer
            ref={svgRef}
            scale={scale}
            zoom={[1/4, 8]}
            grid={showGrid}
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
                debug
              }}
            />
          </SvgContainer>
        </div>

        <StatusBar
          data={{
            elements: elements.length,
            selected: selection?.element?.id
          }}
        />
      </div>
    </FullScreen>
  );
};

// TODO(burdon): Tighten model/screen differences (e.g., frame, drag).

// TODO(burdon): Commit/update model (update/reset element._data).
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

export const Primary = () => {
  const [elements, setElements] = useState<ElementData<any>[]>(() => generator());
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();

  // TODO(burdon): Move handlers.

  return (
    <Container
    />
  );
}
