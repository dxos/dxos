//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Surface } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Obj } from '@dxos/echo';
import { Field } from '@dxos/react-ui';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';

import { useSingleSelectFields } from '#hooks';

export type PivotColumnFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Omit<FormFieldRendererProps, 'type'>;

export const PivotColumnField = ({ data, ...inputProps }: PivotColumnFieldProps) => {
  const ast = data.fieldPropertyAst;
  const target = data.target;
  const db = Database.isDatabase(target) ? target : Obj.isObject(target) ? Obj.getDatabase(target) : undefined;
  const { typename: typeUri } = useFormValues('KanbanForm');
  const singleSelectColumns = useSingleSelectFields(db, typeUri);

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
