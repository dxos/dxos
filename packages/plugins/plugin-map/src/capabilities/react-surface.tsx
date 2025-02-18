//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { type LatLngLiteral } from '@dxos/react-ui-geo';

import { MapCapabilities } from './capabilities';
import { MapContainer, MapControl } from '../components';
import { MAP_PLUGIN } from '../meta';
import { MapType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${MAP_PLUGIN}/map`,
      role: ['article', 'section'],
      filter: (data): data is { subject: MapType } => data.subject instanceof MapType,
      component: ({ data, role }) => {
        const state = useCapability(MapCapabilities.MutableState);
        const [lng = 0, lat = 0] = data.subject.coordinates ?? [];
        const [center, setCenter] = useState<LatLngLiteral>({ lat, lng });
        const [zoom, setZoom] = useState(14);

        const handleChange = useCallback(({ center, zoom }: { center: LatLngLiteral; zoom: number }) => {
          setCenter(center);
          setZoom(zoom);
        }, []);

        return (
          <MapContainer
            role={role}
            type={state.type}
            map={data.subject}
            center={center}
            zoom={zoom}
            onChange={handleChange}
          />
        );
      },
    }),
    createSurface({
      id: 'plugin-map',
      role: 'canvas-node',
      filter: (data) => isInstanceOf(MapType, data),
      component: ({ data }) => {
        const [lng = 0, lat = 0] = data.coordinates ?? [];
        return <MapControl center={{ lat, lng }} zoom={14} />;
      },
    }),
  ]);
