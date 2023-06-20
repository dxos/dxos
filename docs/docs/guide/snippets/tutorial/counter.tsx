//
// Copyright 2022 DXOS.org
//

import { useIdentity, useSpaces } from '@dxos/react-client';
import React from 'react';

export const Counter = () => {
  // Get the user to log in before a space can be obtained.
  const identity = useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  return <></>;
};