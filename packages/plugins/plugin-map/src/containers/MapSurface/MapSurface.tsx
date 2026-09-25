//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Obj } from '@dxos/echo';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

// Import the lazy wrapper (ComponentType<any>) so JSX assignment is not blocked by the
// compound GeoControlProps & MapArticleProps intersection that TS cannot unify directly.
import { MapArticle } from '#containers';
import { MapCapabilities } from '#types';

import { buildTileUrl } from './build-tile-url.ts';

// MapTiler raster style used when an API key for `maptiler.com` is configured.

export type MapSurfaceProps = {
  subject: Obj.Any;
  attendableId?: string;
  role?: string;
};

/**
 * Resolves the marker provider, tile URL and selection writer for {@link MapArticle} and wires the
 * shared map view state (globe/map type, last center/zoom). Used by the map article/section, the
 * generic `map` inline role, and the map companion.
 */
export const MapSurface = ({ subject, attendableId, role }: MapSurfaceProps) => {
  const providers = useCapabilities(MapCapabilities.MarkerProvider);
  const provider = useMemo(() => providers.find((entry) => entry.match(subject)), [providers, subject]);
  const settings = useAtomCapability(MapCapabilities.Settings);
  const tileUrl = useMemo(() => buildTileUrl(settings?.apiKeys), [settings?.apiKeys]);
  const state = useAtomCapability(MapCapabilities.State);
  const { invokePromise } = useOperationInvoker();

  const [center, setCenter] = useState<LatLngLiteral | undefined>(undefined);
  const [zoom, setZoom] = useState<number | undefined>(undefined);
  const handleChange = useCallback(({ center, zoom }: { center: LatLngLiteral; zoom: number }) => {
    setCenter(center);
    setZoom(zoom);
  }, []);

  const handleSelect = useCallback(
    (contextId: string, mode: 'single' | 'multi', id: string) => {
      const subject = mode === 'multi' ? { mode: 'multi' as const, ids: [id] } : { mode: 'single' as const, id };
      void invokePromise(LayoutOperation.Select, { contextId, subject });
    },
    [invokePromise],
  );

  return (
    <MapArticle
      role={role}
      subject={subject}
      attendableId={attendableId}
      provider={provider}
      tileUrl={tileUrl}
      type={state.type}
      center={center}
      zoom={zoom}
      onChange={handleChange}
      onSelect={handleSelect}
    />
  );
};

MapSurface.displayName = 'MapSurface';
