//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo-db';
import { EchoSchema, Format, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Icon, IconButton, Message, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, inputTextLabel, mx } from '@dxos/react-ui-theme';
import { FieldSchema, type FieldType, type ViewType, ViewProjection, VIEW_FIELD_LIMIT } from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form } from '../Form';

const grid = 'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem]';

const ViewMetaSchema = Schema.Struct({
  name: Schema.String.annotations({
    title: 'View',
  }),
  typename: Format.URL.annotations({
    title: 'Typename',
  }),
}).pipe(Schema.mutable);

type ViewMetaType = Schema.Schema.Type<typeof ViewMetaSchema>;

export type ViewEditorProps = ThemedClassName<{
  schema: Schema.Schema.AnyNoContext;
  view: ViewType;
  registry?: SchemaRegistry;
  readonly?: boolean;
  showHeading?: boolean;
  onTypenameChanged?: (typename: string) => void;
  onDelete?: (fieldId: string) => void;
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
  const projection = useMemo(() => {
    // Use reactive and mutable version of json schema when schema is mutable.
    const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
    return new ViewProjection(jsonSchema, view);
  }, [schema, view]);
  const [field, setField] = useState<FieldType>();
  const immutable = readonly || !isMutable(schema);

  // TODO(burdon): Should be reactive.
  const viewValues = useMemo(() => {
    return {
      name: view.name,
      // TODO(burdon): Need to warn user of possible consequences of editing.
      // TODO(burdon): Settings should have domain name owned by user.
      typename: view.query.typename,
    };
  }, [view]);

  const handleSelect = useCallback(
    (field: FieldType) => {
      if (immutable) {
        return;
      }
      setField((f) => (f === field ? undefined : field));
    },
    [immutable],
  );

  // TODO(burdon): Check if mutable; variant of useCallback that return undefined if readonly?

  const handleAdd = useCallback(() => {
    invariant(!immutable);
    const field = projection.createFieldProjection();
    setField(field);
  }, [schema, view]);

  const handleUpdate = useCallback(
    ({ name, typename }: ViewMetaType) => {
      invariant(!immutable);
      requestAnimationFrame(() => {
        if (view.name !== name) {
          view.name = name;
        }

        if (view.query.typename !== typename && !immutable) {
          onTypenameChanged?.(typename);
        }
      });
    },
    [schema, view, onTypenameChanged, immutable],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      invariant(!immutable);
      if (fieldId === field?.id) {
        setField(undefined);
      }

      onDelete?.(fieldId);
    },
    [schema, field, onDelete],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      invariant(!immutable);
      // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
      const fields = [...view.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      view.fields = fields;
    },
    [schema, view.fields],
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
    <div role='none' className={mx('overflow-y-auto', classNames)}>
      {immutable && (
        <div role='none' className='p-2'>
          <Message.Root valence='neutral' className='rounded'>
            <Message.Title>
              <Icon icon='ph--info--regular' size={5} classNames='inline' /> {t('system schema title')}
            </Message.Title>
            <Message.Body>{t('system schema description')}</Message.Body>
          </Message.Root>
        </div>
      )}
      <Form<ViewMetaType>
        autoSave
        schema={ViewMetaSchema}
        values={viewValues}
        onSave={handleUpdate}
        classNames='min-bs-0 overflow-y-auto'
      />

      <div role='none' className='min-bs-0 overflow-y-auto'>
        {/* TODO(burdon): Clean up common form ux. */}
        <div role='none' className='pli-card-spacing-inline mlb-card-spacing-block'>
          <label className={mx(inputTextLabel)}>{t('fields label')}</label>
        </div>

        <List.Root<FieldType>
          items={view.fields}
          isItem={Schema.is(FieldSchema)}
          getId={(field) => field.id}
          onMove={immutable ? undefined : handleMove}
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
                  <List.Item<FieldType>
                    key={field.id}
                    item={field}
                    classNames={mx(grid, ghostHover, !immutable && 'cursor-pointer')}
                  >
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleSelect(field)}>{field.path}</List.ItemTitle>
                    <div className='flex items-center gap-2 -ml-4'>
                      <List.ItemButton
                        icon='ph--eye-slash--regular'
                        disabled={view.fields.length <= 1}
                        onClick={() => handleHide(field.id)}
                        data-testid='hide-field-button'
                      />
                      {!immutable && (
                        <List.ItemDeleteButton
                          icon='ph--trash--regular'
                          disabled={view.fields.length <= 1}
                          onClick={() => handleDelete(field.id)}
                        />
                      )}
                    </div>
                  </List.Item>
                ))}
              </div>
            </>
          )}
        </List.Root>

        {hiddenProperties.length > 0 && (
          <div>
            <div role='none' className='pli-card-spacing-inline mlb-card-spacing-block'>
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
                      classNames={mx(grid, ghostHover, !immutable && 'cursor-pointer')}
                    >
                      <div />
                      <List.ItemTitle>{property}</List.ItemTitle>
                      <List.ItemButton
                        icon='ph--eye--regular'
                        onClick={() => handleShow(property)}
                        data-testid='show-field-button'
                      />
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
        <div role='none' className='pli-card-spacing-chrome mlb-card-spacing-chrome'>
          <IconButton
            icon='ph--plus--regular'
            label={t('button add property')}
            onClick={immutable ? undefined : handleAdd}
            // TODO(burdon): Show field limit in ux (not tooltip).
            disabled={view.fields.length >= VIEW_FIELD_LIMIT}
            classNames='flex is-full'
          />
        </div>
      )}
    </div>
  );
};
