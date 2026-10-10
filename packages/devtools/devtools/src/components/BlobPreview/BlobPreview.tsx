//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useEffect, useState } from 'react';

import { Blob, Database, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as Icon from '@dxos/react-ui/Icon';
import * as Media from '@dxos/react-ui/Media';
import * as ScrollArea from '@dxos/react-ui/ScrollArea';

/** Text past this size is truncated: the preview is for recognizing content, not reading a log file. */
const MAX_TEXT_LENGTH = 64 * 1024;

/**
 * The blob an object carries: the object itself when it is a {@link Blob.Blob}, else the first top-level
 * reference to one (e.g. `File.data`). Synchronous, so a panel can decide whether to open before loading.
 */
export const findBlobRef = (object: Obj.Unknown | undefined): Blob.Blob | Ref.Ref<Obj.Unknown> | undefined => {
  if (!object) {
    return undefined;
  }
  if (Obj.instanceOf(Blob.Blob, object)) {
    return object;
  }
  for (const value of Object.values(object)) {
    if (Ref.isRef(value) && value.target && Obj.instanceOf(Blob.Blob, value.target)) {
      return value;
    }
  }
  return undefined;
};

type BlobResource = {
  url?: string;
  type?: string;
  size?: number;
  text?: string;
  error?: string;
  pending: boolean;
};

/**
 * Resolves a blob to an object url (and, for text, its decoded contents). Owns the url's lifetime: a url
 * minted here is revoked on unmount or when the blob changes.
 */
const useBlobResource = (
  source: Blob.Blob | Ref.Ref<Obj.Unknown> | undefined,
  db: Database.Database | undefined,
): BlobResource => {
  const [resource, setResource] = useState<BlobResource>({ pending: true });
  const key = source ? (Ref.isRef(source) ? source.uri : source.id) : undefined;

  useEffect(() => {
    if (!db || !source) {
      setResource({ pending: false });
      return;
    }

    let cancelled = false;
    // Only a url minted here may be revoked; `Blob.url()` can return one owned by the backend.
    let minted: string | undefined;
    setResource({ pending: true });

    void EffectEx.runPromise(
      Effect.gen(function* () {
        const blob = Ref.isRef(source) ? yield* Database.load(source) : source;
        if (!Obj.instanceOf(Blob.Blob, blob)) {
          return { pending: false, error: 'Not a blob.' };
        }
        const { type, size } = blob;
        const existing = yield* Blob.url(blob);
        // Bytes are read only where the url cannot stand in for them, so previewing a large PDF does not download it twice.
        if (Option.isSome(existing) && !isText(type)) {
          return { pending: false, url: existing.value, type, size };
        }
        const bytes = yield* Blob.read(blob);
        const text = isText(type) ? new TextDecoder().decode(bytes.slice(0, MAX_TEXT_LENGTH)) : undefined;
        if (Option.isSome(existing)) {
          return { pending: false, url: existing.value, type, size, text };
        }
        // `Uint8Array` is generic over `ArrayBufferLike`, while DOM's `BlobPart` only admits `ArrayBuffer`-backed views.
        minted = URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type }));
        return { pending: false, url: minted, type, size, text };
      }).pipe(
        Effect.provide(Database.layer(db)),
        Effect.catch((error) => Effect.succeed<BlobResource>({ pending: false, error: String(error) })),
      ),
    )
      .then((resolved) => {
        if (cancelled) {
          if (minted) {
            URL.revokeObjectURL(minted);
          }
          return;
        }
        setResource(resolved);
      })
      .catch((err) => {
        log.catch(err);
        if (!cancelled) {
          setResource({ pending: false, error: String(err) });
        }
      });

    return () => {
      cancelled = true;
      if (minted) {
        URL.revokeObjectURL(minted);
      }
    };
    // `key` stands in for `source`: ECHO can hand back a fresh ref object on each access.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, key]);

  return resource;
};

const isText = (type: string | undefined) =>
  !!type && (type.startsWith('text/') || type === 'application/json' || type.endsWith('+json'));

export type BlobPreviewProps = {
  source: Blob.Blob | Ref.Ref<Obj.Unknown>;
  db?: Database.Database;
};

/**
 * Renders a blob's content by MIME type: images, PDFs, audio/video and text inline; anything else as
 * its type and size with a download link.
 */
export const BlobPreview = ({ source, db }: BlobPreviewProps) => {
  const { url, type, size, text, error, pending } = useBlobResource(source, db);

  if (pending) {
    return <Message icon='ph--spinner-gap--regular' text='Loading…' />;
  }
  if (error || !url) {
    return <Message icon='ph--warning--regular' text={error ?? 'Blob is not available.'} />;
  }

  const info = (
    <div className='flex shrink-0 items-center gap-2 px-2 py-1 text-xs text-fg-subtle border-b border-separator'>
      <span className='truncate grow'>{type ?? 'unknown type'}</span>
      {size !== undefined && <span>{formatSize(size)}</span>}
      <a href={url} download className='text-accent-text' title='Download'>
        <Icon.Icon icon='ph--download-simple--regular' size='sm' />
      </a>
    </div>
  );

  return (
    <div className='flex flex-col h-full overflow-hidden' data-testid='blob-preview'>
      {info}
      <div className='dx-grow overflow-hidden'>
        <BlobContent url={url} type={type} text={text} />
      </div>
    </div>
  );
};

BlobPreview.displayName = 'BlobPreview';

const BlobContent = ({ url, type, text }: { url: string; type?: string; text?: string }) => {
  if (type?.startsWith('image/')) {
    // An `<img>` never executes an SVG's scripts, so SVG is safe to show here too.
    return <img src={url} alt='Blob preview' className='dx-fill object-contain' />;
  }
  if (type === 'application/pdf') {
    return <iframe src={url} title='PDF preview' className='dx-fill border-none' />;
  }
  if (type?.startsWith('video/') || type?.startsWith('audio/')) {
    return <Media.Player src={url} kind={type.startsWith('video/') ? 'video' : 'audio'} fit='contain' />;
  }
  if (text !== undefined) {
    return (
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <pre className='p-2 text-sm whitespace-pre-wrap break-all'>{text}</pre>
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    );
  }

  return <Message icon='ph--file--regular' text='No preview for this type.' />;
};

const Message = ({ icon, text }: { icon: string; text: string }) => (
  <div className='flex h-full items-center justify-center gap-2 p-4 text-sm text-fg-subtle'>
    <Icon.Icon icon={icon} size='md' />
    <span>{text}</span>
  </div>
);

const formatSize = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};
