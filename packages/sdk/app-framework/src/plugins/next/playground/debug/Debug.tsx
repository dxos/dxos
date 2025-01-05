//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { createSurface } from '../../../plugin-surface';
import { Capabilities } from '../../common';
import { contributes } from '../../plugin';
import { usePluginManager } from '../../react';

export const Debug = () => {
  const manager = usePluginManager();

  const object = {
    enabled: manager.enabled,
    active: manager.active,
    pendingReset: manager.pendingReset,
  };

  return (
    <SyntaxHighlighter language='json' classNames='flex w-full text-xs opacity-75 rounded'>
      {JSON.stringify(object, undefined, 2)}
    </SyntaxHighlighter>
  );
};

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: 'dxos.org/test/debug/main',
      role: 'main',
      component: Debug,
    }),
  );
