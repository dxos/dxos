//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { DevtoolsApp } from '@dxos/devtools';
import { meta as devtoolsMeta } from '@dxos/plugin-devtools';

import { initAutomergeWasm } from '../util/automerge-wasm.ts';

const main = async () => {
  const enter =
    localStorage.getItem(`${devtoolsMeta.profile.key}.devtools`) === 'true' ||
    window.confirm('Continue to DXOS developer tools?');
  if (!enter) {
    window.location.pathname = '/';
    return;
  }

  const { Remote, Config, Defaults } = await import('@dxos/react-client');

  // The devtools client runs echo on this page; automerge is slim-resolved and must be
  // initialized before it (see util/automerge-wasm.ts).
  await initAutomergeWasm();

  const searchProps = new URLSearchParams(window.location.search);
  const target = searchProps.get('target');
  const config = new Config(target ? Remote(target) : {}, Defaults());

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DevtoolsApp config={config} />
    </StrictMode>,
  );
};

void main();
