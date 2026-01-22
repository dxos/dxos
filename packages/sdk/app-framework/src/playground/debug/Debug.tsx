//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import * as Common from '../../common';
import { Capability } from '../../core';
import { usePluginManager } from '../../react';

export const Debug = () => {
  const manager = usePluginManager();
  const core = useAtomValue(manager.core);
  const enabled = useAtomValue(manager.enabled);
  const active = useAtomValue(manager.active);
  const pendingReset = useAtomValue(manager.pendingReset);
  const eventsFired = useAtomValue(manager.eventsFired);

  const object = {
    core,
    enabled,
    active,
    pendingReset,
    eventsFired,
  };

  return (
    <SyntaxHighlighter language='json' classNames='text-xs opacity-75 rounded'>
      {JSON.stringify(object, undefined, 2)}
    </SyntaxHighlighter>
  );
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.ReactSurface,
      Common.createSurface({
        id: 'dxos.org/test/debug/main',
        role: 'secondary',
        component: Debug,
      }),
    ),
  ),
);
