//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, Fragment } from 'react';

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

const stripeClassNames = 'odd:bg-neutral-50 dark:odd:bg-neutral-800';

export const Toolbox = ({ classNames, artifacts, functions, services, striped }: ToolboxProps) => {
  const gridClassNames = 'grid grid-cols-[8rem_8rem_1fr]';
  const subGridClassNames = mx('col-span-full grid grid-cols-subgrid text-xs px-2', striped && stripeClassNames);

  return (
    <div className={mx('flex flex-col overflow-y-auto box-content', classNames)}>
      {artifacts && artifacts.length > 0 && (
        <div>
          <h1 className='px-2 text-sm'>Artifacts</h1>
          <div className={gridClassNames}>
            {artifacts.map(({ id, description, tools }) => (
              <Fragment key={id}>
                <div className={subGridClassNames}>
                  <div className='text-primary-500 truncate'>{id}</div>
                  <div className='col-span-2 line-clamp-2'>{description}</div>
                </div>
                {tools.map(({ name, description }, i) => (
                  <div key={`${name}-${i}`} className={subGridClassNames}>
                    <div />
                    <div className='truncate'>{name}</div>
                    <div className='text-subdued line-clamp-3'>{description}</div>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {services && services.length > 0 && (
        <div>
          <h1 className='px-2 text-sm'>Services</h1>
          <div className={gridClassNames}>
            {services.map(({ service, tools }) => (
              <Fragment key={service.serviceId}>
                <div className={subGridClassNames}>
                  <div className='text-primary-500 truncate'>{service.name ?? service.serviceId}</div>
                  <div className='col-span-2 line-clamp-2'>{service.description}</div>
                </div>
                {tools.map(({ name, description }, i) => (
                  <div key={name} className={mx(subGridClassNames, striped && stripeClassNames)}>
                    <div className='text-primary-500 truncate'>{i === 0 && service.serviceId}</div>
                    <div className='truncate'>{name}</div>
                    <div className='truncate'>{description}</div>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {functions && functions.length > 0 && (
        <div>
          <h1 className='px-2 text-sm'>Functions</h1>
          <div className={gridClassNames}>
            {functions.map(({ name, description }) => (
              <div key={name} className={mx(subGridClassNames, striped && stripeClassNames)}>
                <div className='text-primary-500 truncate'>function</div>
                <div className='truncate'>{name}</div>
                <div className='truncate'>{description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
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
