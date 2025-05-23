//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type ThemeMode, useThemeContext, useAsyncState } from '@dxos/react-ui';
import {
  type ControlProps,
  Globe,
  type GlobeController,
  type LatLng,
  type MapCanvasProps,
  loadTopology,
  useDrag,
  useGlobeZoomHandler,
  useTour,
} from '@dxos/react-ui-geo';
import { isNonNullable } from '@dxos/util';

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

export type GlobeControlProps = MapCanvasProps & { onToggle?: () => void };

export const GlobeControl = ({
  classNames,
  markers = [],
  selected = [],
  center,
  zoom,
  onToggle,
}: GlobeControlProps) => {
  const [topology] = useAsyncState(loadTopology);
  const { themeMode } = useThemeContext();
  const styles = globeStyles(themeMode);

  const [controller, setController] = useState<GlobeController | null>();
  const handleZoomAction = useGlobeZoomHandler(controller);

  const features = useMemo(
    () => ({
      points: markers?.map(({ location: { lat, lng } }) => ({ lat, lng })),
      lines: [],
    }),
    [markers],
  );

  const selectedPoints = useMemo<LatLng[]>(() => {
    if (selected?.length === 0) {
      return features.points;
    }

    const points = selected
      .map((id) => {
        const marker = markers.find((marker) => marker.id === id);
        return marker ? marker.location : undefined;
      })
      .filter(isNonNullable);

    return points;
  }, [markers, selected]);

  const [moved, setMoved] = useState(false);
  useDrag(controller, {
    onUpdate: () => setMoved(true),
  });
  const [running, setRunning] = useTour(controller, selectedPoints?.length ? selectedPoints : features.points, {
    loop: true,
    styles,
    autoRotate: !moved,
  });

  useEffect(() => setRunning(!!selectedPoints?.length), [running, selectedPoints?.length]);

  const handleAction: ControlProps['onAction'] = (action) => {
    switch (action) {
      case 'toggle': {
        onToggle?.();
        break;
      }

      case 'start': {
        setRunning((running) => !running);
        setMoved(false);
        break;
      }
    }
  };

  return (
    <Globe.Root classNames={classNames} center={center} scale={zoom}>
      <Globe.Canvas
        ref={setController}
        topology={topology}
        projection='orthographic'
        features={features}
        styles={styles}
      />
      <Globe.Action onAction={handleAction} />
      <Globe.Zoom onAction={handleZoomAction} />
    </Globe.Root>
  );
};
