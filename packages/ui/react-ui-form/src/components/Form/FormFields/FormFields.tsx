//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { DEFAULT_LAYOUT_NAME, FormLayoutAnnotation } from '@dxos/echo/Annotation';
import { type AnyProperties } from '@dxos/echo/internal';
import { SchemaEx } from '@dxos/effect';
import { type Merge } from '@dxos/util';

import { type FieldContext } from '#types';

import { useFormContext, useFormValues } from '../../../hooks';
import { getRootFormProperties, getSchemaAtPath } from '../../../util';
import { FormFieldDispatch, type FormFieldDispatchProps, FormFieldErrorBoundary } from '../FormField';
import { FormLayout } from '../FormLayout';

const FORM_FIELDS_NAME = 'Form.Fields';

/** A path into the form values: dotted from the root, or its segments. */
export type FormPath = string | (string | number)[];

export const toPathSegments = (path: FormPath | undefined): (string | number)[] =>
  path === undefined
    ? []
    : typeof path === 'string'
      ? SchemaEx.isJsonPath(path)
        ? SchemaEx.splitJsonPath(path)
        : []
      : path;

export type FormFieldsProps<T extends AnyProperties = AnyProperties> = Merge<
  {
    /** The object property whose fields to render; the root by default. */
    path?: FormPath;
    /** Renders these properties only, in schema order. */
    include?: string[];
    exclude?: string[];
    /** Property names in the order to render them. */
    sort?: string[];
    filter?: (props: SchemaEx.SchemaProperty[]) => SchemaEx.SchemaProperty[];
    /**
     * Picks a named layout out of `FormLayoutAnnotation` when present. Falls back to `'default'`.
     * Ignored when the schema has no annotation (linear rendering then takes over).
     */
    layoutName?: string;
    /** The schema to walk in place of the form's, at the same path. */
    schema?: Schema.Codec<T, any>;
  },
  Pick<FormFieldDispatchProps, 'autoFocus'>,
  FieldContext
>;

/**
 * Walks the schema: one `Form.Field` per property at `path`, a `Form.FieldSet` around a nested
 * object's fields. It renders no element of its own, so the fields it produces are siblings of
 * whatever is written beside it.
 */
export const FormFields = ({
  path: pathProp,
  include,
  exclude,
  sort,
  filter,
  layoutName = DEFAULT_LAYOUT_NAME,
  schema: schemaProp,
  ...props
}: FormFieldsProps<any>) => {
  const { form, variant: _variant, testId: _testId, ...contextProps } = useFormContext(FORM_FIELDS_NAME);
  const path = useMemo(() => toPathSegments(pathProp), [typeof pathProp === 'string' ? pathProp : pathProp?.join('.')]);
  const values = useFormValues(FORM_FIELDS_NAME, path);
  const { readonly, layout, projection, ...fieldContext } = { ...contextProps, ...props };
  // The schema to walk: the one given (already the schema at the path: a nested object's, an inline
  // ref target's), or the form's resolved at the path.
  const schema = useMemo(() => {
    if (schemaProp) {
      return schemaProp;
    }
    if (!form.schema) {
      return undefined;
    }
    const ast = path.length ? getSchemaAtPath(form.schema.ast, path, form.values) : form.schema.ast;
    return ast ? Schema.make<Schema.Codec<any, any>>(ast) : undefined;
    // The AST at a path changes only with the discriminator value it depends on, which `values` carries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaProp, form.schema, path, values]);
  const properties = useFormFieldsProperties({ schema, values, include, exclude, filter, sort, projection });
  if ((readonly || layout === 'static') && values == null) {
    return null;
  }

  // If the schema carries a layout template, hand off to <Form.Layout/> which renders the DSL.
  const layouts = schema ? Option.getOrUndefined(FormLayoutAnnotation.get(schema)) : undefined;
  if (layouts?.[layoutName] !== undefined && schema) {
    return (
      <FormLayout
        schema={schema}
        name={layoutName}
        path={path}
        readonly={readonly}
        layout={layout}
        projection={projection}
        {...fieldContext}
      />
    );
  }

  return (
    <>
      {properties.map((property) => {
        const name = property.name.toString();
        return (
          <FormFieldErrorBoundary key={name} path={[...path, name]}>
            <FormFieldDispatch
              type={property.type}
              name={name}
              path={[...path, name]}
              required={!property.isOptional}
              readonly={readonly}
              layout={layout}
              projection={projection}
              {...fieldContext}
            />
          </FormFieldErrorBoundary>
        );
      })}
    </>
  );
};

FormFields.displayName = FORM_FIELDS_NAME;

type UseFormFieldsPropertiesParams = Pick<
  FormFieldsProps<any>,
  'schema' | 'include' | 'exclude' | 'filter' | 'projection' | 'sort'
> & {
  values: AnyProperties | undefined;
};

/**
 * Resolves ordered schema properties for a walk (projection order, include/exclude, filter, sort).
 */
const useFormFieldsProperties = ({
  schema,
  include,
  exclude,
  filter,
  projection,
  values,
  sort,
}: UseFormFieldsPropertiesParams): SchemaEx.SchemaProperty[] => {
  // TODO(burdon): Updates on every value change.
  //  Remove values dep if can remove from getSchemaProperties.
  return useMemo(() => {
    if (!schema) {
      return [];
    }

    // TODO(wittjosiah): Reconcile FormInputAnnotation with projection hidden properties & filter function.
    const schemaProps = getRootFormProperties(schema.ast, values);
    const included = include ? schemaProps.filter((prop) => include.includes(prop.name.toString())) : schemaProps;
    const excluded = exclude ? included.filter((prop) => !exclude.includes(prop.name.toString())) : included;
    const filteredProps = filter ? filter(excluded) : excluded;

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
  }, [schema, values, include, exclude, filter, sort, projection]);
};
