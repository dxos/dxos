//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FormatEnums, type MutableSchema, S } from '@dxos/echo-schema';
import { Button, Icon, useTranslation, type ThemedClassName } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';
import {
  createUniqueFieldForView,
  getPropertySchemaForFormat,
  type FieldProjection,
  FieldSchema,
  type FieldType,
  type ViewType,
  ViewProjection,
  type PropertyType,
} from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { translationKey } from '../../translations';
import { Form, FormInput } from '../Form';

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

  const fieldProperties = useMemo<PropertyType>(() => {
    if (!field) {
      return;
    }

    const { props } = projection.getFieldProjection(field.property);
    return props;
  }, [field, view]);
  const [{ fieldSchema }, setSchema] = useState({ fieldSchema: getPropertySchemaForFormat(fieldProperties?.format) });

  // TODO(burdon): Update object type (field) when format changes (get from FormatSchema map).
  // TODO(burdon): Handle changes to `property` (e.g., uniqueness)?
  const handleValueChanged = useCallback((values: PropertyType) => {
    // TODO(burdon): Log.
    setSchema({ fieldSchema: getPropertySchemaForFormat(values?.format) });
  }, []);

  useEffect(() => {
    handleValueChanged(fieldProperties);
  }, [fieldProperties]);

  const handleAdditionalValidation = useCallback(
    ({ property }: PropertyType) => {
      if (property && view.fields.find((f) => f.property === property && f !== field)) {
        return [{ path: 'property', message: `'${property}' is not unique.` }];
      }
    },
    [view.fields, field],
  );

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleAdd = useCallback(() => {
    const field = createUniqueFieldForView(view);
    view.fields.push(field);
    setField(field);
  }, [view]);

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
    (field: FieldType, props: FieldProjection) => projection.setFieldProjection({ field, props }),
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
        field &&
        fieldProperties && (
          <Form<PropertyType>
            key={field.property}
            autoFocus
            values={fieldProperties}
            schema={fieldSchema}
            additionalValidation={handleAdditionalValidation}
            onValuesChanged={handleValueChanged}
            onSave={(props) => handleSet(field, props)}
            Custom={(props) => (
              <>
                {/* TODO(burdon): Move property field here. */}
                <FormInput<PropertyType>
                  property='format'
                  label={t('field format label')}
                  options={FormatEnums.map((value) => ({ value, label: String(value) }))}
                  {...props}
                />
              </>
            )}
          />
        )
      )}

      {/* TODO(burdon): Option. */}
      {!readonly && (
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
