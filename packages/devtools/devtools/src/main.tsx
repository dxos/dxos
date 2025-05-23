//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initializeAppObservability } from '@dxos/observability';
import { Config, Defaults, Remote, Storage } from '@dxos/react-client';

import { DevtoolsApp as App } from './app';
import { namespace } from './hooks';

const main = async () => {
  void initializeAppObservability({ namespace, config: new Config(Defaults()) });

  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target') ?? undefined;
  // TODO(nf): read wsAuthToken from localStorage?
  const wsAuthToken = searchParams.get('wsAuthToken') ?? undefined;
  const sources = target ? [Remote(target, wsAuthToken), Defaults()] : [await Storage(), Defaults()];
  const config = new Config(...sources);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App config={config} />
    </StrictMode>,
  );
};

void main();
