//
// Copyright 2023 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import React, { FC, useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { List, ListItemButton } from '../components';
import { useSpace } from '../hooks';
import { Organization } from '../proto';

/**
 * https://react-leaflet.js.org/docs/api-map
 */
export const Map: FC<{ items: Organization[]; center?: LatLngExpression }> = ({ items, center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center);
    }
  }, [center]);

  return (
    <>
      {items.map((item) => {
        // TODO(burdon): Dereference fails.
        const { lat, lng } = item.address?.coordinates ?? {};
        if (lat === undefined || lng === undefined) {
          return null;
        }

        return <Marker key={item[id]} position={{ lat, lng }} />;
      })}
    </>
  );
};

export const PlaceList: FC<{ items: Organization[]; onSelect: (object?: Organization) => void }> = ({
  items,
  onSelect
}) => {
  const [selected, setSelected] = useState<string>();
  const handleSelect = useCallback(
    (objectId: string) => {
      if (objectId === selected) {
        setSelected(undefined);
        onSelect(undefined);
      } else {
        setSelected(objectId);
        onSelect(items?.find((organization: Organization) => organization[id] === objectId));
      }
    },
    [items]
  );

  return (
    <div className='flex flex-col w-full overflow-hidden pt-2 pb-2 select-none'>
      <List>
        {items.map((organization) => (
          <ListItemButton
            key={organization[id]}
            selected={organization[id] === selected}
            onClick={() => handleSelect(organization[id])}
            classes={{
              root: 'p-1 text-sm',
              hover: 'bg-sky-100',
              selected: 'bg-sky-200'
            }}
          >
            {organization.name}
          </ListItemButton>
        ))}
      </List>
    </div>
  );
};

export const MapView = () => {
  const [center, setCenter] = useState({ lng: -0.118, lat: 51.501 });
  const { space } = useSpace();
  const organizations = useQuery(space, Organization.filter());

  const handleSelect = (organization?: Organization) => {
    if (organization) {
      const { lat, lng } = organization.address?.coordinates ?? {};
      setCenter({ lat, lng });
    }
  };

  return (
    <div className='flex flex-1 relative'>
      <MapContainer className='w-full' center={center} zoom={11}>
        <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
        <Map items={organizations} center={center} />
        <div className='flex flex-col absolute top-4 bottom-4 right-4 overflow-hidden' style={{ zIndex: 1000 }}>
          <div className='flex bg-white border rounded-md overflow-y-scroll' style={{ width: 240 }}>
            <PlaceList items={organizations} onSelect={handleSelect} />
          </div>
        </div>
      </MapContainer>
    </div>
  );
};
