//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { SetAlarm, GetCurrentDate } from './operations/definitions';

const BLUEPRINT_KEY = 'org.dxos.blueprint.alarm';

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Alarm',
    description: 'Schedule a self-wake and inspect the current time.',
    instructions: Template.make({
      source: trim`
        You can schedule an alarm to wake yourself up in the future and continue working.
        When the alarm fires you receive a prompt carrying any reminder you set.
        Read the current time before computing an absolute wake time.
      `,
    }),
    tools: Blueprint.toolDefinitions({ operations: [SetAlarm, GetCurrentDate] }),
  });

const blueprint: Blueprint.Definition = {
  key: BLUEPRINT_KEY,
  make,
};

export default blueprint;
