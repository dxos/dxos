//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Skill from '@dxos/compute/Skill';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { GetCurrentDate, SetAlarm } from './operations/definitions.ts';

export const key = 'org.dxos.skill.alarm';

const instructions = trim`
  You can schedule an alarm to wake yourself up in the future and continue working.
  When the alarm fires you receive a prompt carrying any reminder you set.
  Read the current time before computing an absolute wake time.
`;

export const make = () =>
  Skill.make({
    key,
    name: 'Alarm',
    description: 'Schedule a self-wake and inspect the current time.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [SetAlarm, GetCurrentDate] }),
  });

export { AlarmHandlers as Handlers } from './operations/index.ts';
export * as Operations from './operations/definitions.ts';
