//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { Field } from './Field';
import { List, type ListProps } from './List';
import { FieldScalarType, FieldSchema, type FieldType, getUniqueProperty, type ViewType } from '../types';

export type ViewEditorProps = ThemedClassName<{
  view: ViewType;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
// TODO(burdon): Are views always flat projections?
export const ViewEditor = ({ classNames, view, readonly }: ViewEditorProps) => {
  const [field, setField] = useState<FieldType | undefined>();

  const handleAdd = () => {
    const field: FieldType = { path: getUniqueProperty(view), type: FieldScalarType.String };
    view.fields.push(field);
    setField(field);
  };

  const handleDelete: ListProps<FieldType>['onDelete'] = (field: FieldType) => {
    const idx = view.fields.findIndex(({ path }) => field.path === path);
    view.fields.splice(idx, 1);
  };

  return (
    <div role='none' className={mx('flex flex-col w-full gap-2 divide-y divide-separator', classNames)}>
      <List<FieldType>
        items={view.fields}
        schema={FieldSchema}
        getLabel={(field) => field.path}
        onSelect={(field) => setField(field)}
        onDelete={handleDelete}
      />
      {field && <Field classNames='p-2' autoFocus field={field} schema={view.schema} />}
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
