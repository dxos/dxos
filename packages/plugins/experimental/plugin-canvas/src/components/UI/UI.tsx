//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { FPS } from './FPS';
import { useActionHandler, useEditorContext, useSelected } from '../../hooks';
import { Toolbar } from '../Toolbar';
import { eventsAuto, eventsNone } from '../styles';
import { testId } from '../util';

/**
 * UI components.
 */
export const UI = () => {
  const { debug, width, height, scale, offset, graph, showGrid, snapToGrid, dragging, linking } = useEditorContext();
  const handleAction = useActionHandler();
  const selected = useSelected();
  const info = {
    debug,
    bounds: {
      width,
      height,
    },
    scale,
    offset,
    graph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    selected,
    showGrid,
    snapToGrid,
    dragging,
    linking,
  };

  return (
    <div {...testId('dx-ui')} className={mx('absolute h-full inset-0', eventsNone)}>
      <div>
        <div className='absolute top-2 left-2'>{debug && <FPS bar='bg-cyan-500' />}</div>
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
        <div className='absolute bottom-2 left-0 right-0 flex justify-center'>
          <div className='p-1 bg-base rounded-md border border-separator'>
            <Toolbar onAction={handleAction} classNames={mx(eventsAuto)} />
          </div>
        </div>
      </div>
    </div>
  );
};
