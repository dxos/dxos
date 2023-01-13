//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Skeleton } from './Skeleton';

export default {
  title: 'react-components/Skeleton'
};

export const Primary = () => {
  return <Skeleton variant='rectangular' height={100} />;
};

export const ExtendedDelay = () => {
  return <Skeleton variant='rectangular' height={100} delay={5000} />;
};
