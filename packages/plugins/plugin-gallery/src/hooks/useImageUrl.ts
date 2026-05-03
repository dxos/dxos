//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { getBlobUrl, getPathFromUrl, loadWnfs } from '@dxos/plugin-wnfs/helpers';
import { WnfsCapabilities } from '@dxos/plugin-wnfs/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

const WNFS_PROTOCOL = 'wnfs://';

/**
 * Resolves an image URL for use in <img src>.
 * - http(s):// URLs are passed through as-is.
 * - wnfs:// URLs are resolved to a blob URL via the WNFS blockstore.
 */
export const useImageUrl = (url: string | undefined, type?: string): string | undefined => {
  const [blockstore] = useCapabilities(WnfsCapabilities.Blockstore);
  const [instances] = useCapabilities(WnfsCapabilities.Instances);
  const client = useClient();
  const [resolved, setResolved] = useState<string | undefined>(() =>
    url && !url.startsWith(WNFS_PROTOCOL) ? url : undefined,
  );

  useEffect(() => {
    if (!url) {
      setResolved(undefined);
      return;
    }
    if (!url.startsWith(WNFS_PROTOCOL)) {
      setResolved(url);
      return;
    }
    if (!blockstore) {
      return;
    }

    let cancelled = false;
    let createdBlobUrl: string | undefined;
    void (async () => {
      const path = getPathFromUrl(url);
      const spaceId = path[1];
      const space: Space | undefined = client.spaces.get().find((s) => s.id === spaceId);
      if (!space) {
        return;
      }
      const { directory, forest } = await loadWnfs({ blockstore, instances, space });
      const blobUrl = await getBlobUrl({ wnfsUrl: url, blockstore, directory, forest, type });
      createdBlobUrl = blobUrl;
      if (!cancelled) {
        setResolved(blobUrl);
      } else {
        URL.revokeObjectURL(blobUrl);
      }
    })();

    return () => {
      cancelled = true;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [url, blockstore, instances, client, type]);

  return resolved;
};
