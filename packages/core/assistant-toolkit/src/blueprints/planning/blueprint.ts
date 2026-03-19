//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';

import { UpdateTasks, PlanningHandlers } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.planning';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks with artifact management.',
    tools: Blueprint.toolDefinitions({ operations: [UpdateTasks] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: PlanningHandlers,
  make,
};

export default blueprint;
