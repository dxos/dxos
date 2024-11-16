//
// Copyright 2024 DXOS.org
//

import { AST, type S, type FormatEnum } from '@dxos/echo-schema';
import { getFormatAnnotation } from '@dxos/echo-schema';
import { findAnnotation, findNode, isSimpleType, getSimpleType } from '@dxos/effect';
import { type SimpleType } from '@dxos/effect';

export type PropertyKey<T extends object> = Extract<keyof T, string>;

/**
 * High-level UX type for schema property.
 */
export type SchemaProperty<T extends object> = {
  property: PropertyKey<T>;
  type: SimpleType;
  format?: FormatEnum;
  title?: string;
  description?: string;
};

export const sortProperties = <T extends object>(
  { property: a }: SchemaProperty<T>,
  { property: b }: SchemaProperty<T>,
) => a.localeCompare(b);

/**
 * Get top-level properties from schema.
 */
// TODO(burdon): Handle tuples?
export const getSchemaProperties = <T extends object>(schema: S.Schema<T>): SchemaProperty<T>[] => {
  return AST.getPropertySignatures(schema.ast).reduce<SchemaProperty<T>[]>((props, prop) => {
    const property = prop.name.toString() as PropertyKey<T>;
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
      const format = getFormatAnnotation(prop.type);
      props.push({ property, type, format, title, description });
    }

    return props;
  }, []);
};

/**
 * Ignore default title/description annotations.
 * NOTE: 'a string' is the fallback annotation provided by effect.
 */
const noDefault = (value?: string, defaultValue?: string): string | undefined =>
  (value === 'a string' || value === 'a non empty string' ? undefined : value) ?? defaultValue;
