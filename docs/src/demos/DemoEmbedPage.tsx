//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React, { useState } from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';

import { DemoFrame } from './DemoFrame.tsx';
import { DEMOS, embedRuntime } from './registry.ts';

/** The demo named by `?id=`, for `pages/embed/demo.astro`. */
export const DemoEmbedPage = () => {
  const id = new URLSearchParams(window.location.search).get('id') ?? '';
  const demo = DEMOS[id];
  const [runtime] = useState(() => demo && embedRuntime(demo));
  if (!demo || !runtime) {
    return <p>No demo "{id}".</p>;
  }

  return <DemoFrame demo={demo} runtime={runtime} />;
};
