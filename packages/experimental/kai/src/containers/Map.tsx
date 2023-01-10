//
// Copyright 2023 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { LatLngExpression } from 'leaflet';
import React, { FC, useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { EchoObject, id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { mx } from '@dxos/react-components';

import { useSpace } from '../hooks';
import { Organization } from '../proto';

/**
 * https://react-leaflet.js.org/docs/api-map
 */
export const Map: FC<{ center?: LatLngExpression }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center);
    }
  }, [center]);

  return (
    <>
      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
      {center && <Marker position={center} />}
    </>
  );
};

// TODO(burdon): Generic list class.
export const PlaceList: FC<{ onSelect: (object: EchoObject) => void }> = ({ onSelect }) => {
  const [selected, setSelected] = useState<string>();
  const { space } = useSpace();
  const organizations = useQuery(space, Organization.filter());

  const handleSelect = (object: EchoObject) => {
    setSelected(object[id]);
    onSelect(object);
  };

  return (
    <div className='flex flex-col w-full overflow-hidden pt-2 pb-2 select-none text-sm'>
      {organizations.map((organization) => (
        <div
          key={organization[id]}
          className={mx(
            'pl-4 pr-4 overflow-hidden text-ellipsis whitespace-nowrap cursor-pointer hover:bg-sky-100',
            selected === organization[id] && 'bg-sky-200'
          )}
          onClick={() => handleSelect(organization)}
        >
          {organization.name}
        </div>
      ))}
    </div>
  );
};

export const MapView = () => {
  const [center, setCenter] = useState({ lng: -0.118, lat: 51.501 });

  const handleSelect = (organization: EchoObject) => {
    const { lat, lng } = (organization as Organization).address?.coordinates ?? {};
    setCenter({ lat, lng });
  };

  return (
    <div className='flex flex-1 relative'>
      <MapContainer className='w-full' center={center} zoom={11}>
        <Map center={center} />
        <div className='flex flex-col absolute top-4 bottom-4 right-4 overflow-hidden' style={{ zIndex: 1000 }}>
          <div className='flex bg-white border rounded-md overflow-y-scroll' style={{ width: 240 }}>
            <PlaceList onSelect={handleSelect} />
          </div>
        </div>
      </MapContainer>
    </div>
  );
};
