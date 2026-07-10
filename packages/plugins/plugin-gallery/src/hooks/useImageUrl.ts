//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type File } from '@dxos/types';

/**
 * Resolves a renderable `<img src>` URL for a {@link File.File}.
 * Inline blobs resolve to a `data:` URL; external blobs are resolved via the registered
 * backend's `getUrl`, if it implements one — otherwise the bytes are read and turned into a
 * `blob:` URL (revoked on unmount).
 */
export const useImageUrl = (file: File.File | undefined): string | undefined => {
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    setResolved(undefined);

    if (!file) {
      return;
    }

    const db = Obj.getDatabase(file);
    if (!db) {
      return;
    }

    let cancelled = false;
    let createdBlobUrl: string | undefined;

    const program = Effect.gen(function* () {
      const blob = yield* Database.load(file.data);
      const urlOption = yield* Blob.url(blob);
      if (Option.isSome(urlOption)) {
        return urlOption.value;
      }
      const bytes = yield* Blob.read(blob);
      // `Uint8Array` is generic over `ArrayBufferLike` (incl. `SharedArrayBuffer`) while DOM's
      // `BlobPart` only covers `ArrayBuffer`-backed views — a gap between the DOM lib types and
      // the TS standard lib, not fixable by typing `bytes` differently.
      return URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type: blob.type }));
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.catchAll(() => Effect.succeed(undefined)),
    );

    void EffectEx.runPromise(program).then((url) => {
      if (cancelled) {
        if (url?.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
        return;
      }
      if (url?.startsWith('blob:')) {
        createdBlobUrl = url;
      }
      setResolved(url);
    });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
    // Keyed on `file?.id` rather than `file`/`file.data` directly: ECHO's reactive proxy returns a
    // fresh `Ref` wrapper for `.data` on every access, so including it (or the proxy object itself)
    // here would rerun this effect on every render — clearing resolved to undefined and
    // re-resolving it each time, which flickers the image while the object settles.
  }, [file?.id]);

  return resolved;
};
