//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type ArtifactDefinition, type Tool } from '@dxos/artifact';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { createToolsFromService } from '../../tools';
import { ServiceType } from '../../types';

export type ToolboxProps = ThemedClassName<{
  artifacts?: ArtifactDefinition[];
  functions?: FunctionType[];
  services?: { service: ServiceType; tools: Tool[] }[];
  striped?: boolean;
}>;

const stripClassNames = 'odd:bg-neutral-50 dark:odd:bg-neutral-800';

export const Toolbox = ({ classNames, artifacts, functions, services, striped }: ToolboxProps) => {
  return (
    <div className={mx('flex overflow-hidden box-content py-2', classNames)}>
      <div className='grid grid-cols-[6rem_8rem_1fr] overflow-y-auto'>
        {artifacts?.map(({ id, tools, ...rest }) =>
          tools.map(({ name, description }, i) => (
            <div
              key={`${id}-${i}`}
              className={mx('col-span-full grid grid-cols-subgrid text-xs px-2', striped && stripClassNames)}
            >
              <div className='text-primary-500 truncate'>{i === 0 && id}</div>
              <div className='truncate'>{name}</div>
              <div className='text-subdued line-clamp-3'>{description}</div>
            </div>
          )),
        )}
        {functions?.map(({ name, description }) => (
          <div
            key={name}
            className={mx('col-span-full grid grid-cols-subgrid text-xs px-2', striped && stripClassNames)}
          >
            <div className='text-primary-500 truncate'>function</div>
            <div className='truncate'>{name}</div>
            <div className='truncate'>{description}</div>
          </div>
        ))}
        {services?.map(({ service, tools }) =>
          tools.map(({ name, description }, i) => (
            <div
              key={`${service.id}-${name}`}
              className={mx('col-span-full grid grid-cols-subgrid text-xs px-2', striped && stripClassNames)}
            >
              <div className='text-primary-500 truncate'>{i === 0 && service.serviceId}</div>
              <div className='truncate'>{name}</div>
              <div className='truncate'>{description}</div>
            </div>
          )),
        )}
      </div>
    </div>
  );
};

export const ToolboxContainer = ({ classNames, space }: ThemedClassName<{ space?: Space }>) => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const functions = useQuery(space, Filter.schema(FunctionType));

  const services = useQuery(space, Filter.schema(ServiceType));
  const [serviceTools, setServiceTools] = useState<{ service: ServiceType; tools: Tool[] }[]>([]);
  useEffect(() => {
    log('creating service tools...');
    queueMicrotask(async () => {
      const tools = await Promise.all(
        services.map(async (service) => ({ service, tools: await createToolsFromService(service) })),
      );
      setServiceTools(tools);
    });
  }, [services]);

  return (
    <Toolbox classNames={classNames} artifacts={artifactDefinitions} functions={functions} services={serviceTools} />
  );
};
