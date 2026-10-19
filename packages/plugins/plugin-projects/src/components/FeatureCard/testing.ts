//
// Copyright 2026 DXOS.org
//

import { type FeatureModel } from './feature.ts';

const feature = (props: Pick<FeatureModel, 'id' | 'name' | 'status'> & Partial<FeatureModel>): FeatureModel => ({
  specs: [],
  subfeatures: [],
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
    subfeatures: [
      { id: 'sync-gmail', name: 'Gmail', status: 'prototype' },
      { id: 'sync-imap', name: 'IMAP', status: 'planned' },
    ],
    tasks: [
      { id: 'task-1', title: 'Move sync to EDGE', done: false, milestone: 'M2' },
      { id: 'task-2', title: 'Incremental history fetch', done: false, milestone: 'M2' },
      { id: 'task-3', title: 'Initial Gmail import', done: true, milestone: 'M1' },
    ],
    showcases: [{ id: 'showcase-3', name: 'First sync of a Gmail inbox' }],
  }),
  feature({
    id: 'compose',
    name: 'Compose & send',
    status: 'operational',
    dependsOn: ['sync', 'tokens'],
    tasks: [{ id: 'task-4', title: 'Reply from the inbox', done: true, milestone: 'M1' }],
  }),
  feature({
    id: 'triage',
    name: 'Smart triage',
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
    status: 'in-progress',
    dependsOn: ['tasks'],
    tasks: [{ id: 'task-5', title: 'Feature card stories', done: false, milestone: 'M3' }],
  }),
  feature({
    id: 'delegate',
    name: 'Delegate a task to an agent',
    status: 'failing',
    dependsOn: ['tasks', 'sync'],
    tasks: [{ id: 'task-6', title: 'Agent identity on EDGE', done: false, milestone: 'M2' }],
    showcases: [{ id: 'showcase-5', name: 'Agent closes a task' }],
  }),
];
