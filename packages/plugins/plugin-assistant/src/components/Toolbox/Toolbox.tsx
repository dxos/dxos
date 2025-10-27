//
// Copyright 2025 DXOS.org
//

import React, { type FC, Fragment, useEffect, useState } from 'react';

import { type Blueprint } from '@dxos/blueprints';
import { type Ref } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { log } from '@dxos/log';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { type ThemedClassName } from '@dxos/react-ui';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';
import { type AiChatProcessor } from '../../processor';
import { ServiceType } from '../../types';

export type ToolboxProps = ThemedClassName<{
  services?: { service: ServiceType }[];
  functions?: Function.Function[];
  // TODO(burdon): Combine into single array.
  blueprints?: readonly Ref.Ref<Blueprint.Blueprint>[];
  activeBlueprints?: readonly Ref.Ref<Blueprint.Blueprint>[];
}>;

export const Toolbox = ({ classNames, functions, services, blueprints, activeBlueprints }: ToolboxProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <div className={mx('flex flex-col overflow-y-auto box-content', classNames)}>
      {blueprints && blueprints.length > 0 && (
        <Section
          title='Blueprints'
          items={blueprints.map(({ target }) => ({
            name: target?.name ?? '',
            description: target?.description ?? '',
            subitems: target?.tools.map((toolId) => ({ name: `∙ ${safeToolId(toolId)}` })),
          }))}
        />
      )}

      {activeBlueprints && activeBlueprints.length > 0 && (
        <Section
          title='Blueprints'
          items={activeBlueprints.map(({ target }) => ({
            name: target?.name ?? '',
            description: target?.description ?? '',
            subitems: target?.tools.map((toolId) => ({ name: `∙ ${safeToolId(toolId)}` })),
          }))}
        />
      )}

      {services && services.length > 0 && (
        <Section
          title='Services'
          items={services.map(({ service: { serviceId, name, description } }) => ({
            name: name ?? serviceId,
            description,
            // subitems: tools.map(({ name, description }) => ({ name: `∙ ${name}`, description })),
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

export type ToolboxContainerProps = ThemedClassName<{
  space?: Space;
  processor?: AiChatProcessor;
}>;

export const ToolboxContainer = ({ classNames, space, processor }: ToolboxContainerProps) => {
  // Registered services.
  const services = useQuery(space, Filter.type(ServiceType));
  const [serviceTools, setServiceTools] = useState<{ service: ServiceType }[]>([]);
  useEffect(() => {
    log('creating service tools...', { services: services.length });
    queueMicrotask(async () => {
      // TODO(burdon): Fix.
      // const tools = await Promise.all(
      //   services.map(async (service) => ({ service, tools: await createToolsFromService(service) })),
      // );
      // setServiceTools(tools);
    });
  }, [services]);

  // Deployed functions.
  const functions = useQuery(space, Filter.type(Function.Function));

  return (
    <Toolbox
      classNames={classNames}
      blueprints={processor?.context.blueprints.value}
      services={serviceTools}
      functions={functions}
    />
  );
};

const safeToolId = (name: string) => {
  return name.split('_').pop();
};
