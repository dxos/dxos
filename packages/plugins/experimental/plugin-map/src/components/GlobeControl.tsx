//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Globe, type GlobeController, useDrag, useTour } from '@dxos/gem-globe';
import { type ThemeMode, useThemeContext } from '@dxos/react-ui';

import { type MapCanvasProps } from './Map';

const globeStyles = (themeMode: ThemeMode) =>
  themeMode === 'dark'
    ? {
        water: {
          fillStyle: '#000',
        },

        land: {
          fillStyle: '#050505',
          strokeStyle: 'darkgreen',
        },

        graticule: {
          strokeStyle: '#111',
        },

        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: 'yellow',
        },

        point: {
          radius: 0.2,
          fillStyle: 'red',
        },
      }
    : {
        water: {
          fillStyle: '#fff',
        },

        land: {
          fillStyle: '#f5f5f5',
          strokeStyle: '#ccc',
        },

        graticule: {
          strokeStyle: '#ddd',
        },

        line: {
          lineWidth: 1.5,
          lineDash: [4, 16],
          strokeStyle: '#333',
        },

        point: {
          radius: 0.2,
          fillStyle: 'red',
        },
      };

export type GlobeControlProps = MapCanvasProps & { onToggle: () => void };

export const GlobeControl = ({ classNames, markers = [], center, zoom, onToggle }: GlobeControlProps) => {
  const { themeMode } = useThemeContext();
  const styles = globeStyles(themeMode);

  const [controller, setController] = useState<GlobeController | null>();
  const features = useMemo(
    () => ({
      points: markers?.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    }),
    [markers],
  );

  // Control hooks.
  useDrag(controller);
  const [start] = useTour(controller, features, { styles });

  // TODO(burdon): Transform from center/zoom.
  return (
    <Globe.Root classNames={classNames} center={center} scale={zoom}>
      <Globe.Canvas ref={setController} projection='mercator' styles={styles} features={features} />
      <Globe.ActionControls onAction={onToggle} />
      <Globe.ZoomControls />
    </Globe.Root>
  );
};
