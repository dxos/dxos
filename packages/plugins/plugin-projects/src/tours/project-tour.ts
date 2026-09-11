//
// Copyright 2026 DXOS.org
//

import type * as Tour from '@dxos/plugin-support/Tour';

/**
 * Puts the article in the tab a step is about before it shows.
 *
 * Driven through the tab control rather than through state: the article holds `tab` in local React
 * state, so there is nothing an operation or a capability can address. Clicking the same `data-testid`
 * the step targets is what a reader would do, and it keeps the whole arrangement inside this file.
 */
const showTab =
  (tab: 'overview' | 'tasks'): Tour.Step['before'] =>
  () => {
    document.querySelector<HTMLElement>(`[data-testid="projectsPlugin.tab.${tab}"]`)?.click();
  };

/**
 * Walks what a project is made of, switching tabs as it goes.
 *
 * Every target is chrome the article always renders. The outline, the standing context and the
 * milestone list are all conditional on content a new project does not have yet, and a step whose
 * target never appears does not fail loudly — it ends the tour early.
 */
export const steps: Tour.Step[] = [
  {
    before: showTab('overview'),
    target: '[data-testid="projectsPlugin.tab.overview"]',
    title: 'Overview',
    description: 'The brief, the standing context every session reads, and the notes work is drafted in.',
    placement: 'bottom',
  },
  {
    before: showTab('overview'),
    target: '[data-testid="projectsPlugin.artifacts"]',
    title: 'Artifacts',
    description: 'What the project produces. Documents, tables and the rest are filed here as they are made.',
    placement: 'top',
  },
  {
    before: showTab('tasks'),
    target: '[data-testid="projectsPlugin.tab.tasks"]',
    title: 'Tasks',
    description: 'The ledger, grouped into milestones. Tick rows to arm the actions beside this tab.',
    placement: 'bottom',
  },
  {
    before: showTab('tasks'),
    target: '[data-testid="projectsPlugin.delegateTasks"]',
    title: 'Hand work to an agent',
    description: 'Ticked tasks go to one agent session, in the order they are listed.',
    placement: 'bottom',
  },
  {
    target: '[data-testid="projectsPlugin.createChat"]',
    title: 'Sessions',
    description: 'Start a session against the project. It reads the brief and files what it makes under Artifacts.',
    placement: 'bottom',
  },
];

export default steps;
