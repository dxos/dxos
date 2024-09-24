//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { DevtoolsContextProvider, useRoutes } from '../hooks';

const Routes = () => {
  return useRoutes();
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Devtools = () => {
  return (
    <DevtoolsContextProvider>
      <HashRouter>
        <Routes />
      </HashRouter>
    </DevtoolsContextProvider>
  );
};

export default Devtools;
