//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { Globe, type GlobeController, useDrag, useTour } from '@dxos/gem-globe';
import { type ThemeMode, useThemeContext } from '@dxos/react-ui';

import { type MapTilesProps } from './Map';

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

export const GlobeControl = ({ classNames, markers = [] }: MapTilesProps) => {
  const { themeMode } = useThemeContext();
  const styles = globeStyles(themeMode);
  const controller = useRef<GlobeController>(null);
  const features = useMemo(
    () => ({
      points: markers?.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    }),
    [markers],
  );
  useDrag(controller.current);
  const [start] = useTour(controller.current, features, { styles });
  useEffect(() => {
    // controller.current?.setRotation([0, -40, 0]);
  }, []);

  return (
    <Globe.Root classNames={classNames} scale={2}>
      <Globe.Canvas ref={controller} styles={styles} projection='mercator' features={features} />
      <Globe.Controls onAction={() => start()} />
    </Globe.Root>
  );
};
