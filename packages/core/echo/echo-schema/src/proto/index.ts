//
// Copyright 2023 DXOS.org
//

import { dxos } from './gen/schema';

// Re-export namespace & class.
export import Schema = dxos.schema.Schema;
export type SchemaProps = dxos.schema.SchemaProps;

export { types as schemaBuiltin } from './gen/schema';
