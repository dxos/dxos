//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Field } from './Field';
import { FieldScalarType, type FormType } from './types';

export type FormEditorProps<T = {}> = ThemedClassName<{
  form: FormType;
  schema?: S.Schema<T>;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const FormEditor = <T = {},>({ classNames, form, schema, readonly }: FormEditorProps<T>) => {
  const handleAdd = () => {
    // TODO(burdon): Check unique.
    form.fields.push({ path: 'prop', type: FieldScalarType.String });
  };

  // TODO(burdon): Delete prop.
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2 divide-y divide-separator', classNames)}>
      {form.fields.map((field, i) => (
        // NOTE: Use `i` as the key since the property might change.
        <Field key={i} classNames='p-2' field={field} schema={schema} />
      ))}
      {!readonly && (
        <div className='flex justify-center'>
          <Button onClick={handleAdd}>
            <Icon icon='ph--plus--regular' size={4} />
          </Button>
        </div>
      )}
    </div>
  );
};
