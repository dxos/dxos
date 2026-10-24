//
// Copyright 2026 DXOS.org
//

import { type ActorFlow } from '../../testing/actors/index.ts';

/**
 * Four people on one new document: two write their own sections, stopping between sentences; one copy
 * edits the typos they leave; one reads along, highlighting phrases and opening comment threads.
 */
export const markdownFlow: ActorFlow = {
  actors: [
    { name: 'Ada', hue: 'blue', role: 'Writing the overview' },
    { name: 'Ben', hue: 'amber', role: 'Writing the timeline' },
    { name: 'Cleo', hue: 'emerald', role: 'Copy editing' },
    { name: 'Dev', hue: 'rose', role: 'Reviewing', companions: ['comments'] },
  ],
  document: {
    name: 'Launch notes',
    content: '# Launch notes\n\n## Overview\n\n\n\n## Timeline\n\n',
  },
  duration: 27_000,
  steps: [
    {
      actor: 0,
      name: 'Overview',
      run: async ({ actor }) => {
        await actor.pause(800);
        await actor.moveTo({ after: '## Overview\n\n' });
        await actor.type('Composer 1.0 brings real-time collaboration to every document in a space. ');
        await actor.pause(1_400);
        await actor.type('Teams can write, review and coment together without leaving teh editor. ');
        await actor.pause(1_100);
        await actor.type('Every change syncs peer to peer, so work continues offline and merges when you reconnect.');
      },
    },
    {
      actor: 1,
      name: 'Timeline',
      run: async ({ actor }) => {
        await actor.pause(2_500);
        await actor.moveTo({ end: true });
        await actor.type('The private beta opens on 4 November for existing spaces. ');
        await actor.pause(1_800);
        await actor.type('Public launch follows two weeks later, once we recieve feedback from the beta. ');
        await actor.pause(900);
        await actor.type('Mobile apps ship in the same release.');
      },
    },
    {
      actor: 2,
      name: 'Corrections',
      run: async ({ actor }) => {
        await actor.pause(9_000);
        await actor.waitFor('coment together');
        await actor.replace('coment', 'comment');
        await actor.waitFor('teh editor');
        await actor.pause(600);
        await actor.replace('teh editor', 'the editor');
        await actor.waitFor('recieve');
        await actor.pause(1_000);
        await actor.replace('recieve', 'receive');
        await actor.waitFor('two weeks later');
        await actor.pause(800);
        await actor.replace('two weeks later', 'a fortnight later');
      },
    },
    {
      actor: 3,
      name: 'Review',
      run: async ({ actor }) => {
        await actor.pause(12_000);
        await actor.waitFor('private beta');
        await actor.comment('private beta', 'Which spaces are in the first cohort?');
        await actor.pause(2_500);
        await actor.waitFor('peer to peer');
        await actor.comment('peer to peer', 'A diagram would help here.');
        await actor.pause(2_000);
        await actor.waitFor('Mobile apps');
        await actor.comment('Mobile apps', 'Is this still on track?');
      },
    },
  ],
};
