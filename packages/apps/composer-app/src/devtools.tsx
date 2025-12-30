//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DevtoolsApp } from '@dxos/devtools';
import { initializeAppObservability } from '@dxos/observability';
import { meta as debugMeta } from '@dxos/plugin-debug';

const namespace = `${debugMeta.id}/devtools`;

const main = async () => {
  const enter =
    localStorage.getItem(`${debugMeta.id}/devtools`) === 'true' || window.confirm('Continue to DXOS developer tools?');
  if (!enter) {
    window.location.pathname = '/';
    return;
  }

  const { Remote, Config, Defaults } = await import('@dxos/react-client');

  const searchProps = new URLSearchParams(window.location.search);
  const target = searchProps.get('target');
  const config = new Config(target ? Remote(target) : {}, Defaults());
  void initializeAppObservability({ namespace, config });

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DevtoolsApp config={config} />
    </StrictMode>,
  );
};

void main();
