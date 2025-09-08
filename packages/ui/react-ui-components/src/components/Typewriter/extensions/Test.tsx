//
// Copyright 2025 DXOS.org
//

import React from 'react';

export type TestProps = { text?: string };

export const Test = ({ text }: TestProps) => {
  return <div className='text-xl text-red-500'>{text}</div>;
};
