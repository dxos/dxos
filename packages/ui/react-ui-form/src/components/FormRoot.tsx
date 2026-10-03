//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type AnyProperties } from '@dxos/echo/internal';
import { type Merge } from '@dxos/util';

import {
  FormContextProvider,
  type FormContextValue,
  type FormHandlerProps,
  type FormUpdateMeta,
  useFormHandler,
} from '../hooks/index.ts';
import { type FormFieldsProps } from './property-walk.ts';

//
// Root
//

export type FormRootProps<T extends AnyProperties = AnyProperties> = Merge<
  Omit<FormContextValue<T>, 'form'>,
  Pick<FormHandlerProps<T>, 'schema' | 'autoSave' | 'values' | 'defaultValues' | 'onValidate' | 'onValuesChanged'>,
  Omit<FormFieldsProps<T>, 'path' | 'schema'>,
  PropsWithChildren<{
    /**
     * Called when the form is submitted and passes validation.
     */
    onSave?: (values: T, meta: FormUpdateMeta<T>) => void;

    /**
     * Called when the form is canceled to abandon/undo any pending changes.
     */
    onCancel?: () => void;
  }>
>;

export const FormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  schema,
  values,
  onSave,
  onCancel,
  ...props
}: FormRootProps<T>) => {
  const form = useFormHandler({ schema, values, onSave, onCancel, ...props });

  return (
    <FormContextProvider form={form} {...props}>
      {children}
    </FormContextProvider>
  );
};

FormRoot.displayName = 'Form.Root';
