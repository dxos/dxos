//
// Copyright 2024 DXOS.org
//

import React from 'react';
import FPSStats from 'react-fps-stats';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { useActionHandler, useEditorContext, useSelected } from '../../hooks';
import { Toolbar } from '../Toolbar';
import { eventsAuto, eventsNone } from '../styles';
import { testId } from '../util';

/**
 * UI components.
 */
export const UI = () => {
  const { debug, width, height, graph, showGrid, snapToGrid, dragging, linking } = useEditorContext();
  const handleAction = useActionHandler();
  const selected = useSelected();
  const info = {
    debug,
    graph: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
    },
    selected,
    width,
    height,
    showGrid,
    snapToGrid,
    dragging,
    linking,
  };

  return (
    <div {...testId('dx-ui')} className={mx('absolute h-full inset-0', eventsNone)}>
      <div>
        <div className='absolute top-0 left-0'>
          <FPSStats />
        </div>
      </div>
      <div>
        <div className='absolute bottom-0 left-0'>
          <SyntaxHighlighter language='javascript' classNames={mx('w-[300px] bg-base text-xs p-2 opacity-70')}>
            {JSON.stringify(info, null, 2)}
          </SyntaxHighlighter>
        </div>
        <div className='absolute bottom-0 left-0 right-0 flex justify-center'>
          <div>
            <Toolbar onAction={handleAction} classNames={mx(eventsAuto)} />
          </div>
        </div>
      </div>
    </div>
  );
};
