import { Blueprint } from '@dxos/blueprints';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';
import { updateTasks } from './functions';

export const PlanningBlueprint = Blueprint.make({
  key: 'dxos.org/blueprint/planning',
  name: 'Planning',
  description: 'Plans and tracks complex tasks with artifact management.',
  tools: Blueprint.toolDefinitions({ functions: [updateTasks] }),
});
