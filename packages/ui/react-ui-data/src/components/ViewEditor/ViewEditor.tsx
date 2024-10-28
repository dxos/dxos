//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S, createObjectId, type SchemaResolver } from '@dxos/echo-schema';
import { Button, Icon, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { getUniqueProperty, FieldValueType, FieldSchema, type FieldType, type ViewType } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { Field } from '../Field';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem] rounded';

export type ViewEditorProps = ThemedClassName<{
  view: ViewType;
  // TODO(burdon): Remove when we can represent the schema field as an object/reference.
  schemaResolver?: SchemaResolver;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const ViewEditor = ({ classNames, view, schemaResolver, readonly }: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const [field, setField] = useState<FieldType | undefined>();

  const handleAdd = () => {
    const field: FieldType = { id: createObjectId(), path: getUniqueProperty(view), type: FieldValueType.String };
    view.fields.push(field);
    setField(field);
  };

  const handleSelect = (field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  };

  const handleDelete = (field: FieldType) => {
    const idx = view.fields.findIndex((f) => field.id === f.id);
    view.fields.splice(idx, 1);
    setField(undefined);
  };

  const handleMove = (fromIndex: number, toIndex: number) => {
    arrayMove(view.fields, fromIndex, toIndex);
  };

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <List.Root<FieldType> isItem={S.is(FieldSchema)} items={view.fields} onMove={handleMove}>
        {({ items }) => (
          <div className='w-full'>
            <div role='heading' className={grid}>
              <div />
              <div className='flex items-center text-sm'>{t('field path label')}</div>
            </div>

            <div role='list' className='flex flex-col w-full'>
              {items?.map((item) => (
                <List.Item<FieldType> key={item.id} item={item} classNames={mx(grid, ghostHover)}>
                  <List.ItemDragHandle />
                  <List.ItemTitle onClick={() => handleSelect(item)}>{item.path}</List.ItemTitle>
                  <List.ItemDeleteButton onClick={() => handleDelete(item)} />
                </List.Item>
              ))}
            </div>
          </div>
        )}
      </List.Root>

      {field && view.schema && (
        <Field classNames='p-2' autoFocus field={field} schema={schemaResolver?.(view.schema)} />
      )}

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
