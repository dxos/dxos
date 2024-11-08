//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useStack } from './Stack';

export const StackItemHeading = () => {
  const { orientation } = useStack();
  return <div className={orientation === 'horizontal' ? 'bs-[--rail-size]' : 'is-[--rail-size]'} />;
};
