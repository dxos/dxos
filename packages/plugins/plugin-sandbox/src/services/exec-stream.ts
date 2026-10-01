//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** Content type that asks sandbox-service to stream a command's output rather than answer once it exits. */
export const EXEC_STREAM_CONTENT_TYPE = 'text/event-stream';

/** One event of sandbox-service's exec stream; it ends with exactly one `exit` or `error`. */
const ExecStreamEvent = Schema.Union([
  Schema.Struct({ type: Schema.Literals(['stdout', 'stderr']), data: Schema.String }),
  Schema.Struct({
    type: Schema.Literal('exit'),
    exitCode: Schema.Number,
    success: Schema.Boolean,
    timedOut: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({ type: Schema.Literal('error'), message: Schema.String }),
]);

const decodeEvent = Schema.decodeUnknownOption(Schema.fromJsonString(ExecStreamEvent));

/**
 * Folds an exec stream's body into the result a non-streamed `exec` answers with. Comments (the
 * heartbeat) and unknown events are skipped; a stream cut before its end is a failed command.
 */
export const foldExecStream = (
  body: string,
): { stdout: string; stderr: string; exitCode: number; success: boolean } => {
  const output = { stdout: '', stderr: '' };
  for (const frame of body.split('\n\n')) {
    if (!frame.startsWith('data: ')) {
      continue;
    }
    const event = decodeEvent(frame.slice('data: '.length));
    if (event._tag === 'None') {
      continue;
    }
    switch (event.value.type) {
      case 'stdout':
      case 'stderr':
        output[event.value.type] += event.value.data;
        break;
      case 'exit': {
        const { exitCode, success, timedOut } = event.value;
        const stderr = timedOut ? `${output.stderr}\ncommand timed out and was killed`.trim() : output.stderr;
        return { stdout: output.stdout, stderr, exitCode, success };
      }
      case 'error':
        return { ...output, stderr: `${output.stderr}\n${event.value.message}`.trim(), exitCode: -1, success: false };
    }
  }
  return {
    ...output,
    stderr: `${output.stderr}\nexec stream ended before the command exited`.trim(),
    exitCode: -1,
    success: false,
  };
};
