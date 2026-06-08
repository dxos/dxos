//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export {
  getBaseType,
  type SchemaProperty,
  getProperties,
  VisitResult,
  type Path,
  type TestFn,
  type VisitorFn,
  visit,
  findNode,
  findProperty,
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
