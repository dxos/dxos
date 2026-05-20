//
// Copyright 2025 DXOS.org
//

import { type Plugin } from '../core';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.process-manager',
  name: 'Process Manager Plugin',
  author: 'DXOS',
  description:
    'Hosts the process-manager runtime that composes contributed layer specs into a service resolver, exposes the operation invoker built on top of it, and registers undo/history tracking.',
  tags: ['system'],
};
