//
// Copyright 2026 DXOS.org
//

import { Blueprint } from '@dxos/compute';

import { UpdateTasks } from './operations/update-tasks';

const BLUEPRINT_KEY = 'org.dxos.blueprint.planning';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Planning',
    description: 'Plans and tracks complex tasks using artifacts.',
    tools: Blueprint.toolDefinitions({ operations: [UpdateTasks] }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
