//
// Copyright 2023 DXOS.org
//

import React from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

// TODO(mykola): Add proto schema. Decode bytes.
export const JsonView = ({ data }: { data: Object }) => {
  return (
    <div className='flex flex-1 overflow-auto'>
      <SyntaxHighlighter className='flex flex-1' language='json' style={style}>
        {JSON.stringify(data, undefined, 2)}
      </SyntaxHighlighter>
    </div>
  );
};
