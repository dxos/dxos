//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useThemeContext } from '@dxos/react-ui';
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
  useTopology,
  useTour,
  useWheel,
} from '@dxos/react-ui-geo';
import { isNonNullable } from '@dxos/util';

import { type GeoControlProps } from '../types';

export type GlobeControlProps = GeoControlProps &
  GlobeRootProps & {
    onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
  };

/** Squared planar distance heuristic for nearest-marker search. */
const distanceSq = (a: LatLngLiteral, b: LatLngLiteral): number => {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return dLat * dLat + dLng * dLng;
};

export const GlobeControl = composable<HTMLDivElement, GlobeControlProps>(
  ({ center, zoom, markers = [], lines = [], selected = [], onSelect, onToggle, onChange, ...props }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const styles = globeStyles(themeMode);

    // Track the live globe zoom so topology resolution refines as the user zooms in
    // (progressive level-of-detail; see useTopology). Seeded from the initial zoom prop.
    const [zoomLevel, setZoomLevel] = useState<number>(zoom ?? 1);
    const topology = useTopology(zoomLevel);

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
      setZoomLevel(controller.zoom);
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
        lines: lines.map(({ source, target }) => ({ source, target })),
      }),
      [markers, lines],
    );

    // Click on the globe canvas selects the nearest marker (within a threshold), mirroring the
    // leaflet marker-click behaviour so map and globe selection stay consistent.
    const handleSelectNearest = useCallback(
      (clientX: number, clientY: number) => {
        if (!onSelect || !controller?.canvas || !controller.projection) {
          return;
        }
        const rect = controller.canvas.getBoundingClientRect();
        const coords = controller.projection.invert?.([clientX - rect.left, clientY - rect.top]);
        if (!coords) {
          return;
        }
        const [lng, lat] = coords;
        const click: LatLngLiteral = { lat, lng };

        let bestId: string | undefined;
        let bestDist = Infinity;
        for (const marker of markers) {
          const distance = distanceSq(marker.location, click);
          if (distance < bestDist) {
            bestDist = distance;
            bestId = marker.id;
          }
        }
        // Threshold (~5 degrees) so clicks on empty ocean don't select a far-away marker.
        if (bestId && bestDist < 25) {
          onSelect(bestId);
        }
      },
      [controller, markers, onSelect],
    );

    useEffect(() => {
      const canvas = controller?.canvas;
      if (!canvas) {
        return;
      }
      const handler = (event: MouseEvent) => handleSelectNearest(event.clientX, event.clientY);
      canvas.addEventListener('click', handler);
      return () => canvas.removeEventListener('click', handler);
    }, [controller?.canvas, handleSelectNearest]);

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
    // emitChange updates the local zoom level (for topology LOD) and propagates the new view to the
    // parent so a wheel/pinch zoom isn't lost on the next re-render.
    useWheel(controller, { onUpdate: emitChange });
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
      <Globe.Root rotation={initialRotation} zoom={initialZoom} ref={setController}>
        <Globe.Viewport {...composableProps(props)} ref={forwardedRef}>
          <Globe.Canvas topology={topology} projection='orthographic' features={features} styles={styles} />
          <Globe.Action onAction={handleAction} />
          <Globe.Zoom onAction={handleZoomAction} />
        </Globe.Viewport>
      </Globe.Root>
    );
  },
);
