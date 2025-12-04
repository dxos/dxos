//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { type SchemaProperty, getArrayElementType, getProperties, isArrayType, isNestedType } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { getSchema } from '../types';

export const setValue = (obj: any, path: readonly (string | number)[], value: any): void => {
  invariant(path.length > 0, 'Path must not be empty');

  const schema = getSchema(obj);
  invariant(schema != null, 'Object must have a schema');

  let parent = obj;
  let currentAST: SchemaAST.AST | undefined = schema.ast;

  // Navigate to the parent of the target property.
  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i];
    const key = typeof part === 'number' ? part : String(part);
    if (parent[key] === undefined) {
      const propertyAST = getPropertyAST(currentAST, String(part));
      const shouldBeArray = propertyAST ? isArrayType(propertyAST) : false;

      if (shouldBeArray) {
        // Create array.
        parent[key] = [];
      } else {
        // TODO(wittjosiah): Is there a better way to handle this than creating an object with defaults?
        //   Perhaps properties on objects should be optional by default?
        // Create object with defaults for required fields.
        const objWithDefaults = createObjectWithDefaults(propertyAST);
        parent[key] = objWithDefaults;
      }
    }

    parent = parent[key];
    currentAST = getPropertyAST(currentAST, String(part));
  }

  const finalKey = path[path.length - 1];
  parent[finalKey] = value;

  return value;
};

/**
 * Helper to get the AST of a nested property.
 * @param ast - Current schema AST.
 * @param propertyName - Name of the property to get.
 * @returns The AST of the nested property, or undefined if not found.
 */
const getPropertyAST = (ast: SchemaAST.AST | undefined, propertyName: string): SchemaAST.AST | undefined => {
  if (!ast) {
    return undefined;
  }

  if (isNestedType(ast)) {
    const properties = getProperties(ast);
    const property = properties.find((p) => p.name.toString() === propertyName);

    if (property) {
      return property.type;
    }
  }

  if (isArrayType(ast)) {
    const elementType = getArrayElementType(ast);
    return elementType;
  }

  return undefined;
};

/**
 * Get all required properties from a schema AST.
 * A property is required if it's not optional.
 *
 * @param ast - Schema AST to inspect.
 * @returns Array of required properties with their types.
 */
const getRequiredProperties = (ast: SchemaAST.AST | undefined): SchemaProperty[] => {
  if (!ast) {
    return [];
  }

  // Only objects/structs have properties with optional/required distinction.
  if (!isNestedType(ast)) {
    return [];
  }

  const properties = getProperties(ast);

  // Filter to only required properties (where isOptional === false).
  return properties.filter((p) => !p.isOptional);
};

/**
 * Get the default value for a primitive type.
 * Returns undefined for non-primitive or unsupported types.
 *
 * @param ast - Type AST.
 * @returns Default value for the type, or undefined.
 */
const getDefaultValueForType = (ast: SchemaAST.AST | undefined): any => {
  if (!ast) {
    return undefined;
  }

  const defaultValue = SchemaAST.getDefaultAnnotation(ast);
  if (Option.isSome(defaultValue)) {
    return defaultValue.value;
  }

  return Match.value(ast).pipe(
    Match.when({ _tag: 'StringKeyword' }, () => ''),
    Match.when({ _tag: 'NumberKeyword' }, () => 0),
    Match.when({ _tag: 'BooleanKeyword' }, () => false),
    Match.orElse(() => undefined),
  );
};

/**
 * Create an object with default values for all required properties.
 * Currently handles primitive types only (String, Number, Boolean).
 * Non-primitive required fields are left undefined.
 *
 * @param ast - Schema AST describing the object structure.
 * @returns Object with required fields populated with defaults.
 */
const createObjectWithDefaults = (ast: SchemaAST.AST | undefined): any => {
  if (!ast) {
    return {};
  }

  const requiredProps = getRequiredProperties(ast);
  const obj: any = {};

  for (const prop of requiredProps) {
    const defaultValue = getDefaultValueForType(prop.type);
    if (defaultValue !== undefined) {
      obj[prop.name] = defaultValue;
    }
  }

  return obj;
};
