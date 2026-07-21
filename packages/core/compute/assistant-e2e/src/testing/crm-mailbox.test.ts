//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';

import { runMemoizedTests } from '@dxos/ai/testing';
import { Obj } from '@dxos/echo';
import { CrmPlugin } from '@dxos/plugin-crm/plugin';
import { ProfileOf } from '@dxos/plugin-crm/types';
import { Markdown } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { trim } from '@dxos/util';

import { agentTest, agentTestTimeout } from '../harness';

// Must stay at module scope: primes the test PRNG; agentTest pins a per-test seed from the test name.
Obj.ID.dangerouslyDisableRandomness();

const SEED_EMAIL_INPUT = {
  sender: { name: 'Vishal @ SigNoz', email: 'vishal@mail.signoz.io' },
  blocks: [
    {
      _tag: 'text',
      text: trim`
        Hi there,

        Your AI Assistant access is live — meet Noz, SigNoz's AI observability assistant.

        Let us know if you have any questions getting started.

        Best,
        Vishal Sharma
        Founding Engineer @ SigNoz

        SigNoz Inc
        2261 Market Street #4010
        San Francisco, CA 94114
      `,
    },
  ],
  properties: {
    subject: 'Your AI Assistant access is live. Meet Noz.',
  },
  created: '2026-06-26T12:00:00.000Z',
};

// Frozen-conversation replay (A/B); off by default (`DX_RUN_LLM_TESTS=1` / `ALLOW_LLM_GENERATION=1`
// to run) — see `packages/core/compute/ai/TESTING.md`.
const describeMemoized = runMemoizedTests() ? describe : describe.skip;

describeMemoized('CRM Mailbox', () => {
  it.effect(
    'processes a mailbox email into CRM profiles and employer relation',
    agentTest({
      instructions: trim`
        The database starts empty.

        Enable these skills using the skill manager:
        - org.dxos.skill.crm
        - org.dxos.skill.webSearch
        - org.dxos.skill.database
        - org.dxos.skill.markdown

        A new email message is provided in the <input> block below.
        - Research the sender and any contacts mentioned in the message.
        - Create and link a summary document for the sender's Organization if one does not already exist.
        - Create or update CRM Profiles (Person and/or Organization objects) for those contacts using the CRM tools.

        <input>${JSON.stringify(SEED_EMAIL_INPUT)}</input>
      `,
      completionCriteria: [
        'A Person object for Vishal Sharma exists in the database.',
        'An Organization object named SigNoz exists in the database.',
        'The create-relation operation for an Employer relation completed successfully.',
        'The Employer relation between Vishal Sharma and SigNoz has role "Founding Engineer" stored as a proper schema field (not corrupted into character-index keys).',
      ],
      plugins: [CrmPlugin(), MarkdownPlugin()],
      clientTypes: [ProfileOf.ProfileOf, Markdown.Document],
    }),
    {
      timeout: agentTestTimeout(),
    },
  );
});
