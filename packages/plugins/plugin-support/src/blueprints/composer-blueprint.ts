//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';

import INSTRUCTIONS from './composer-instructions.md?raw';

export const COMPOSER_BLUEPRINT_KEY = 'org.dxos.blueprint.composer';

const make = () =>
  Blueprint.make({
    key: COMPOSER_BLUEPRINT_KEY,
    name: 'Composer',
    tools: Blueprint.toolDefinitions({ operations: [] }),
    instructions: Template.make({ source: INSTRUCTIONS }),
  });

const blueprint: Blueprint.Definition = {
  key: COMPOSER_BLUEPRINT_KEY,
  make,
};

export default blueprint;
