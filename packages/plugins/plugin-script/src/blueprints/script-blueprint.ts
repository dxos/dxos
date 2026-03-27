//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

const BLUEPRINT_KEY = 'org.dxos.blueprint.script';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Script',
    tools: Blueprint.toolDefinitions({ tools: [] }),
    instructions: Template.make({
      source: trim`
        You can create and update scripts which contain Typescript code.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
