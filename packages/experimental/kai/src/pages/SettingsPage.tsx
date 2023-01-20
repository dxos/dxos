//
// Copyright 2022 DXOS.org
//

import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { useClient } from '@dxos/react-client';

export const SettingsPage = () => {
  const client = useClient();

  // https://www.npmjs.com/package/react-syntax-highlighter
  return (
    <div className='full-screen'>
      <div className='flex flex-1 overflow-hidden drop-shadow-md justify-center'>
        <div className='flex flex-1 overflow-y-auto bg-gray-50 text-sm p-4' style={{ width: 700, maxWidth: 700 }}>
          <SyntaxHighlighter className='flex flex-1' language='json' style={style}>
            {JSON.stringify(client.config.values, undefined, 2)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};
