//
// Copyright 2025 DXOS.org
//

import { DXN } from '@dxos/keys';

import { Plugin } from '../core';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.processManager'),
  name: 'Process Manager Plugin',
  author: 'DXOS',
  description:
    'Hosts the process-manager runtime that composes contributed layer specs into a service resolver, exposes the operation invoker built on top of it, and registers undo/history tracking.',
  tags: ['system'],
});
