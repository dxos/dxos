//
// Copyright 2021 DXOS.org
//

import React from 'react';

export const JsonPanel = ({ value }: { value: any }) => (
  <pre
    style={{
      margin: 0,
      // code whiteSpace: 'pre-wrap',
      // code wordBreak: 'break-all',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }}
  >
    {JSON.stringify(value, undefined, 2)}
  </pre>
);
