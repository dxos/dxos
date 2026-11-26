//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import { foldExecStream, parseExecStream } from './exec-stream.ts';

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

describe('parseExecStream', () => {
  test('reads events split across chunks and stops at the exit', async ({ expect }) => {
    const body = [
      frame({ type: 'stdout', data: 'one\n' }),
      ': keepalive\n\n',
      frame({ type: 'exit', exitCode: 3, success: false }),
      frame({ type: 'stdout', data: 'after the end' }),
    ].join('');
    const bytes = new TextEncoder().encode(body);
    const chunks = [bytes.slice(0, 7), bytes.slice(7, 40), bytes.slice(40)];
    const events = await EffectEx.runPromise(Stream.runCollect(parseExecStream(Stream.fromIterable(chunks))));
    expect(Chunk.toReadonlyArray(Chunk.fromIterable(events))).toEqual([
      { type: 'stdout', data: 'one\n' },
      { type: 'exit', exitCode: 3, success: false },
    ]);
  });

  test('a body that ends before the exit ends with an error event', async ({ expect }) => {
    const bytes = new TextEncoder().encode(frame({ type: 'stdout', data: 'partial' }));
    const events = await EffectEx.runPromise(Stream.runCollect(parseExecStream(Stream.make(bytes))));
    expect(Chunk.toReadonlyArray(Chunk.fromIterable(events))).toEqual([
      { type: 'stdout', data: 'partial' },
      { type: 'error', message: 'exec stream ended before the command exited' },
    ]);
  });
});
