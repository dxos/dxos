import React from 'react';
import { useIdentity } from '@dxos/react-client';

export const MyComponent = () => {
  const identity = useIdentity();
  return <>{/* ... */}</>;
};
