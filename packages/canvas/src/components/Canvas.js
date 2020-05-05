//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import assert from 'assert';
import debug from 'debug';
import React, { useEffect, useState, useRef } from 'react';
import { HotKeys } from "react-hotkeys";
import useResizeAware from 'react-resize-aware';
import { makeStyles } from '@material-ui/core/styles';

import { Grid, View, useGrid, useObjectMutator } from '@dxos/gem-core';

import { createObject} from '../shapes';

import Objects from './Objects';
import Toolbar from './Toolbar';
import { dragSelectGenerator } from '../drag';

const log = debug('spore:canvas');

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1
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
  }
}));

/**
 * Canvas application.
 */
const Canvas = ({ data }) => {
  const classes = useStyles();
  const [resizeListener, { width, height }] = useResizeAware();
  const [selected, setSelected] = useState({ ids: [] });
  const [options, setOptions] = useState({ zoom: 1, showAxis: false, showGrid: true });
  const [tool, setTool] = useState('select');
  const grid = useGrid({ width, height, zoom: options.zoom });
  const clipboard = useRef(null);
  const view = useRef();
  const guides = useRef();

  // TODO(burdon): ECHO model.
  const [objects, setObjects, getObjects, updateObjects] = useObjectMutator(data);

  // Handle move/resize.
  const handleUpdate = (id, properties) => {
    const objects = getObjects();
    const idx = objects.findIndex(object => object.id === id);
    const object = objects[idx];
    assert(object, `Invalid object: ${id}`);

    updateObjects({
      $splice: [[idx, 1, { ...object, ...properties }]]
    });
  };

  // Reset selection.
  useEffect(() => {
    const drag = dragSelectGenerator(
      guides.current,
      grid,
      tool,
      () => {
        setSelected(null);
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
  }, [view, tool]);

  const isSelected = objectId => selected && selected.ids.find(id => id === objectId);

  // Toolbar actions.
  const handleAction = (action) => {
    log(`Action: ${action}`);

    switch (action) {

      //
      // Tools
      //

      case 'select':
      case 'path':
        setTool(action === tool ? 'select' : action);
        break;

      case 'rect': {
        const object = createObject('rect', { bounds: { x: 0, y: 0, width: 20, height: 20 } });
        console.log(object);
        setObjects([...objects, object]);
        setSelected({ ids: [object.id] });
        break;
      }

      case 'ellipse': {
        const object = createObject('ellipse', { bounds: { x: 0, y: 0, width: 20, height: 20 } });
        setObjects([...objects, object]);
        setSelected({ ids: [object.id] });
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
            updateObjects({ $splice: [ [ idx, 1 ] ] });
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
        setOptions({ ...options, showGrid: !options.showGrid });
        break;
      }

      case 'zoom-in': {
        setOptions({ ...options, zoom: Math.min(5, options.zoom + .5) });
        break;
      }

      case 'zoom-out': {
        setOptions({ ...options, zoom: Math.max(1, options.zoom - .5) });
        break;
      }

      case 'zoom-fit': {
        setOptions({ ...options, zoom: 1 });
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

  const keyMap = {
    DELETE: ['del', 'backspace'],
    CUT: 'command+x',
    COPY: 'command+c',
    PASTE: 'command+v',
    UNDO: 'command+z',
    REDO: 'shift+command+z'
  };

  const keyHandlers = {
    DELETE: () => handleAction('delete'),
    CUT: () => handleAction('cut'),
    COPY: () => handleAction('copy'),
    PASTE: () => handleAction('paste'),
    UNDO: () => handleAction('undo'),
    REDO: () => handleAction('redo'),
  };

  return (
    <div className={classes.root}>
      <HotKeys
        allowChanges
        keyMap={keyMap}
        handlers={keyHandlers}
      >
        <Toolbar tool={tool} onAction={handleAction} />

        <div>
          {resizeListener}
          <View ref={view} width={width} height={height}>
            <Grid
              grid={grid}
              showAxis={options.showAxis}
              showGrid={options.showGrid}
            />

            <Objects
              grid={grid}
              objects={objects}
              selected={selected}
              onSelect={ids => setSelected(ids ? { ids } : null)}
              onUpdate={handleUpdate}
            />

            <g ref={guides} className={classes.guides} />
          </View>
        </div>
      </HotKeys>
    </div>
  );
};

export default Canvas;
