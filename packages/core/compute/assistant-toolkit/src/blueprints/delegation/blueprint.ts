//
// Copyright 2026 DXOS.org
//

import { Blueprint } from '@dxos/compute';

import { DelegateTask } from './operations/delegate-task';

const BLUEPRINT_KEY = 'org.dxos.blueprint.delegation';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Delegation',
    description: 'Delegates work to sub-agents and tracks it as plan tasks.',
    tools: Blueprint.toolDefinitions({ operations: [DelegateTask] }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
