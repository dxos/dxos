//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import type * as SandboxService from '@dxos/plugin-sandbox/SandboxService';

/**
 * ACP (JSON-RPC, one message per line) with an agent running as a sandbox job, from a handler that runs
 * in short invocations. Nothing is held in memory between them: {@link Cursor} records what was sent
 * and read, the caller stores it, and the next invocation carries on from it.
 */

/** What a later invocation needs to carry on the conversation. */
export const Cursor = Schema.Struct({
  /** The id the next request is sent with. */
  nextId: Schema.Number,
  /** Requests sent and not yet answered, by id, with the method each called. */
  pending: Schema.Record(Schema.String, Schema.String),
  /** Characters of the job's output already read. */
  stdout: Schema.Number,
  stderr: Schema.Number,
  /** The start of a line read before its end arrived. */
  partial: Schema.String,
});
export type Cursor = Schema.Schema.Type<typeof Cursor>;

export const initialCursor: Cursor = { nextId: 0, pending: {}, stdout: 0, stderr: 0, partial: '' };

export type Message =
  /** The agent answered one of our requests; `method` is what that request called. */
  | { _tag: 'response'; id: number; method: string; result?: unknown; error?: { code: number; message: string } }
  /** The agent asks us something and waits for {@link respond}. */
  | { _tag: 'request'; id: number | string; method: string; params: unknown }
  | { _tag: 'notification'; method: string; params: unknown };

export type ReadResult = {
  cursor: Cursor;
  messages: Message[];
  /** What the job wrote to stderr in this read. */
  stderr: string;
  /** Set once the job has ended. */
  exit?: { exitCode: number } | { error: string };
};

/** Sends a request; the answer arrives from a later {@link read} as a `response` carrying `method`. */
export const request = (
  job: SandboxService.Job,
  cursor: Cursor,
  method: string,
  params: unknown,
): Effect.Effect<{ cursor: Cursor; id: number }, SandboxService.SandboxError> => {
  const id = cursor.nextId;
  return job.stdin(Stream.make(line({ jsonrpc: '2.0', id, method, params }))).pipe(
    Effect.as({
      id,
      cursor: { ...cursor, nextId: id + 1, pending: { ...cursor.pending, [String(id)]: method } },
    }),
  );
};

export const notify = (
  job: SandboxService.Job,
  method: string,
  params: unknown,
): Effect.Effect<void, SandboxService.SandboxError> => job.stdin(Stream.make(line({ jsonrpc: '2.0', method, params })));

/** Answers a request the agent sent. */
export const respond = (
  job: SandboxService.Job,
  id: number | string,
  result: unknown,
): Effect.Effect<void, SandboxService.SandboxError> => job.stdin(Stream.make(line({ jsonrpc: '2.0', id, result })));

/**
 * Reads what the job wrote since `cursor`, for at most `wait`: a job that is still running never ends
 * its output, so the read stops on time rather than on the stream's end.
 */
export const read = (
  job: SandboxService.Job,
  cursor: Cursor,
  wait: Duration.Input,
): Effect.Effect<ReadResult, SandboxService.SandboxError> =>
  job.output({ stdout: cursor.stdout, stderr: cursor.stderr }).pipe(
    Stream.interruptWhen(Effect.sleep(wait)),
    Stream.runFold(
      () => ({ stdout: '', stderr: '', exit: undefined as ReadResult['exit'] }),
      (acc, event) => {
        switch (event.type) {
          case 'stdout':
          case 'stderr':
            return { ...acc, [event.type]: acc[event.type] + event.data };
          case 'exit':
            return { ...acc, exit: { exitCode: event.exitCode } };
          case 'error':
            return { ...acc, exit: { error: event.message } };
        }
      },
    ),
    Effect.map(({ stdout, stderr, exit }) => {
      const parsed = parse(cursor, stdout);
      return {
        cursor: { ...parsed.cursor, stderr: cursor.stderr + stderr.length },
        messages: parsed.messages,
        stderr,
        ...(exit !== undefined && { exit }),
      };
    }),
  );

/** Splits `stdout` read after `cursor` into messages, matching responses to the requests they answer. */
export const parse = (cursor: Cursor, stdout: string): { cursor: Cursor; messages: Message[] } => {
  const lines = (cursor.partial + stdout).split('\n');
  const partial = lines.pop() ?? '';
  const pending = { ...cursor.pending };
  const messages: Message[] = [];
  for (const text of lines) {
    const message = decodeLine(text);
    if (message === undefined) {
      continue;
    }
    if ('method' in message && message.method !== undefined) {
      messages.push(
        message.id !== undefined
          ? { _tag: 'request', id: message.id, method: message.method, params: message.params }
          : { _tag: 'notification', method: message.method, params: message.params },
      );
    } else if (typeof message.id === 'number' && pending[String(message.id)] !== undefined) {
      const method = pending[String(message.id)];
      delete pending[String(message.id)];
      messages.push({
        _tag: 'response',
        id: message.id,
        method,
        ...(message.result !== undefined && { result: message.result }),
        ...(message.error !== undefined && { error: message.error }),
      });
    }
  }
  return { cursor: { ...cursor, pending, partial, stdout: cursor.stdout + stdout.length }, messages };
};

const JsonRpcMessage = Schema.Struct({
  id: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  method: Schema.optional(Schema.String),
  params: Schema.optional(Schema.Unknown),
  result: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.Struct({ code: Schema.Number, message: Schema.String })),
});

const decodeJsonRpc = Schema.decodeUnknownOption(Schema.fromJsonString(JsonRpcMessage));

/** A line that is not JSON-RPC (an adapter's stray log line) is skipped. */
const decodeLine = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) {
    return undefined;
  }
  const decoded = decodeJsonRpc(trimmed);
  return decoded._tag === 'Some' ? decoded.value : undefined;
};

const line = (message: unknown): string => `${JSON.stringify(message)}\n`;
