//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

/**
 * Probes whether an image URL actually loads in this document. Hotlinked
 * og-images are frequently blocked by the host's Cross-Origin-Resource-Policy
 * (ERR_BLOCKED_BY_RESPONSE.NotSameOrigin), which only surfaces at load time.
 * Needed for `Card.Poster`, whose underlying `Image` exposes no load-error
 * callback — a plain `<img>` can hide itself with an inline `onError` instead.
 */
export const useImageLoads = (src: string | undefined): boolean => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    if (!src) {
      return;
    }
    const probe = new window.Image();
    probe.onload = () => setLoaded(true);
    probe.src = src;
    return () => {
      probe.onload = null;
    };
  }, [src]);

  return loaded;
};
