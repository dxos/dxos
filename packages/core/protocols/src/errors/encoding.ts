//
// Copyright 2023 DXOS.org
//

import { type Error as SerializedErrorProto } from '../proto/gen/dxos/error.js';

import { reconstructError } from './helpers.js';

export const encodeError = (err: any): SerializedErrorProto => {
  if (typeof err === 'object' && err?.message) {
    return {
      name: err.name,
      message: err.message,
      context: err.context,
      stack: err.stack,
    };
  } else if (typeof err === 'string') {
    return {
      message: err,
    };
  } else {
    return {
      message: JSON.stringify(err),
    };
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
