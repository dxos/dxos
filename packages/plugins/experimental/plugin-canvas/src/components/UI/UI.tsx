//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { FPS, testId } from '@dxos/react-ui-canvas';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext } from '../../hooks';
import { Tools, Toolbar } from '../Toolbar';
import { type TestId } from '../defs';
import { eventsAuto, eventsNone } from '../styles';

/**
 * UI components.
 */
export const UI = () => {
  const { debug, registry, monitor, graph, showGrid, snapToGrid, linking, selection, actionHandler } =
    useEditorContext();
  const { shape: dragging } = monitor.state().value;
  const info = {
    debug,
    graph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    dragging,
    selected: selection.selected.value,
    showGrid,
    snapToGrid,
    linking,
  };

  return (
    <div {...testId<TestId>('dx-ui')} className={mx('absolute h-full inset-0', eventsNone)}>
      <div>
        <div className='absolute top-2 left-2'>{debug && <FPS bar='bg-cyan-500' />}</div>
      </div>
      <div>
        <div className='absolute top-2 left-2 right-2 flex justify-center'>
          <div className='p-1 bg-base rounded-md border border-separator'>
            <Tools classNames={mx(eventsAuto)} registry={registry} />
          </div>
        </div>
      </div>
      <div>
        <div className='absolute bottom-2 left-2'>
          {debug && (
            <SyntaxHighlighter
              language='javascript'
              classNames={mx('w-[300px] bg-base rounded-md bg-base border border-separator text-xs p-2 opacity-70')}
            >
              {JSON.stringify(info, null, 2)}
            </SyntaxHighlighter>
          )}
        </div>
        <div className='absolute bottom-2 left-2 right-2 flex justify-center'>
          <div className='p-1 bg-base rounded-md border border-separator'>
            <Toolbar onAction={actionHandler} classNames={mx(eventsAuto)} />
          </div>
        </div>
      </div>
    </div>
  );
};
