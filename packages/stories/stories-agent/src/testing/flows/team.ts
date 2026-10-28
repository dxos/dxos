//
// Copyright 2026 DXOS.org
//

import { type ActorFlow, type ActorSpec, type ActorStep, seedDocument } from '../actors/index.ts';

type Section = {
  heading: string;
  /** Index of the actor who writes it, and answers comments on it. */
  writer: number;
  /** When the writer starts, in ms. */
  start: number;
  /** Each sentence, typed with a pause after it; typos are fixed by the editors. */
  sentences: string[];
  /** Pauses after each sentence but the last, in ms. */
  pauses: number[];
};

/**
 * Eight sections of a launch plan, each written by its own actor. Writers start and stop at different times, so
 * typing overlaps only in part; the actor in column 2, row 3 (index 9) starts first, as the shot opens on them.
 */
const SECTIONS: Section[] = [
  {
    heading: 'Overview',
    writer: 0,
    start: 4_000,
    sentences: [
      'Composer 1.0 brings real-time collaboration to every document in a space. ',
      'Teams write, review and coment together without leaving the editor.',
    ],
    pauses: [3_500],
  },
  {
    heading: 'Goals',
    writer: 2,
    start: 9_000,
    sentences: ['Reach ten thousand weekly active teams by the end of the quarter. ', 'Keep churn under two percnt.'],
    pauses: [2_500],
  },
  {
    heading: 'Audience',
    writer: 5,
    start: 6_500,
    sentences: [
      'Product teams who already plan in documents and boards. ',
      'Agencies that share work with their clients every day.',
    ],
    pauses: [4_000],
  },
  {
    heading: 'Pricing',
    writer: 9,
    start: 800,
    sentences: [
      'The free plan covers three spaces and unlimited documents. ',
      'Teams pay twelve dollars per seat each month, billed anualy. ',
      'Every plan includes offline sync.',
    ],
    pauses: [2_500, 2_000],
  },
  {
    heading: 'Timeline',
    writer: 10,
    start: 12_000,
    sentences: [
      'The private beta opens on 4 November for existing spaces. ',
      'Public launch follows two weeks later, once we recieve feedback.',
    ],
    pauses: [3_000],
  },
  {
    heading: 'Marketing',
    writer: 13,
    start: 15_000,
    sentences: ['A launch video and a live demo on launch day. ', 'Partners post their own stories the same weak.'],
    pauses: [2_000],
  },
  {
    heading: 'Support',
    writer: 7,
    start: 18_000,
    sentences: ['Office hours twice a week during the beta. ', 'A shared channel for every design partner.'],
    pauses: [3_500],
  },
  {
    heading: 'Risks',
    writer: 15,
    start: 21_000,
    sentences: ['Sync conflicts on very large documents. ', 'Onboarding that asks for too much before the first edit.'],
    pauses: [2_500],
  },
];

const ACTORS: ActorSpec[] = [
  { name: 'Ada', hue: 'blue' },
  { name: 'Ben', hue: 'amber' },
  { name: 'Cleo', hue: 'emerald' },
  { name: 'Dev', hue: 'rose', companions: ['comments'] },
  { name: 'Eve', hue: 'violet', companions: ['comments'] },
  { name: 'Finn', hue: 'orange' },
  { name: 'Gia', hue: 'teal' },
  { name: 'Hugo', hue: 'indigo' },
  { name: 'Iris', hue: 'pink' },
  { name: 'Jon', hue: 'lime' },
  { name: 'Kai', hue: 'cyan' },
  { name: 'Lena', hue: 'red', companions: ['comments'] },
  { name: 'Milo', hue: 'purple', companions: ['comments'] },
  { name: 'Nia', hue: 'sky' },
  { name: 'Omar', hue: 'yellow' },
  { name: 'Pia', hue: 'fuchsia' },
];

