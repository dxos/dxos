//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { File } from '@dxos/types';

import { FileOperation } from '#types';

import { NoBackendError, resolvePreferredStorage } from './create.ts';

/** Raised when the named upload cannot be adopted — never uploaded, already consumed, or expired. */
export class UploadNotFoundError extends BaseError.extend('UploadNotFoundError') {
  constructor(public readonly uploadId: string) {
    super({ message: `No completed upload ${uploadId}. Upload the bytes to the signed URL before creating the file.` });
  }
}

const handler: Operation.WithHandler<typeof FileOperation.CreateFromUpload> = FileOperation.CreateFromUpload.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ uploadId, name }) {
      // Shared with the UI and `createFromSource` paths, so all three agree on which backend an
      // upload lands in. The lenient resolver, because this operation runs in hosts with no plugin
      // capabilities at all — an unregistered backend is reported below, by the store that has to
      // adopt the bytes, rather than guessed at from the settings UI's descriptors.
      const storage = yield* resolvePreferredStorage;

      const blob = yield* Blob.fromUpload(uploadId, { storage }).pipe(
        // `not-found` is the adoptable-upload miss; every other reason is a misconfigured backend,
        // which is not a missing upload and should not be dressed up as one.
        Effect.catchTag('BlobNotAvailableError', (error): Effect.Effect<never, NoBackendError | UploadNotFoundError> =>
          error.context.reason === 'not-found'
            ? Effect.fail(new UploadNotFoundError(uploadId))
            : Effect.fail(new NoBackendError()),
        ),
      );

      // No type check: every type is accepted, and the blob service already stored an executable
      // one as `application/octet-stream`.
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
