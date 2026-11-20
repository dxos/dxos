//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import { describe, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';
import type * as SandboxService from '@dxos/plugin-sandbox/SandboxService';

import * as JobAcp from './JobAcp.ts';

/** A job whose output is whatever the test appends; writes are recorded. */
const fakeJob = () => {
  const written: string[] = [];
  const output: SandboxService.JobEvent[] = [];
  const job: SandboxService.Job = {
    id: 'job',
    output: (from = {}) => {
      let stdout = from.stdout ?? 0;
      let stderr = from.stderr ?? 0;
      const events = output.flatMap((event): SandboxService.JobEvent[] => {
        if (event.type !== 'stdout' && event.type !== 'stderr') {
          return [event];
        }
        const skip = Math.min(event.type === 'stdout' ? stdout : stderr, event.data.length);
        if (event.type === 'stdout') {
          stdout -= skip;
        } else {
          stderr -= skip;
        }
        return skip === event.data.length ? [] : [{ type: event.type, data: event.data.slice(skip) }];
      });
      // A running job's output never ends on its own.
      return Stream.concat(Stream.fromIterable(events), Stream.never);
    },
    stdin: (input) => Stream.runForEach(input, (data) => Effect.sync(() => void written.push(data))),
    state: () => Effect.succeed({ status: 'running' }),
    terminate: () => Effect.succeed({ status: 'killed' }),
  };
  return { job, written, output };
};

describe('JobAcp', () => {
  test('a response read in a later invocation is matched to its request', async ({ expect }) => {
    const { job, written, output } = fakeJob();
    const sent = await EffectEx.runPromise(JobAcp.request(job, JobAcp.initialCursor, 'initialize', { v: 1 }));
    expect(JSON.parse(written[0])).toEqual({ jsonrpc: '2.0', id: 0, method: 'initialize', params: { v: 1 } });

    // The answer arrives split, with a stray log line and a notification ahead of it.
    output.push({
      type: 'stdout',
      data: 'adapter starting\n{"jsonrpc":"2.0","method":"session/update","params":{"a":1}}\n{"jsonrpc"',
    });
    const first = await EffectEx.runPromise(JobAcp.read(job, sent.cursor, '50 millis'));
    expect(first.messages).toEqual([{ _tag: 'notification', method: 'session/update', params: { a: 1 } }]);
    expect(first.cursor.pending).toEqual({ '0': 'initialize' });

    output.push({ type: 'stdout', data: ':"2.0","id":0,"result":{"ok":true}}\n' }, { type: 'stderr', data: 'warn\n' });
    const second = await EffectEx.runPromise(JobAcp.read(job, first.cursor, '50 millis'));
    expect(second.messages).toEqual([{ _tag: 'response', id: 0, method: 'initialize', result: { ok: true } }]);
    expect(second.cursor).toMatchObject({ pending: {}, partial: '', nextId: 1, stderr: 5 });
    expect(second.stderr).toBe('warn\n');

    // Nothing new: the same cursor reads nothing twice.
    const third = await EffectEx.runPromise(JobAcp.read(job, second.cursor, '50 millis'));
    expect(third.messages).toEqual([]);
  });

  test('a request from the agent is answered by id, and the exit is reported', async ({ expect }) => {
    const { job, written, output } = fakeJob();
    output.push(
      { type: 'stdout', data: '{"jsonrpc":"2.0","id":"p1","method":"session/request_permission","params":{}}\n' },
      { type: 'exit', exitCode: 1, success: false },
    );
    const result = await EffectEx.runPromise(JobAcp.read(job, JobAcp.initialCursor, '50 millis'));
    expect(result.messages).toEqual([{ _tag: 'request', id: 'p1', method: 'session/request_permission', params: {} }]);
    expect(result.exit).toEqual({ exitCode: 1 });
    await EffectEx.runPromise(JobAcp.respond(job, 'p1', { outcome: { outcome: 'cancelled' } }));
    expect(JSON.parse(written[0])).toEqual({ jsonrpc: '2.0', id: 'p1', result: { outcome: { outcome: 'cancelled' } } });
  });
});
