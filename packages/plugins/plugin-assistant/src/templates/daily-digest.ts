//
// Copyright 2026 DXOS.org
//

import { type AutomationCapabilities } from '@dxos/plugin-automation';

import { makeScheduledRoutineAutomation } from './scaffold';

/** Inbox supplies new messages; database queries recent objects; markdown writes the digest document. */
const BLUEPRINT_KEYS = [
  'org.dxos.blueprint.inbox',
  'org.dxos.blueprint.database',
  'org.dxos.blueprint.markdown',
] as const;

/** Runs daily by default; the user edits the schedule and the scope by opening the trigger and routine. */
const DEFAULT_CRON = '0 9 * * *';

const DEFAULT_INSTRUCTIONS = `\
Summarize recent activity in this space into a markdown document.

Review new messages in the inbox and recently changed objects. Produce a short digest grouped by theme,
highlight anything that needs attention, and write it to a markdown document titled with the current date.
`;

export const dailyDigest: AutomationCapabilities.Template = {
  id: 'org.dxos.automation.dailyDigest',
  label: 'Daily Digest',
  icon: 'ph--list-bullets--regular',
  scaffold: ({ name }) =>
    makeScheduledRoutineAutomation({
      name: name ?? 'Daily Digest',
      instructions: DEFAULT_INSTRUCTIONS,
      blueprintKeys: BLUEPRINT_KEYS,
      cron: DEFAULT_CRON,
    }),
};
