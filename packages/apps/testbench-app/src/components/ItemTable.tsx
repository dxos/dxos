//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { toJsonSchema, type S } from '@dxos/echo-schema';
import { type ReactiveObject } from '@dxos/live-object';
import { DynamicTable } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: S.Schema<T>;
  objects?: T[];
};

export const ItemTable = <T extends ReactiveObject<any>>({ schema, objects = [] }: ItemTableProps<T>) => {
  const jsonSchema = useMemo(() => toJsonSchema(schema), [schema]);
  return (
    <div role='none' className='is-full bs-full'>
      <DynamicTable jsonSchema={jsonSchema} objects={objects} />
    </div>
  );
};
