//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { FileOperation, FileType, MAX_FILE_SIZE, isAcceptedMimeType } from '../types';

export class UnsupportedFileTypeError extends Error {
  constructor(public readonly type: string) {
    super(`Unsupported file type: ${type}`);
    this.name = 'UnsupportedFileTypeError';
  }
}

export class FileTooLargeError extends Error {
  constructor(
    public readonly size: number,
    public readonly limit: number = MAX_FILE_SIZE,
  ) {
    super(`File is too large: ${size} bytes (limit: ${limit} bytes)`);
    this.name = 'FileTooLargeError';
  }
}

const handler: Operation.WithHandler<typeof FileOperation.Create> = FileOperation.Create.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file }) {
      if (!isAcceptedMimeType(file.type)) {
        return yield* Effect.fail(new UnsupportedFileTypeError(file.type));
      }

      const data = new Uint8Array(yield* Effect.promise(() => file.arrayBuffer()));

      if (data.byteLength > MAX_FILE_SIZE) {
        return yield* Effect.fail(new FileTooLargeError(data.byteLength));
      }

      return {
        object: FileType.make({
          name: file.name,
          type: file.type,
          size: data.byteLength,
          data,
          timestamp: new Date().toISOString(),
        }),
      };
    }),
  ),
);

export default handler;
