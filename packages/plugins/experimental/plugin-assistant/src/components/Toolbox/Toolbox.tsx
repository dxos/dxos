//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect, Fragment, type FC } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { parseToolName, type ArtifactDefinition, type Tool } from '@dxos/artifact';
import { FunctionType } from '@dxos/functions';
import { log } from '@dxos/log';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { createToolsFromService } from '../../tools';
import { ServiceType } from '../../types';

export type ToolboxProps = ThemedClassName<{
  artifacts?: ArtifactDefinition[];
  services?: { service: ServiceType; tools: Tool[] }[];
  functions?: FunctionType[];
  striped?: boolean;
}>;

export const Toolbox = ({ classNames, artifacts, functions, services, striped }: ToolboxProps) => {
  return (
    <div className={mx('flex flex-col overflow-y-auto box-content', classNames)}>
      {artifacts && artifacts.length > 0 && (
        <Section
          title='Artifacts'
          items={artifacts.map(({ name, description, tools }) => ({
            name,
            description,
            subitems: tools.map(({ name, description }) => ({ name: `∙ ${parseToolName(name)}`, description })),
          }))}
        />
      )}

      {services && services.length > 0 && (
        <Section
          title='Services'
          items={services.map(({ service: { serviceId, name, description }, tools }) => ({
            name: name ?? serviceId,
            description,
            subitems: tools.map(({ name, description }) => ({ name: `∙ ${name}`, description })),
          }))}
        />
      )}

      {functions && functions.length > 0 && (
        <Section title='Functions' items={functions.map(({ name, description }) => ({ name, description }))} />
      )}
    </div>
  );
};

const Section: FC<{
  title: string;
  items: { name: string; description?: string; subitems?: { name: string; description?: string }[] }[];
  striped?: boolean;
}> = ({ title, items, striped }) => {
  const stripeClassNames = 'odd:bg-neutral-50 dark:odd:bg-neutral-800';
  const gridClassNames = 'grid grid-cols-[8rem_1fr]';
  const subGridClassNames = mx('col-span-full grid grid-cols-subgrid text-xs px-2', striped && stripeClassNames);

  return (
    <div>
      <h1 className='px-2 text-sm'>{title}</h1>
      <div className={gridClassNames}>
        {items.map(({ name, description, subitems }, i) => (
          <Fragment key={i}>
            {name && (
              <div className={subGridClassNames}>
                <div className='truncate text-primary-500'>{name}</div>
                <div className='line-clamp-2'>{description}</div>
              </div>
            )}
            {subitems?.map(({ name, description }, i) => (
              <div key={i} className={mx(subGridClassNames, striped && stripeClassNames)}>
                <div className='truncate'>{name}</div>
                <div className='line-clamp-3 text-subdued'>{description}</div>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export const ToolboxContainer = ({ classNames, space }: ThemedClassName<{ space?: Space }>) => {
  // Plugin artifacts.
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);

  // Registered services.
  const services = useQuery(space, Filter.schema(ServiceType));
  const [serviceTools, setServiceTools] = useState<{ service: ServiceType; tools: Tool[] }[]>([]);
  useEffect(() => {
    log('creating service tools...', { services: services.length });
    queueMicrotask(async () => {
      const tools = await Promise.all(
        services.map(async (service) => ({ service, tools: await createToolsFromService(service) })),
      );

      setServiceTools(tools);
    });
  }, [services]);

  // Deployed functions.
  const functions = useQuery(space, Filter.schema(FunctionType));

  return (
    <Toolbox classNames={classNames} artifacts={artifactDefinitions} services={serviceTools} functions={functions} />
  );
};
