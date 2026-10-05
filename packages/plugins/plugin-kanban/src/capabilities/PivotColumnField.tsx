//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import * as TypeOptions from '@dxos/app-toolkit/TypeOptions';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Obj, Type } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { Field } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

export type PivotColumnFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  const { typename: typeUri } = useFormValues('KanbanForm');
  const types = useQuery(db, TypeOptions.allTypesQuery);
  const selectedSchema = useMemo(
    () => types.filter(Type.isType).find((type) => Type.getURI(type) === typeUri),
    [types, typeUri],
  );
  const singleSelectColumns = useMemo(() => {
    const properties = selectedSchema?.jsonSchema.properties;
    if (!properties) {
      return [];
    }

    return Object.entries(properties).reduce<string[]>((acc, [key, value]) => {
      if (typeof value === 'object' && value !== null && (value as { format?: string }).format === 'single-select') {
        acc.push(key);
      }
      return acc;
    }, []);
  }, [selectedSchema]);

  if (!ast || !db || !typeUri) {
    return null;
  }

  const props: FormFieldRendererProps = { ...inputProps, type: ast };

  return (
    <Field.Root>
      <Field.Label>{inputProps.label}</Field.Label>
      <SelectField {...props} options={singleSelectColumns.map((column) => ({ value: column }))} />
    </Field.Root>
  );
};
