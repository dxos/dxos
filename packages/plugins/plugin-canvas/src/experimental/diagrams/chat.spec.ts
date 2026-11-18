//
// Copyright 2026 DXOS.org
//

//
// The Chat slide: what one agent is made of, boxed as the agent, with the skill it draws on at the left and the model
// that runs it at the right.
//

import { type SlideSpec } from './spec.ts';

const card = (id: string, label: string, icon: string) => ({ id, label, icon });

export const CHAT: SlideSpec = {
  id: 'chat',
  title: 'Chat',
  groups: [
    {
      id: 'agent',
      box: true,
      columns: [
        [card('skill', 'Skill', 'graduation-cap')],
        [
          card('operator', 'Operator', 'user'),
          card('feed', 'Feed', 'queue'),
          card('session', 'Session', 'play-circle'),
          card('tool', 'Tool', 'wrench'),
          card('artifact', 'Artifact', 'cube'),
        ],
        [card('model', 'Model', 'cpu')],
      ],
    },
  ],
  edges: [
    { from: 'operator', to: 'feed', label: 'writes' },
    { from: 'operator', to: 'skill' },
    { from: 'operator', to: 'model' },
    { from: 'session', to: 'feed', label: 'writes' },
    { from: 'session', to: 'model', label: 'run by' },
    { from: 'session', to: 'tool', label: 'uses' },
    { from: 'skill', to: 'tool', label: 'defines' },
    { from: 'tool', to: 'artifact', label: 'makes' },
  ],
};
