//
// Copyright 2026 DXOS.org
//

import { type RoutineCapabilities } from '@dxos/plugin-routine';

import { makeScheduledRoutine } from './scaffold';

/** Inbox supplies new messages; database queries recent objects; markdown writes the digest document. */
const SKILL_KEYS = ['org.dxos.skill.inbox', 'org.dxos.skill.database', 'org.dxos.skill.markdown'] as const;

/** Runs daily by default; the user edits the schedule and the scope by opening the trigger and routine. */
const DEFAULT_CRON = '0 9 * * *';

const DEFAULT_INSTRUCTIONS = `\
Summarize recent activity in this space into a markdown document.

Review new messages in the inbox and recently changed objects. Produce a short digest grouped by theme,
highlight anything that needs attention, and write it to a markdown document titled with the current date.
`;

export const dailyDigest: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.dailyDigest',
  label: 'Daily Digest',
  icon: 'ph--list-bullets--regular',
  scaffold: ({ name }) =>
    makeScheduledRoutine({
      name: name ?? 'Daily Digest',
      text: DEFAULT_INSTRUCTIONS,
      skillKeys: SKILL_KEYS,
      cron: DEFAULT_CRON,
    }),
};
