//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type S } from '@dxos/effect';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type FieldType } from './types';

// TODO(burdon): Reconcile with ColumnSettings.

export type FormEditorProps<T = {}> = ThemedClassName<{
  schema?: S.Schema<T>;
  fields: readonly FieldType[];
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const FormEditor = <T = {},>({ classNames, schema, fields, readonly }: FormEditorProps<T>) => {
  return (
    <div role='none' className={mx('flex flex-col w-full gap-2', classNames)}>
      {!readonly && (
        <div className='flex justify-center'>
          <Button>
            <Icon icon='ph--plus--regular' size={4} />
          </Button>
        </div>
      )}
    </div>
  );
};
