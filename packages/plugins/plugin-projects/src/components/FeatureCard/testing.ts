//
// Copyright 2026 DXOS.org
//

import { type FeatureModel } from './feature.ts';

const feature = (props: Pick<FeatureModel, 'id' | 'name' | 'status'> & Partial<FeatureModel>): FeatureModel => ({
  active: props.tasks?.some((task) => task.active) ?? false,
  requirements: [],
  specs: [],
  subfeatures: [],
  code: [],
  dependsOn: [],
  tasks: [],
  showcases: [],
  ...props,
});

/**
 * A small cross-plugin map with one example of every status and signal: Compose & send is ahead of
 * Provider sync and has no showcase, Smart triage is blocked and unplanned, and Delegate to agent is failing.
 */
export const SAMPLE_FEATURES: FeatureModel[] = [
  feature({
    id: 'accounts',
    name: 'Accounts',
    status: 'operational',
    specs: ['packages/plugins/plugin-connector/PLUGIN.mdl#F-1'],
    showcases: [{ id: 'showcase-1', name: 'Connecting a Google account' }],
  }),
  feature({
    id: 'tokens',
    name: 'OAuth tokens',
    description: 'Sign-in grants are stored per account and refreshed before they expire.',
    status: 'operational',
    dependsOn: ['accounts'],
    specs: ['packages/plugins/plugin-connector/PLUGIN.mdl#F-2'],
    showcases: [{ id: 'showcase-2', name: 'Token refresh after expiry' }],
  }),
  feature({
    id: 'sync',
    name: 'Provider sync',
    description: 'Mail and calendars stay in step with the provider, in both directions.',
    status: 'prototype',
    dependsOn: ['tokens'],
    specs: ['packages/plugins/plugin-inbox/PLUGIN.mdl#F-3', 'packages/plugins/plugin-inbox/PLUGIN.mdl#F-6'],
    link: 'dxn:org.dxos.plugin.inbox.feature.providerSync',
    code: [
      {
        path: 'packages/plugins/plugin-inbox/src/sync/gmail-sync.test.ts',
        line: 24,
        kind: 'suite',
        symbol: 'Gmail sync',
      },
      {
        path: 'packages/plugins/plugin-inbox/src/sync/history.test.ts',
        line: 41,
        kind: 'test',
        symbol: 'fetches only the history since the last sync',
      },
      { path: 'packages/plugins/plugin-inbox/src/sync/analytics.ts', line: 12, kind: 'code', symbol: 'trackSyncRun' },
    ],
    requirements: [
      {
        id: 'F-3.1',
        text: 'A message received by the provider appears in the inbox within a minute, with no refresh.',
      },
      { id: 'F-3.2', text: 'Archiving, labelling or deleting in Composer is mirrored to the provider.' },
      { id: 'F-3.3', text: 'A sync fetches only the history since the last one.' },
    ],
    subfeatures: [
      { id: 'sync-gmail', name: 'Gmail', status: 'prototype' },
      { id: 'sync-imap', name: 'IMAP', status: 'planned' },
    ],
    tasks: [
      { id: 'task-1', title: 'Move sync to EDGE', done: false, active: true, milestone: 'M2' },
      { id: 'task-2', title: 'Incremental history fetch', done: false, active: false, milestone: 'M2' },
      { id: 'task-3', title: 'Initial Gmail import', done: true, active: false, milestone: 'M1' },
    ],
    showcases: [{ id: 'showcase-3', name: 'First sync of a Gmail inbox' }],
  }),
  feature({
    id: 'compose',
    name: 'Compose & send',
    status: 'operational',
    dependsOn: ['sync', 'tokens'],
    tasks: [{ id: 'task-4', title: 'Reply from the inbox', done: true, active: false, milestone: 'M1' }],
  }),
  feature({
    id: 'triage',
    name: 'Smart triage',
    description: 'Incoming mail is sorted by what needs a reply, what can wait and what is noise.',
    status: 'planned',
    dependsOn: ['delegate', 'feature-map'],
  }),
  feature({
    id: 'tasks',
    name: 'Tasks and milestones',
    status: 'operational',
    showcases: [{ id: 'showcase-4', name: 'Planning a release' }],
  }),
  feature({
    id: 'feature-map',
    name: 'Feature map',
    description:
      'Anyone can learn the scope of an unfamiliar product by moving through its features, from the whole down to each requirement.',
    status: 'prototype',
    dependsOn: ['tasks'],
    tasks: [{ id: 'task-5', title: 'Feature card stories', done: false, active: true, milestone: 'M3' }],
  }),
  feature({
    id: 'delegate',
    name: 'Delegate a task to an agent',
    description: 'An agent takes a task, does the work in its own identity and closes it with a summary.',
    status: 'failing',
    dependsOn: ['tasks', 'sync'],
    tasks: [{ id: 'task-6', title: 'Agent identity on EDGE', done: false, active: true, milestone: 'M2' }],
    showcases: [{ id: 'showcase-5', name: 'Agent closes a task' }],
  }),
];

/**
 * Three ranks of a workspace app whose id order crosses most dependencies, so a layout that orders each rank by id
 * draws tangled arrows and one that minimises crossings does visibly better.
 */
export const LAYERED_FEATURES: FeatureModel[] = [
  feature({ id: 'app-search', name: 'Search', status: 'prototype', dependsOn: ['svc-presence', 'svc-editor'] }),
  feature({ id: 'app-calendar', name: 'Calendar', status: 'planned', dependsOn: ['svc-sync'] }),
  feature({ id: 'app-chat', name: 'Chat', status: 'operational', dependsOn: ['svc-index', 'svc-presence'] }),
  feature({ id: 'app-notes', name: 'Notes', status: 'operational', dependsOn: ['svc-index'] }),
  feature({ id: 'svc-index', name: 'Full-text index', status: 'operational', dependsOn: ['core-identity'] }),
  feature({ id: 'svc-sync', name: 'Sync', status: 'prototype', dependsOn: ['core-storage', 'core-network'] }),
  feature({ id: 'svc-presence', name: 'Presence', status: 'planned', dependsOn: ['core-identity', 'core-network'] }),
  feature({ id: 'svc-editor', name: 'Collaborative editor', status: 'prototype', dependsOn: ['core-storage'] }),
  feature({ id: 'core-storage', name: 'Storage', status: 'operational' }),
  feature({ id: 'core-network', name: 'Network', status: 'operational' }),
  feature({ id: 'core-identity', name: 'Identity', status: 'failing' }),
];
