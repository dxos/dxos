//
// Copyright 2026 DXOS.org
//
// Curated re-export of `effect/SchemaAST`. Effect 4 marks all but nine of that module's exports
// internal and drops them from the published types, so every direct importer is a site that must
// be rewritten by hand at the version bump; routing them through here confines that rewrite to
// this module. The surface is enumerated rather than star-exported so that a symbol nobody
// imports is a symbol nobody has to port.
//

// @import-as-namespace

export {
  type AST,
  type Annotated,
  type Annotations,
  Declaration,
  DescriptionAnnotationId,
  ExamplesAnnotationId,
  IdentifierAnnotationId,
  IndexSignature,
  JSONSchemaAnnotationId,
  Literal,
  type LiteralValue,
  OptionalType,
  type Parameter,
  PropertySignature,
  Refinement,
  StringKeyword,
  Suspend,
  SymbolKeyword,
  TemplateLiteral,
  TitleAnnotationId,
  Transformation,
  TupleType,
  Type,
  TypeLiteral,
  Union,
  annotations,
  booleanKeyword,
  encodedBoundAST,
  getAnnotation,
  getDefaultAnnotation,
  getDescriptionAnnotation,
  getIdentifierAnnotation,
  getJSONSchemaAnnotation,
  getPropertySignatures,
  getSurrogateAnnotation,
  getTitleAnnotation,
  isAnyKeyword,
  isBooleanKeyword,
  isDeclaration,
  isEnums,
  isLiteral,
  isNeverKeyword,
  isNumberKeyword,
  isObjectKeyword,
  isRefinement,
  isStringKeyword,
  isSuspend,
  isSymbolKeyword,
  isTransformation,
  isTupleType,
  isTypeLiteral,
  isUndefinedKeyword,
  isUnion,
  isUnknownKeyword,
  neverKeyword,
  numberKeyword,
  objectKeyword,
  omit,
  stringKeyword,
  unknownKeyword,
} from 'effect/SchemaAST';
