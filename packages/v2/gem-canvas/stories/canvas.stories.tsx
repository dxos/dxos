//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import React, { useEffect, useState } from 'react';

import { FullScreen, SVGContextProvider, useStateRef } from '@dxos/gem-core';

import {
  Action,
  ActionType,
  Canvas,
  ControlState,
  ElementData,
  ElementDataType,
  ElementId,
  ElementType,
  SelectionModel,
  StatusBar,
  Tool,
  Toolbar,
  createKeyHandlers,
  useMemoryElementModel
} from '../src';

import { generator } from './helpers';

const log = debug('gem:canvas:story');
debug.enable('gem:canvas:*,-*:render');
// debug.enable('gem:canvas:*');

// TODO(burdon): Commit/update model (update/reset element._data).
// TODO(burdon): Refresh/render button.

// TODO(burdon): styled-components warning
// TODO(burdon): Tighten model/screen differences (e.g., frame, drag).
// TODO(burdon): See different layers in draw.io for elements, cursor, and connection points.

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

export default {
  title: 'gem-canvas/Canvas'
};

const Container = () => {
  // State.
  const [selection, setSelection, selectionRef] = useStateRef<SelectionModel>();
  const [tool, setTool] = useState<Tool>();
  const [grid, setGrid] = useState(true); // TODO(burdon): Generalize to view options.
  const [showToolbar, setShowToolbar] = useState(true);
  const [debug, setDebug, debugRef] = useStateRef(false);

  // Elements.
  const [elements, model] = useMemoryElementModel(() => generator());

  // Reset selection.
  useEffect(() => {
    if (tool) {
      setSelection(undefined);
    }
  }, [tool]);

  //
  // Event handlers.
  //

  const handleSelect = (selection: SelectionModel) => {
    setSelection(selection);
  };

  const handleCreate = async (type: ElementType, data: ElementDataType) => {
    const element = await model.create(type, data);
    setTool(undefined);
    setSelection({ element, state: ControlState.SELECTED });
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

  const handleAction = async (action: Action) => {
    const { type } = action;
    switch (type) {
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
        setGrid(grid => !grid);
        break;
      }

      // TODO(burdon): Reset zoom.
      case ActionType.RESET_ZOOM: {
        break;
      }

      case ActionType.TOOL_SELECT: {
        const { tool } = action;
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
  };

  //
  // Keys.
  //
  useEffect(() => {
    d3.select(document.body)
      .call(createKeyHandlers(handleAction));
  }, [elements]);

  return (
    <FullScreen>
      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
        <Toolbar
          tool={tool}
          minimized={!showToolbar}
          onMinimize={showToolbar => setShowToolbar(!showToolbar)}
          onAction={handleAction}
          onStyle={(style: string) => {
            if (selection) {
              const { element: { data, ...rest } } = selection;
              void handleUpdate({ ...rest, data: { ...data, style } });
            }
          }}
        />

        <div style={{ display: 'flex', flex: 1 }}>
          <SVGContextProvider>
            <Canvas
              grid={grid}
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
          </SVGContextProvider>
        </div>

        {toolbar && (
          <StatusBar
            data={{
              elements: elements.length,
              selected: selection?.element?.id
            }}
          />
        )}
      </div>
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <Container />
  );
}
