//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.map';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Map',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update maps to show geospatial data.
      `,
    }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
