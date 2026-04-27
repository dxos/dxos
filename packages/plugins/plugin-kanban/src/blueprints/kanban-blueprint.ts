//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.kanban';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Kanban',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update kanban boards to show data in sorted columns defined by schema.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
