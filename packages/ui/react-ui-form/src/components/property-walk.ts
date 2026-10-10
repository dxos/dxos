//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import { useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { type Merge } from '@dxos/util';

import { type FieldContext } from '#types';

import { getRootFormProperties } from '../util/index.ts';
import { type FormFieldDispatchProps } from './resolve-field.ts';

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
     * Picks a named layout out of `Annotation.FormLayoutAnnotation` when present. Falls back to `'default'`.
     * Ignored when the schema has no annotation (linear rendering then takes over).
     */
    layoutName?: string;
    /** The schema to walk in place of the form's, at the same path. */
    schema?: Schema.Codec<T, any>;
  },
  Pick<FormFieldDispatchProps, 'autoFocus'>,
  FieldContext
>;

export type UseFormFieldsPropertiesParams = Pick<
  FormFieldsProps<any>,
  'schema' | 'include' | 'exclude' | 'filter' | 'projection' | 'sort'
> & {
  values: AnyProperties | undefined;
};

/**
 * Resolves ordered schema properties for a walk (projection order, include/exclude, filter, sort).
 */
export const useFormFieldsProperties = ({
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
