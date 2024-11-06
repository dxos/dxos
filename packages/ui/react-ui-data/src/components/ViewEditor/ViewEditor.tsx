//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { type MutableSchema, S } from '@dxos/echo-schema';
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
  getPropertySchemaForFormat,
} from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { Field } from '../Field';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem] rounded';

export type ViewEditorProps = ThemedClassName<{
  schema: MutableSchema;
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

  // TODO(ZaymonFC): Projection should return `Property` instead of `FieldProjectionType`
  const fieldProperties = useMemo(
    () => (field ? (projection.getFieldProjection(field.property) as any) : undefined),
    [field, view],
  );
  const [{ fieldSchema }, setSchema] = useState({ fieldSchema: getPropertySchemaForFormat(fieldProperties?.format) });

  const calculateFieldSchema = useCallback((values: any) => {
    setSchema({ fieldSchema: getPropertySchemaForFormat(values?.format) });
  }, []);

  useEffect(() => {
    calculateFieldSchema(fieldProperties);
  }, [fieldProperties]);

  const handleAdd = useCallback(() => {
    const field = createUniqueFieldForView(view);
    view.fields.push(field);
    setField(field);
  }, [view]);

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      arrayMove(view.fields, fromIndex, toIndex);
    },
    [view.fields],
  );

  const handleDelete = useCallback(
    (field: FieldType) => {
      const idx = view.fields.findIndex((f) => field.property === f.property);
      view.fields.splice(idx, 1);
      setField(undefined);
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

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <List.Root<FieldType>
        items={view.fields}
        isItem={S.is(FieldSchema)}
        getId={(field) => field.property}
        onMove={handleMove}
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

      {!fieldSchema ? (
        <div>Schema not implemented for {fieldProperties?.format ?? 'undefined'}</div>
      ) : (
        fieldProperties &&
        field && (
          <Field
            key={field.property}
            classNames='p-2'
            autoFocus
            values={fieldProperties}
            schema={fieldSchema}
            onValuesChanged={calculateFieldSchema}
            onSave={(props) => handleSet(field, props)}
          />
        )
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
