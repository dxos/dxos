//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, JsonSchema, Obj, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

/** The form renderer's own props ride alongside `data` on the surface envelope; `type` comes from the field AST. */
export type LocationFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

/**
 * Form field offering the geo-point properties of the form's currently chosen typename as the map's
 * location column. It consumes the whole surface envelope, so it takes no `props` mapper.
 */
export const LocationField = ({ data, ...inputProps }: LocationFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  const { typename } = useFormValues('MapForm');
  const schema =
    typename && db
      ? db.graph.registry
          .list()
          .filter(Type.isType)
          .find((type) => Type.getTypename(type) === typename)
      : undefined;
  const jsonSchema = schema && JsonSchema.toJsonSchema(schema);
  const coordinateProperties = useMemo(() => {
    if (!jsonSchema?.properties) {
      return [];
    }

    return Object.entries(jsonSchema.properties).reduce<string[]>((acc, [key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        'format' in value &&
        value.format === Format.TypeFormat.GeoPoint
      ) {
        acc.push(key);
      }
      return acc;
    }, []);
  }, [jsonSchema]);

  if (!ast || !typename) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  return <SelectField {...props} options={coordinateProperties.map((property) => ({ value: property }))} />;
};
