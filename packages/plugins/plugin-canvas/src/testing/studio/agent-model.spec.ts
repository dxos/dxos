//
// Copyright 2026 DXOS.org
//

//
// The Agent slide: what an agent is made of, as a grid — three columns crossed by the three layers it works through,
// from what a person asks for down to what the agent knows.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string) => ({ id, label, icon });

export const AGENT: SlideSpec = {
  id: 'agent',
  title: 'Agent',
  bands: [
    {
      id: 'layer-ui',
      label: 'UI / Control',
      box: true,
      columns: [
        [card('goal', 'Goal', 'target'), card('project', 'Project', 'folder')],
        [],
        [card('outcome', 'Outcome', 'trophy'), card('task', 'Task', 'check-square')],
      ],
    },
    {
      id: 'layer-activity',
      label: 'Activity',
      box: true,
      columns: [
        [card('feed', 'Feed', 'queue'), card('scheduler', 'Scheduler', 'alarm')],
        [card('session', 'Session', 'play-circle'), card('tool', 'Tool', 'wrench')],
        [card('model', 'Model', 'cpu'), card('plan', 'Plan', 'list-numbers')],
      ],
    },
    {
      id: 'layer-knowledge',
      label: 'Knowledge',
      box: true,
      columns: [
        [card('memory', 'Memory', 'brain'), card('schema', 'Schema', 'brackets-curly')],
        [card('graph', 'Graph', 'graph'), card('artifact', 'Artifact', 'cube')],
        [card('skill', 'Skill', 'graduation-cap'), card('spec', 'Specification', 'clipboard-text')],
      ],
    },
  ],
  edges: [
    { from: 'project', to: 'goal', label: 'serves' },
    { from: 'outcome', to: 'goal', label: 'achieves' },
    { from: 'task', to: 'project', label: 'in' },
    { from: 'task', to: 'outcome', label: 'produces' },
    { from: 'task', to: 'spec', label: 'implements' },
    { from: 'plan', to: 'spec', label: 'follows' },
    { from: 'session', to: 'task', label: 'works on' },
    { from: 'session', to: 'model', label: 'run by' },
    { from: 'session', to: 'tool', label: 'uses' },
    { from: 'session', to: 'feed', label: 'writes' },
    { from: 'scheduler', to: 'session', label: 'starts' },
    { from: 'scheduler', to: 'feed', label: 'watches' },
    { from: 'feed', to: 'graph', label: 'updates' },
    { from: 'memory', to: 'feed', label: 'learns from' },
    { from: 'memory', to: 'graph', label: 'part of' },
    { from: 'tool', to: 'graph', label: 'acts on' },
    { from: 'tool', to: 'artifact', label: 'makes' },
    { from: 'skill', to: 'tool', label: 'defines' },
    { from: 'graph', to: 'schema', label: 'typed by' },
    { from: 'artifact', to: 'graph', label: 'stored in' },
  ],
};
