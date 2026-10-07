//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

export {
  type Path,
  type SchemaProperty,
  type TestFn,
  type VisitorFn,
  VisitResult,
  findAnnotation,
  findNode,
  findProperty,
  getAnnotation,
  getArrayElementType,
  getBaseType,
  getDiscriminatedType,
  getDiscriminatingProps,
  getLiteralValues,
  getProperties,
  isArrays,
  isArrayType,
  isDiscriminatedUnion,
  isLiteralUnion,
  isNestedType,
  isOption,
  mapAst,
  retainContext,
  unwrapOptional,
  visit,
} from './internal/ast.ts';

export {
  JsonPath,
  JsonProp,
  createJsonPath,
  fromEffectValidationPath,
  getField,
  getValue,
  isJsonPath,
  setValue,
  splitJsonPath,
} from './internal/json-path.ts';

export { ParamKeyAnnotation, UrlParser, getParamKeyAnnotation } from './internal/url.ts';
