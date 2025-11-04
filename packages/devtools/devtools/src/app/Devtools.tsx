//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { HashRouter } from 'react-router-dom';

import { DevtoolsContextProvider, useRoutes } from '../hooks';

const Routes = () => useRoutes();

export type DevtoolsProps = {
  noRouter?: boolean;
};

/**
 * Entrypoint for app and extension (no direct dependency on Client).
 */
export const Devtools = ({ noRouter }: DevtoolsProps) => {
  if (noRouter) {
    return (
      <DevtoolsContextProvider>
        <Routes />
      </DevtoolsContextProvider>
    );
  }

  return (
    <DevtoolsContextProvider>
      <HashRouter>
        <Routes />
      </HashRouter>
    </DevtoolsContextProvider>
  );
};

export default Devtools;
