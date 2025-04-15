//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Filter, type Space } from '@dxos/client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Icon, Input, List, ListItem } from '@dxos/react-ui';

import { useServices } from '../../hooks';
import { categoryIcons, ServiceType } from '../../types';

// TODO(burdon): Option to show all/enabled/filter.
export const ServiceRegistry = ({ space }: { space: Space }) => {
  const matchingServices = useServices(space);
  const enabledServices = useQuery(space, Filter.schema(ServiceType));

  // Join matching services with enabled services.
  const services = useMemo(() => {
    return matchingServices.map((service) => enabledServices.find((s) => s.serviceId === service.serviceId) ?? service);
  }, [matchingServices, enabledServices]);

  // TODO(burdon): Reaplce with SpacePlugin intent.
  const handleSetEnabled = (service: ServiceType, enabled: boolean) => {
    if (enabled) {
      space.db.add(service);
    } else {
      // TODO(burdon): Remove or disable?
      space.db.remove(service);
    }
  };

  return (
    <List classNames='h-full grid auto-rows-[5rem] gap-2 p-2 pis-2 pie-2 overflow-y-auto scrollbar-thin'>
      {services.map((service) => (
        <ServiceItem
          key={service.serviceId}
          service={service}
          enabled={service.enabled}
          setEnabled={(enabled) => handleSetEnabled(service, enabled)}
        />
      ))}
    </List>
  );
};

const ServiceItem = ({
  service,
  enabled,
  setEnabled,
}: {
  service: ServiceType;
  enabled?: boolean;
  setEnabled?: (enabled: boolean) => void;
}) => {
  return (
    <ListItem.Root classNames='flex flex-col gap-1 p-1 overflow-hidden rounded-md border border-separator'>
      <div className='grid grid-cols-[40px_1fr_40px]'>
        <div className='flex gow justify-center items-center'>
          <Icon icon={categoryIcons[service.category ?? 'default'] ?? 'ph--placeholder--regular'} size={6} />
        </div>
        <div className='grow items-center truncate mie-2'>{service.name}</div>
        <div className='flex gow justify-center items-center'>
          <Input.Root>
            <Input.Switch checked={enabled} onClick={() => setEnabled?.(!enabled)} />
          </Input.Root>
        </div>
      </div>
      <div className='grid grid-cols-[40px_1fr]'>
        <div />
        <div className='text-sm text-subdued line-clamp-2 mie-1'>{service.description}</div>
      </div>
    </ListItem.Root>
  );
};
