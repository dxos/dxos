//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ArtifactDefinition } from '@dxos/artifact';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

export type ToolboxProps = ThemedClassName<{
  artifacts?: ArtifactDefinition[];
}>;

export const Toolbox = ({ classNames, artifacts }: ToolboxProps) => {
  return (
    <div className={mx('flex overflow-hidden box-content', classNames)}>
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
      </div>
    </div>
  );
};
