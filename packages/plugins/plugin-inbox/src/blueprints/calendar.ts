//
// Copyright 2025 DXOS.org
//

import { type AppCapabilities } from '@dxos/app-toolkit';
import { Blueprint, Template } from '@dxos/blueprints';
import { trim } from '@dxos/util';

import { InboxOperation } from '#operations';

const BLUEPRINT_KEY = 'org.dxos.blueprint.calendar';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Calendar',
    tools: Blueprint.toolDefinitions({ operations: [InboxOperation.GoogleCalendarSync], tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });

const blueprint: AppCapabilities.BlueprintDefinition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
