//
// Copyright 2026 DXOS.org
//

export {
  type BlockValue,
  type Entry,
  type FieldValue,
  type Row,
  decodeBlock,
  fieldRange,
  patchBlock,
} from './codec.ts';
export {
  type DialectRegistry,
  type ResolveOptions,
  SOFTWARE_DIALECT,
  STANDARD_DIALECTS,
  extensionTable,
  fieldOf,
  keyedFields,
  parseDialectHeader,
  printExtensionTable,
  resolveBlockSchemas,
} from './dialects.ts';
export { type ExtDefinition, parseExtDefinitions, resolveDefinition } from './ext.ts';
export { parseFieldType } from './field-type.ts';
export { type RekeyOptions, type SpecItem, isNumberedId, labelsByKey, mintKey, rekey, specItems } from './keys.ts';
export {
  type ParseOptions,
  type Range,
  type SourceBlock,
  type SourceField,
  type SourceLine,
  parseSourceBlock,
  parseSourceBlocks,
  scanBlocks,
} from './source.ts';
export { type Change, applyChanges, minimalChange } from './text.ts';
export {
  BLOCK_ROLES,
  type BlockRole,
  type BlockSchema,
  type FieldSchema,
  type FieldType,
  isReferenceField,
  isSpecReference,
} from './types.ts';
