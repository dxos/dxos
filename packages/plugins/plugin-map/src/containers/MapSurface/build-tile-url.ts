//
// Copyright 2025 DXOS.org
//

import { type APIKey } from '@dxos/schema';

// Import the lazy wrapper (ComponentType<any>) so JSX assignment is not blocked by the
// compound GeoControlProps & MapArticleProps intersection that TS cannot unify directly.

// Kept out of `MapSurface.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on
// every edit.

/** Build a MapTiler tile URL when a `maptiler.com` API key is configured; otherwise undefined (default OSM). */
const MAPTILER_STYLE = 'streets-v2';

export const buildTileUrl = (apiKeys?: readonly APIKey[]): string | undefined => {
  const key = apiKeys?.find((entry) => entry.domain === 'maptiler.com');
  return key?.apiKey ? `https://api.maptiler.com/maps/${MAPTILER_STYLE}/{z}/{x}/{y}.png?key=${key.apiKey}` : undefined;
};
