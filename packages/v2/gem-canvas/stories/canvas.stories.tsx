//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
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
  Toolbar,
  useMemoryElementModel,
} from '../src';

import { generator } from './helpers';

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:debug');

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

export default {
  title: 'gem-canvas/Canvas'
};

// TODO(burdon): Factor out.
const Container = () => {
  const svgRef = useRef<SVGSVGElement>();
  const scale = useScale({ gridSize: 32 });
  const [elements, model] = useMemoryElementModel(() => generator());

  // State.
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();
  const [tool, setTool] = useState<Tool>();
  const [showGrid, setShowGrid, showGridRef] = useStateRef(true); // TODO(burdon): Generalize to options.
  const [debug, setDebug, debugRef] = useStateRef(false);

  const handleSelect = (selection: SelectionModel) => {
    setSelection(selection);
  };

  const handleCreate = async (type: ElementType, data: ElementDataType) => {
    const element = await model.create(type, data);
    setSelection({ element, state: ControlState.SELECTED });
    setTool(undefined);
    return true; // TODO(burdon): Chance to reject commit.
  }

  const handleUpdate = async (element: ElementData<any>) => {
    await model.update(element);
    return true; // TODO(burdon): Chance to reject commit.
  };

  const handleDelete = async (id: ElementId) => {
    await model.delete(id);
    setSelection(undefined);
    return true; // TODO(burdon): Chance to reject commit.
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
      .call(createKeyHandlers(async ({ action, tool }) => {
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

          case ActionType.CANCEL: {
            setTool(undefined);
            setSelection(undefined);
            break;
          }

          case ActionType.DELETE: {
            if (selectionRef.current) {
              await handleDelete(selectionRef.current!.element.id);
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
              onCreate={handleCreate}
              onUpdate={handleUpdate}
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

export const Primary = () => {
  return (
    <Container />
  );
}
