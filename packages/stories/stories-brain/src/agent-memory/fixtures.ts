//
// Copyright 2026 DXOS.org
//

import { type Message } from './types.ts';

const at = (iso: string) => new Date(iso);

/** Two conversations a week apart; the second revises a preference and follows up on a deploy. */
export const SESSIONS: { id: string; label: string; messages: Message[] }[] = [
  {
    id: 'chat-2026-11-10',
    label: 'Session 1 · Nov 10',
    messages: [
      {
        role: 'user',
        content: "Hi, I'm Dana. I work on the payments team at Acme.",
        timestamp: at('2026-11-10T09:00:00Z'),
      },
      { role: 'assistant', content: 'Nice to meet you, Dana! How can I help?', timestamp: at('2026-11-10T09:00:05Z') },
      { role: 'user', content: 'I prefer TypeScript for backend services.', timestamp: at('2026-11-10T09:01:00Z') },
      {
        role: 'user',
        content:
          'We deployed the ledger service to production yesterday. Always run the migration dry-run before deploying.',
        timestamp: at('2026-11-10T09:02:00Z'),
      },
      {
        role: 'user',
        content: 'Remind me to rotate the Stripe keys on Friday.',
        timestamp: at('2026-11-10T09:03:00Z'),
      },
      { role: 'assistant', content: "Noted. I'll keep that in mind.", timestamp: at('2026-11-10T09:03:04Z') },
    ],
  },
  {
    id: 'chat-2026-11-16',
    label: 'Session 2 · Nov 16',
    messages: [
      {
        role: 'user',
        content: 'Update: I prefer Rust for backend services now.',
        timestamp: at('2026-11-16T14:00:00Z'),
      },
      {
        role: 'user',
        content: 'We rolled back the ledger service after a latency spike.',
        timestamp: at('2026-11-16T14:01:00Z'),
      },
      {
        role: 'assistant',
        content: 'Sorry to hear that. Anything to note for next time?',
        timestamp: at('2026-11-16T14:01:03Z'),
      },
      {
        role: 'user',
        content: 'Always page the on-call engineer before deploying.',
        timestamp: at('2026-11-16T14:02:00Z'),
      },
    ],
  },
];

export const QUERIES = [
  'Which language does Dana use for backend services?',
  'What happened with the ledger service?',
  'What should I do before deploying?',
  'What is the capital of France?',
];
