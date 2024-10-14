//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { generateEchoId } from '@dxos/echo-schema';
import { Button, Icon, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { FieldScalarType, FieldSchema, type FieldType, getUniqueProperty, type ViewType } from '../../types';
import { Field } from '../Field';
import { List, type ListProps } from '../List';

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
    const field: FieldType = { id: generateEchoId(), path: getUniqueProperty(view), type: FieldScalarType.String };
    view.fields.push(field);
    setField(field);
  };

  const handleSelect: ListProps<FieldType>['onDelete'] = (field) => {
    setField((f) => (f === field ? undefined : field));
  };

  const handleDelete: ListProps<FieldType>['onDelete'] = (field) => {
    const idx = view.fields.findIndex((f) => field.id === f.id);
    view.fields.splice(idx, 1);
  };

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <List<FieldType>
        items={view.fields}
        schema={FieldSchema}
        getLabel={(field) => (field.label?.length ? field.label : field.path)}
        onSelect={handleSelect}
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
