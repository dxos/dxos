//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton, ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type SchemaTableProps = ThemedClassName<{
  types: any[];
  objects?: Record<string, number | undefined>;
  label: string;
  onClick: (typename: string) => void;
}>;

export const SchemaTable = ({ classNames, types, objects = {}, label, onClick }: SchemaTableProps) => {
  return (
    <div className={mx('grid grid-cols-[1fr_80px_40px] gap-1 overflow-none', classNames)}>
      <h2 className='p-2'>{label}</h2>
      {types.map((type) => (
        <div key={type.typename} className='grid grid-cols-subgrid col-span-3 items-center'>
          <div className='px-2 text-sm font-mono text-subdued'>{type.typename}</div>
          <div className='px-2 text-right font-mono'>{objects[type.typename] ?? 0}</div>
          <IconButton
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label='Create data'
            onClick={() => onClick(type.typename)}
          />
        </div>
      ))}
    </div>
  );
};
