//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type TestProps = { text?: string; tagName?: string };

export const Test = ({ text, tagName }: TestProps) => {
  return (
    <div className='text-xl text-red-500'>
      {tagName && <span className='font-bold'>[{tagName}] </span>}
      {text}
    </div>
  );
};
