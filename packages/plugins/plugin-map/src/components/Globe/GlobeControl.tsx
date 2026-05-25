//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAsyncState, useThemeContext } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import {
  type ControlProps,
  Globe,
  type GlobeController,
  type GlobeRootProps,
  type LatLngLiteral,
  geoToPosition,
  globeStyles,
  positionToRotation,
  useDrag,
  useGlobeZoomHandler,
  useTour,
  useWheel,
} from '@dxos/react-ui-geo';
import { loadTopology } from '@dxos/react-ui-geo/data';
import { isNonNullable } from '@dxos/util';

import { type GeoControlProps } from '../types';

export type GlobeControlProps = GeoControlProps &
  GlobeRootProps & {
    onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
  };

export const GlobeControl = composable<HTMLDivElement, GlobeControlProps>(
  ({ center, zoom, markers = [], selected = [], onToggle, onChange, ...props }, forwardedRef) => {
    const [topology] = useAsyncState(loadTopology);
    const { themeMode } = useThemeContext();
    const styles = globeStyles(themeMode);

    // Capture the initial position once at mount and convert to a rotation. Passing rotation
    // directly bypasses the center→rotation effect chain in Globe.Canvas (which can race with
    // the first paint) and avoids feedback loops when updates bubble back through onChange.
    const initialRotation = useMemo(() => (center ? positionToRotation(geoToPosition(center)) : undefined), []);
    const initialZoom = useMemo(() => zoom, []);

    const [controller, setController] = useState<GlobeController | null>();
    const baseZoomHandler = useGlobeZoomHandler(controller);

    const emitChange = useCallback(() => {
      if (!controller) {
        return;
      }

      const [lng, lat] = controller.projection.rotate();
      onChange?.({ center: { lat: -lat, lng: -lng }, zoom: controller.zoom });
    }, [controller, onChange]);

    const handleZoomAction = useCallback<NonNullable<ControlProps['onAction']>>(
      (action) => {
        baseZoomHandler?.(action);
        requestAnimationFrame(emitChange);
      },
      [baseZoomHandler, emitChange],
    );

    const features = useMemo(
      () => ({
        points: markers?.map(({ location: { lat, lng } }) => ({ lat, lng })),
        lines: [],
      }),
      [markers],
    );

    const selectedPoints = useMemo<LatLngLiteral[]>(() => {
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
    useWheel(controller);
    useDrag(controller, {
      onUpdate: ({ type }) => {
        if (type === 'move') {
          setMoved(true);
        }
        if (type === 'end') {
          emitChange();
        }
      },
    });

    // TODO(burdon): Redo.
    const [active, setActive] = useState(false);
    const [_, setRunning] = useTour(controller, selectedPoints?.length ? selectedPoints : features.points, {
      running: active,
      loop: true,
      styles,
      autoRotate: !moved,
    });

    useEffect(() => setActive(!!selectedPoints?.length), [selectedPoints?.length]);

    const handleAction: ControlProps['onAction'] = (action) => {
      switch (action) {
        case 'toggle': {
          // Emit the live position so the next control inherits the user's current view.
          emitChange();
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
      <Globe.Root {...composableProps(props)} rotation={initialRotation} zoom={initialZoom} ref={forwardedRef}>
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
  },
);
