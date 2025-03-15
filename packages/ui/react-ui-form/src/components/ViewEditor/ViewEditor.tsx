//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo-db';
import { AST, Format, type EchoSchema, S, type JsonProp } from '@dxos/echo-schema';
import { IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, inputTextLabel, mx } from '@dxos/react-ui-theme';
import { FieldSchema, type FieldType, type ViewType, ViewProjection, VIEW_FIELD_LIMIT } from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form } from '../Form';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem]';

const ViewMetaSchema = S.Struct({
  name: S.String.annotations({
    [AST.TitleAnnotationId]: 'View',
  }),
  typename: Format.URL.annotations({
    [AST.TitleAnnotationId]: 'Typename',
  }),
}).pipe(S.mutable);

type ViewMetaType = S.Schema.Type<typeof ViewMetaSchema>;

export type ViewEditorProps = ThemedClassName<{
  schema: EchoSchema;
  view: ViewType;
  registry?: SchemaRegistry;
  readonly?: boolean;
  showHeading?: boolean;
  onTypenameChanged: (typename: string) => void;
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
  onTypenameChanged,
  onDelete,
}: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const projection = useMemo(() => new ViewProjection(schema, view), [schema, view]);
  const [field, setField] = useState<FieldType>();

  // TODO(burdon): Should be reactive.
  const viewValues = useMemo(() => {
    return {
      name: view.name,
      // TODO(burdon): Need to warn user of possible consequences of editing.
      // TODO(burdon): Settings should have domain name owned by user.
      typename: view.query.typename,
    };
  }, [view]);

  const handleViewUpdate = useCallback(
    ({ name, typename }: ViewMetaType) => {
      requestAnimationFrame(() => {
        if (view.name !== name) {
          view.name = name;
        }
        if (view.query.typename !== typename) {
          onTypenameChanged(typename);
        }
      });
    },
    [view, schema, onTypenameChanged],
  );

  const handleSelect = useCallback((field: FieldType) => {
    setField((f) => (f === field ? undefined : field));
  }, []);

  const handleAdd = useCallback(() => {
    const field = projection.createFieldProjection();
    setField(field);
  }, [view]);

  const handleDelete = useCallback(
    (fieldId: string) => {
      if (fieldId === field?.id) {
        setField(undefined);
      }
      onDelete(fieldId);
    },
    [onDelete, field],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
      const fields = [...view.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      view.fields = fields;
    },
    [view.fields],
  );

  const handleClose = useCallback(() => setField(undefined), []);

  const hiddenProperties = projection.getHiddenProperties();

  const handleHide = useCallback(
    (fieldId: string) => {
      setField(undefined);
      projection.hideFieldProjection(fieldId);
    },
    [projection],
  );

  const handleShow = useCallback(
    (property: string) => {
      setField(undefined);
      projection.showFieldProjection(property as JsonProp);
    },
    [projection],
  );

  return (
    <div role='none' className={mx('flex flex-col w-full divide-y divide-separator', classNames)}>
      <Form<ViewMetaType> autoSave schema={ViewMetaSchema} values={viewValues} onSave={handleViewUpdate} />

      <div>
        {/* TODO(burdon): Clean up common form ux. */}
        <div role='none' className='p-2'>
          <label className={mx(inputTextLabel)}>{t('fields label')}</label>
        </div>

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
                    <div className='flex items-center gap-2 -ml-4'>
                      <List.ItemButton
                        icon='ph--eye-slash--regular'
                        disabled={view.fields.length <= 1}
                        onClick={() => handleHide(field.id)}
                      />
                      <List.ItemDeleteButton
                        icon='ph--trash--regular'
                        disabled={view.fields.length <= 1}
                        onClick={() => handleDelete(field.id)}
                      />
                    </div>
                  </List.Item>
                ))}
              </div>
            </>
          )}
        </List.Root>

        {hiddenProperties.length > 0 && (
          <div>
            <div role='none' className='p-2'>
              <label className={mx(inputTextLabel)}>{t('hidden fields label')}</label>
            </div>

            <List.Root<string>
              items={hiddenProperties}
              isItem={(item): item is string => typeof item === 'string'}
              getId={(property) => property}
            >
              {({ items: properties }) => (
                <div role='list' className='flex flex-col w-full'>
                  {properties?.map((property) => (
                    <List.Item<string>
                      key={property}
                      item={property}
                      classNames={mx(grid, ghostHover, 'cursor-pointer')}
                    >
                      <div />
                      <List.ItemTitle>{property}</List.ItemTitle>
                      <List.ItemButton icon='ph--eye--regular' onClick={() => handleShow(property)} />
                    </List.Item>
                  ))}
                </div>
              )}
            </List.Root>
          </div>
        )}
      </div>

      {field && (
        <FieldEditor
          key={field.id}
          view={view}
          projection={projection}
          field={field}
          registry={registry}
          onSave={handleClose}
        />
      )}

      {!readonly && !field && (
        <div className='flex p-2 justify-center'>
          <IconButton
            icon='ph--plus--regular'
            label={t('button add property')}
            onClick={handleAdd}
            // TODO(burdon): Show field limit in ux (not tooltip).
            disabled={view.fields.length >= VIEW_FIELD_LIMIT}
          />
        </div>
      )}
    </div>
  );
};
