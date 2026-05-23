//
// Copyright 2024 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { JsonSchema, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  schema: Schema.Schema<T> | Type.AnyType;
  objects?: T[];
};

export const ItemTable = <T extends object>({ schema, objects = [] }: ItemTableProps<T>) => {
  const jsonSchema = useMemo(() => JsonSchema.toJsonSchema(Type.getSchema(schema as any)), [schema]);
  return <DynamicTable classNames='dx-container' jsonSchema={jsonSchema} rows={objects} />;
};
