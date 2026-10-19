//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { foldExecStream } from './exec-stream.ts';

const frame = (event: unknown) => `data: ${JSON.stringify(event)}\n\n`;

describe('foldExecStream', () => {
  test('collects output and ends with the exit code, skipping heartbeats', ({ expect }) => {
    const body = [
      frame({ type: 'stdout', data: 'one\n' }),
      ': keepalive\n\n',
      frame({ type: 'stderr', data: 'warn\n' }),
      frame({ type: 'stdout', data: 'two\n' }),
      frame({ type: 'exit', exitCode: 0, success: true }),
    ].join('');
    expect(foldExecStream(body)).toEqual({ stdout: 'one\ntwo\n', stderr: 'warn\n', exitCode: 0, success: true });
  });

  test('a timed-out command and a service error are failed commands', ({ expect }) => {
    expect(foldExecStream(frame({ type: 'exit', exitCode: -1, success: false, timedOut: true }))).toMatchObject({
      exitCode: -1,
      success: false,
      stderr: 'command timed out and was killed',
    });
    expect(foldExecStream(frame({ type: 'error', message: 'boom' }))).toMatchObject({ stderr: 'boom', success: false });
  });

  test('a stream cut before its end is a failed command', ({ expect }) => {
    expect(foldExecStream(frame({ type: 'stdout', data: 'x' }))).toMatchObject({ stdout: 'x', success: false });
  });
});
