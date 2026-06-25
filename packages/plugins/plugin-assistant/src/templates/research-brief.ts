//
// Copyright 2026 DXOS.org
//

import { type RoutineCapabilities } from '@dxos/plugin-routine';

import { makeScheduledRoutine } from './scaffold';

/** The research skill drives the brief; web-search, markdown, and database tools support it. */
const SKILL_KEYS = [
  'org.dxos.skill.research',
  'org.dxos.skill.webSearch',
  'org.dxos.skill.markdown',
  'org.dxos.skill.database',
] as const;

/** Runs weekly by default; the user edits the schedule and the topic by opening the trigger and routine. */
const DEFAULT_CRON = '0 9 * * 1';

const DEFAULT_INSTRUCTIONS = `\
Research the topic below and write a concise brief to a new markdown document.

Topic: (replace with the topic you want tracked)

Gather current information with the web-search and research tools. Summarize the key developments, link the
sources you used, and create a markdown document titled with the topic and the current date.
`;

export const researchBrief: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.researchBrief',
  label: 'Research Brief',
  icon: 'ph--newspaper--regular',
  // Scheduled space-level research — not meaningful for a specific object companion.
  appliesTo: (subject) => subject == null,
  scaffold: ({ name }) =>
    makeScheduledRoutine({
      name: name ?? 'Research Brief',
      text: DEFAULT_INSTRUCTIONS,
      skillKeys: SKILL_KEYS,
      cron: DEFAULT_CRON,
    }),
};
