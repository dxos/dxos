//
// Copyright 2024 DXOS.org
//

import { AST, type FormatEnum } from '@dxos/echo-schema';
import { getFormatAnnotation } from '@dxos/echo-schema';
import { findAnnotation, findNode, isSimpleType, getSimpleType } from '@dxos/effect';
import { type SimpleType } from '@dxos/effect';

export type PropertyKey<T extends object> = Extract<keyof T, string>;

/**
 * High-level UX type for schema property.
 */
export type SchemaProperty<T extends object> = {
  root: AST.AST;
  prop: AST.PropertySignature;
  name: PropertyKey<T>;
  type: SimpleType;
  format?: FormatEnum;
  title?: string;
  description?: string;
};

/**
 * Get top-level properties from schema.
 */
// TODO(burdon): Handle tuples?
export const getSchemaProperties = <T extends object>(ast: AST.AST): SchemaProperty<T>[] => {
  return AST.getPropertySignatures(ast).reduce<SchemaProperty<T>[]>((props, prop) => {
    const name = prop.name.toString() as PropertyKey<T>;
    const title = noDefault(findAnnotation<string>(prop.type, AST.TitleAnnotationId));
    const description = noDefault(findAnnotation<string>(prop.type, AST.DescriptionAnnotationId));

    let type: SimpleType | undefined;
    let baseType = findNode(prop.type, isSimpleType);
    if (baseType) {
      type = getSimpleType(baseType);
    } else {
      baseType = findNode(prop.type, AST.isTransformation);
      if (baseType && AST.isTransformation(baseType)) {
        type = getSimpleType(baseType.from);
      }
    }

    if (type) {
      const format = baseType ? getFormatAnnotation(baseType) : undefined;
      props.push({ root: ast, prop, name, type, format, title, description });
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
