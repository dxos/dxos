//
// Copyright 2022 DXOS.org
//

import { Bug } from 'phosphor-react';
import React from 'react';
import { Link } from 'react-router-dom';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { useClient } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { useAppState } from '../hooks';

const SettingsPage = () => {
  const client = useClient();
  const state = useAppState();

  // TODO(burdon): Toggle settings with local storage.
  return (
    <div className='flex overflow-hidden w-full h-full'>
      <div className='flex flex-1 overflow-hidden drop-shadow-md justify-center'>
        <div
          className='flex flex-1 flex-col overflow-y-scroll bg-gray-50 text-sm'
          style={{ width: 700, maxWidth: 700 }}
        >
          <div className='flex items-center justify-between p-2 bg-appbar-header'>
            <div className='flex items-center'>
              <Link to='/' title='Home'>
                <Bug className={mx(getSize(8))} />
              </Link>
            </div>
          </div>

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

export default SettingsPage;
