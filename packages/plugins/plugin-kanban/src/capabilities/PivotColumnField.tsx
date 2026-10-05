//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Database, Obj } from '@dxos/echo';
import { type FormFieldRendererProps, SelectField, useFormValues } from '@dxos/react-ui-form';
import * as Field from '@dxos/react-ui/Field';

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
