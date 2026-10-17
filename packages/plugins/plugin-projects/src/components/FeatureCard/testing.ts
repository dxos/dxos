//
// Copyright 2026 DXOS.org
//

import { type FeatureModel } from './feature.ts';

const CONNECTOR = { specKey: 'org.dxos.plugin.connector', specName: 'Connector' };
const INBOX = { specKey: 'org.dxos.plugin.inbox', specName: 'Inbox' };
const PROJECTS = { specKey: 'org.dxos.plugin.projects', specName: 'Projects' };
const PRODUCT = { specKey: 'org.dxos.product.composer', specName: 'Composer' };

/**
 * A small cross-plugin map with one example of every signal: Compose & send is ahead of Provider
 * sync and untested, Smart triage is blocked and unplanned, and Delegate to agent names a feature
 * that does not exist.
 */
export const SAMPLE_FEATURES: FeatureModel[] = [
  {
    ...CONNECTOR,
    id: 'org.dxos.plugin.connector#F-1',
    key: 'F-1',
    name: 'Accounts',
    stage: 'stable',
    dependsOn: [],
    requirements: [
      { key: 'F-1.1', text: 'An account is created once per provider identity.', covered: true },
      { key: 'F-1.2', text: 'Removing an account revokes its tokens.', covered: true },
    ],
    tasks: [],
  },
  {
    ...CONNECTOR,
    id: 'org.dxos.plugin.connector#F-2',
    key: 'F-2',
    name: 'OAuth tokens',
    stage: 'stable',
    dependsOn: ['org.dxos.plugin.connector#F-1'],
    requirements: [{ key: 'F-2.1', text: 'Tokens refresh before they expire.', covered: true }],
    tasks: [],
  },
  {
    ...INBOX,
    id: 'org.dxos.plugin.inbox#F-1',
    key: 'F-1',
    name: 'Mailbox',
    description: 'Messages sync into an append-only feed; the article lists them paged and thread-grouped.',
    stage: 'stable',
    dependsOn: ['org.dxos.plugin.connector#F-1'],
    requirements: [
      { key: 'F-1.1', text: 'Messages sync into an append-only feed, newest first.', covered: true },
      { key: 'F-1.2', text: 'Tags, stars and read state live in the TagIndex sidecar.', covered: true },
      { key: 'F-1.3', text: 'System-tag folders are filter nodes over the mailbox.', covered: false },
    ],
    tasks: [{ id: 'task-1', title: 'Saved filters in the nav tree', done: true, milestone: 'M1' }],
  },
  {
    ...INBOX,
    id: 'org.dxos.plugin.inbox#F-3',
    key: 'F-3',
    name: 'Provider sync',
    description: 'Sync is idempotent, resumable, capped per run and cancellable.',
    stage: 'preview',
    dependsOn: ['org.dxos.plugin.inbox#F-1', 'org.dxos.plugin.connector#F-2'],
    requirements: [
      { key: 'F-3.1', text: 'Sync is idempotent, resumable, capped per run, and cancellable.', covered: true },
      { key: 'F-3.2', text: 'A provider is a MailSyncProvider layer.', covered: false },
      { key: 'F-3.3', text: 'Sync runs on EDGE on a 10-minute cron when enabled.', covered: false },
    ],
    tasks: [
      { id: 'task-2', title: 'Move sync to the EDGE cron', done: false, milestone: 'M2' },
      { id: 'task-3', title: 'JMAP provider layer', done: false, milestone: 'M2' },
      { id: 'task-4', title: 'Cap messages per run', done: true, milestone: 'M1' },
    ],
  },
  {
    ...INBOX,
    id: 'org.dxos.plugin.inbox#F-4',
    key: 'F-4',
    name: 'Compose & send',
    stage: 'stable',
    dependsOn: ['org.dxos.plugin.inbox#F-1', 'org.dxos.plugin.inbox#F-3'],
    requirements: [
      { key: 'F-4.1', text: 'Drafts are local DraftMessages scoped to the mailbox.', covered: false },
      { key: 'F-4.2', text: 'AI reply drafting is grounded on the thread.', covered: false },
    ],
    tasks: [],
  },
  {
    ...INBOX,
    id: 'org.dxos.plugin.inbox#F-9',
    key: 'F-9',
    name: 'Smart triage',
    stage: 'planned',
    dependsOn: ['org.dxos.plugin.projects#F-5'],
    requirements: [{ key: 'F-9.1', text: 'Messages that need a reply become tasks.', covered: false }],
    tasks: [],
  },
  {
    ...PROJECTS,
    id: 'org.dxos.plugin.projects#F-1',
    key: 'F-1',
    name: 'Tasks and milestones',
    stage: 'stable',
    dependsOn: [],
    requirements: [
      { key: 'F-1.1', text: 'A task set enumerates its root tasks in order.', covered: true },
      { key: 'F-1.2', text: 'Milestone progress is derived from its tasks.', covered: true },
    ],
    tasks: [],
  },
  {
    ...PROJECTS,
    id: 'org.dxos.plugin.projects#F-5',
    key: 'F-5',
    name: 'Feature map',
    stage: 'planned',
    dependsOn: ['org.dxos.plugin.projects#F-1'],
    requirements: [{ key: 'F-5.1', text: 'Tasks link to the features they implement.', covered: false }],
    tasks: [{ id: 'task-5', title: 'Feature card stories', done: false, milestone: 'M3' }],
  },
  {
    ...PRODUCT,
    id: 'org.dxos.product.composer#F-1',
    key: 'F-1',
    name: 'Delegate a task to an agent',
    stage: 'preview',
    dependsOn: ['org.dxos.plugin.projects#F-1', 'org.dxos.plugin.inbox#F-3', 'org.dxos.plugin.agent#F-2'],
    requirements: [{ key: 'F-1.1', text: 'A delegated task reports back to its project.', covered: true }],
    tasks: [{ id: 'task-6', title: 'Agent identity on EDGE', done: false, milestone: 'M2' }],
  },
];