/** Copy editors: who fixes which typo, and when they start looking. */
const CORRECTIONS: { editor: number; start: number; fixes: [string, string][] }[] = [
  { editor: 1, start: 14_000, fixes: [['coment', 'comment']] },
  { editor: 6, start: 17_000, fixes: [['percnt', 'percent']] },
  { editor: 8, start: 11_000, fixes: [['anualy', 'annually']] },
  {
    editor: 14,
    start: 22_000,
    fixes: [
      ['recieve', 'receive'],
      ['same weak', 'same week'],
    ],
  },
];

/** Reviewers: the phrases they comment on, and the writer's answer (if any). */
const REVIEWS: { reviewer: number; start: number; comments: { phrase: string; text: string; answer?: string }[] }[] = [
  {
    reviewer: 3,
    start: 13_000,
    comments: [
      {
        phrase: 'twelve dollars',
        text: 'Is this per month or per year?',
        answer: 'Per month; annual billing saves 20%.',
      },
    ],
  },
  {
    reviewer: 4,
    start: 19_000,
    comments: [{ phrase: 'ten thousand', text: 'Ambitious; what is the current number?' }],
  },
  {
    reviewer: 11,
    start: 24_000,
    comments: [
      { phrase: 'private beta', text: 'Who is in the first cohort?', answer: 'Design partners, then the waitlist.' },
    ],
  },
  {
    reviewer: 12,
    start: 28_000,
    comments: [
      { phrase: 'Sync conflicts', text: 'Link the load-test results here.', answer: 'Added to the risk log.' },
    ],
  },
];

const content = ['# Launch plan', ...SECTIONS.map(({ heading }) => `## ${heading}\n\n`)].join('\n\n');

const writing = (): ActorStep<void>[] =>
  SECTIONS.map(({ heading, writer, start, sentences, pauses }) => ({
    actor: writer,
    name: heading,
    run: async ({ actor }) => {
      await actor.pause(start);
      await actor.moveTo({ after: `## ${heading}\n\n` });
      for (const [index, sentence] of sentences.entries()) {
        await actor.type(sentence);
        await actor.pause(pauses[index] ?? 0);
      }
    },
  }));

const editing = (): ActorStep<void>[] =>
  CORRECTIONS.map(({ editor, start, fixes }) => ({
    actor: editor,
    name: 'Corrections',
    run: async ({ actor }) => {
      await actor.pause(start);
      for (const [typo, fix] of fixes) {
        await actor.waitFor(typo);
        await actor.pause(1_500);
        await actor.replace(typo, fix);
      }
    },
  }));

const reviewing = (): ActorStep<void>[] =>
  REVIEWS.map(({ reviewer, start, comments }) => ({
    actor: reviewer,
    name: 'Review',
    run: async ({ actor }) => {
      await actor.pause(start);
      for (const { phrase, text } of comments) {
        await actor.waitFor(phrase);
        await actor.comment(phrase, text);
        await actor.pause(3_000);
      }
    },
  }));

/** Each writer answers the comments on their section after they finish writing it. */
const answering = (): ActorStep<void>[] =>
  REVIEWS.flatMap(({ comments }) =>
    comments.flatMap(({ phrase, answer }) => {
      const section = SECTIONS.find(({ sentences }) => sentences.some((sentence) => sentence.includes(phrase)));
      return section && answer
        ? [
            {
              actor: section.writer,
              name: `Answer: ${phrase}`,
              run: async ({ actor }) => {
                await actor.pause(2_000);
                await actor.reply(phrase, answer);
              },
            },
          ]
        : [];
    }),
  );

/**
 * Sixteen people on one new launch plan: eight writers (one section each), four copy editors, four reviewers whose
 * comment threads the writers answer.
 */
export const teamFlow: ActorFlow<void> = {
  actors: ACTORS,
  document: { name: 'Launch plan' },
  seed: seedDocument({ name: 'Launch plan', content }),
  duration: 48_000,
  steps: [...writing(), ...editing(), ...reviewing(), ...answering()],
};
