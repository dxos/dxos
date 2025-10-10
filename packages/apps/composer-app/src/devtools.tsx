//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DevtoolsApp } from '@dxos/devtools';
import { meta as debugMeta } from '@dxos/plugin-debug';

const main = async () => {
  const enter =
    localStorage.getItem(`${debugMeta.id}/devtools`) === 'true' || window.confirm('Continue to DXOS developer tools?');
  if (!enter) {
    window.location.pathname = '/';
    return;
  }

  const { Remote, Config, Defaults } = await import('@dxos/react-client');

  const searchParams = new URLSearchParams(window.location.search);
  const target = searchParams.get('target');
  const config = new Config(target ? Remote(target) : {}, Defaults());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DevtoolsApp config={config} />
    </StrictMode>,
  );
};

void main();
