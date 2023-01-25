//
// Copyright 2022 DXOS.org
//

import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { useClient } from '@dxos/react-client';

import { useAppState } from '../hooks';

export const SettingsPage = () => {
  const client = useClient();
  const state = useAppState();

  // https://www.npmjs.com/package/react-syntax-highlighter
  return (
    <div className='flex overflow-hidden w-full h-full'>
      <div className='flex flex-1 overflow-hidden drop-shadow-md justify-center'>
        <div
          className='flex flex-1 flex-col overflow-y-scroll bg-gray-50 text-sm'
          style={{ width: 700, maxWidth: 700 }}
        >
          <div className='flex flex-col'>
            <h2 className='p-2 py-1 bg-slate-300'>STATE</h2>
            <SyntaxHighlighter className='w-full' language='json' style={style}>
              {JSON.stringify(state, undefined, 2)}
            </SyntaxHighlighter>
          </div>

          <div className='flex flex-col'>
            <h2 className='px-2 py-1 bg-slate-300'>CONFIG</h2>
            <SyntaxHighlighter className='w-full' language='json' style={style}>
              {JSON.stringify(client.config.values, undefined, 2)}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    </div>
  );
};
