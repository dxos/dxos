//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { S, type ReactiveObject, type StoredSchema } from '@dxos/echo-schema';
import { Button, Icon, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import {
  createUniqueFieldForView,
  type FieldProjectionType,
  FieldSchema,
  type FieldType,
  type ViewType,
  ViewProjection,
} from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { Field } from '../Field';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem] rounded';

// TODO(burdon): Resolver.
export type ViewEditorProps = ThemedClassName<{
  schema: ReactiveObject<StoredSchema>;
  view: ViewType;
  readonly?: boolean;
}>;

/**
 * Schema-based object form.
 */
export const ViewEditor = ({ classNames, schema, view, readonly }: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const projection = useMemo(() => new ViewProjection(schema, view), [schema, view]);
  const [field, setField] = useState<FieldType | undefined>();
  const fieldProperties = useMemo(
    () => (field ? projection.getFieldProjection(field.property) : undefined),
    [field, view],
  );

  const handleAdd = useCallback(() => {
    const field = createUniqueFieldForView(view);
    view.fields.push(field);
    setField(field);
  }, [view]);

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleDelete = useCallback(
    (field: FieldType) => {
      const idx = view.fields.findIndex((f) => field.property === f.property);
      view.fields.splice(idx, 1);
      setField(undefined);
    },
    [view.fields],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      arrayMove(view.fields, fromIndex, toIndex);
    },
    [view.fields],
  );

  const handleSet = useCallback(
    (field: FieldType, props: FieldProjectionType) => {
      projection.updateField(field);
      projection.updateFormat(field.property, props);
    },
    [view.fields],
  );

  // TODO(burdon): Get getId.
  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <List.Root<FieldType>
        isItem={S.is(FieldSchema)}
        items={view.fields}
        onMove={handleMove}
        getId={(field) => field.property}
      >
        {({ items }) => (
          <div className='w-full'>
            <div role='heading' className={grid}>
              <div />
              <div className='flex items-center text-sm'>{t('field path label')}</div>
            </div>

            <div role='list' className='flex flex-col w-full'>
              {items?.map((item) => (
                <List.Item<FieldType> key={item.property} item={item} classNames={mx(grid, ghostHover)}>
                  <List.ItemDragHandle />
                  <List.ItemTitle onClick={() => handleSelect(item)}>{item.property}</List.ItemTitle>
                  <List.ItemDeleteButton onClick={() => handleDelete(item)} />
                </List.Item>
              ))}
            </div>
          </div>
        )}
      </List.Root>

      {fieldProperties && field && (
        <Field
          key={field.property}
          classNames='p-2'
          autoFocus
          field={fieldProperties}
          onSave={(props) => handleSet(field, props)}
        />
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
