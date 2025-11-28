//
// Copyright 2024 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import * as String from 'effect/String';

import { Format } from '@dxos/echo';
import {
  type AnyProperties,
  FormInputAnnotationId,
  type JsonSchemaType,
  OptionsAnnotationId,
  type OptionsAnnotationType,
  type PropertyKey,
  getFormatAnnotation,
  getSchemaReference,
} from '@dxos/echo/internal';
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
export type SchemaProperty<T extends AnyProperties, V = any> = {
  name: PropertyKey<T>;
  ast: SchemaAST.AST;
  optional: boolean;
  readonly: boolean;
  type: SimpleType;
  array?: boolean;
  format?: Format.TypeFormat;
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
export const getSchemaProperties = <T extends AnyProperties>(
  ast: SchemaAST.AST,
  value: any = {},
  options: { includeId?: boolean; form?: boolean } = {},
): SchemaProperty<T>[] => {
  const { includeId = false, form = false } = options;
  if (SchemaAST.isUnion(ast)) {
    const baseType = getDiscriminatedType(ast, value);
    if (baseType) {
      return getSchemaProperties(baseType, value, options);
    }

    return [];
  }

  invariant(SchemaAST.isTypeLiteral(ast));
  const knownProperties = SchemaAST.getPropertySignatures(ast).reduce<SchemaProperty<T>[]>((props, prop) => {
    const name = prop.name.toString() as PropertyKey<T>;
    // TODO(burdon): Handle special case?
    const identifier = SchemaAST.getAnnotation(prop.type, SchemaAST.IdentifierAnnotationId).pipe(Option.getOrUndefined);
    if (name === 'id' && identifier !== 'false' && !includeId) {
      return props;
    }

    const processed = processProperty(name, prop, form);
    if (processed) {
      props.push(processed);
    } else {
      log('cannot process property', { prop });
    }

    return props;
  }, []);

  if (ast.indexSignatures.length) {
    invariant(ast.indexSignatures.length === 1, 'Multi-index signature is not supported.');
    const indexSignature = ast.indexSignatures[0];
    const validator = Schema.is(Schema.make(indexSignature.type));
    for (const [key, val] of Object.entries(value)) {
      if (knownProperties.some((prop) => prop.name === key)) {
        continue;
      }
      if (!validator(val)) {
        continue;
      }

      const processed = processProperty(
        key as PropertyKey<T>,
        {
          isOptional: true,
          isReadonly: indexSignature.isReadonly,
          type: indexSignature.type,
        },
        form,
      );
      if (processed) {
        knownProperties.push(processed);
      }
    }
  }

  return knownProperties;
};

const processProperty = <T extends AnyProperties>(
  name: PropertyKey<T>,
  prop: { type: SchemaAST.AST; isReadonly: boolean; isOptional: boolean },
  form: boolean,
): SchemaProperty<T> | undefined => {
  // Annotations.
  const formInput = findAnnotation<boolean>(prop.type, FormInputAnnotationId);
  const title = findAnnotation<string>(prop.type, SchemaAST.TitleAnnotationId);
  const description = findAnnotation<string>(prop.type, SchemaAST.DescriptionAnnotationId);
  const examples = findAnnotation<string[]>(prop.type, SchemaAST.ExamplesAnnotationId);
  const defaultValue = findAnnotation(prop.type, SchemaAST.DefaultAnnotationId);
  let options: (string | number)[] | undefined = findAnnotation<OptionsAnnotationType[]>(
    prop.type,
    OptionsAnnotationId,
  );

  if (form && formInput === false) {
    return undefined;
  }

  // Get type.
  const property: Omit<SchemaProperty<T>, 'type' | 'array' | 'format'> = {
    name,
    ast: prop.type,
    optional: prop.isOptional,
    readonly: prop.isReadonly,
    title: title ?? Function.pipe(name, String.capitalize),
    description,
    examples,
    defaultValue,
    options,
  };

  let type: SchemaProperty<T>['type'] | undefined;
  let array: SchemaProperty<T>['array'] | undefined;
  let format: SchemaProperty<T>['format'] | undefined;

  // Parse SchemaAST.
  // NOTE: findNode traverses the AST until the condition is met.
  let baseType = findNode(prop.type, isSimpleType);

  // First check if reference.
  const jsonSchema = findAnnotation<JsonSchemaType>(prop.type, SchemaAST.JSONSchemaAnnotationId);
  if (jsonSchema && '$id' in jsonSchema) {
    const { typename } = getSchemaReference(jsonSchema) ?? {};
    if (typename) {
      // TODO(burdon): Special handling for refs? type = 'ref'?
      type = 'object';
      format = Format.TypeFormat.Ref;
    }
  } else {
    const any = findNode(prop.type, SchemaAST.isAnyKeyword);
    if (any) {
      // NOTE: Schema.Any is currently used to represent template inputs.
      type = 'string';
    } else if (baseType) {
      type = getSimpleType(baseType);
    } else {
      // Transformations.
      // https://effect.website/docs/schema/transformations
      baseType = findNode(prop.type, SchemaAST.isTransformation);
      if (baseType) {
        invariant(SchemaAST.isTransformation(baseType));
        type = getSimpleType(baseType.from);
      } else {
        // TODO(wittjosiah): Can this ever happen?
        // Tuples.
        // https://effect.website/docs/schema/basic-usage/#rest-element
        baseType = findNode(prop.type, SchemaAST.isTupleType);
        if (baseType) {
          invariant(SchemaAST.isTupleType(baseType));
          const [tupleType] = baseType.rest ?? [];
          if (tupleType) {
            invariant(baseType.elements.length === 0);
            baseType = findNode(tupleType.type, isSimpleType);
            if (baseType) {
              const jsonSchema = findAnnotation<JsonSchemaType>(baseType, SchemaAST.JSONSchemaAnnotationId);
              if (jsonSchema && '$id' in jsonSchema) {
                const { typename } = getSchemaReference(jsonSchema) ?? {};
                if (typename) {
                  type = 'object';
                  format = Format.TypeFormat.Ref;
                  array = true;
                }
              } else {
                type = getSimpleType(baseType);
                array = true;
              }
            }
          }
        } else {
          // Union of literals.
          // This will be returned from the head of the function when generating a discriminating type
          baseType = findNode(prop.type, isLiteralUnion);
          if (baseType) {
            type = 'literal';
            if (SchemaAST.isUnion(baseType)) {
              options = baseType.types
                .map((type) => (SchemaAST.isLiteral(type) ? type.literal : null))
                .filter((v): v is string | number => v !== null);
            }
          }
        }
      }
    }
  }

  if (!type) {
    return undefined;
  }

  return {
    type,
    array,
    format: format ?? (baseType ? getFormatAnnotation(baseType) : undefined),
    ...property,
    options,
  };
};

export const sortProperties = <T extends AnyProperties>(
  { name: a }: SchemaProperty<T>,
  { name: b }: SchemaProperty<T>,
) => a.localeCompare(b);
