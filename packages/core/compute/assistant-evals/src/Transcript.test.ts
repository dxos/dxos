//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type AiUsage } from '@dxos/ai';

import * as Transcript from './Transcript.ts';

const call = (overrides: Partial<AiUsage.Call>): AiUsage.Call => ({
  model: 'deepseek-v4-pro',
  provider: 'edge',
  inputTokens: 100,
  outputTokens: 20,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  start: 1_000,
  end: 3_000,
  ...overrides,
});

const SYSTEM = { role: 'system', content: 'You write programs for the `eval` tool.' };
const USER = { role: 'user', content: [{ type: 'text', text: 'Count the active organizations.' }] };
const PROGRAM = 'const all = await db.query(Organization).run();\nconsole.log(all.length);';
const CALL = {
  role: 'assistant',
  content: [{ type: 'function', function: { name: 'eval', arguments: { code: PROGRAM } } }],
};
const RESULT = { role: 'tool', content: [{ type: 'tool-result', name: 'eval', result: '2' }] };

describe('Transcript.render', () => {
  const markdown = Transcript.render({
    name: 'Code mode — counts [code-mode-plain / deepseek-v4-pro]',
    calls: [
      call({ input: [SYSTEM, USER], output: [CALL], tools: [{ name: 'eval' }] }),
      call({
        start: 3_000,
        end: 4_000,
        input: [SYSTEM, USER, CALL, RESULT],
        output: [{ role: 'assistant', content: [{ type: 'text', text: 'There are 2.' }] }],
      }),
    ],
    outcome: { output: 'There are 2.' },
  });

  test('shows the model metadata and the system prompt once', ({ expect }) => {
    expect(markdown).toContain('- **Model calls:** 2');
    expect(markdown).toContain('| 2 | deepseek-v4-pro |');
    expect(markdown.match(/You write programs/g)).toHaveLength(1);
    expect(markdown).toContain('- `eval`');
  });

  test('shows programs as code and each message once', ({ expect }) => {
    expect(markdown).toContain(`\`\`\`ts\n${PROGRAM}\n\`\`\``);
    expect(markdown.match(/Count the active organizations/g)).toHaveLength(1);
    expect(markdown).toContain('**Tool result** `eval`');
  });

  test('a prompt cut off by the telemetry is shown raw and said so', ({ expect }) => {
    const cut = Transcript.render({
      name: 'cut',
      calls: [call({ input: '[{"role":"user"' })],
      outcome: { output: '' },
    });
    expect(cut).toContain('arrived cut off');
  });
});
