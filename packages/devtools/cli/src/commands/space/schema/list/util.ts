//
// Copyright 2025 DXOS.org
//

import { FormBuilder } from '../../../../util';

type SchemaEntry = {
  id?: string;
  typename: string;
  version: string;
};

export const mapSchemas = (schemas: SchemaEntry[]) => {
  return schemas.map((schema) => ({
    id: schema.id,
    typename: schema.typename,
    version: schema.version,
  }));
};

export const printSchema = (schema: SchemaEntry) =>
  FormBuilder.make({ title: schema.typename }).pipe(
    FormBuilder.set('id', schema.id ?? '<none>'),
    FormBuilder.set('typename', schema.typename),
    FormBuilder.set('version', schema.version),
    FormBuilder.build,
  );

export const printSchemas = (schemas: SchemaEntry[]) => {
  return schemas.map(printSchema);
};

export const createTypenameFilter = (typenameFilter?: string) => {
  if (!typenameFilter) {
    return () => true;
  }

  return (schema: SchemaEntry) => schema.typename.toLowerCase().includes(typenameFilter.toLowerCase());
};
