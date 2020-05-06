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

import { Grid, SVG, useGrid, useObjectMutator } from '@dxos/gem-core';

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
 */
const Canvas = ({ data }) => {
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const view = useRef();
  const guides = useRef();

  //
  // Data
  // TODO(burdon): Factor out data (ECHO model).
  //

  const [objects,, getObjects, updateObjects] = useObjectMutator(data);

  // Handle move/resize.
  const handleUpdate = (id, properties) => {
    const objects = getObjects();
    const idx = objects.findIndex(object => object.id === id);
    const object = objects[idx];
    assert(object, `Invalid object: ${id}`);

    updateObjects({
      $splice: [[idx, 1, { ...object, ...properties }]]
    });

    // TODO(burdon): Move.
    setTool('select');
  };

  //
  // App State
  //

  const [options, setOptions] = useState({ zoom: 1, showAxis: false, showGrid: true });
  const { zoom, showAxis, showGrid } = options;
  const [tool, setTool] = useState('select');
  const grid = useGrid({ width, height, zoom });
  const clipboard = useRef(null);

  //
  // Selection
  // TODO(burdon): Rename selection.
  //

  const [selected, setSelected] = useState({ ids: [] });
  const isSelected = objectId => selected && selected.ids.find(id => id === objectId);
  const handleSelect = ids => {
    setSelected(ids ? { ids } : null);
    setTool('select');
  };
  const object = objects.find(object => isSelected(object.id));
  const textIdx = objects.findIndex(object => isSelected(object.id) && object.type === 'text');

  useEffect(() => {
    const drag = createToolDrag(
      guides.current,
      grid,
      tool,
      showGrid,
      object => {
        if (object) {
          updateObjects({ $push: [object] });
          setSelected({ ids: [object.id] });
        } else {
          setSelected(null);
        }
      });

    d3.select(view.current)
      .call(drag)
      .on('click', () => {
        // NOTE: Happens after drag ends.
        console.log('click');
        const data = d3.select(d3.event.target).datum();
        if (!data) {
          setSelected(null);
        }
      });
  }, [grid, view, tool, showGrid]);

  //
  // Actions
  //

  const handleAction = (action) => {
    log(`Action: ${action}`);

    // clipboard, setTool, setSelected, objects, options

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
        break;
      }

      //
      // Clipboard
      //

      case 'delete': {
        if (selected) {
          const idx = objects.findIndex(object => isSelected(object.id));
          assert(idx !== -1);
          updateObjects({ $splice: [[idx, 1]] });
          setSelected(null);
        }
        break;
      }

      case 'cut': {
        if (selected) {
          const idx = objects.findIndex(object => isSelected(object.id));
          if (idx !== -1) {
            clipboard.current = objects[idx];
            updateObjects({ $splice: [[ idx, 1 ]] });
            setSelected(null);
          }
        }
        break;
      }

      case 'copy': {
        if (selected) {
          const object = objects.find(object => isSelected(object.id));
          if (object) {
            clipboard.current = object;
          }
        }
        break;
      }

      case 'paste': {
        if (clipboard.current) {
          const { type, ...rest } = clipboard.current;
          const object = createObject(type, rest);
          updateObjects({ $push: [object] });
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

        updateObjects({
          $splice: [[idx, 1, { ...object, order }]]
        });

        break;
      }

      case 'move-down': {
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

        updateObjects({
          $splice: [[idx, 1, { ...object, order }]]
        });

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
        <Toolbar tool={tool} snap={showGrid} onAction={handleAction} />

        <div className={classes.container}>
          <div className={classes.main}>
            {textIdx !== -1 && (
              <Input
                grid={grid}
                object={objects[textIdx]}
                onUpdate={(id, text) => {
                  const idx = objects.findIndex(object => object.id === id);
                  updateObjects({ $splice: [[idx, 1, { ...object, text }]] });
                }}
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
                  onUpdate={handleUpdate}
                />

                <g ref={guides} className={classes.guides} />
              </SVG>
            </div>
          </div>

          <Palette object={object} onUpdate={handleUpdate} />
        </div>
      </div>
    </Keys>
  );
};

export default Canvas;
