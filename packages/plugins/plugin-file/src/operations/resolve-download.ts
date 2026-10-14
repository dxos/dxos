//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { digestHex } from '@dxos/blob';
import * as Operation from '@dxos/compute/Operation';
import { Blob, Database } from '@dxos/echo';
import { BaseError } from '@dxos/errors';

import { FileOperation } from '#types';

/** Raised when a file's bytes are not in the content-addressed store a download URL can point at. */
export class DownloadNotAvailableError extends BaseError.extend('DownloadNotAvailableError') {
  constructor() {
    super({
      message:
        'This file is not held in blob storage (it is stored inline or by an extension backend), so it has no ' +
        'download URL. Read it with the file.read operation instead.',
    });
  }
}

/**
 * The default handler, for a host whose blob store is the one the file was written to (EDGE): an
 * `ni:` URI is a content digest, and that digest is the store's key, so the id is derived without
 * reading a byte.
 */
const handler: Operation.WithHandler<typeof FileOperation.ResolveDownload> = FileOperation.ResolveDownload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ file }) {
      const object = yield* Database.load(file);
      const blob = yield* Database.load(object.data);
      if (blob.data._tag !== 'external' || !blob.data.uri.startsWith(`${Blob.Scheme.ni}:///`)) {
        return yield* Effect.fail(new DownloadNotAvailableError());
      }

      return {
        downloadId: digestHex(blob.data.uri),
        name: object.name,
        type: blob.type ?? 'application/octet-stream',
        size: blob.size,
      };
    }),
  ),
);

export default handler;
