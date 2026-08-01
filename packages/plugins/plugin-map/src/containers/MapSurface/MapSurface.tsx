//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useAtomCapability, useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { type Obj } from '@dxos/echo';
import { type LatLngLiteral } from '@dxos/react-ui-geo';
import { type APIKey } from '@dxos/schema';

import { MapCapabilities } from '#types';

// Import the lazy wrapper (ComponentType<any>) so JSX assignment is not blocked by the
// compound GeoControlProps & MapArticleProps intersection that TS cannot unify directly.
import { MapArticle } from '../index';

// MapTiler raster style used when an API key for `maptiler.com` is configured.
const MAPTILER_STYLE = 'streets-v2';

/** Build a MapTiler tile URL when a `maptiler.com` API key is configured; otherwise undefined (default OSM). */
export const buildTileUrl = (apiKeys?: readonly APIKey[]): string | undefined => {
  const key = apiKeys?.find((entry) => entry.domain === 'maptiler.com');
  return key?.apiKey ? `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=${key.apiKey}` : undefined;
};

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
