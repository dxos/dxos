//
// Copyright 2021 DXOS.org
//

export { preconfigureProtobufjs } from './configure.ts';
export { ModuleSpecifier } from './module-specifier.ts';
export * from './namespaces.ts';
export { registerResolver } from './parser/index.ts';
export { type GenerateSchemaOptions, generateSchema, parseAndGenerateSchema } from './type-generator.ts';
