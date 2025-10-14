//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { Type } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { DynamicTable } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: Schema.Schema<T>;
  objects?: T[];
};

export const ItemTable = <T extends Live<any>>({ schema, objects = [] }: ItemTableProps<T>) => {
  const jsonSchema = useMemo(() => Type.toJsonSchema(schema), [schema]);
  return (
    <div role='none' className='is-full bs-full'>
      <DynamicTable jsonSchema={jsonSchema} rows={objects} />
    </div>
  );
};
