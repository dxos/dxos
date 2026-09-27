//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { FileLimits, FileOperation } from '#types';

import { UnsupportedUploadTypeError, UploadNotFoundError } from './operations/create-from-upload.ts';

/** Bytes a local host received on its own upload listener, keyed by the id it minted. */
export type Upload = {
  readonly bytes: Uint8Array;
  readonly type: string;
  readonly name?: string;
};

/** Where completed uploads wait: read without removing, released only once the file is stored. */
export type Source = {
  /** `undefined` when the upload never arrived or has expired. */
  peek(uploadId: string): Upload | undefined;
  consume(uploadId: string): void;
};

/**
 * `file.createFromUpload` for a host that stages uploads itself (`@dxos/mcp-server/LocalUpload`)
 * rather than on EDGE. Registered in place of the default handler, which adopts from EDGE's staging
 * area — a store these uploads never reach. The bytes go to the client's default blob backend
 * (EDGE when configured), exactly as a UI upload's would; with no backend they are stored inline,
 * which `Blob.fromBytes` caps at `Blob.MAX_INLINE_SIZE`.
 */
export const createFromUploadHandler = (source: Source) =>
  FileOperation.CreateFromUpload.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ uploadId, name }) {
        const staged = source.peek(uploadId);
        if (!staged) {
          return yield* Effect.fail(new UploadNotFoundError(uploadId));
        }
        if (!FileLimits.isAcceptedMimeType(staged.type)) {
          return yield* Effect.fail(new UnsupportedUploadTypeError(staged.type));
        }

        const blob = yield* Blob.fromBytes(staged.bytes, { type: staged.type });
        const object = File.make({ name: name ?? staged.name, data: Ref.make(blob) });
        // The blob first: `SetParent` on `File.data` cascades deletion, so the child must exist
        // before the parent references it.
        yield* Database.add(blob);
        yield* Database.add(object);
        yield* Database.flush();
        source.consume(uploadId);
        return { object };
      }),
    ),
  );
