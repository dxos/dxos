//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { IconButton } from '@dxos/react-ui';

export type SchemaTableProps = {
  types: any[];
  objects?: Record<string, number | undefined>;
  label: string;
  onClick: (typename: string) => void;
};

export const SchemaTable = ({ types, objects = {}, label, onClick }: SchemaTableProps) => {
  return (
    <div className='grid grid-cols-[1fr_80px_40px] gap-1 overflow-hidden'>
      <div className='grid grid-cols-subgrid col-span-3'>
        <div className='px-2 py-1 text-sm text-primary-500'>{label}</div>
      </div>
      {types.map((type) => (
        <div key={type.typename} className='grid grid-cols-subgrid col-span-3 items-center'>
          <div className='px-2 py-1 text-sm font-mono text-green-500'>{type.typename}</div>
          <div className='px-2 py-1 text-right font-mono'>{objects[type.typename] ?? 0}</div>
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
