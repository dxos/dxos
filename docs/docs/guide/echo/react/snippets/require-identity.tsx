import React from 'react';
import { useRoutes } from 'react-router-dom';
import { RequireIdentity } from '@dxos/react-appkit';

export const Routes = () => {
  return useRoutes([
    {
      element: <RequireIdentity />,
      children: [
        // ... other routes will fire only once identity is established
      ]
    }
  ]);
};
