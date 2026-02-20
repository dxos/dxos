//
// Copyright 2026 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint } from '@dxos/blueprints';

import { PlanningFunctions } from './functions';

const BLUEPRINT_KEY = 'dxos.org/blueprint/planning';

const functions = Object.values(PlanningFunctions);

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks with artifact management.',
    tools: Blueprint.toolDefinitions({ functions: [PlanningFunctions.UpdateTasks] }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  functions,
  make,
};

export default blueprint;
