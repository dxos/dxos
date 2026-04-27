//
// Copyright 2026 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';

import { UpdateTasks } from './functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.planning';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks with artifact management.',
    tools: Blueprint.toolDefinitions({ operations: [UpdateTasks] }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
