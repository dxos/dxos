//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { CalendarSync, CalendarHandlers } from '../functions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.calendar';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Calendar',
    tools: Blueprint.toolDefinitions({ operations: [CalendarSync], tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  operations: CalendarHandlers,
  make,
};

export default blueprint;
