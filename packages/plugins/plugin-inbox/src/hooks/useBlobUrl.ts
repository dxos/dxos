//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useEffect, useState } from 'react';

import { Blob, Database, Obj, type Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';

export type BlobResource = {
  /** Object url for the blob's bytes, or `undefined` until resolved (or on failure). */
  url?: string;
  /** MIME type as recorded on the blob; `undefined` when the blob did not declare one. */
  type?: string;
  /** True while resolving — distinct from "resolved to nothing", which is a failure worth reporting. */
  pending: boolean;
};

/**
 * Resolves a blob ref to a displayable object url, mirroring the `Blob.url()` → `Blob.read()` +
 * `createObjectURL` fallback `useCidResolver` uses for inline images.
 *
 * Unlike that resolver this owns the url's lifetime: a url minted here is revoked on unmount or when
 * the ref changes, since nothing downstream caches it.
 */
export const useBlobUrl = (ref: Ref.Ref<Obj.Unknown> | undefined, db: Database.Database | undefined): BlobResource => {
  const [resource, setResource] = useState<BlobResource>({ pending: true });
  const uri = ref?.uri;

  useEffect(() => {
    if (!db || !ref) {
      setResource({ pending: false });
      return;
    }

    let cancelled = false;
    // Only a url this hook minted may be revoked; `Blob.url()` can return one owned elsewhere.
    let minted: string | undefined;
    setResource({ pending: true });

    void EffectEx.runPromise(
      Effect.gen(function* () {
        const blob = yield* Database.load(ref);
        if (!Obj.instanceOf(Blob.Blob, blob)) {
          return undefined;
        }
        const existing = yield* Blob.url(blob);
        if (Option.isSome(existing)) {
          return { url: existing.value, type: blob.type };
        }
        const bytes = yield* Blob.read(blob);
        // `Uint8Array` is generic over `ArrayBufferLike` while DOM's `BlobPart` only covers
        // `ArrayBuffer`-backed views — a gap in the lib types, not something a different annotation fixes.
        minted = URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type: blob.type }));
        return { url: minted, type: blob.type };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.catch(() => Effect.succeed(undefined)),
      ),
    )
      .then((resolved) => {
        if (cancelled) {
          // Resolved after unmount: nothing will render it, so release it here instead of leaking.
          if (minted) {
            URL.revokeObjectURL(minted);
          }
          return;
        }
        setResource({ ...resolved, pending: false });
      })
      .catch((err) => {
        // `Effect.catch` above only handles TYPED failures; a defect still rejects here. Without this
        // the rejection would be unhandled — logged rather than swallowed, and the viewer falls back to
        // its "could not be loaded" state instead of spinning forever.
        log.catch(err);
        if (!cancelled) {
          setResource({ pending: false });
        }
      });

    return () => {
      cancelled = true;
      if (minted) {
        URL.revokeObjectURL(minted);
      }
    };
    // `uri` stands in for `ref`: ECHO's proxy can hand back a fresh ref object on each access.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, uri]);

  return resource;
};

/** Render strategy for an attachment, chosen from its MIME type. */
export type AttachmentKind = 'pdf' | 'image' | 'text' | 'unsupported';

/**
 * Maps a MIME type onto how the attachment should be displayed. Unknown types are `unsupported`
 * rather than guessed: rendering arbitrary bytes in an iframe is how a mail client becomes an
 * execution surface for a hostile attachment.
 */
export const getAttachmentKind = (type: string | undefined): AttachmentKind => {
  if (!type) {
    return 'unsupported';
  }
  if (type === 'application/pdf') {
    return 'pdf';
  }
  if (type.startsWith('image/') && type !== 'image/svg+xml') {
    // SVG excluded deliberately: inline script and event handlers make it active content.
    return 'image';
  }
  if (type.startsWith('text/') && type !== 'text/html') {
    return 'text';
  }
  return 'unsupported';
};
