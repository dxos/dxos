//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
// TODO(burdon): Move css to style imports?
// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { getSize, mx } from '@dxos/react-ui-theme';
import { GeoLocation, Organization } from '@dxos/kai-types';
import { NavMenu } from '@dxos/react-appkit';
import { useQuery } from '@dxos/react-client/echo';

import { useFrameContext } from '../../hooks';

// TODO(burdon): Needs to resize when sidebar opens/closes (if is open initially).
// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4
// Resources: https://www.latlong.net

const defaults = {
  center: { lat: 37.970833, lng: 23.72611 } as LatLngExpression,
  zoom: 13,
};

export const MapFrame = () => {
  return (
    <div className='flex flex-1 overflow-hidden z-10'>
      <MapContainer className='flex flex-1'>
        <MapControl />
      </MapContainer>
    </div>
  );
};

type MapPropsGetter<T> = {
  id: (object: T) => string;
  label: (object: T) => string;
  coordinates: (object: T) => GeoLocation | undefined;
};

/**
 * https://react-leaflet.js.org/docs/api-map
 */
export const MapControl = () => {
  const { space } = useFrameContext();
  const objects = useQuery(space, Organization.filter());
  const getter: MapPropsGetter<Organization> = {
    id: (object: Organization) => object.id,
    label: (object: Organization) => object.name,
    coordinates: (object: Organization) => object.address?.coordinates,
  };

  const [selected, setSelected] = useState<string>();
  const [center, setCenter] = useState<LatLngExpression>(defaults.center);
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom() ?? defaults.zoom);
    }
  }, [center]);

  useEffect(() => {
    if (objects.length) {
      handleSelect(objects[0]);
    }
  }, [objects]);

  const handleSelect = (object?: Organization) => {
    setSelected(object?.id);
    if (object) {
      const { lat, lng } = getter.coordinates(object) ?? {};
      if (lat !== undefined && lng !== undefined) {
        setCenter({ lat, lng });
      }
    }
  };

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Map tiles. */}
      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {/* Markers. */}
      {objects.map((object) => {
        const { lat, lng } = getter.coordinates(object) ?? {};
        if (lat === undefined || lng === undefined) {
          return null;
        }

        // TODO(burdon): Marker icon doesn't load on mobile.
        return <Marker key={getter.id(object)} position={{ lat, lng }} />;
      })}

      {/* List panel. */}
      {objects.length > 0 && (
        <div className='absolute block-start-4 block-end-4 inline-end-4 overflow-hidden bs-sm z-[9999]'>
          {/* TODO(burdon): Clicking on list starts map drag. */}
          <PlaceList<Organization> items={objects} value={selected} onSelect={handleSelect} getter={getter} />
        </div>
      )}
    </div>
  );
};

export type PlaceListProps<T = {}> = {
  items: T[];
  value?: string;
  onSelect: (object?: T) => void;
  getter: MapPropsGetter<T>;
};

// TODO(burdon): Generalize list control/selector.
export const PlaceList = <T,>({ items, value, getter, onSelect }: PlaceListProps<T>) => {
  const [selected, setSelected] = useState<string | undefined>(value);
  useEffect(() => setSelected(value), [value]);

  const handleSelect = useCallback(
    (objectId: string) => {
      if (objectId === selected) {
        setSelected(undefined);
        onSelect(undefined);
      } else {
        setSelected(objectId);
        onSelect(items?.find((item) => getter.id(item) === objectId));
      }
    },
    [items],
  );

  return (
    <NavMenu
      variant='vertical'
      slots={{ root: { className: 'cursor-default pointer-events-none' } }}
      items={items.map((item) => {
        const active = getter.id(item) === selected;
        return {
          children: (
            <>
              <Circle weight='fill' className={mx(getSize(4), 'text-selection-marker', !active && 'invisible')} />
              <span>{getter.label(item)}</span>
            </>
          ),
          triggerLinkProps: {
            className: '!text-current cursor-pointer pointer-events-auto flex items-center gap-2',
            onClick: () => handleSelect(getter.id(item)),
          },
        };
      })}
    />
  );
};

export default MapFrame;
