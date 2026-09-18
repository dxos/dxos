//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Ref } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { File } from '@dxos/types';

import { FileLimits, FileOperation } from '#types';

import { NoBackendError, resolvePreferredStorage } from './create.ts';

/** Raised when the named upload cannot be adopted — never uploaded, already consumed, or expired. */
export class UploadNotFoundError extends BaseError.extend('UploadNotFoundError') {
  constructor(public readonly uploadId: string) {
    super({ message: `No completed upload ${uploadId}. Upload the bytes to the signed URL before creating the file.` });
  }
}

/** Raised when the bytes that arrived are not of a type this plugin accepts. */
export class UnsupportedUploadTypeError extends BaseError.extend('UnsupportedUploadTypeError') {
  constructor(public readonly type: string) {
    super({ message: `Uploaded content has an unsupported type: ${type}` });
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

      // The type is only knowable once the blob service reports what it received — the caller never
      // declared one and could not be believed if it had. Checked before either object is added, so
      // a rejected upload leaves nothing behind in the SPACE.
      //
      // It does leave the bytes in the store: adoption has already promoted them to their
      // content-addressed key, and deleting that key is not safe to do here. The key is the digest,
      // so identical bytes deduplicate — a delete would take the bytes out from under any other
      // File that happens to reference the same content. That is the same hazard that keeps
      // `BlobBackend` from having a `remove` at all (see `MAX_EDGE_BLOB_SIZE`'s note on GC and
      // refcounting). Rejecting the type before the bytes move — at mint time, from a media type
      // the upload URL is signed for — is the fix, and it belongs with `createUpload`.
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
