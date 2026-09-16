//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type File } from '@dxos/types';

export type FileUrl = { url: string; type: string; size?: number };

/**
 * A URL the file's bytes can be rendered from — the blob's own when the store serves one, else an
 * object URL over the bytes, revoked when the file changes or the host unmounts.
 */
export const useFileUrl = (file: File.File): FileUrl | undefined => {
  const [rendered, setRendered] = useState<FileUrl | undefined>(undefined);
  const dataUri = file.data?.uri?.toString();

  useEffect(() => {
    setRendered(undefined);

    const db = Obj.getDatabase(file);
    if (!db) {
      return;
    }

    let cancelled = false;
    let createdBlobUrl: string | undefined;

    const program = Effect.gen(function* () {
      const blob = yield* Database.load(file.data);
      const type = blob.type ?? 'application/octet-stream';
      const size = blob.size;
      const urlOption = yield* Blob.url(blob);
      if (Option.isSome(urlOption)) {
        return { url: urlOption.value, type, size };
      }
      const bytes = yield* Blob.read(blob);
      // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
      // `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and
      // the TS standard lib, not fixable by typing `bytes` differently.
      const url = URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type }));
      // Only a URL this hook minted is its to revoke: the store's own `blob:` URL may be another consumer's.
      createdBlobUrl = url;
      return { url, type, size };
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.catch(() => Effect.succeed(undefined)),
    );

    void EffectEx.runPromise(program).then((result) => {
      if (cancelled) {
        if (createdBlobUrl) {
          URL.revokeObjectURL(createdBlobUrl);
        }
        return;
      }
      setRendered(result);
    });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
    // Keyed on the blob's URI rather than `file`/`file.data` directly: ECHO's reactive proxy returns
    // a fresh `Ref` wrapper for `.data` on every access, so including it (or the proxy object itself)
    // here would rerun this effect on every render — clearing the render state and re-resolving it
    // each time, which flickers the image while the object settles. The URI is what changes when a
    // download replaces the file's bytes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, dataUri]);

  return rendered;
};
