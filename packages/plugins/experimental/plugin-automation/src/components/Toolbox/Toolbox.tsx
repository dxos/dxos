//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type ArtifactDefinition } from '@dxos/artifact';
import type { FunctionType } from '@dxos/functions';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ToolboxProps = ThemedClassName<{
  artifacts?: ArtifactDefinition[];
  functions?: FunctionType[];
}>;

export const Toolbox = ({ classNames, artifacts, functions }: ToolboxProps) => {
  return (
    <div className={mx('flex overflow-hidden box-content py-2', classNames)}>
      <div className='grid grid-cols-[6rem_8rem_1fr] overflow-y-auto'>
        {artifacts?.map(({ id, tools, ...rest }) =>
          tools.map(({ name, description }, i) => (
            <div
              key={id}
              className='col-span-full grid grid-cols-subgrid text-xs odd:bg-neutral-50 dark:odd:bg-neutral-800 px-2'
            >
              <div className='text-primary-500 truncate'>{i === 0 && id}</div>
              <div className='truncate'>{name}</div>
              <div className='text-subdued line-clamp-3'>{description}</div>
            </div>
          )),
        )}
        <div className='col-span-full grid grid-cols-subgrid text-xs odd:bg-neutral-50 dark:odd:bg-neutral-800 px-2'>
          {functions?.map(({ name, description }) => (
            <>
              <div className='text-primary-500 truncate'>{name}</div>
              <div className='truncate'>{description}</div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ToolboxContainer = ({ classNames }: ThemedClassName) => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);
  const functions: FunctionType[] = []; //useQuery(space, Filter.schema(FunctionType)); // no access to space
  return <Toolbox classNames={classNames} artifacts={artifactDefinitions} functions={functions} />;
};
