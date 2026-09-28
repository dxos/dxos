//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useThemeContext } from '@dxos/react-ui';
import { Globe, type ProjectionType, globeStyles, useTopology } from '@dxos/react-ui-geo';

export type WorldMapProps = {
  projection?: ProjectionType;
};

/** A static world map with no markers or interaction, for plugins that only need a backdrop. */
export const WorldMap = ({ projection = 'equirectangular' }: WorldMapProps) => {
  const { themeMode } = useThemeContext();
  const topology = useTopology();
  return (
    <Globe.Root>
      <Globe.Viewport>
        <Globe.Canvas topology={topology} projection={projection} styles={globeStyles(themeMode)} />
      </Globe.Viewport>
    </Globe.Root>
  );
};
