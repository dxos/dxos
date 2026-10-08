//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formatAnswer } from './script.ts';

describe('formatAnswer', () => {
  test('prints the output, then the trailer', ({ expect }) => {
    expect(formatAnswer({ output: 'a\nb', stats: { calls: 3, callMs: 41 } }, 52.4)).to.equal(
      'a\nb\n---\n3 calls · 41 ms in calls · 52 ms total',
    );
  });

  test('a failure follows what the program printed first', ({ expect }) => {
    expect(formatAnswer({ output: 'partial', error: 'boom', stats: { calls: 1, callMs: 5 } }, 9)).to.equal(
      'partial\nError: boom\n---\n1 call · 5 ms in calls · 9 ms total',
    );
  });

  test('a sandbox that counted nothing reports only the total', ({ expect }) => {
    expect(formatAnswer({ output: '', error: 'The script could not run: offline' }, 3)).to.equal(
      'Error: The script could not run: offline\n---\n3 ms total',
    );
  });
});
