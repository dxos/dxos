//
// Copyright 2026 DXOS.org
//

//
// Conversations (F-5.6), ported from echo3d's chatter: tiny message threads popping up beside bound objects, at most
// one per object, each turn arriving in order and the thread fading out after its last. An `overlay` effect: it names
// the object it hangs from and the animator places it through the stage's projection.
//

export const CONVERSATIONS_SOURCE = `
import { defineEffect, ramp } from '@dxos/plugin-animator/effect';

const PEOPLE = [
  ['Ana', '#5b8def'],
  ['Ben', '#2fbf71'],
  ['Kai', '#e57bd1'],
  ['Mia', '#f2c230'],
  ['Raj', '#ff8a3d'],
  ['Agent', '#8fbfbf'],
];

const CONVERSATIONS = [
  ['Can you summarise this?', 'Three points, linked below.', 'Perfect, thanks.'],
  ['Who owns this?', 'Ops, since Monday.'],
  ['Draft is ready.', 'Reviewing now.', 'Two small fixes.'],
  ['Any blockers?', 'Waiting on Auth.', 'Flag it on the roadmap.'],
  ['Merge the duplicates?', 'Done: four into one.'],
  ['Add the transcript.', 'Attached and indexed.'],
];

const pick = (random, list) => list[Math.floor(random() * list.length)];

const turnOf = (params) => params.turn ?? 0.7;

export default defineEffect({
  init: (ctx) => ({ next: ctx.params.delay ?? 0, threads: [] }),
  step: (state, ctx) => {
    const params = ctx.params;
    const turn = turnOf(params);
    const conversations = params.conversations ?? CONVERSATIONS;
    const people = params.people ?? PEOPLE;
    state.threads = state.threads.filter((thread) => ctx.t - thread.born < thread.life);
    const visible = (ctx.bound.objects ?? []).filter((object) => object.opacity > 0.05);
    const free = visible.filter((object) => !state.threads.some((thread) => thread.object === object.id));
    if (free.length > 0 && state.threads.length < (params.max ?? 4) && ctx.t >= state.next) {
      state.next = ctx.t + (ctx.random() * 2) / (params.rate ?? 1.5);
      // Two speakers take turns: a person, then a colleague or an agent.
      const first = pick(ctx.random, people.slice(0, -1));
      const second = ctx.random() < 0.5 ? people[people.length - 1] : pick(ctx.random, people.slice(0, -1));
      const lines = pick(ctx.random, conversations);
      const object = pick(ctx.random, free).id;
      state.threads.push({
        object,
        born: ctx.t,
        life: lines.length * turn + (params.linger ?? 1.6),
        messages: lines.map((text, index) => {
          const [who, color] = index % 2 === 0 ? first : second;
          return { who, color, text };
        }),
      });
    }
    return state;
  },
  draw: (state, ctx) => {
    const turn = turnOf(ctx.params);
    const objects = Object.values(ctx.objects);
    const middle = objects.reduce((sum, object) => sum + object.position.x, 0) / Math.max(1, objects.length);
    return state.threads.flatMap((thread) => {
      const object = ctx.objects[thread.object];
      if (!object) {
        return [];
      }
      const age = ctx.t - thread.born;
      // Hangs outward: to the left of an object left of the middle, right-aligned there.
      const left = object.position.x < middle;
      return [
        {
          kind: 'thread',
          id: thread.object + '@' + thread.born.toFixed(4),
          anchor: { target: thread.object, angle: left ? Math.PI : 0, gap: 6 },
          align: left ? 'start' : 'end',
          opacity: Math.min(1, (1 - age / thread.life) * 3) * object.opacity,
          messages: thread.messages.map((message, index) => ({
            ...message,
            opacity: ramp(age - index * turn, 0.2),
          })),
        },
      ];
    });
  },
});
`;

export const CONVERSATIONS_PARAMS = {
  type: 'object',
  properties: {
    objects: {
      'type': 'array',
      'items': { type: 'string' },
      'x-binding': 'object',
      'description': 'Objects to talk beside.',
    },
    rate: { type: 'number', default: 1.5, description: 'Threads started per second, on average.' },
    max: { type: 'number', default: 4, description: 'Most threads at once.' },
    turn: { type: 'number', default: 0.7, description: 'Seconds between turns.' },
    linger: { type: 'number', default: 1.6, description: 'Seconds a thread stays after its last turn.' },
    delay: { type: 'number', default: 0, description: 'Seconds before the first thread.' },
    conversations: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
    people: { type: 'array', description: '[name, colour] pairs; the last is the agent.' },
  },
};
