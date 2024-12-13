//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

import { useEditorContext } from '../../hooks';
import { Toolbar } from '../Toolbar';
import { eventsNone } from '../styles';
import { testId } from '../util';

/**
 * UI components.
 */
export const UI = () => {
  const { debug, width, height, showGrid, snapToGrid, dragging, linking, handleAction } = useEditorContext();
  const info = { debug, width, height, showGrid, snapToGrid, dragging, linking };

  return (
    <div {...testId('dx-ui')} className={mx('absolute h-full inset-0', eventsNone)}>
      <div></div>
      <div>
        <div className='z-[300] absolute bottom-0 left-0'>
          <SyntaxHighlighter language='javascript' classNames='w-[300px] bg-base text-xs p-2 opacity-70'>
            {JSON.stringify(info, null, 2)}
          </SyntaxHighlighter>
        </div>
        <div className='z-[300] absolute bottom-0 left-0 right-0 flex justify-center'>
          <div>
            <Toolbar onAction={handleAction} />
          </div>
        </div>
      </div>
    </div>
  );
};
