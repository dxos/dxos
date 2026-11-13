//
// Copyright 2026 DXOS.org
//

import '@dxos-theme';
import '../styles/island-base.generated.css';

import React from 'react';

// `@dxos/keys` reads `Buffer` as it loads, so the globals go in before anything else.
import '@dxos/node-std/globals';
import '@dxos/react-ui/theme.css';

import { DemoFrame } from './DemoFrame.tsx';
import { DEMOS, pageRuntime } from './registry.ts';

/** A live demo island: `<EchoDemo id='editor' client:only='react' />`. */
export const EchoDemo = ({ id }: { id: string }) => {
  const demo = DEMOS[id];
  if (!demo) {
    throw new Error(`No demo "${id}"`);
  }

  return <DemoFrame demo={demo} runtime={pageRuntime()} />;
};
