//
// Copyright 2023 DXOS.org
//

import { create } from '@bufbuild/protobuf';

import { type Error as SerializedErrorProto, ErrorSchema } from '../buf/proto/gen/dxos/error_pb.ts';

import { reconstructError } from './helpers.ts';

export const encodeError = (err: any): SerializedErrorProto => {
  if (typeof err === 'object' && err?.message) {
    return create(ErrorSchema, {
      name: err.name,
      message: err.message,
      context: err.context,
      stack: err.stack,
    });
  } else if (typeof err === 'string') {
    return create(ErrorSchema, {
      message: err,
    });
  } else {
    return create(ErrorSchema, {
      message: JSON.stringify(err),
    });
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
