//
// Copyright 2020 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import { LinearProgress } from '@mui/material';

import { ClientInitializer } from '@dxos/react-client';
import { ErrorView } from '@dxos/react-framework';

import App from './components/App';
import { initConfig } from './config';

const start = () => {
  ReactDOM.render(
    <ClientInitializer config={initConfig} loaderComponent={() => <LinearProgress />} errorComponent={ErrorView}>
      <App />
    </ClientInitializer>,
    document.getElementById('root'));
};

start();
