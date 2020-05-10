//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import assert from 'assert';
import debug from 'debug';
import React, { useEffect, useRef, useState } from 'react';
import { HotKeys } from 'react-hotkeys';
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';

import { Grid, SVG, useGrid } from '@dxos/gem-core';

import { createToolDrag } from '../drag';
import { createObject } from '../shapes';

import Input from './Input';
import Objects from './Objects';
import Palette from './Palette';
import Toolbar from './Toolbar';

const log = debug('gem:canvas');

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },

  keys: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    outline: 'none'
  },

  // TODO(burdon): Move to useDefaultStyles.
  guides: {
    '& > g > rect.selector': {
      strokeWidth: 2,
      stroke: 'darkblue',
      fill: 'none'
    },
    '& > g > rect.selector-inner': {
      fill: 'darkblue',
      opacity: .1
    },

    '& > g > path': {
      strokeWidth: 2,
      stroke: 'darkblue',
      fill: 'none'
    }
  },

  container: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
  },

  main: {
    display: 'flex',
    flex: 1,

    // NOTE: Relative position for Input.
    position: 'relative',
    '& > div': {
      display: 'flex',
      flex: 1
    }
  }
}));

/**
 * Key shortcuts.
 */
const Keys = ({ children, onAction }) => {
  const classes = useStyles();
  assert(onAction);

  const keyMap = {
    DELETE: ['del', 'backspace'],
    CUT: 'command+x',
    COPY: 'command+c',
    PASTE: 'command+v',
    UNDO: 'command+z',
    REDO: 'shift+command+z'
  };

  const keyHandlers = {
    DELETE: () => onAction('delete'),
    CUT: () => onAction('cut'),
    COPY: () => onAction('copy'),
    PASTE: () => onAction('paste'),
    UNDO: () => onAction('undo'),
    REDO: () => onAction('redo'),
  };

  return (
    <HotKeys
      className={classes.keys}
      allowChanges
      keyMap={keyMap}
      handlers={keyHandlers}
    >
      {children}
    </HotKeys>
  );
};

/**
 * Canvas application.
 *
 * @param {Object[]} [objects]
 * @param {Object} [model]
 * @param {boolean} [showToolbar]
 * @param {boolean} [showPalette]
 */
