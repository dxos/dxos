//
// Copyright 2024 DXOS.org
//

import { pipe } from 'effect';
import { capitalize } from 'effect/String';

import {
  AST,
  FormatEnum,
  getFormatAnnotation,
  type OptionsAnnotationType,
  OptionsAnnotationId,
  type PropertyKey,
  type BaseObject,
  getSchemaReference,
  type JsonSchemaType,
} from '@dxos/echo-schema';
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
import { log } from '@dxos/log';

/**
 * Flattened representation of AST node.
 */
export type SchemaProperty<T extends BaseObject, V = any> = {
  name: PropertyKey<T>;
  ast: AST.AST;
  optional: boolean;
  readonly: boolean;
  type: SimpleType;
  array?: boolean;
  format?: FormatEnum;
  title?: string;
  description?: string;
  examples?: string[];
  defaultValue?: V;
  options?: OptionsAnnotationType[];
};

/**
 * Get properties from the given AST node (typically from a Schema object).
 * Handle discriminated unions.
 */
export const getSchemaProperties = <T extends BaseObject>(ast: AST.AST, value: any = {}): SchemaProperty<T>[] => {
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
    // TODO(burdon): Handle special case?
    if (name === 'id') {
      return props;
    }

    // Annotations.
    const title = findAnnotation<string>(prop.type, AST.TitleAnnotationId);
    const description = findAnnotation<string>(prop.type, AST.DescriptionAnnotationId);
    const examples = findAnnotation<string[]>(prop.type, AST.ExamplesAnnotationId);
    const defaultValue = findAnnotation(prop.type, AST.DefaultAnnotationId);
    const options = findAnnotation<OptionsAnnotationType[]>(prop.type, OptionsAnnotationId);

    // Get type.
    const property: Omit<SchemaProperty<T>, 'type' | 'array' | 'format'> = {
      name,
      ast: prop.type,
      optional: prop.isOptional,
      readonly: prop.isReadonly,
      title: title ?? pipe(name, capitalize),
      description,
      examples,
      defaultValue,
      options,
    };

    let type: SchemaProperty<T>['type'] | undefined;
    let array: SchemaProperty<T>['array'] | undefined;
    let format: SchemaProperty<T>['format'] | undefined;

    // Parse AST.
    // NOTE: findNode traverses the AST until the condition is met.
    let baseType = findNode(prop.type, isSimpleType);

    // First check if reference.
    const jsonSchema = findAnnotation<JsonSchemaType>(prop.type, AST.JSONSchemaAnnotationId);
    if (jsonSchema && '$id' in jsonSchema) {
      const { typename } = getSchemaReference(jsonSchema) ?? {};
      if (typename) {
        // TODO(burdon): Special handling for refs? type = 'ref'?
        type = 'object';
        format = FormatEnum.Ref;
      }
    } else {
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
                array = true;
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
    }

    if (type) {
      props.push({
        type,
        array,
        format: format ?? (baseType ? getFormatAnnotation(baseType) : undefined),
        ...property,
      });
    } else {
      log.warn('cannot process property', { prop });
    }

    return props;
  }, []);
};

export const sortProperties = <T extends BaseObject>({ name: a }: SchemaProperty<T>, { name: b }: SchemaProperty<T>) =>
  a.localeCompare(b);
