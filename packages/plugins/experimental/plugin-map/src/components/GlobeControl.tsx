//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

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

export const GlobeControl = ({ classNames, markers = [], onToggle }: GlobeControlProps) => {
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
  useEffect(() => {
    controller?.setRotation([0, -40, 0]);
  }, [controller]);

  return (
    <Globe.Root classNames={classNames} scale={2}>
      <Globe.Canvas ref={setController} projection='mercator' styles={styles} features={features} />
      <Globe.ActionControls onAction={onToggle} />
      <Globe.ZoomControls />
    </Globe.Root>
  );
};
