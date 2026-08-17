//
// Copyright 2025 DXOS.org
//

import type * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import * as Template from '@dxos/compute/Template';
import { trim } from '@dxos/util';

import { Calendar } from '#types';

export const key = Calendar.SKILL_KEY;

export type CalendarSkillOptions = {
  /** Sync operations of the connectors bound to a Calendar, resolved by the caller. */
  syncOperations?: readonly Operation.Definition.Any[];
};

export const make = ({ syncOperations = [] }: CalendarSkillOptions = {}): Skill.Skill =>
  Skill.make({
    key: Calendar.SKILL_KEY,
    name: 'Calendar',
    tools: Skill.toolDefinitions({ operations: [...syncOperations], tools: [] }),
    instructions: Template.make({
      source: trim`
        You manage my calendar.
      `,
    }),
  });
