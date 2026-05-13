//
// Copyright 2026 DXOS.org
//

import { describe, test } from '@effect/vitest';

import { decideStderrChunk, filterStderrBuffer } from './stderr-filter';

/**
 * The exact warning shape produced by `warnAfterTimeout` in @dxos/debug.
 * Captured here as a literal so the unit test catches a regression even if
 * the formatter ever changes the prefix.
 */
const WARNING_FIXTURE = `Action \`Finding properties for a space\` is taking more then 5,000ms to complete. This might be a bug.
    at <anonymous> (/abs/path/packages/common/debug/dist/lib/node-esm/index.mjs:208:17)
    at warnAfterTimeout (/abs/path/packages/common/debug/dist/lib/node-esm/index.mjs:207:31)
    at _initializeDb (/abs/path/packages/sdk/client/src/echo/space-proxy.ts:461:11)
    at processTicksAndRejections (native)
`;

describe('decideStderrChunk', () => {
  test('drops the warning prefix line', ({ expect }) => {
    const r = decideStderrChunk(
      'Action `Finding properties for a space` is taking more then 5,000ms to complete.\n',
      false,
    );
    expect(r.drop).toBe(true);
    expect(r.suppressing).toBe(true);
  });

  test('drops indented stack frames after a warning', ({ expect }) => {
    expect(decideStderrChunk('    at warnAfterTimeout (...)\n', true)).toEqual({ drop: true, suppressing: true });
    expect(decideStderrChunk('    at _initializeDb (...)\n', true)).toEqual({ drop: true, suppressing: true });
  });

  test('drops blank lines while suppressing', ({ expect }) => {
    expect(decideStderrChunk('\n', true)).toEqual({ drop: true, suppressing: true });
  });

  test('lets non-indented line through and ends suppression', ({ expect }) => {
    const r = decideStderrChunk('Some other log line\n', true);
    expect(r.drop).toBe(false);
    expect(r.suppressing).toBe(false);
  });

  test('does not drop unrelated lines when not suppressing', ({ expect }) => {
    const r = decideStderrChunk('regular stderr message\n', false);
    expect(r.drop).toBe(false);
    expect(r.suppressing).toBe(false);
  });

  test('matches a stable prefix — survives wording change past "more"', ({ expect }) => {
    // Future-proofing: e.g. "more then" → "more than" typo fix should still
    // be filtered.
    const r = decideStderrChunk('Action `something` is taking more than 10,000ms to complete. Bug?\n', false);
    expect(r.drop).toBe(true);
  });
});

describe('filterStderrBuffer', () => {
  test('strips the entire warning + stack trace from a captured buffer', ({ expect }) => {
    const out = filterStderrBuffer(WARNING_FIXTURE);
    expect(out).toBe('');
  });

  test('preserves real stderr that surrounds a filtered warning', ({ expect }) => {
    const buffer = `before\n${WARNING_FIXTURE}after\n`;
    const out = filterStderrBuffer(buffer);
    expect(out).toContain('before\n');
    expect(out).toContain('after\n');
    expect(out).not.toContain('Action `Finding');
    expect(out).not.toContain('warnAfterTimeout');
  });

  test('two consecutive warnings are both stripped', ({ expect }) => {
    const buffer = WARNING_FIXTURE + WARNING_FIXTURE;
    const out = filterStderrBuffer(buffer);
    expect(out).toBe('');
  });

  test('passes through unrelated stderr unchanged', ({ expect }) => {
    const buffer = 'normal log\nanother normal log\n';
    const out = filterStderrBuffer(buffer);
    expect(out).toBe(buffer);
  });
});
