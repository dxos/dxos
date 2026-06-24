//
// Copyright 2026 DXOS.org
//

import { Blueprint, Operation } from '@dxos/compute';
import { Ref } from '@dxos/echo';

import { PlanningOperations } from './operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.planning';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks using artifacts.',
    tools: Blueprint.toolDefinitions({ operations: [PlanningOperations.UpdateTasks] }),
    // At the end of every request, remind the agent to keep working while its plan has open tasks.
    // The reminder enqueues onto the owning host (Tier B), which keeps the process alive.
    hooks: [
      {
        spec: { _tag: 'end-request' },
        function: Ref.make(Operation.serialize(PlanningOperations.PlanReminder)),
      },
    ],
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
