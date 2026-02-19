//
// Copyright 2026 DXOS.org
//

import { Blueprint } from '@dxos/blueprints';

import { Functions } from './functions';

export const blueprint = Blueprint.make({
  key: 'dxos.org/blueprint/planning',
  name: 'Planning',
  description: 'Plans and tracks complex tasks with artifact management.',
  tools: Blueprint.toolDefinitions({ functions: [Functions.updateTasks] }),
});