const Canvas = ({ objects = [], model, showToolbar = true, showPalette = true }) => {
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const view = useRef();
  const guides = useRef();

  // TODO(burdon): Read-only if model is null.

  //
  // App State
  //

  const grid = useGrid({ width, height, zoom });
  const [options, setOptions] = useState({ zoom: 1, showAxis: false, showGrid: true });
  const { zoom, showAxis, showGrid } = options;
  const clipboard = useRef(null);

  // TODO(burdon): Wrap.
  const [tool, setTool] = useState('select');
  const toolRef = useRef(tool);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  //
  // Selection
  // TODO(burdon): Rename selected=>selection.
  //

  // TODO(burdon): Multi-select (object).
  const [selected, setSelected] = useState({ ids: [] });
  const isSelected = objectId => selected && selected.ids.find(id => id === objectId);
  const object = objects.find(object => isSelected(object.id));
  const textIdx = objects.findIndex(object => isSelected(object.id) && object.type === 'text');
  const handleSelect = ids => {
    if (toolRef.current === 'select') {
      setSelected(ids ? { ids } : null);
    }
  };

  if (model) {
    useEffect(() => {
      const drag = createToolDrag(
        guides.current,
        grid,
        tool,
        showGrid,
        object => {
          if (object) {
            model.appendObject(object);
            setSelected({ ids: [ object.id ] });
          } else {
            setSelected(null);
          }
        });

      d3.select(view.current)
        .call(drag)
        .on('click', () => {
          // NOTE: Happens after drag ends.
          console.log('click');
          const d = d3.select(d3.event.target).datum();
          if (!d) {
            setSelected(null);
          }
        });
    }, [ grid, view, tool, showGrid ]);
  }

  //
  // Actions
  //

  const handleAction = (action) => {
    log(`Action: ${action}`);

    // TODO(burdon): Split read-only actions (no model required).
    switch (action) {

      //
      // Tools
      //

      case 'select':
      case 'path':
      case 'rect':
      case 'ellipse':
      case 'text': {
        setTool(action === tool ? 'select' : action);
        setSelected(null);
        break;
      }

      //
      // Clipboard
      //

      case 'delete': {
        // TODO(burdon): Multi-select.
        if (selected) {
          const object = objects.find(object => isSelected(object.id));
          model.removeObject(object.id);
          setSelected(null);
        }
        break;
      }

      case 'cut': {
        // TODO(burdon): Multi-select.
        if (selected) {
          const object = objects.find(object => isSelected(object.id));
          clipboard.current = object;
          model.removeObject(object.id);
          setSelected(null);
        }
        break;
      }

      case 'copy': {
        // TODO(burdon): Multi-select.
        if (selected) {
          const object = objects.find(object => isSelected(object.id));
          if (object) {
            clipboard.current = object;
          }
        }
        break;
      }

      case 'paste': {
        // TODO(burdon): Multi-select.
        if (clipboard.current) {
          const { type, ...rest } = clipboard.current;
          const object = createObject(type, rest);
          model.appendObject(object);
          setSelected({ ids: [object.id] });
        }
        break;
      }

      //
      // View
      //

      case 'grid': {
        setOptions({ ...options, showGrid: !showGrid });
        break;
      }

      case 'zoom-in': {
        setOptions({ ...options, zoom: Math.min(5, zoom + .5) });
        break;
      }

      case 'zoom-out': {
        setOptions({ ...options, zoom: Math.max(1, zoom - .5) });
        break;
      }

      case 'zoom-fit': {
        setOptions({ ...options, zoom: 1 });
        break;
      }

      //
      // Order
      //

      case 'move-up': {
        // TODO(burdon): Multi-select.
        const idx = objects.findIndex(object => isSelected(object.id));
        const object = objects[idx];
        const orders = [...new Set(objects.map(object => (object.order || 1)))].sort();
        const i = orders.findIndex(o => o === (object.order || 1));

        if (i === 0) {
          return;
        }

        orders.unshift(0);
        const min = orders[i - 1];
        const max = orders[i];
        const order = min + (max - min) / 2;

        model.updateObject(object.id, { order });
        break;
      }

      case 'move-down': {
        // TODO(burdon): Multi-select.
        const idx = objects.findIndex(object => isSelected(object.id));
        const object = objects[idx];
        const orders = [...new Set(objects.map(object => (object.order || 1)))].sort();
        const i = orders.findIndex(o => o === (object.order || 1));

        if (i === orders.length - 1) {
          return;
        }

        orders.push(...[orders[orders.length - 1] + 1, orders[orders.length - 1] + 2]);
        const min = orders[i + 1];
        const max = orders[i + 2];
        const order = min + (max - min) / 2;

        model.updateObject(object.id, { order });
        break;
      }

      //
      // TODO(burdon): CRDT model.
      //

      case 'undo': {
        break;
      }

      case 'redo': {
        break;
      }
    }
  };

  return (
    <Keys onAction={handleAction}>
      <div className={classes.root}>
        {showToolbar && (
          <Toolbar tool={tool} snap={showGrid} onAction={handleAction} />
        )}

        <div className={classes.container}>
          <div className={classes.main}>
            {textIdx !== -1 && (
              <Input
                grid={grid}
                object={objects[textIdx]}
                onUpdate={(id, text) => model.updateObject(id, { text })}
                onEnter={() => setSelected(null)}
              />
            )}

            <div>
              {resizeListener}
              <SVG ref={view} width={width} height={height}>
                <Grid
                  grid={grid}
                  showAxis={showAxis}
                  showGrid={showGrid}
                />

                <Objects
                  grid={grid}
                  snap={showGrid}
                  objects={objects}
                  selected={selected}
                  onSelect={handleSelect}
                  onUpdate={(id, properties) => model.updateObject(id, properties)}
                />

                <g ref={guides} className={classes.guides} />
              </SVG>
            </div>
          </div>

          {showPalette && (
            <Palette object={object} onUpdate={(id, properties) => model.updateObject(id, properties)} />
          )}
        </div>
      </div>
    </Keys>
  );
};

export default Canvas;
