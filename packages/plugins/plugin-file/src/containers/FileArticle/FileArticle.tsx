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

import { FilePreview } from '#components';
import { File } from '#types';

export type FileArticleProps = AppSurface.ObjectArticleProps<File.File>;

export const FileArticle = ({ role, subject: file }: FileArticleProps) => {
  const [renderUrl, setRenderUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRenderUrl(undefined);

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
      return URL.createObjectURL(new globalThis.Blob([bytes as BlobPart], { type: file.type }));
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
      setRenderUrl(url);
    });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
    // Keyed on `file.id`/`file.type` rather than `file`/`file.data` directly: ECHO's reactive
    // proxy returns a fresh `Ref` wrapper for `.data` on every access, so including it (or the
    // proxy object itself) here would rerun this effect on every render — clearing renderUrl to
    // undefined and re-resolving it each time, which flickers the image while the object settles.
  }, [file.id, file.type]);

  if (!renderUrl) {
    return null;
  }

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content asChild>
        <FilePreview type={file.type} url={renderUrl} />
      </Panel.Content>
    </Panel.Root>
  );
};

export default FileArticle;
