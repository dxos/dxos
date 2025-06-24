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
  readonly: _readonly,
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
  const readonly = _readonly || !isMutable(schema);

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
      if (readonly) {
        return;
      }
      setField((f) => (f === field ? undefined : field));
    },
    [readonly],
  );

  // TODO(burdon): Check if mutable; variant of useCallback that return undefined if readonly?

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    const field = projection.createFieldProjection();
    setField(field);
  }, [schema, view, readonly]);

  const handleUpdate = useCallback(
    ({ name, typename }: ViewMetaType) => {
      invariant(!readonly);
      requestAnimationFrame(() => {
        if (view.name !== name) {
          view.name = name;
        }

        if (view.query.typename !== typename && !readonly) {
          onTypenameChanged?.(typename);
        }
      });
    },
    [schema, view, onTypenameChanged, readonly],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      invariant(!readonly);
      if (fieldId === field?.id) {
        setField(undefined);
      }

      onDelete?.(fieldId);
    },
    [schema, field, onDelete, readonly],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      invariant(!readonly);
      // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
      const fields = [...view.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      view.fields = fields;
    },
    [schema, view.fields, readonly],
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
      {readonly && (
        <div role='none' className='plb-card-spacing-block pli-card-spacing-inline'>
          <Message.Root valence='neutral' className='rounded'>
            <Message.Title>
              <Icon icon='ph--info--regular' size={5} classNames='inline' /> {t('system schema title')}
            </Message.Title>
            <Message.Body>{t('system schema description')}</Message.Body>
          </Message.Root>
        </div>
      )}

      {/* TODO(burdon): Is the form read-only or just the schema? */}
      {/* TODO(burdon): Readonly fields should take up the same space as editable fields (just be ghosted). */}
      <Form<ViewMetaType>
        autoSave
        schema={ViewMetaSchema}
        values={viewValues}
        readonly={readonly}
        onSave={handleUpdate}
        classNames='min-bs-0 overflow-y-auto'
      />

      <div role='none' className='min-bs-0 overflow-y-auto'>
        <div role='none' className='pli-card-spacing-inline'>
          <label className={mx(inputTextLabel)}>{t('fields label')}</label>
        </div>

        <List.Root<FieldType>
          items={view.fields}
          isItem={Schema.is(FieldSchema)}
          getId={(field) => field.id}
          readonly={readonly}
          onMove={readonly ? undefined : handleMove}
        >
          {({ items: fields }) => (
            <>
              {showHeading && (
                <div role='heading' className={grid}>
                  <div />
                  <div className='flex pli-card-spacing-inline items-center text-sm'>{t('field path label')}</div>
                </div>
              )}

              <div role='list' className='flex flex-col w-full px-2'>
                {fields?.map((field) => (
                  <List.Item<FieldType>
                    key={field.id}
                    item={field}
                    classNames={mx(grid, ghostHover, !readonly && 'cursor-pointer')}
                  >
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleSelect(field)}>{field.path}</List.ItemTitle>
                    <div className='flex items-center gap-2'>
                      <List.ItemButton
                        icon='ph--eye-slash--regular'
                        // TDOO(burdon): Is this the correct test?
                        disabled={view.fields.length <= 1}
                        onClick={() => handleHide(field.id)}
                        data-testid='hide-field-button'
                      />
                      {!readonly && (
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
            <div role='none' className='pli-card-spacing-inline px-2'>
              <label className={mx(inputTextLabel)}>{t('hidden fields label')}</label>
            </div>

            <List.Root<string>
              items={hiddenProperties}
              isItem={(item): item is string => typeof item === 'string'}
              getId={(property) => property}
            >
              {({ items: properties }) => (
                <div role='list' className='flex flex-col w-full pli-card-spacing-inline'>
                  {properties?.map((property) => (
                    <List.Item<string>
                      key={property}
                      item={property}
                      classNames={mx(grid, ghostHover, !readonly && 'cursor-pointer')}
                    >
                      <List.ItemDragHandle disabled />
                      <List.ItemTitle>{property}</List.ItemTitle>
                      <div className='flex items-center gap-2'>
                        <List.ItemButton
                          icon='ph--eye--regular'
                          onClick={() => handleShow(property)}
                          data-testid='show-field-button'
                        />
                      </div>
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
            onClick={readonly ? undefined : handleAdd}
            // TODO(burdon): Show field limit in ux (not tooltip).
            disabled={view.fields.length >= VIEW_FIELD_LIMIT}
            classNames='flex is-full'
          />
        </div>
      )}
    </div>
  );
};
