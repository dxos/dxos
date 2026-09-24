//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Blob, Database, Ref } from '@dxos/echo';
import { File } from '@dxos/types';

import { FileLimits, FileOperation } from '#types';

import { UnsupportedUploadTypeError, UploadNotFoundError } from './create-from-upload.ts';

/** Bytes a local host received on its own upload listener, keyed by the id it minted. */
export type Upload = {
  readonly bytes: Uint8Array;
  readonly type: string;
  readonly name?: string;
};

/** Hands over a completed upload exactly once; `undefined` when it never arrived or expired. */
export type Take = (uploadId: string) => Upload | undefined;

/**
 * `file.createFromUpload` for a host that stages uploads itself (`@dxos/mcp-server/LocalUpload`)
 * rather than on EDGE. Registered in place of the default handler, which adopts from EDGE's staging
 * area — a store these uploads never reach. The bytes go to the client's default blob backend
 * (EDGE when configured, inline otherwise), exactly as a UI upload's would.
 */
export const createFromUploadHandler = (take: Take) =>
  FileOperation.CreateFromUpload.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ uploadId, name }) {
        const staged = take(uploadId);
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
        return { object };
      }),
    ),
  );
