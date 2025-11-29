//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { type SchemaProperty, getSchemaProperties } from '@dxos/schema';
import { isTruthy } from '@dxos/util';

import { type FormHandlerProps } from '../../hooks';

import { FormField, type FormFieldProps } from './FormField';
import { FormFieldErrorBoundary } from './FormFieldComponent';
import { useFormValues } from './FormRoot';

export type FormFieldSetProps<T extends AnyProperties> = ThemedClassName<
  {
    testId?: string;
    exclude?: (props: SchemaProperty<T>[]) => SchemaProperty<T>[];
    // TODO(burdon): Change to function (dynamic?)
    sort?: string[];
  } & Pick<FormHandlerProps<T>, 'schema'> &
    Pick<
      FormFieldProps<T>,
      | 'path'
      | 'inline'
      | 'projection'
      | 'autoFocus'
      | 'readonly'
      | 'fieldMap'
      | 'fieldProvider'
      | 'createSchema'
      | 'createOptionLabel'
      | 'createOptionIcon'
      | 'createInitialValuePath'
      | 'onCreate'
      | 'onQueryRefOptions'
    >
>;

export const FormFieldSet = forwardRef<HTMLDivElement, FormFieldSetProps<any>>(
  ({ classNames, schema, path, exclude, sort, projection, inline, ...props }, forwardRef) => {
    const values = useFormValues(FormFieldSet.displayName!, path);

    // TODO(burdon): Updates on every value change.
    //  Remove values dep if can remove from getSchemaProperties.
    const properties = useMemo(() => {
      if (!schema) {
        return [];
      }

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
        const projectionPaths = new Set(fieldProjections.map((projection) => String(projection.field.path)));
        const remainingProps = visibleProps.filter((prop) => !projectionPaths.has(prop.name));
        orderedProps.push(...remainingProps);
        return orderedProps;
      }

      // Fallback to legacy filter/sort behavior.
      const filtered = exclude ? exclude(props) : props;
      return sort ? filtered.sort(({ name: a }, { name: b }) => sort.indexOf(a) - sort.indexOf(b)) : filtered;
    }, [schema, values, exclude, sort, projection?.fields]);

    return (
      <div role='form' className={mx('is-full', inline && 'flex flex-col gap-2', classNames)} ref={forwardRef}>
        {properties
          .map((property) => {
            return (
              <FormFieldErrorBoundary key={property.name} path={[...(path ?? []), property.name]}>
                <FormField
                  property={property}
                  path={[...(path ?? []), property.name]}
                  projection={projection}
                  inline={inline}
                  {...props}
                />
              </FormFieldErrorBoundary>
            );
          })
          .filter(isTruthy)}
      </div>
    );
  },
);

FormFieldSet.displayName = 'Form.Fields';
