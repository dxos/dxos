//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { FPS, testId } from '@dxos/react-ui-canvas';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';

import { useEditorContext } from '../../hooks';
import { type TestId } from '../defs';
import { eventsAuto, eventsNone } from '../styles';
import { Toolbar, Tools } from '../Toolbar';

export type UIProps = ThemedClassName<{
  showTools?: boolean;
  showToolbar?: boolean;
}>;

/**
 * UI components.
 */
export const UI = ({ showTools, showToolbar }: UIProps) => {
  const { debug, registry, dragMonitor, graph, showGrid, snapToGrid, selection, actionHandler } = useEditorContext();
  const dragging = dragMonitor.state().value;
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
  };

  return (
    <div {...testId<TestId>('dx-ui')} className={mx('absolute bs-full inset-0', eventsNone)}>
      <div>
        <div className='absolute top-2 left-2'>{debug && <FPS bar='bg-cyan-500' />}</div>
      </div>
      {showTools && (
        <div className='absolute top-2 left-2 right-2 flex justify-center'>
          <Tools classNames={mx(eventsAuto)} registry={registry} />
        </div>
      )}

      <div>
        <div className='absolute bottom-2 left-2'>
          {debug && (
            <Json
              classNames={mx('is-[300px] bg-baseSurface border border-separator rounded-sm text-xs opacity-70')}
              data={info}
            />
          )}
        </div>
        {showToolbar && (
          <div className='absolute bottom-2 left-2 right-2 flex justify-center'>
            <div className='p-1 bg-baseSurface border border-separator rounded-sm '>
              <Toolbar onAction={actionHandler} classNames={mx(eventsAuto)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
