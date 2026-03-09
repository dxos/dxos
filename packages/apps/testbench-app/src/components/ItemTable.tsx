//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { JsonSchema, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: Schema.Schema<T>;
  objects?: T[];
};

export const ItemTable = <T extends object>({ schema, objects = [] }: ItemTableProps<T>) => {
  const jsonSchema = useMemo(() => JsonSchema.toJsonSchema(schema), [schema]);
  return (
    <div role='none' className='w-full h-full'>
      <DynamicTable jsonSchema={jsonSchema} rows={objects} />
    </div>
  );
};
