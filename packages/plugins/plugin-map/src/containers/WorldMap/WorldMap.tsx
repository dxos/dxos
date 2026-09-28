//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { Globe, type GlobeFit, type ProjectionType, globeStyles, useTopology } from '@dxos/react-ui-geo';

export type WorldMapProps = {
  projection?: ProjectionType;
  /** How the world sits in the surface, as `object-fit` places an image. */
  fit?: GlobeFit;
};

/** A static world map with no markers or interaction, for plugins that only need a backdrop. */
export const WorldMap = ({ projection = 'equirectangular', fit = 'contain' }: WorldMapProps) => {
  const { themeMode } = useThemeContext();
  const topology = useTopology();
  return (
    // Zoom 1 is the fit itself; the root's default zooms in past it.
    <Globe.Root zoom={1}>
      <Globe.Viewport>
        <Globe.Canvas topology={topology} projection={projection} fit={fit} styles={globeStyles(themeMode)} />
      </Globe.Viewport>
    </Globe.Root>
  );
};
