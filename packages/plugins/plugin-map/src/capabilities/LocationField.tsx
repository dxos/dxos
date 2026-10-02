//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Database, JsonSchema, Obj, URI } from '@dxos/echo';
import { useType } from '@dxos/echo-react';
import { Format } from '@dxos/echo/Format';
import { Field } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

/** The form renderer's own props ride alongside `data` on the surface envelope; `type` comes from the field AST. */
export type LocationFieldProps = Surface.Root.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

/**
 * Form field offering the geo-point properties of the form's currently chosen typename as the map's
 * location column. It consumes the whole surface envelope, so it takes no `props` mapper.
 */
export const LocationField = ({ data, ...inputProps }: LocationFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  // The type picker's value is the type's URI, and a user's own type lives in the space rather than the
  // shared registry, so it is resolved across both.
  const { typename } = useFormValues('MapForm');
  const schema = useType(db, URI.isURI(typename) ? typename : undefined);
  // Memoized: an unmemoized `toJsonSchema` would return a fresh identity each render, defeating the memo below.
  const jsonSchema = useMemo(() => (schema ? JsonSchema.toJsonSchema(schema) : undefined), [schema]);
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

  // A provided field owns its row, so it carries its own label.
  return (
    <Field.Root>
      <Field.Label>{inputProps.label}</Field.Label>
      <SelectField {...props} options={coordinateProperties.map((property) => ({ value: property }))} />
    </Field.Root>
  );
};
