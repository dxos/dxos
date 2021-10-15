//
// Copyright 2021 DXOS.org
//

import React from 'react';

export const JsonPanel = ({ value }: { value: any }) => {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}
    >
      {JSON.stringify(value, undefined, 2)}
    </pre>
  );
};
