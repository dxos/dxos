//
// Copyright 2026 DXOS.org
//

import { type TriageModel } from '@dxos/plugin-projects/testing';
import { Message } from '@dxos/types';

/**
 * Recorded messages from the DXOS Discord #general channel, as `plugin-discord` syncs them
 * (`src/__fixtures__/discord-messages.json`), reduced to what triage reads.
 */
export const GENERAL_CHANNEL: readonly { name: string; created: string; text: string }[] = [
  {
    name: 'Tim',
    created: '2025-07-10T04:46:22.953Z',
    text: "A month or two ago we (BlueYard) were given a whirlwind tour of all the DXOS composer features and they all looked so amazing. But now that I'm building something with it I'm not sure where to start. Do you have videos on interesting things to build to get started? Would be great to take that demo you gave us and cut it up into small 5 min videos on each piece and how to implement it.",
  },
  {
    name: 'omdesign',
    created: '2025-08-04T01:07:49.000Z',
    text: "Hi DXOS Team! I'm so grateful to you and I want to introduce what I think is Web 3.5 embodied. DXOS + Nextgraph + Overlays Capture Architecture https://omdesign.is/has-needs-white-paper",
  },
  {
    name: 'omdesign',
    created: '2025-08-04T15:51:12.000Z',
    text: "I'll jump in call room in case anyone want's to ask a question.",
  },
  {
    name: 'Justice',
    created: '2025-08-23T06:24:31.000Z',
    text: "Have y'all heard of [hash.ai](https://hash.ai/)?  I think it's so very fascinating how many different people are converging on the same ideas, but from all sorts of different directions",
  },
  {
    name: '💔⏰🤔🫶❓🍆',
    created: '2025-09-25T21:48:05.000Z',
    text: 'hi guys is there a guide on how we can customize the storage',
  },
  { name: 'nandi', created: '2026-04-12T01:41:20.000Z', text: '👋 hello' },
  { name: 'xi', created: '2026-05-23T18:19:44.000Z', text: 'hiya!' },
  { name: 'Maximt_698', created: '2026-05-26T15:46:09.000Z', text: 'hello world!' },
];

export const toMessage = ({ name, created, text }: (typeof GENERAL_CHANNEL)[number]) =>
  Message.make({ created, sender: { role: 'user', name }, blocks: [{ _tag: 'text', text }] });

/**
 * What a model would answer for the messages that need anything, so the story runs offline. The replies
 * promise nothing the team has not said: each is a draft a person reviews before it is posted.
 */
export const TRIAGE_SCRIPT: TriageModel.Script = [
  {
    match: 'Do you have videos on interesting things to build',
    result: {
      reply:
        "Thanks Tim, glad the tour landed! We don't have short how-to videos yet, and cutting the demo into five-minute pieces is a great idea. What are you building? We'll follow up with the best place to start.",
      tasks: [
        {
          kind: 'docs',
          title: 'Record five-minute videos on building with Composer',
          description: 'One short video per feature from the BlueYard tour, each showing how to implement it.',
        },
        { kind: 'action', title: 'Ask Tim what he is building and suggest a starting point' },
      ],
    },
  },
  {
    match: 'has-needs-white-paper',
    result: {
      tasks: [{ kind: 'action', title: 'Read the Has-Needs white paper omdesign shared and reply' }],
    },
  },
  {
    match: 'customize the storage',
    result: {
      reply:
        "There isn't a guide for that yet. Could you say a bit more about what you'd like to change? The team will follow up with pointers.",
      tasks: [{ kind: 'docs', title: 'Write a guide to customizing storage' }],
    },
  },
];
