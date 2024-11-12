//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaResolver } from '@dxos/echo-db';
import { type MutableSchema, S } from '@dxos/echo-schema';
import { Button, Icon, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import { FieldSchema, type FieldType, type ViewType, ViewProjection } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem]';

export type ViewEditorProps = ThemedClassName<{
  schema: MutableSchema;
  view: ViewType;
  registry?: SchemaResolver;
  readonly?: boolean;
  showHeading?: boolean;
  onDelete: (fieldId: string) => void;
}>;

/**
 * Schema-based object form.
 */
export const ViewEditor = ({
  classNames,
  schema,
  view,
  registry,
  readonly,
  showHeading = false,
  onDelete,
}: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const projection = useMemo(() => new ViewProjection(schema, view), [schema, view]);
  const [field, setField] = useState<FieldType>();

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleAdd = useCallback(() => {
    const field = projection.createFieldProjection();
    setField(field);
  }, [view]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      arrayMove(view.fields, fromIndex, toIndex);
    },
    [view.fields],
  );

  const handleClose = useCallback(() => setField(undefined), []);

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <List.Root<FieldType>
        items={view.fields}
        isItem={S.is(FieldSchema)}
        getId={(field) => field.id}
        onMove={handleMove}
      >
        {({ items: fields }) => (
          <>
            {showHeading && (
              <div role='heading' className={grid}>
                <div />
                <div className='flex items-center text-sm'>{t('field path label')}</div>
              </div>
            )}

            <div role='list' className='flex flex-col w-full'>
              {fields?.map((field) => (
                <List.Item<FieldType> key={field.id} item={field} classNames={mx(grid, ghostHover, 'cursor-pointer')}>
                  <List.ItemDragHandle />
                  <List.ItemTitle onClick={() => handleSelect(field)}>{field.path}</List.ItemTitle>
                  <List.ItemDeleteButton onClick={() => onDelete(field.id)} />
                </List.Item>
              ))}
            </div>
          </>
        )}
      </List.Root>

      {field && (
        <FieldEditor
          key={field.id}
          view={view}
          projection={projection}
          field={field}
          registry={registry}
          onClose={handleClose}
        />
      )}

      {!readonly && !field && (
        <div className='flex justify-center p-2'>
          <div className='flex gap-2'>
            <Button onClick={handleAdd}>
              <Icon icon='ph--plus--regular' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
