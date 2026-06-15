//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.table';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Table',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update tables to show data in sorted columns defined by schema.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
