//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type SchemaProperty } from '@dxos/effect';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isTruthy } from '@dxos/util';

import { type FormHandlerProps } from '../../hooks';
import { getFormProperties } from '../../util';

import { useFormValues } from './Form';
import { FormField, type FormFieldProps } from './FormField';
import { FormFieldErrorBoundary, FormFieldLabel } from './FormFieldComponent';

export type FormFieldSetProps<T extends AnyProperties> = ThemedClassName<
  {
    label?: string;
    exclude?: (props: SchemaProperty[]) => SchemaProperty[];
    sort?: string[];
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
      | 'createOptionLabel'
      | 'createOptionIcon'
      | 'createInitialValuePath'
      | 'db'
      | 'getOptions'
      | 'onCreate'
    >
>;

export const FormFieldSet = forwardRef<HTMLDivElement, FormFieldSetProps<any>>(
  ({ classNames, label, schema, readonly, path, exclude, sort, projection, layout, ...props }, forwardRef) => {
    const values = useFormValues(FormFieldSet.displayName!, path);

    // TODO(burdon): Updates on every value change.
    //  Remove values dep if can remove from getSchemaProperties.
    const properties = useMemo(() => {
      if (!schema) {
        return [];
      }

      // TODO(wittjosiah): Reconcile FormInputAnnotation with projection hidden properties & exclude function.
      const props = getFormProperties(schema.ast);

      // Use projection-based field management when view and projection are available.
      if (projection) {
        const fieldProjections = projection.getFieldProjections();
        const hiddenProperties = new Set(projection.getHiddenProperties());

        // Filter properties to only include visible ones and order by projection.
        const visibleProps = props.filter((prop) => !hiddenProperties.has(prop.name.toString()));
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
      const filtered = exclude ? exclude(props) : props;
      return sort
        ? filtered.sort(({ name: a }, { name: b }) => sort.indexOf(a.toString()) - sort.indexOf(b.toString()))
        : filtered;
    }, [schema, values, exclude, sort, projection?.fields]);

    if ((readonly || layout === 'static') && values == null) {
      return null;
    }

    return (
      <div
        role='form'
        className={mx('is-full', layout === 'inline' && 'flex flex-col gap-2', classNames)}
        ref={forwardRef}
      >
        {layout !== 'inline' && label && <FormFieldLabel label={label} asChild />}
        {properties
          .map((property) => {
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
          })
          .filter(isTruthy)}
      </div>
    );
  },
);

FormFieldSet.displayName = 'Form.Fields';
