//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type SchemaProperty } from '@dxos/effect';

import { type FormHandlerProps } from '../../hooks';
import { getFormProperties } from '../../util';

import { useFormValues } from './Form';
import { FormField, type FormFieldProps } from './FormField';
import { FormFieldErrorBoundary, FormFieldLabel } from './FormFieldComponent';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps<T extends AnyProperties> = {
  label?: string;
  sort?: string[];
  exclude?: (props: SchemaProperty[]) => SchemaProperty[];
} & Pick<FormHandlerProps<T>, 'schema'> &
  Pick<
    FormFieldProps,
    | 'path'
    | 'autoFocus'
    | 'readonly'
    | 'layout'
    | 'projection'
    | 'fieldMap'
    | 'fieldProvider'
    | 'createTypename'
    | 'createOptionLabel'
    | 'createOptionIcon'
    | 'createInitialValuePath'
    | 'createFieldMap'
    | 'db'
    | 'schemaHook'
    | 'getOptions'
    | 'onCreate'
  >;

/**
 * Renders a set of form fields derived from a schema object.
 */
export const FormFieldSet = ({
  label,
  schema,
  readonly,
  path,
  sort,
  exclude,
  projection,
  layout,
  ...props
}: FormFieldSetProps<any>) => {
  const values = useFormValues(FORM_FIELDSET_NAME, path);

  // TODO(burdon): Updates on every value change.
  //  Remove values dep if can remove from getSchemaProperties.
  const properties = useMemo(() => {
    if (!schema) {
      return [];
    }

    // TODO(wittjosiah): Reconcile FormInputAnnotation with projection hidden properties & exclude function.
    const schemaProps = getFormProperties(schema.ast);
    const filteredProps = exclude ? exclude(schemaProps) : schemaProps;

    // Use projection-based field management when view and projection are available.
    if (projection) {
      const fieldProjections = projection.getFieldProjections();
      const hiddenProperties = new Set(projection.getHiddenProperties());

      // Filter properties to only include visible ones and order by projection.
      const visibleProps = filteredProps.filter((prop) => !hiddenProperties.has(prop.name.toString()));
      const orderedProps: SchemaProperty[] = [];

      // Add properties in projection field order.
      for (const fieldProjection of fieldProjections) {
        const fieldPath = String(fieldProjection.field.path);
        const prop = visibleProps.find((p) => p.name === fieldPath);
        if (prop) {
          orderedProps.push(prop);
        }
      }

      // Add any remaining properties not in projection.
      const projectionPaths = new Set(fieldProjections.map((projection) => String(projection.field.path)));
      const remainingProps = visibleProps.filter((prop) => !projectionPaths.has(prop.name.toString()));
      orderedProps.push(...remainingProps);
      return orderedProps;
    }

    // Fallback to legacy filter/sort behavior.
    return sort
      ? [...filteredProps].sort(({ name: a }, { name: b }) => sort.indexOf(a.toString()) - sort.indexOf(b.toString()))
      : filteredProps;
  }, [schema, values, exclude, sort, projection]);

  if ((readonly || layout === 'static') && values == null) {
    return null;
  }

  return (
    <>
      {layout !== 'inline' && label && <FormFieldLabel label={label} asChild />}
      {properties.map((property) => {
        const name = property.name.toString();
        return (
          <FormFieldErrorBoundary key={name} path={[...(path ?? []), name]}>
            <FormField
              type={property.type}
              name={name}
              path={[...(path ?? []), name]}
              readonly={readonly}
              layout={layout}
              projection={projection}
              {...props}
            />
          </FormFieldErrorBoundary>
        );
      })}
    </>
  );
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;
