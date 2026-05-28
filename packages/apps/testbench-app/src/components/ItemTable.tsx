//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { JsonSchema, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

export type ItemTableProps<T> = {
  type: Type.AnyEntity;
  objects?: T[];
};

export const ItemTable = <T extends object>({ type, objects = [] }: ItemTableProps<T>) => {
  const jsonSchema = useMemo(() => JsonSchema.toJsonSchema(Type.getSchema(type)), [type]);
  return <DynamicTable classNames='dx-container' jsonSchema={jsonSchema} rows={objects} />;
};
