//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
import SyntaxHighlighter from 'react-syntax-highlighter';
// eslint-disable-next-line no-restricted-imports
import style from 'react-syntax-highlighter/dist/esm/styles/hljs/a11y-light';

import { mx } from '@dxos/react-components';

// TODO(mykola): Add proto schema. Decode bytes.
export const JsonView: FC<{ data?: Object; className?: string }> = ({ data, className }) => {
  return (
    <SyntaxHighlighter className={mx('flex flex-1 text-xs', className)} language='json' style={style}>
      {JSON.stringify(data, undefined, 2)}
    </SyntaxHighlighter>
  );
};
