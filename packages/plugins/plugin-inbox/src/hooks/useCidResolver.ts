//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { useMemo } from 'react';

import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type HtmlSrcResolver } from '@dxos/react-ui-components';
import { type Message } from '@dxos/types';

/**
 * Resolves `<img src="cid:...">` references (inline attachments, per RFC 2392) against a message's
 * attachments, mirroring the `Database.load` → `Blob.url()`/`Blob.read()`+`createObjectURL()` fallback
 * used by `useImageUrl`/`plugin-file`'s image decorations.
 *
 * Lives here rather than in the renderer so the shared UI package stays free of ECHO: the resolver is
 * built where the database already is, and `Html` only sees `(src) => Promise<string | undefined>`.
 */
export const useCidResolver = (
  attachments: readonly Message.Attachment[] | undefined,
  db: Database.Database | undefined,
): HtmlSrcResolver | undefined => {
  // ECHO's reactive proxy can return a fresh array reference on every access, so a stable primitive key
  // stands in for `attachments` — keying on the array itself would rebuild the resolver (and re-resolve
  // every image) on unrelated renders.
  const attachmentsKey =
    attachments?.map((attachment) => `${attachment.contentId ?? ''}:${attachment.ref.uri}`).join(',') ?? '';

  return useMemo<HtmlSrcResolver | undefined>(() => {
    if (!db || !attachmentsKey) {
      return undefined;
    }

    const byContentId = new Map(
      (attachments ?? [])
        .filter((attachment) => attachment.contentId)
        .map((attachment) => [attachment.contentId!, attachment]),
    );

    return async (src) => {
      if (!src.startsWith('cid:')) {
        return undefined;
      }
      const attachment = byContentId.get(src.slice('cid:'.length).replace(/^<|>$/g, ''));
      if (!attachment) {
        return undefined;
      }

      return EffectEx.runPromise(
        Effect.gen(function* () {
          const blob = yield* Database.load(attachment.ref);
          if (!Obj.instanceOf(Blob.Blob, blob)) {
            return undefined;
          }
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
        ),
      );
    };
    // `attachmentsKey` stands in for `attachments` (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, attachmentsKey]);
};
