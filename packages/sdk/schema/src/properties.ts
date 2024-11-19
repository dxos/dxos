//
// Copyright 2024 DXOS.org
//

import { AST, type FormatEnum, getFormatAnnotation } from '@dxos/echo-schema';
import {
  type SimpleType,
  findAnnotation,
  findNode,
  getDiscriminatedType,
  getSimpleType,
  isLiteralUnion,
  isSimpleType,
} from '@dxos/effect';
import { invariant } from '@dxos/invariant';

// TODO(burdon): JsonPath?
export type PropertyKey<T extends object> = Extract<keyof T, string>;

/**
 * Flattened representation of AST node.
 */
export type SchemaProperty<T extends object> = {
  prop: AST.PropertySignature;
  name: PropertyKey<T>;
  type: SimpleType;
  tuple?: boolean;
  format?: FormatEnum;
  title?: string;
  description?: string;
};

/**
 * Get properties from the given AST node (typically from a Schema object).
 * Handle discriminated unions.
 */
export const getSchemaProperties = <T extends object>(ast: AST.AST, value: any = {}): SchemaProperty<T>[] => {
  if (AST.isUnion(ast)) {
    const baseType = getDiscriminatedType(ast, value);
    if (baseType) {
      return getSchemaProperties(baseType);
    }

    return [];
  }

  invariant(AST.isTypeLiteral(ast));
  return AST.getPropertySignatures(ast).reduce<SchemaProperty<T>[]>((props, prop) => {
    const name = prop.name.toString() as PropertyKey<T>;

    // Annotations.
    const title = noDefault(findAnnotation<string>(prop.type, AST.TitleAnnotationId));
    const description = noDefault(findAnnotation<string>(prop.type, AST.DescriptionAnnotationId));

    // Get type.
    let type: SimpleType | undefined;
    let tuple = false;
    let baseType = findNode(prop.type, isSimpleType);
    if (baseType) {
      type = getSimpleType(baseType);
    } else {
      // Transformations.
      // https://effect.website/docs/schema/transformations
      baseType = findNode(prop.type, AST.isTransformation);
      if (baseType) {
        invariant(AST.isTransformation(baseType));
        type = getSimpleType(baseType.from);
      } else {
        // Tuples.
        // https://effect.website/docs/schema/basic-usage/#rest-element
        baseType = findNode(prop.type, AST.isTupleType);
        if (baseType) {
          invariant(AST.isTupleType(baseType));
          const [tupleType] = baseType.rest ?? [];
          if (tupleType) {
            invariant(baseType.elements.length === 0);
            baseType = findNode(tupleType.type, isSimpleType);
            if (baseType) {
              type = getSimpleType(baseType);
              tuple = true;
            }
          }
        } else {
          // Union of literals.
          // This will be returned from the head of the function when generating a discriminating type
          baseType = findNode(prop.type, isLiteralUnion);
          if (baseType) {
            type = 'literal';
          }
        }
      }
    }

    if (type) {
      const format = baseType ? getFormatAnnotation(baseType) : undefined;
      props.push({ prop, name, type, tuple, format, title, description });
    }

    return props;
  }, []);
};

export const sortProperties = <T extends object>({ name: a }: SchemaProperty<T>, { name: b }: SchemaProperty<T>) =>
  a.localeCompare(b);

/**
 * Ignore default title/description annotations.
 * NOTE: 'a string' is the fallback annotation provided by effect.
 */
const noDefault = (value?: string, defaultValue?: string): string | undefined =>
  (value === 'a number' || value === 'a string' || value === 'a non empty string' ? undefined : value) ?? defaultValue;
