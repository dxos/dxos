//
// Copyright 2025 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
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

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
