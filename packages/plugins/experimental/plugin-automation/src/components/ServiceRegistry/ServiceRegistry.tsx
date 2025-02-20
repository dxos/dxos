//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Space } from '@dxos/client/echo';
import { List } from '@dxos/react-ui';

import { useServiceRegistry } from '../../hooks';
import { type ServiceType } from '../../types';

export const ServiceRegistry = ({ space }: { space: Space }) => {
  const services = useServiceRegistry(space);

  return (
    <List classNames='grid auto-rows-[10rem] gap-3 p-3 overflow-y-auto scrollbar-thin'>
      {services.map((service) => (
        <div key={service.serviceId} className='flex'>
          <ServiceItem service={service} />
        </div>
      ))}
    </List>
  );
};

const ServiceItem = ({ service }: { service: ServiceType }) => {
  return <div>{service.name}</div>;
};
