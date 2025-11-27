//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { forwardRef, useMemo } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type ProjectionModel, type SchemaProperty, getSchemaProperties } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { type QueryRefOptions } from '../../hooks';

import { type RefFieldProps } from './fields';
import { FormErrorBoundary } from './FormErrorBoundary';
import { FormField, type FormFieldProps } from './FormField';
import { type FormFieldLookup, type FormFieldMap } from './FormFieldComponent';
import { useFormValues } from './FormRoot';

export type FormFieldSetProps = ThemedClassName<
  {
    testId?: string;
    schema: Schema.Schema.All;
    /**
     * Path to the current object from the root. Used with nested forms.
     */
    path?: (string | number)[];
    exclude?: (props: SchemaProperty<any>[]) => SchemaProperty<any>[];
    // TODO(burdon): Change to function (dynamic?)
    sort?: string[];
    /**
     * Optional projection for projection-based field management.
     */
    projection?: ProjectionModel;
    /**
     * Map of custom renderers for specific properties.
     * Prefer lookupComponent for plugin specific input surfaces.
     */
    fieldMap?: FormFieldMap;
    // TODO(burdon): Document.
    lookupComponent?: FormFieldLookup;
    onQueryRefOptions?: QueryRefOptions;
  } & Pick<FormFieldProps, 'readonly'> &
    Pick<
      RefFieldProps,
      | 'createSchema'
      | 'createOptionLabel'
      | 'createOptionIcon'
      | 'createInitialValuePath'
      | 'onCreate'
      | 'onQueryRefOptions'
    >
>;

export const FormFieldSet = forwardRef<HTMLDivElement, FormFieldSetProps>(
  (
    {
      classNames,
      schema,
      path,
      exclude,
      sort,
      projection,
      readonly,
      fieldMap,
      lookupComponent,
      onQueryRefOptions,
      ...props
    },
    forwardRef,
  ) => {
    const values = useFormValues(FormFieldSet.displayName!, path);

    const properties = useMemo(() => {
      const props = getSchemaProperties(schema.ast, values, { form: true });

      // Use projection-based field management when view and projection are available.
      if (projection) {
        const fieldProjections = projection.getFieldProjections();
        const hiddenProperties = new Set(projection.getHiddenProperties());

        // Filter properties to only include visible ones and order by projection.
        const visibleProps = props.filter((prop) => !hiddenProperties.has(prop.name));
        const orderedProps: SchemaProperty<any>[] = [];

        // Add properties in projection field order.
        for (const fieldProjection of fieldProjections) {
          const fieldPath = String(fieldProjection.field.path);
          const prop = visibleProps.find((p) => p.name === fieldPath);
          if (prop) {
            orderedProps.push(prop);
          }
        }

        // Add any remaining properties not in projection.
        const projectionPaths = new Set(fieldProjections.map((fp) => String(fp.field.path)));
        const remainingProps = visibleProps.filter((prop) => !projectionPaths.has(prop.name));
        orderedProps.push(...remainingProps);
        return orderedProps;
      }

      // Fallback to legacy filter/sort behavior.
      const filtered = exclude ? exclude(props) : props;
      return sort ? filtered.sort((a, b) => sort.indexOf(a.name) - sort.indexOf(b.name)) : filtered;
    }, [schema, values, exclude, sort, projection?.fields]);

    return (
      <div role='form' className={mx('is-full', classNames)} ref={forwardRef}>
        {properties
          .map((property) => {
            return (
              <FormErrorBoundary key={property.name} path={[...(path ?? []), property.name]}>
                <FormField
                  property={property}
                  path={[...(path ?? []), property.name]}
                  readonly={readonly}
                  projection={projection}
                  fieldMap={fieldMap}
                  lookupComponent={lookupComponent}
                  onQueryRefOptions={onQueryRefOptions}
                  {...props}
                />
              </FormErrorBoundary>
            );
          })
          .filter(isTruthy)}
      </div>
    );
  },
);

FormFieldSet.displayName = 'Form.Fields';
