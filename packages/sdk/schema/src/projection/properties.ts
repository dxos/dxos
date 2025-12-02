//
// Copyright 2024 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';

import { type AnyProperties, FormInputAnnotationId, type PropertyKey } from '@dxos/echo/internal';
import {
  findAnnotation,
  findNode,
  getBaseType,
  getDiscriminatedType,
  isDiscriminatedUnion,
  isTupleType,
} from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

/**
 * Flattened representation of AST node.
 */
export type SchemaProperty<T extends AnyProperties> = {
  name: PropertyKey<T>;
  ast: SchemaAST.AST;
  optional: boolean;
  readonly: boolean;
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

  // if (ast.indexSignatures.length) {
  //   invariant(ast.indexSignatures.length === 1, 'Multi-index signature is not supported.');
  //   const indexSignature = ast.indexSignatures[0];
  //   const validator = Schema.is(Schema.make(indexSignature.type));
  //   for (const [key, val] of Object.entries(value)) {
  //     if (knownProperties.some((prop) => prop.name === key)) {
  //       continue;
  //     }
  //     if (!validator(val)) {
  //       continue;
  //     }

  //     const processed = processProperty(
  //       key as PropertyKey<T>,
  //       {
  //         name: key,
  //         type: indexSignature.type,
  //         isOptional: true,
  //         isReadonly: indexSignature.isReadonly,
  //       },
  //       form,
  //     );
  //     if (processed) {
  //       knownProperties.push(processed);
  //     }
  //   }
  // }

  return knownProperties;
};

const processProperty = <T extends AnyProperties>(
  name: PropertyKey<T>,
  prop: SchemaAST.PropertySignature,
  form: boolean,
): SchemaProperty<T> | undefined => {
  // TODO(wittjosiah): `findAnnotation` shouldn't be needed after extracting the base type.
  // Annotations.
  const formInput = findAnnotation<boolean>(prop.type, FormInputAnnotationId);

  // TODO(wittjosiah): Factor out to form.
  if (form && formInput === false) {
    return undefined;
  }

  // Get type.
  const property: Omit<SchemaProperty<T>, 'type' | 'array' | 'format'> = {
    name,
    ast: getBaseType(prop),
    optional: prop.isOptional,
    readonly: prop.isReadonly,
  };

  // Parse SchemaAST.
  // NOTE: findNode traverses the AST until the condition is met.
  let baseType = findNode(prop.type, isSimpleType);
  if (!baseType) {
    // Transformations.
    // https://effect.website/docs/schema/transformations
    baseType = findNode(prop.type, SchemaAST.isTransformation);
    if (baseType) {
      invariant(SchemaAST.isTransformation(baseType));
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
          // if (baseType) {
          //   const jsonSchema = findAnnotation<JsonSchemaType>(baseType, SchemaAST.JSONSchemaAnnotationId);
          //   if (jsonSchema && '$id' in jsonSchema) {
          //     const { typename } = getSchemaReference(jsonSchema) ?? {};
          //     if (typename) {
          //       format = Format.TypeFormat.Ref;
          //     }
          //   }
          // }
        }
      }
    }
  }

  if (!baseType) {
    return undefined;
  }

  return {
    ...property,
  };
};

export const sortProperties = <T extends AnyProperties>(
  { name: a }: SchemaProperty<T>,
  { name: b }: SchemaProperty<T>,
) => a.localeCompare(b);

/**
 * Get the base type; e.g., traverse through refinements.
 *
 * @deprecated
 */
export const getSimpleType = (node: SchemaAST.AST): string | undefined => {
  if (
    SchemaAST.isDeclaration(node) ||
    SchemaAST.isObjectKeyword(node) ||
    SchemaAST.isTypeLiteral(node) ||
    // TODO(wittjosiah): Tuples are actually arrays.
    isTupleType(node) ||
    isDiscriminatedUnion(node)
  ) {
    return 'object';
  }

  if (SchemaAST.isStringKeyword(node)) {
    return 'string';
  }
  if (SchemaAST.isNumberKeyword(node)) {
    return 'number';
  }
  if (SchemaAST.isBooleanKeyword(node)) {
    return 'boolean';
  }

  if (SchemaAST.isEnums(node)) {
    return 'enum';
  }

  if (SchemaAST.isLiteral(node)) {
    return 'literal';
  }
};

/**
 * @deprecated
 */
export const isSimpleType = (node: SchemaAST.AST): boolean => !!getSimpleType(node);
