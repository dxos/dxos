//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { Capabilities, createSurface } from '../../common';
import { contributes, defineCapabilityModule } from '../../core';
import { usePluginManager } from '../../react';

export const Debug = () => {
  const manager = usePluginManager();

  const object = {
    core: manager.core,
    enabled: manager.enabled,
    active: manager.active,
    pendingReset: manager.pendingReset,
    eventsFired: manager.eventsFired,
  };

  return (
    <SyntaxHighlighter language='json' classNames='text-xs opacity-75 rounded'>
      {JSON.stringify(object, undefined, 2)}
    </SyntaxHighlighter>
  );
};

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'dxos.org/test/debug/main',
      role: 'secondary',
      component: Debug,
    }),
  ),
);
