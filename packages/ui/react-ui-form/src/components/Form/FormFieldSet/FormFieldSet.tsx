//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { useMemo } from 'react';

import { DEFAULT_LAYOUT_NAME, FormLayoutAnnotation } from '@dxos/echo/Annotation';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { type Merge } from '@dxos/util';

import { type FieldContext } from '#types';

import { type FormHandlerProps, useFormValues } from '../../../hooks';
import { getRootFormProperties } from '../../../util';
import { FormField, FormFieldErrorBoundary, type FormFieldProps, presentationFor } from '../FormField';
import { FormLayout } from '../FormLayout';
import { FormFieldSetContainer } from './FormFieldSetContainer';

const FORM_FIELDSET_NAME = 'Form.FieldSet';

export type FormFieldSetProps<T extends AnyProperties> = Merge<
  {
    /** Applied to the field set's container (the bordered box when collapsible). */
    classNames?: string;
    label?: string;
    sort?: string[];
    /**
     * When set, renders a toggle button at the end of the label row that
     * shows/hides the field set body. Used for nested objects.
     */
    collapsible?: boolean;
    filter?: (props: SchemaEx.SchemaProperty[]) => SchemaEx.SchemaProperty[];
    /**
     * Picks a named layout out of `FormLayoutAnnotation` when present.
     * Falls back to `'default'`. Ignored when the schema has no annotation
     * (linear rendering then takes over).
     */
    layoutName?: string;
  },
  Pick<FormHandlerProps<T>, 'schema'>,
  Pick<FormFieldProps, 'path' | 'autoFocus'>,
  FieldContext
>;

/**
 * Renders a set of form fields derived from a schema object.
 */
export const FormFieldSet = ({
  classNames,
  label,
  schema,
  readonly,
  path,
  sort,
  collapsible,
  filter,
  projection,
  layout,
  layoutName = DEFAULT_LAYOUT_NAME,
  ...props
}: FormFieldSetProps<any>) => {
  const values = useFormValues(FORM_FIELDSET_NAME, path);
  const properties = useFormFieldSetProperties({ schema, values, filter, sort, projection });
  if ((readonly || layout === 'static') && values == null) {
    return null;
  }

  // If the schema carries a layout template, hand off to <Form.Layout/> which renders the DSL.
  // Linear rendering still runs when no annotation is present, so existing call sites are unchanged.
  const layouts = schema ? Option.getOrUndefined(FormLayoutAnnotation.get(schema)) : undefined;
  const body =
    layouts?.[layoutName] !== undefined && schema ? (
      <FormLayout
        schema={schema}
        name={layoutName}
        path={path}
        readonly={readonly}
        layout={layout}
        projection={projection}
        {...props}
      />
    ) : (
      properties.map((property) => {
        const name = property.name.toString();
        return (
          <FormFieldErrorBoundary key={name} path={[...(path ?? []), name]}>
            <FormField
              type={property.type}
              name={name}
              path={[...(path ?? []), name]}
              required={!property.isOptional}
              readonly={readonly}
              layout={layout}
              projection={projection}
              {...props}
            />
          </FormFieldErrorBoundary>
        );
      })
    );

  return (
    <FormFieldSetContainer
      classNames={classNames}
      label={label}
      path={SchemaEx.createJsonPath(path ?? [])}
      readonly={readonly}
      presentation={presentationFor(layout)}
      collapsible={collapsible}
    >
      {body}
    </FormFieldSetContainer>
  );
};

FormFieldSet.displayName = FORM_FIELDSET_NAME;

type UseFormFieldSetPropertiesParams = Pick<FormFieldSetProps<any>, 'schema' | 'filter' | 'projection' | 'sort'> & {
  values: AnyProperties | undefined;
  sort?: string[];
};

/**
 * Resolves ordered schema properties for a field set (projection order, filter, or sort).
 */
const useFormFieldSetProperties = ({
  schema,
  filter,
  projection,
  values,
  sort,
}: UseFormFieldSetPropertiesParams): SchemaEx.SchemaProperty[] => {
  // TODO(burdon): Updates on every value change.
  //  Remove values dep if can remove from getSchemaProperties.
  return useMemo(() => {
    if (!schema) {
      return [];
    }

    // TODO(wittjosiah): Reconcile FormInputAnnotation with projection hidden properties & filter function.
    const schemaProps = getRootFormProperties(schema.ast, values);
    const filteredProps = filter ? filter(schemaProps) : schemaProps;

    // Use projection-based field management when view and projection are available.
    if (projection) {
      const fieldProjections = projection.getFieldProjections();
      const hiddenProperties = new Set(projection.getHiddenProperties());

      // Filter properties to only include visible ones and order by projection.
      const visibleProps = filteredProps.filter((prop) => !hiddenProperties.has(prop.name.toString()));
      const orderedProps: SchemaEx.SchemaProperty[] = [];

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
  }, [schema, values, filter, sort, projection]);
};
