//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { ErrorSchema, type Error as SerializedErrorProto } from '../buf/proto/gen/dxos/error_pb.ts';
import { reconstructError } from './helpers.ts';

/** Bounds the cause chain folded into a serialized stack. */
const MAX_CAUSE_DEPTH = 8;

/**
 * The wire format has no `cause` field, so the chain is folded into the stack, where a remote
 * failure's origin (e.g. the SQLite error beneath a host-side `SqlError`) is otherwise lost.
 */
const stackWithCauses = (err: Error): string | undefined => {
  const parts = [err.stack ?? `${err.name}: ${err.message}`];
  const seen = new Set<unknown>([err]);
  let cause = err.cause;
  while (cause !== undefined && cause !== null && !seen.has(cause) && parts.length <= MAX_CAUSE_DEPTH) {
    seen.add(cause);
    const described = cause instanceof Error ? (cause.stack ?? `${cause.name}: ${cause.message}`) : String(cause);
    // `toServiceError` wraps a foreign error under its own stack, which would otherwise print twice.
    if (described !== parts.at(-1)) {
      parts.push(described);
    }
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  return parts.length === 1 ? err.stack : parts.join('\nCaused by: ');
};

export const encodeError = (err: any): SerializedErrorProto => {
  if (typeof err === 'object' && err?.message) {
    return create(ErrorSchema, {
      name: err.name,
      message: err.message,
      context: err.context,
      stack: err instanceof Error ? stackWithCauses(err) : err.stack,
    });
  } else if (typeof err === 'string') {
    return create(ErrorSchema, { message: err });
  } else {
    return create(ErrorSchema, { message: JSON.stringify(err) });
  }
};

export type DecodeOptions = {
  appendStack?: string;
};

export const decodeError = (err: SerializedErrorProto, { appendStack }: DecodeOptions = {}) => {
  const error = reconstructError(err);
  if (appendStack) {
    error.stack = (err.stack ?? `${error.message}\n`) + appendStack;
  } else {
    error.stack = err.stack;
  }

  return error;
};
