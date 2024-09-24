//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initializeAppObservability } from '@dxos/observability';
import { Config, Defaults, Remote } from '@dxos/react-client';

import { DevtoolsApp as App } from './app';
import { namespace } from './hooks';

const main = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target') ?? undefined;
  // TODO(nf): read wsAuthToken from localStorage?
  const config = new Config(Remote(target, searchParams.get('wsAuthToken') ?? undefined), Defaults());

  void initializeAppObservability({ namespace, config: new Config(Defaults()) });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
};

main();
