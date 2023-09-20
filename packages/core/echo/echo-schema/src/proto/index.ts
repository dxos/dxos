import { dxos } from './gen/schema'

// Re-export namespace & class.
export import Schema = dxos.schema.Schema;

export { schema$ as schemaBuiltin } from './gen/schema'