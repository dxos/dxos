//
// Copyright 2025 DXOS.org
//

import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Calendar, InboxOperation } from '#types';

export const key = Calendar.SKILL_KEY;

export const make = (): Skill.Skill =>
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
