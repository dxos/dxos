//
// Copyright 2026 DXOS.org
//

import { Skill } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { SetAlarm, GetCurrentDate } from './operations/definitions';

const SKILL_KEY = 'org.dxos.skill.alarm';

const instructions = trim`
  You can schedule an alarm to wake yourself up in the future and continue working.
  When the alarm fires you receive a prompt carrying any reminder you set.
  Read the current time before computing an absolute wake time.
`;

const make = () =>
  Skill.make({
    key: SKILL_KEY,
    name: 'Alarm',
    description: 'Schedule a self-wake and inspect the current time.',
    agentCanEnable: true,
    instructions: {
      source: Ref.make(Text.make({ content: instructions })),
    },
    tools: Skill.toolDefinitions({ operations: [SetAlarm, GetCurrentDate] }),
  });

const skill: Skill.Definition = {
  key: SKILL_KEY,
  make,
};

export default skill;
