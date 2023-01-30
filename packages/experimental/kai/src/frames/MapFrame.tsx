//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Move css to style imports?
// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { List, ListItemButton } from '../components';
import { useSpace } from '../hooks';
import { LatLng, Organization } from '../proto';

// TODO(burdon): Needs to resize when sidebar opens/closes (if is open initially).
// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4
// Resources: https://www.latlong.net

const defaults = {
  center: { lat: 37.970833, lng: 23.72611 } as LatLngExpression,
  zoom: 13
};

const MapFrame = () => {
  return (
    <div className='flex flex-1 overflow-hidden'>
      <MapContainer className='flex flex-1' center={defaults.center} zoom={defaults.zoom}>
        <MapControl />
      </MapContainer>
    </div>
  );
};

type MapPropsGetter<T> = {
  id: (object: T) => string;
  label: (object: T) => string;
  coordinates: (object: T) => LatLng | undefined;
};

/**
 * https://react-leaflet.js.org/docs/api-map
 */
export const MapControl = () => {
  const space = useSpace();
  const objects = useQuery(space, Organization.filter());
  const getter: MapPropsGetter<Organization> = {
    id: (object: Organization) => object[id],
    label: (object: Organization) => object.name,
    coordinates: (object: Organization) => object.address?.coordinates
  };

  const [selected, setSelected] = useState<string>();
  const [center, setCenter] = useState<LatLngExpression>();
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom() ?? 10);
    }
  }, [center]);

  useEffect(() => {
    if (objects.length) {
      handleSelect(objects[0]);
    }
  }, [objects]);

  const handleSelect = (object?: Organization) => {
    setSelected(object?.[id]);
    if (object) {
      const { lat, lng } = getter.coordinates(object) ?? {};
      if (lat !== undefined && lng !== undefined) {
        setCenter({ lat, lng });
      }
    }
  };

  return (
    <div className='flex flex-1 overflow-hidden'>
      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {/* Markers. */}
      {objects.map((object) => {
        const { lat, lng } = getter.coordinates(object) ?? {};
        if (lat === undefined || lng === undefined) {
          return null;
        }

        // TODO(burdon): Marker icon doesn't load on mobile?
        return <Marker key={getter.id(object)} position={{ lat, lng }} />;
      })}

      {/* List panel. */}
      {objects.length > 0 && (
        <div className='flex flex-col absolute top-4 bottom-4 right-4 overflow-hidden' style={{ zIndex: 1000 }}>
          <div className='flex bg-white border rounded-md overflow-y-auto' style={{ width: 240 }}>
            {/* TODO(burdon): Clicking on list starts map drag. */}
            <PlaceList<Organization> items={objects} value={selected} onSelect={handleSelect} getter={getter} />
          </div>
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
    [items]
  );

  return (
    <div className='flex flex-col w-full overflow-hidden pt-2 pb-2 select-none'>
      <List>
        {items.map((item) => (
          <ListItemButton
            key={getter.id(item)}
            selected={getter.id(item) === selected}
            onClick={() => handleSelect(getter.id(item))}
            classes={{
              root: 'p-1 text-sm',
              hover: 'bg-sky-100',
              selected: 'bg-sky-200'
            }}
          >
            {getter.label(item)}
          </ListItemButton>
        ))}
      </List>
    </div>
  );
};

export default MapFrame;
