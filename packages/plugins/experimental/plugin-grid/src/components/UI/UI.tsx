//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { useEditorContext } from '../../hooks';
import { Toolbar } from '../Toolbar';
import { testId } from '../util';

/**
 *
 */
export const UI = () => {
  const { debug, handleAction } = useEditorContext();
  const info = { debug };

  return (
    <div {...testId('ui')} className='relative w-full grid grid-rows-[1fr_40px]'>
      <div></div>
      <div>
        <div className='z-10 absolute left-0 bottom-0'>
          <SyntaxHighlighter language='javascript' classNames='w-[300px] bg-base text-xs p-2 opacity-70'>
            {JSON.stringify(info, null, 2)}
          </SyntaxHighlighter>
        </div>
        <div className='z-10 flex w-full justify-center'>
          <div>
            <Toolbar onAction={handleAction} />
          </div>
        </div>
      </div>
    </div>
  );
};
