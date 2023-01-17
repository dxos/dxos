//
// Copyright 2023 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import React, { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { List, ListItemButton } from '../components';
import { useSpace } from '../hooks';
import { LatLng, Organization } from '../proto';

export const MapFrame = () => {
  // https://react-leaflet.js.org/docs/api-map
  return (
    <div className='flex flex-1 overflow-hidden'>
      <MapContainer className='flex flex-1'>
        <MapControl />
      </MapContainer>
    </div>
  );
};

export const MapControl = () => {
  const { space } = useSpace();
  const objects = useQuery(space, Organization.filter());
  const getter = {
    id: (object: Organization) => object[id],
    label: (object: Organization) => object.name
  };

  const [center, setCenter] = useState<LatLng>(); // { lng: -0.118, lat: 51.501 });
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 10);
    }
  }, [center]);

  useEffect(() => {
    if (objects.length) {
      handleSelect(objects[0]);
    }
  }, [objects]);

  const handleSelect = (item?: Organization) => {
    if (item) {
      const { lat, lng } = item.address?.coordinates ?? {};
      if (lat !== undefined && lng !== undefined) {
        setCenter({ lat, lng });
      }
    }
  };

  return (
    <div className='flex flex-1 overflow-hidden'>
      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {objects.map((item) => {
        const { lat, lng } = item.address?.coordinates ?? {};
        if (lat === undefined || lng === undefined) {
          return null;
        }

        return <Marker key={item[id]} position={{ lat, lng }} />;
      })}

      {objects.length && (
        <div className='flex flex-col absolute top-4 bottom-4 right-4 overflow-hidden' style={{ zIndex: 1000 }}>
          <div className='flex bg-white border rounded-md overflow-y-scroll' style={{ width: 240 }}>
            <PlaceList<Organization> items={objects} onSelect={handleSelect} getter={getter} />
          </div>
        </div>
      )}
    </div>
  );
};

// TODO(burdon): Standardize pattern.

type PlaceListPropsGetter<T> = {
  id: (object: T) => string;
  label: (object: T) => string;
};

type PlaceListProps<T = {}> = {
  items: T[];
  selected?: string;
  onSelect: (object?: T) => void;
  getter: PlaceListPropsGetter<T>;
};

export const PlaceList = <T,>({ items, getter, onSelect }: PlaceListProps<T>) => {
  const [selected, setSelected] = useState<string>(); // TODO(burdon): Controlled vs. non-controlled pattern.

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
