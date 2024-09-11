//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useRef } from 'react';

import { Globe, type GlobeController, useDrag, useTour } from '@dxos/gem-globe';
import { type ThemeMode, useThemeContext } from '@dxos/react-ui';
import { getDebugName } from '@dxos/util';

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
  const { tx, themeMode } = useThemeContext();
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

  const clazz = tx('toolbar.root', 'TOOLBAR_MISSING', {});
  console.log('tx(toolbar.root)', clazz, getDebugName(tx));
  if (!clazz) {
    return null;
  }

  return (
    <Globe.Root classNames={classNames} scale={2}>
      <Globe.Canvas ref={controller} styles={styles} projection='mercator' features={features} />
      <Globe.ActionControls onAction={start} />
      <Globe.ZoomControls onAction={onToggle} />
    </Globe.Root>
  );
};
