//
// Copyright 2026 DXOS.org
//

import { type ActorFlow, seedDocument } from '../actors/index.ts';

/**
 * Four people on one new document. Ada and Ben write their own sections, starting and stopping seconds apart so
 * their typing overlaps only in part; Cleo copy edits the typos they leave; Dev reads along, highlighting phrases and
 * opening comment threads, which Ben answers once his section is done.
 */
export const markdownFlow: ActorFlow<void> = {
  actors: [
    { name: 'Ada', hue: 'blue', role: 'Writing the overview' },
    { name: 'Ben', hue: 'amber', role: 'Writing the timeline', companions: ['comments'] },
    { name: 'Cleo', hue: 'emerald', role: 'Copy editing' },
    { name: 'Dev', hue: 'rose', role: 'Reviewing', companions: ['comments'] },
  ],
  document: { name: 'Launch notes' },
  seed: seedDocument({ name: 'Launch notes', content: '# Launch notes\n\n## Overview\n\n\n\n## Timeline\n\n' }),
  duration: 46_000,
  steps: [
    {
      actor: 0,
      name: 'Overview',
      run: async ({ actor }) => {
        await actor.pause(1_000);
        await actor.moveTo({ after: '## Overview\n\n' });
        await actor.type('Composer 1.0 brings real-time collaboration to every document in a space. ');
        await actor.pause(4_500);
        await actor.type('Teams can write, review and coment together without leaving teh editor. ');
        await actor.pause(3_000);
        await actor.type('Every change syncs peer to peer, so work continues offline and merges when you reconnect.');
      },
    },
    {
      actor: 1,
      name: 'Timeline',
      run: async ({ actor }) => {
        await actor.pause(6_500);
        await actor.moveTo({ end: true });
        await actor.type('The private beta opens on 4 November for existing spaces. ');
        await actor.pause(5_000);
        await actor.type('Public launch follows two weeks later, once we recieve feedback from the beta. ');
        await actor.pause(2_000);
        await actor.type('Mobile apps ship in the same release.');
      },
    },
    {
      actor: 1,
      name: 'Answers',
      run: async ({ actor }) => {
        await actor.pause(2_500);
        await actor.reply('private beta', 'Design partners first, then every team on the waitlist.');
        await actor.pause(4_000);
        await actor.reply('Mobile apps', 'Yes: iOS is in review and Android follows the same week.');
      },
    },
    {
      actor: 2,
      name: 'Corrections',
      run: async ({ actor }) => {
        await actor.pause(16_000);
        await actor.waitFor('coment together');
        await actor.replace('coment', 'comment');
        await actor.waitFor('teh editor');
        await actor.pause(2_500);
        await actor.replace('teh editor', 'the editor');
        await actor.waitFor('recieve');
        await actor.pause(3_000);
        await actor.replace('recieve', 'receive');
        await actor.waitFor('two weeks later');
        await actor.pause(2_000);
        await actor.replace('two weeks later', 'a fortnight later');
      },
    },
    {
      actor: 3,
      name: 'Review',
      run: async ({ actor }) => {
        await actor.pause(18_000);
        await actor.waitFor('private beta');
        await actor.comment('private beta', 'Which spaces are in the first cohort?');
        await actor.pause(5_000);
        await actor.waitFor('peer to peer');
        await actor.comment('peer to peer', 'A diagram would help here.');
        await actor.pause(4_000);
        await actor.waitFor('Mobile apps');
        await actor.comment('Mobile apps', 'Is this still on track?');
      },
    },
  ],
};
