//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { Obj, type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { File } from '@dxos/types';

import { useImageUrl } from './useImageUrl';

/** The renderable surface of a {@link Variant}: an ephemeral `url` and/or a materialized `content` object. */
export type VariantSource = {
  url?: string;
  content?: Ref.Ref<Obj.Unknown>;
};

const isFile = Obj.instanceOf(File.File);

/**
 * Resolves a {@link VariantSource} to a renderable `<img>`/`<video>` `src`: the ephemeral `url` when
 * present, else the materialized `content` when it is a `File.File` (loaded live so {@link useImageUrl}
 * can read the blob into a `data:`/`blob:` URL).
 */
export const useVariantSource = (source?: VariantSource): string | undefined => {
  const [fileObj, setFileObj] = useState<File.File>();
  const key = source?.url ?? source?.content?.uri;

  useEffect(() => {
    if (source?.url || !source?.content) {
      setFileObj(undefined);
      return;
    }
    let cancelled = false;
    void source.content
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setFileObj(isFile(loaded) ? loaded : undefined);
        }
      })
      .catch((err) => log.catch(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const fileUrl = useImageUrl(fileObj);
  return source?.url ?? fileUrl;
};
