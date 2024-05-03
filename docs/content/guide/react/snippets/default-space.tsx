//
// Copyright 2022 DXOS.org
//

import React from 'react';
import {
  useQuery,
  useSpace,
} from '@dxos/react-client/echo';

export const App = () => {

  const defaultSpace = useSpace();

  // Get objects from the space as an array of JS objects.
  const objects = useQuery(defaultSpace);

  return <>{objects.length}</>;
};

