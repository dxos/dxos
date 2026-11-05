//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
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
  Omit<FormContextValue<T>, 'form' | 'object'>,
  Pick<
    FormHandlerProps<T>,
    | 'schema'
    | 'autoSave'
    | 'commitOn'
    | 'fieldOverrides'
    | 'values'
    | 'defaultValues'
    | 'onValidate'
    | 'onValuesChanged'
  >,
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

/**
 * Given a live ECHO object as its `values`, the form follows the object's changes itself and binds its collaborative
 * fields (see `CollaborativeAnnotation`) to the object's strings.
 */
export const FormRoot = <T extends AnyProperties = AnyProperties>({
  children,
  schema,
  values: valuesProp,
  onSave,
  onCancel,
  ...props
}: FormRootProps<T>) => {
  const object = Obj.isObject(valuesProp) ? valuesProp : undefined;
  const [snapshot] = useObject(object);
  const values = object ? (snapshot as Partial<T> | undefined) : valuesProp;
  const form = useFormHandler({ schema, values, onSave, onCancel, ...props });

  return (
    <FormContextProvider form={form} object={object} {...props}>
      {children}
    </FormContextProvider>
  );
};

FormRoot.displayName = 'Form.Root';
