//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type ThemeMode, useThemeContext, useAsyncState } from '@dxos/react-ui';
import {
  type ControlProps,
  Globe,
  type GlobeController,
  type MapCanvasProps,
  loadTopology,
  useDrag,
  useGlobeZoomHandler,
  useTour,
} from '@dxos/react-ui-geo';

const globeStyles = (themeMode: ThemeMode) =>
  themeMode === 'dark'
    ? {
        water: {
          fillStyle: '#191919',
        },

        land: {
          fillStyle: '#444',
          strokeStyle: '#222',
        },

        border: {
          strokeStyle: '#111',
        },

        graticule: {
          strokeStyle: '#111',
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
  const [topology] = useAsyncState(loadTopology);
  const { themeMode } = useThemeContext();
  const styles = globeStyles(themeMode);

  const [controller, setController] = useState<GlobeController | null>();
  const handleZoomAction = useGlobeZoomHandler(controller);
  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        onToggle();
        break;
      }

      case 'start': {
        start();
        break;
      }

      default: {
        handleZoomAction?.(action);
      }
    }
  };

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

  return (
    <Globe.Root classNames={classNames} center={center} scale={zoom}>
      <Globe.Canvas ref={setController} topology={topology} projection='mercator' styles={styles} features={features} />
      <Globe.Action onAction={handleAction} />
      <Globe.Zoom />
    </Globe.Root>
  );
};
