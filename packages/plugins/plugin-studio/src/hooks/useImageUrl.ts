//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type File } from '@dxos/types';

/**
 * Resolves a renderable `<img src>` URL for a {@link File.File}. Inline blobs resolve to a `data:`
 * URL; external blobs resolve via the backend's `getUrl` when available, else the bytes are read into
 * a `blob:` URL (revoked on unmount). Vendored from plugin-gallery.
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
    // Keyed on `file?.id`: ECHO's reactive proxy returns a fresh `Ref` wrapper for `.data` on every
    // access, so depending on the proxy object would re-run this effect every render and flicker.
  }, [file?.id]);

  return resolved;
};
