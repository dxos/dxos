//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { FileLimits, FileOperation } from '#types';

import { NoBackendError, resolveActiveStorage } from './create.ts';

/** Raised when the named upload cannot be adopted — never uploaded, already consumed, or expired. */
export class UploadNotFoundError extends Error {
  constructor(public readonly uploadId: string) {
    super(`No completed upload ${uploadId}. Upload the bytes to the signed URL before creating the file.`);
    this.name = 'UploadNotFoundError';
  }
}

/** Raised when the bytes that arrived are not of a type this plugin accepts. */
export class UnsupportedUploadTypeError extends Error {
  constructor(public readonly type: string) {
    super(`Uploaded content has an unsupported type: ${type}`);
    this.name = 'UnsupportedUploadTypeError';
  }
}

const handler: Operation.WithHandler<typeof FileOperation.CreateFromUpload> = FileOperation.CreateFromUpload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ uploadId, name }) {
      // Shared with the UI and `createFromSource` paths, so all three agree on which backend an
      // upload lands in.
      const storage = yield* resolveActiveStorage;

      const blob = yield* Blob.fromUpload(uploadId, { storage }).pipe(
        // `not-found` is the adoptable-upload miss; every other reason is a misconfigured backend,
        // which is the same condition `resolveActiveStorage` reports and should not be dressed up
        // as a missing upload.
        Effect.catchTag('BlobNotAvailableError', (error) =>
          error.context.reason === 'not-found'
            ? Effect.fail(new UploadNotFoundError(uploadId))
            : Effect.fail(new NoBackendError()),
        ),
        Effect.catchTag('BlobWriteError', () => Effect.fail(new UploadNotFoundError(uploadId))),
      );

      // The type is only knowable once the blob service reports what it received — the caller never
      // declared one and could not be believed if it had. Checked before anything is added, so a
      // rejected upload leaves no orphan Blob behind in the space.
      const type = blob.type ?? 'application/octet-stream';
      if (!FileLimits.isAcceptedMimeType(type)) {
        return yield* Effect.fail(new UnsupportedUploadTypeError(type));
      }

      const object = File.make({ name, data: Ref.make(blob) });
      // The blob first: `SetParent` on `File.data` cascades deletion, so the child has to exist
      // before the parent references it.
      yield* Database.add(blob);
      yield* Database.add(object);
      return { object };
    }),
  ),
);

export default handler;
