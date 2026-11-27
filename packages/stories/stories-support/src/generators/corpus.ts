//
// Copyright 2026 DXOS.org
//

import { type Support } from '../types/index.ts';

/** An external person who writes to the inbox. */
export type Actor = {
  readonly key: string;
  readonly name: string;
  readonly email: string;
  /** The organization the sender's address resolves to; absent for a free-mail address. */
  readonly organization?: { readonly name: string; readonly website: string };
  /** What the space holds before the first message. */
  readonly seeded: 'person-and-organization' | 'organization' | 'none';
};

export const ACTORS = {
  ada: {
    key: 'ada',
    name: 'Ada Okafor',
    email: 'ada@lumenlabs.example',
    organization: { name: 'Lumen Labs', website: 'https://lumenlabs.example' },
    seeded: 'person-and-organization',
  },
  ben: {
    key: 'ben',
    name: 'Ben Ruiz',
    email: 'ben@lumenlabs.example',
    organization: { name: 'Lumen Labs', website: 'https://lumenlabs.example' },
    seeded: 'organization',
  },
  chen: {
    key: 'chen',
    name: 'Chen Wei',
    email: 'chen@northwind.example',
    organization: { name: 'Northwind', website: 'https://northwind.example' },
    seeded: 'none',
  },
  dara: {
    key: 'dara',
    name: 'Dara Singh',
    email: 'dara@quantahealth.example',
    organization: { name: 'Quantahealth', website: 'https://quantahealth.example' },
    seeded: 'none',
  },
  eli: {
    key: 'eli',
    name: 'Eli Novak',
    email: 'eli.novak@gmail.com',
    seeded: 'none',
  },
} as const satisfies Record<string, Actor>;

export type ActorKey = keyof typeof ACTORS;

/**
 * One fact as an extraction of the message recorded it. A question or request carries the sentence; a statement
 * carries its triple as well.
 */
export type RecordedFact =
  | { readonly kind: 'question' | 'request'; readonly text: string }
  | {
      readonly kind: 'statement';
      readonly text: string;
      readonly subject: string;
      readonly predicate: string;
      readonly object: string;
    };

/** What the pipeline must produce for one question or request of a message. */
export type ExpectedOutcome =
  | { readonly kind: 'draft'; readonly document: string }
  | { readonly kind: 'task'; readonly reason: Support.TaskReason };

export type CorpusMessage = {
  /** Stable key; fact ids and test ids derive from it. */
  readonly key: string;
  readonly from: ActorKey;
  readonly created: string;
  readonly subject: string;
  readonly text: string;
  readonly facts: readonly RecordedFact[];
  /** A stage made to fail for this message, to show a failed row. */
  readonly fault?: Support.StageId;
  /** One entry per question and request, in the order of `facts`. */
  readonly expected: readonly ExpectedOutcome[];
};

const question = (text: string): RecordedFact => ({ kind: 'question', text });
const request = (text: string): RecordedFact => ({ kind: 'request', text });

