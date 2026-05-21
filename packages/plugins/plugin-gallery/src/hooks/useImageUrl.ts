//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { FileCapabilities } from '@dxos/plugin-file/types';
import { getSpace } from '@dxos/react-client/echo';
import { File } from '@dxos/types';

/**
 * Resolves a renderable `<img src>` URL for a {@link File.File}.
 * - Inline bytes are turned into a `blob:` URL (revoked on unmount).
 * - `http(s)://`, `data:`, and `blob:` URLs pass through.
 * - Other URL schemes (e.g. `wnfs://`) are dispatched to the first matching
 *   {@link FileCapabilities.UrlResolver} contribution.
 */
export const useImageUrl = (file: File.File | undefined): string | undefined => {
  const resolvers = useCapabilities(FileCapabilities.UrlResolver);
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setResolved(undefined);
      return;
    }

    const { data, type } = file;
    if (data._tag === 'inline') {
      const url = URL.createObjectURL(new Blob([data.bytes as BlobPart], { type }));
      setResolved(url);
      return () => URL.revokeObjectURL(url);
    }

    if (/^(?:https?|data|blob):/i.test(data.url)) {
      setResolved(data.url);
      return;
    }

    const resolver = resolvers.find((r) => r.test(data.url));
    if (!resolver) {
      setResolved(undefined);
      return;
    }

    let cancelled = false;
    let createdBlobUrl: string | undefined;
    setResolved(undefined);
    void resolver
      .resolve(data.url, file, getSpace(file))
      .then((url) => {
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
      })
      .catch(() => {
        if (!cancelled) {
          setResolved(undefined);
        }
      });

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [file, file?.data, file?.type, resolvers]);

  return resolved;
};
