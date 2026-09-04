//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useEffect, useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Blob, Database, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { Panel } from '@dxos/react-ui';
import { File } from '@dxos/types';

import { Preview } from '#components';

export type FileArticleProps = AppSurface.ObjectArticleProps<File.File>;

export const FileArticle = ({ role, subject: file, attendableId }: FileArticleProps) => {
  const [rendered, setRendered] = useState<{ url: string; type: string; size?: number } | undefined>(undefined);

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
      return { url, type, size };
    }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.catch(() => Effect.succeed(undefined)),
    );

    void EffectEx.runPromise(program).then((result) => {
      if (cancelled) {
        if (result?.url.startsWith('blob:')) {
          URL.revokeObjectURL(result.url);
        }
        return;
      }
      if (result?.url.startsWith('blob:')) {
        createdBlobUrl = result.url;
      }
      setRendered(result);
    });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
    // Keyed on `file.id` rather than `file`/`file.data` directly: ECHO's reactive proxy returns a
    // fresh `Ref` wrapper for `.data` on every access, so including it (or the proxy object itself)
    // here would rerun this effect on every render — clearing the render state and re-resolving it
    // each time, which flickers the image while the object settles.
  }, [file.id]);

  if (!rendered) {
    return null;
  }

  return (
    // No `dx-document`: that constrains content to the reading column, which is right for prose and
    // wrong for a preview — a PDF or image should use the full plank width.
    <Panel.Root role={role}>
      <Preview.Root
        type={rendered.type}
        url={rendered.url}
        name={file.name}
        size={rendered.size}
        attendableId={attendableId}
      >
        <Panel.Toolbar asChild>
          <Preview.Toolbar />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <Preview.Content />
        </Panel.Content>
      </Preview.Root>
    </Panel.Root>
  );
};

export default FileArticle;

FileArticle.displayName = 'FileArticle';
