//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export {
  type SchemaProperty,
  type Path,
  type TestFn,
  type VisitorFn,
  VisitResult,
  visit,
  findNode,
  findProperty,
  getBaseType,
  getProperties,
  getAnnotation,
  findAnnotation,
  isOption,
  isLiteralUnion,
  getLiteralValues,
  isArrayType,
  getArrayElementType,
  isTupleType,
  isDiscriminatedUnion,
  getDiscriminatingProps,
  getDiscriminatedType,
  isNestedType,
  mapAst,
  unwrapOptional,
} from './internal/ast';

export {
  JsonPath,
  JsonProp,
  isJsonPath,
  createJsonPath,
  fromEffectValidationPath,
  splitJsonPath,
  getField,
  getValue,
  setValue,
} from './internal/json-path';

export { getParamKeyAnnotation, ParamKeyAnnotation, UrlParser } from './internal/url';