/** The messages the generators send, in the order they are sent. */
export const CORPUS: readonly CorpusMessage[] = [
  {
    key: 'm01',
    from: 'ada',
    created: '2026-11-02T09:00:00.000Z',
    subject: 'CPU time limit',
    text: 'What is the CPU time limit for a Worker on the paid plan?',
    facts: [question('What is the CPU time limit for a Worker on the paid plan?')],
    expected: [{ kind: 'draft', document: 'Workers platform limits' }],
  },
  {
    key: 'm02',
    from: 'chen',
    created: '2026-11-02T09:05:00.000Z',
    subject: 'Deploy failed',
    text: 'Why did our Worker deploy fail at 14:02 yesterday with error 10021?',
    facts: [question('Why did our Worker deploy fail at 14:02 yesterday with error 10021?')],
    expected: [{ kind: 'task', reason: 'low-confidence' }],
  },
  {
    key: 'm03',
    from: 'ben',
    created: '2026-11-02T09:10:00.000Z',
    subject: 'Alarm guarantees',
    text: 'Are Durable Object alarms guaranteed to run, and are they retried if the handler throws?',
    facts: [question('Are Durable Object alarms guaranteed to run, and are they retried if the handler throws?')],
    expected: [{ kind: 'draft', document: 'Durable Objects' }],
  },
  {
    key: 'm04',
    from: 'ben',
    created: '2026-11-02T09:15:00.000Z',
    subject: 'Worker limit increase',
    text: "Please raise our account's Worker limit to 2,000.",
    facts: [request("Please raise our account's Worker limit to 2,000.")],
    expected: [{ kind: 'task', reason: 'request' }],
  },
  {
    key: 'm05',
    from: 'chen',
    created: '2026-11-02T09:20:00.000Z',
    subject: 'KV write visibility',
    text: 'How long does a KV write take to be visible in other regions?',
    facts: [question('How long does a KV write take to be visible in other regions?')],
    expected: [{ kind: 'draft', document: 'Workers KV' }],
  },
  {
    key: 'm06',
    from: 'dara',
    created: '2026-11-02T09:25:00.000Z',
    subject: 'Hyperdrive and Aurora',
    text: 'Does Hyperdrive pool MySQL connections to an Aurora cluster?',
    facts: [question('Does Hyperdrive pool MySQL connections to an Aurora cluster?')],
    expected: [{ kind: 'task', reason: 'no-evidence' }],
  },
  {
    key: 'm07',
    from: 'dara',
    created: '2026-11-02T09:30:00.000Z',
    subject: 'Cron time zone',
    text: 'Do Cron Triggers run in UTC or in local time?',
    facts: [question('Do Cron Triggers run in UTC or in local time?')],
    expected: [{ kind: 'draft', document: 'Cron Triggers' }],
  },
  {
    key: 'm08',
    from: 'ada',
    created: '2026-11-02T09:35:00.000Z',
    subject: 'Session store migration',
    text: 'We are moving our session store to Durable Objects. What is the storage limit per object? Please add Ben to our support plan.',
    facts: [
      {
        kind: 'statement',
        text: 'We are moving our session store to Durable Objects.',
        subject: 'Lumen Labs',
        predicate: 'is moving to',
        object: 'Durable Objects',
      },
      question('What is the storage limit per object?'),
      request('Please add Ben to our support plan.'),
    ],
    expected: [
      { kind: 'draft', document: 'Durable Objects' },
      { kind: 'task', reason: 'request' },
    ],
  },
  {
    key: 'm09',
    from: 'eli',
    created: '2026-11-02T09:40:00.000Z',
    subject: 'KV value size',
    text: 'What is the largest value I can store in KV?',
    facts: [question('What is the largest value I can store in KV?')],
    expected: [{ kind: 'draft', document: 'Workers KV' }],
  },
  {
    key: 'm10',
    from: 'dara',
    created: '2026-11-02T09:45:00.000Z',
    subject: 'Logpush and SOC 2',
    text: 'Can you enable Logpush for our zone and send us your SOC 2 report?',
    facts: [request('Can you enable Logpush for our zone and send us your SOC 2 report?')],
    expected: [{ kind: 'task', reason: 'request' }],
  },
  {
    key: 'm11',
    from: 'ada',
    created: '2026-11-02T09:50:00.000Z',
    subject: 'Subrequest limit',
    text: 'How many subrequests can a Worker make in one request?',
    facts: [question('How many subrequests can a Worker make in one request?')],
    expected: [{ kind: 'draft', document: 'Workers platform limits' }],
  },
  {
    key: 'm12',
    from: 'eli',
    created: '2026-11-02T09:55:00.000Z',
    subject: 'Testing a Cron Trigger',
    text: 'How do I test a Cron Trigger locally?',
    facts: [question('How do I test a Cron Trigger locally?')],
    fault: 'research',
    expected: [{ kind: 'task', reason: 'research-failed' }],
  },
];
