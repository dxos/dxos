//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { patchAnthropicMessagesRequestBody } from './edge-ai-http-client';

describe('patchAnthropicMessagesRequestBody', () => {
  test('adds eager_input_streaming to user-defined tools', ({ expect }) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      stream: true,
      tools: [
        {
          name: 'delegate-task',
          description: 'Delegate work',
          input_schema: { type: 'object', properties: { title: { type: 'string' } } },
        },
        {
          name: 'bash',
          type: 'bash_20250124',
        },
      ],
    });

    const patched = JSON.parse(patchAnthropicMessagesRequestBody(body) as string);

    expect(patched.tools[0]).toMatchObject({ eager_input_streaming: true });
    expect(patched.tools[1]).not.toHaveProperty('eager_input_streaming');
  });

  test('leaves non-json bodies unchanged', ({ expect }) => {
    const body = 'not-json';
    expect(patchAnthropicMessagesRequestBody(body)).toBe(body);
  });
});
