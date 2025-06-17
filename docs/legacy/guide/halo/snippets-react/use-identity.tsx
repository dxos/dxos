//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { useIdentity } from '@dxos/react-client/halo';

export const MyComponent = () => {
  const identity = useIdentity();
  return <>{/* ... */}</>;
};
