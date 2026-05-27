//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '../core';
import { DXN } from '@dxos/keys';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.processManager'),
  name: 'Process Manager Plugin',
  author: 'DXOS',
  description:
    'Hosts the process-manager runtime that composes contributed layer specs into a service resolver, exposes the operation invoker built on top of it, and registers undo/history tracking.',
  tags: ['system'],
};
