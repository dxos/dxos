//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import {
  type IconRegistry,
  IconRegistryContext,
  type IconSource,
  NoopRegistry,
  acquireRegistry,
  defaultSources,
} from './icon-registry.ts';

export type IconRegistryProviderProps = PropsWithChildren<{
  /**
   * Icon sets resolvable at runtime; defaults to Phosphor at `/phosphor`. Only the first
   * mounted provider's sources apply, since the registry is shared across a document.
   */
  sources?: IconSource[];
}>;

/**
 * Provides the shared icon registry to descendants (consumed by `useIconHref`), acquiring
 * the refcounted document-level singleton on mount and releasing it on unmount.
 */
export const IconRegistryProvider = ({ children, sources = defaultSources }: IconRegistryProviderProps) => {
  const [registry, setRegistry] = useState<IconRegistry>(NoopRegistry);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const { registry, release } = acquireRegistry(sources);
    setRegistry(registry);
    return release;
    // Sources are read once when the shared registry is created; later changes are ignored by design.
  }, []);

  return <IconRegistryContext.Provider value={registry}>{children}</IconRegistryContext.Provider>;
};
