//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Button, useControlledState, useThemeContext, useTranslation } from '@dxos/react-ui';

import { translationKey } from '#translations';

import { type GlobeController, useTopology } from '../../hooks/index.ts';
import { type GeoMarker } from '../../types.ts';
import { globeStyles } from '../../util/index.ts';
import { Globe } from '../Globe/index.ts';

export type WorldMapView = 'map' | 'globe';

export type WorldMapProps = {
  /** Plotted as points; the one whose id is `selected` is highlighted. */
  markers?: GeoMarker[];
  selected?: string;
  /** `map` is the flat equirectangular world; `globe` is orthographic and turns to the selected marker. */
  view?: WorldMapView;
  onViewChange?: (view: WorldMapView) => void;
};

/**
 * The whole world with a set of markers, flat or as a globe, with a toggle between the two.
 * On the globe a change of selection turns the earth about its axis to the selected marker.
 */
export const WorldMap = ({ markers = [], selected, view: viewProp = 'map', onViewChange }: WorldMapProps) => {
  const { t } = useTranslation(translationKey);
  const { themeMode } = useThemeContext();
  // No graticule: the map is a backdrop for the markers, and the grid competes with them.
  const styles = useMemo(() => {
    const { graticule: _graticule, ...styles } = globeStyles(themeMode);
    return styles;
  }, [themeMode]);
  const topology = useTopology();
  const [view, setView] = useControlledState<WorldMapView>(viewProp, onViewChange);
  const [controller, setController] = useState<GlobeController | null>(null);

  const location = markers.find((marker) => marker.id === selected)?.location;
  const features = useMemo(
    () => ({ points: markers.map((marker) => marker.location), selected: location ? [location] : [] }),
    [markers, location],
  );

  // The flat map always shows the whole world, so it only resets; the globe turns to the selection.
  useEffect(() => {
    if (!controller) {
      return;
    }
    if (view === 'map') {
      controller.cancelFlyTo();
      controller.setRotation([0, 0, 0]);
    } else if (location) {
      // Turned about the axis to the marker's meridian and kept level on the equator, so the move reads
      // as the earth spinning. A newer selection interrupts this one, which rejects; that is expected.
      controller
        .flyTo({ lat: 0, lng: location.lng }, { path: 'axis', duration: 600, msPerRadian: 400 })
        .catch(() => {});
    }
  }, [controller, view, location?.lat, location?.lng]);

  return (
    <Globe.Root zoom={1} ref={setController}>
      <Globe.Viewport>
        <Globe.Canvas
          topology={topology}
          projection={view === 'globe' ? 'orthographic' : 'equirectangular'}
          fit='contain'
          styles={styles}
          features={features}
        />
        <Globe.Panel position='topright'>
          <Button
            data-testid='worldMap.toggle'
            icon={view === 'globe' ? 'ph--map-trifold--regular' : 'ph--globe-hemisphere-west--regular'}
            iconOnly
            label={t(view === 'globe' ? 'show-map.button' : 'show-globe.button')}
            onClick={() => setView(view === 'globe' ? 'map' : 'globe')}
          />
        </Globe.Panel>
      </Globe.Viewport>
    </Globe.Root>
  );
};
