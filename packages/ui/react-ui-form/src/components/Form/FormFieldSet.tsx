//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { createJsonPath, type SchemaProperty } from '@dxos/effect';

import { type FormHandlerProps } from '../../hooks';
import { getFormProperties } from '../../util';
import { useFormValues } from './Form';
import { FormField, type FormFieldProps } from './FormField';
import { FormFieldErrorBoundary, FormFieldLabel } from './FormFieldComponent';
import { DEFAULT_LAYOUT_NAME, FormLayout, FormLayoutAnnotation } from './Layout';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps<T extends AnyProperties> = {
  label?: string;
  sort?: string[];
  exclude?: (props: SchemaProperty[]) => SchemaProperty[];
  /**
   * Picks a named layout out of `FormLayoutAnnotation` when present.
   * Falls back to `'default'`. Ignored when the schema has no annotation
   * (linear rendering then takes over).
   */
  layoutName?: string;
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
    | 'useType'
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
  layoutName = DEFAULT_LAYOUT_NAME,
  ...props
}: FormFieldSetProps<any>) => {
  const values = useFormValues(FORM_FIELDSET_NAME, path);
  const properties = useFormFieldSetProperties({ schema, values, exclude, sort, projection });
  if ((readonly || layout === 'static') && values == null) {
    return null;
  }

  // If the schema carries a layout template, hand off to <Form.Layout/> which renders the DSL.
  // Linear rendering still runs when no annotation is present, so existing call sites are unchanged.
  const layouts = schema ? Option.getOrUndefined(FormLayoutAnnotation.get(schema)) : undefined;
  if (layouts?.[layoutName] !== undefined && schema) {
    return (
      <>
        {layout !== 'inline' && label && <FormFieldLabel label={label} path={createJsonPath(path ?? [])} asChild />}
        <FormLayout
          schema={schema}
          name={layoutName}
          path={path}
          readonly={readonly}
          layout={layout}
          projection={projection}
          {...props}
        />
      </>
    );
  }

  return (
    <>
      {layout !== 'inline' && label && <FormFieldLabel label={label} path={createJsonPath(path ?? [])} asChild />}
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

type UseFormFieldSetPropertiesParams = Pick<FormFieldSetProps<any>, 'schema' | 'exclude' | 'projection' | 'sort'> & {
  values: AnyProperties | undefined;
  sort?: string[];
};

/**
 * Resolves ordered schema properties for a field set (projection order, exclude, or sort).
 */
const useFormFieldSetProperties = ({
  schema,
  exclude,
  projection,
  values,
  sort,
}: UseFormFieldSetPropertiesParams): SchemaProperty[] => {
  // TODO(burdon): Updates on every value change.
  //  Remove values dep if can remove from getSchemaProperties.
  return useMemo(() => {
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
        const prop = visibleProps.find((prop) => prop.name === fieldPath);
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
};
