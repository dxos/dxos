//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Message } from '@dxos/types';

import { latestText, pullRequestsIn } from './cloud-run.ts';

const said = (sender: 'user' | 'assistant', ...texts: string[]) =>
  Message.make({ sender, blocks: texts.map((text) => ({ _tag: 'text' as const, text })) });

const called = (name: string, input: string) =>
  Message.make({
    sender: 'assistant',
    blocks: [{ _tag: 'toolCall', toolCallId: `call-${name}`, name, input, providerExecuted: false }],
  });

describe('pullRequestsIn', () => {
  test("finds the agent's pull request URLs across messages and blocks, once each, in order", ({ expect }) => {
    expect(
      pullRequestsIn([
        said('assistant', 'Opened https://github.com/dxos/dxos/pull/14600 for the client.'),
        said(
          'assistant',
          'Edge: https://github.com/dxos/edge/pull/1540',
          'and again https://github.com/dxos/dxos/pull/14600',
        ),
      ]),
    ).toEqual(['https://github.com/dxos/dxos/pull/14600', 'https://github.com/dxos/edge/pull/1540']);
  });

  test('ignores what the person wrote and blocks that are not text', ({ expect }) => {
    expect(
      pullRequestsIn([
        said('user', 'Please follow up on https://github.com/dxos/dxos/pull/1'),
        called('Bash', 'gh pr view https://github.com/dxos/dxos/pull/2'),
      ]),
    ).toEqual([]);
  });

  test('finds nothing in a run that opened no pull request', ({ expect }) => {
    expect(
      pullRequestsIn([said('assistant', 'Nothing to change; see https://github.com/dxos/dxos/issues/3.')]),
    ).toEqual([]);
  });
});

describe('latestText', () => {
  test('is undefined before the agent has done anything', ({ expect }) => {
    expect(latestText([said('user', 'go')])).toBeUndefined();
  });

  test("is the agent's last text, trimmed", ({ expect }) => {
    expect(latestText([said('assistant', 'first'), said('assistant', '  last  ')])).toBe('last');
  });

  test('is the tool the agent called when that came last', ({ expect }) => {
    expect(latestText([said('assistant', 'Running the tests.'), called('Bash', 'pnpm test')])).toBe('→ Bash pnpm test');
  });

  test('keeps the end of a long text, where a turn says what it did', ({ expect }) => {
    const long = `${'a'.repeat(2500)}done`;
    const latest = latestText([said('assistant', long)]);
    expect(latest).toBe(`…${long.slice(-2000)}`);
    expect(latestText([said('assistant', 'b'.repeat(2000))])).toBe('b'.repeat(2000));
  });
});
