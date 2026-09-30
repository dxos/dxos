//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useMemo } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';

import { FormFieldErrorBoundary } from '../components/Form/FormField/FormField.tsx';
import {
  type FormFieldsProps,
  toPathSegments,
  useFormFieldsProperties,
} from '../components/Form/FormFields/FormFields.tsx';
import { useFormContext, useFormValues } from '../hooks/index.ts';
import { getSchemaAtPath } from '../util/index.ts';
import { FormFieldDispatch } from './FormFieldDispatch.tsx';

const FORM_FIELDS_NAME = 'Form.Fields';

export type { FormFieldsProps };

/**
 * Walks the schema at `path`: one row per property, a nested group per object. Renders no element of its own, so its
 * rows are direct children of the enclosing grid. The layout DSL (`Form.Layout`) is out of the spike's scope.
 */
export const FormFields = ({
  path: pathProp,
  include,
  exclude,
  sort,
  filter,
  schema: schemaProp,
  layoutName: _layoutName,
  ...props
}: FormFieldsProps<any>) => {
  const { form, variant: _variant, testId: _testId, ...contextProps } = useFormContext(FORM_FIELDS_NAME);
  const path = useMemo(() => toPathSegments(pathProp), [typeof pathProp === 'string' ? pathProp : pathProp?.join('.')]);
  const values = useFormValues<AnyProperties>(FORM_FIELDS_NAME, path);
  const { readonly, layout, projection, ...fieldContext } = { ...contextProps, ...props };
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
