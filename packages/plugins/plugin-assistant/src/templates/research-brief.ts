//
// Copyright 2026 DXOS.org
//

import { type AutomationCapabilities } from '@dxos/plugin-automation';

import { makeScheduledRoutineAutomation } from './scaffold';

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

export const researchBrief: AutomationCapabilities.Template = {
  id: 'org.dxos.automation.researchBrief',
  label: 'Research Brief',
  icon: 'ph--newspaper--regular',
  scaffold: ({ name }) =>
    makeScheduledRoutineAutomation({
      name: name ?? 'Research Brief',
      instructions: DEFAULT_INSTRUCTIONS,
      skillKeys: SKILL_KEYS,
      cron: DEFAULT_CRON,
    }),
};
