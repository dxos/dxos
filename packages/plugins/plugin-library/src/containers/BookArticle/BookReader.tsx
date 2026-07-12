//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { type RefObject, forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { Blob, Database, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { useObject } from '@dxos/react-client/echo';
import { Button, Icon, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Book } from '#types';

import { EpubReader, type EpubReaderHandle, type ReaderLocation } from './EpubReader';

const ACCEPT = '.pdf,.epub,application/pdf,application/epub+zip';
const EPUB_TYPE = 'application/epub+zip';
const PDF_TYPE = 'application/pdf';

type Resolved = { url: string; type: string; revoke: boolean };

/** Browsers often omit the MIME type for `.epub` (and sometimes `.pdf`); infer it from the extension. */
const fileType = (file: File): string => {
  if (file.type) {
    return file.type;
  }
  const name = file.name.toLowerCase();
  return name.endsWith('.epub') ? EPUB_TYPE : name.endsWith('.pdf') ? PDF_TYPE : '';
};

const Spinner = () => (
  <div role='none' className='grid bs-full place-items-center text-description'>
    <Icon icon='ph--spinner-gap--regular' size={6} classNames='animate-spin' />
  </div>
);

/**
 * "Read" view of a book: renders the attached content blob (PDF/EPUB) inline, or an upload affordance
 * when none is attached. The blob is resolved to a renderable URL via the ECHO blob backend (a `data:`
 * / backend URL when available, otherwise an object URL built from the raw bytes and revoked on cleanup).
 * Forwards a paging handle to the EPUB reader (null for PDF/no content) so the toolbar can page.
 */
export const BookReader = forwardRef<EpubReaderHandle, { book: Book.Book }>(({ book }, forwardedRef) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(book);
  // Subscribe so attaching (or replacing) the content blob re-renders and re-resolves.
  const [live] = useObject(book);
  const contentRef = live.content;
  // The ref object identity is not stable across reactive snapshots; key the resolver on the target URI
  // so it runs once per attached blob rather than on every unrelated re-render (the loader flicker).
  const contentKey = contentRef ? String(contentRef.uri) : undefined;

  const [resolved, setResolved] = useState<Resolved | undefined>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reading position: restore the exact CFI on open (fraction as a fallback), and persist it as the
  // reader relocates. `lastCfiRef` starts at the saved CFI so the restore's own relocate is a no-op —
  // guarding on the CFI (not the percent) also stops the saved position drifting forward each reopen.
  const initialCfi = live.progress?.cfi;
  const initialFraction = (live.progress?.percent ?? 0) / 100;
  const lastCfiRef = useRef<string | undefined>(live.progress?.cfi);
  const handleRelocate = useCallback(
    ({ fraction, cfi, current, total }: ReaderLocation) => {
      if (!cfi || cfi === lastCfiRef.current) {
        return;
      }
      lastCfiRef.current = cfi;
      // Keep the whole progress current for posterity: the CFI is the exact restore anchor, `percent`
      // (integer) is the published progress, and current/total record the reader's location count.
      Obj.update(book, (book) => {
        book.progress = {
          ...book.progress,
          cfi,
          percent: Math.round(fraction * 100),
          ...(current && current > 0 ? { currentPage: current } : {}),
          ...(total && total > 0 ? { totalPages: total } : {}),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [book],
  );

  useEffect(() => {
    if (!contentRef || !db) {
      setResolved(undefined);
      setError(false);
      return;
    }
    let cancelled = false;
    setResolved(undefined);
    setError(false);
    const program = Effect.gen(function* () {
      const blob = yield* Database.load(contentRef);
      const type = blob.type ?? '';
      const urlOption = yield* Blob.url(blob);
      // A `data:` URL (inline blob) renders directly; for anything else build an object URL from the raw
      // bytes so rendering never depends on a backend URL being reachable in an <iframe> or `fetch`.
      if (Option.isSome(urlOption) && urlOption.value.startsWith('data:')) {
        return { url: urlOption.value, type, revoke: false };
      }
      const bytes = yield* Blob.read(blob);
      // DOM `BlobPart` vs the TS-stdlib `Uint8Array` differ only at the lib-typing boundary; the value
      // is a valid blob part. `globalThis.Blob` — the namespace import shadows the DOM `Blob` global.
      return { url: URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type })), type, revoke: true };
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.catchAll(() => Effect.succeed(undefined)),
    );
    void EffectEx.runPromise(program).then((next) => {
      if (cancelled) {
        // The effect resolved after unmount/ref-change; revoke the URL we will never render.
        if (next?.revoke) {
          URL.revokeObjectURL(next.url);
        }
        return;
      }
      if (next) {
        setResolved(next);
      } else {
        setError(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contentKey, db]);

  // Revoke object URLs (not backend/data URLs) when they are replaced or on unmount.
  useEffect(() => {
    return () => {
      if (resolved?.revoke) {
        URL.revokeObjectURL(resolved.url);
      }
    };
  }, [resolved]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!db) {
        return;
      }
      setBusy(true);
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const blob = await EffectEx.runPromise(
          Blob.fromBytes(bytes, { type: fileType(file) }).pipe(Effect.provide(Database.layer(db))),
        );
        const added = db.add(blob);
        Obj.update(book, (book) => {
          book.content = Ref.make(added);
        });
      } finally {
        setBusy(false);
      }
    },
    [db, book],
  );

  // Upload in progress, then blob resolution in progress — a single spinner across both avoids the
  // flash of the "unavailable" prompt between attaching the blob and resolving its URL.
  if (busy) {
    return <Spinner />;
  }
  if (!contentRef) {
    return <UploadPrompt busy={busy} inputRef={inputRef} onFile={handleFile} label={t('upload-content.label')} accept={ACCEPT} message={t('no-content.message')} />;
  }
  if (resolved) {
    if (resolved.type === EPUB_TYPE) {
      return (
        <EpubReader
          ref={forwardedRef}
          url={resolved.url}
          title={live.catalog?.title}
          initialCfi={initialCfi}
          initialFraction={initialFraction}
          onRelocate={handleRelocate}
        />
      );
    }
    if (resolved.type === PDF_TYPE) {
      return <iframe src={resolved.url} title={live.catalog?.title ?? t('view-read.label')} className='is-full bs-full border-0' />;
    }
    return (
      <div role='none' className='grid bs-full place-items-center p-4'>
        <Button asChild>
          <a href={resolved.url} download>
            {t('download-file.label')}
          </a>
        </Button>
      </div>
    );
  }
  if (error) {
    return <UploadPrompt busy={busy} inputRef={inputRef} onFile={handleFile} label={t('upload-content.label')} accept={ACCEPT} message={t('content-unavailable.message')} />;
  }
  return <Spinner />;
});

BookReader.displayName = 'BookReader';

type UploadPromptProps = {
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  label: string;
  message: string;
  accept: string;
};

const UploadPrompt = ({ busy, inputRef, onFile, label, message, accept }: UploadPromptProps) => (
  <div role='none' className='flex bs-full flex-col items-center justify-center gap-3 p-4 text-center'>
    <Icon icon='ph--book-open--regular' size={10} classNames='text-description' />
    <p className='text-sm text-description'>{message}</p>
    <input
      ref={inputRef}
      type='file'
      accept={accept}
      className='sr-only'
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) {
          onFile(file);
        }
        event.target.value = '';
      }}
    />
    <Button disabled={busy} onClick={() => inputRef.current?.click()}>
      <Icon icon='ph--upload-simple--regular' size={4} classNames='mie-2' />
      {label}
    </Button>
  </div>
);
