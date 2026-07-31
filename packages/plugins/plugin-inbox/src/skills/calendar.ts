//
// Copyright 2025 DXOS.org
//

import { Skill, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { InboxOperation } from '#types';
import { Calendar } from '#types';

const make = () =>
  Skill.make({
    key: Calendar.SKILL_KEY,
    name: 'Calendar',
    tools: Skill.toolDefinitions({ operations: [InboxOperation.GoogleCalendarSync], tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });

const skill: Skill.Definition = {
  key: Calendar.SKILL_KEY,
  make,
};

export default skill;
