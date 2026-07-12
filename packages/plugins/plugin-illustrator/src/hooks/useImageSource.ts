//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type File } from '@dxos/types';

import { useImageUrl } from './useImageUrl';

/** A gallery item — a remote URL (generated) and/or an uploaded file blob. */
export type ImageSource = {
  url?: string;
  file?: Ref.Ref<File.File>;
  name?: string;
};

/**
 * Resolves an {@link ImageSource} to a renderable `<img src>`: the remote `url` when present, else
 * the uploaded file's `data:`/`blob:` URL (loaded live so {@link useImageUrl} can read the blob).
 */
export const useImageSource = (source?: Pick<ImageSource, 'url' | 'file'>): string | undefined => {
  const [fileObj, setFileObj] = useState<File.File>();
  const fileKey = source?.file?.uri;

  useEffect(() => {
    if (!source?.file) {
      setFileObj(undefined);
      return;
    }
    let cancelled = false;
    void source.file
      .load()
      .then((loaded) => {
        if (!cancelled) {
          setFileObj(loaded);
        }
      })
      .catch((err) => log.catch(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  const fileUrl = useImageUrl(fileObj);
  return source?.url ?? fileUrl;
};
