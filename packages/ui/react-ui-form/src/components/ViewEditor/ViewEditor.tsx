//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo-db';
import { EchoSchema, Format, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { Callout, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { cardSpacing } from '@dxos/react-ui-stack';
import { inputTextLabel, mx, subtleHover } from '@dxos/react-ui-theme';
import { type DataType, FieldSchema, type FieldType, ProjectionModel, VIEW_FIELD_LIMIT } from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form, type FormProps } from '../Form';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

const ViewMetaSchema = Schema.Struct({
  typename: Format.URL.annotations({
    title: 'Record type',
  }),
}).pipe(Schema.mutable);

type ViewMetaType = Schema.Schema.Type<typeof ViewMetaSchema>;

export type ViewEditorProps = ThemedClassName<
  {
    schema: Schema.Schema.AnyNoContext;
    view: DataType.View;
    registry?: SchemaRegistry;
    readonly?: boolean;
    showHeading?: boolean;
    onTypenameChanged?: (typename: string) => void;
    onDelete?: (fieldId: string) => void;
  } & Pick<FormProps<any>, 'outerSpacing'>
>;

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
  outerSpacing = true,
}: ViewEditorProps) => {
  const { t } = useTranslation(translationKey);
  const projection = useMemo(() => {
    // Use reactive and mutable version of json schema when schema is mutable.
    const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
    return new ProjectionModel(jsonSchema, view.projection);
  }, [schema, view.projection]);
  const [expandedField, setExpandedField] = useState<FieldType['id']>();
  const readonly = _readonly || !isMutable(schema);

  // TODO(burdon): Should be reactive.
  const viewValues = useMemo(() => {
    return {
      // TODO(burdon): Need to warn user of possible consequences of editing.
      // TODO(burdon): Settings should have domain name owned by user.
      typename: view.query.typename,
    };
  }, [view.query.typename]);

  const handleToggleField = useCallback(
    (field: FieldType) => {
      setExpandedField((prevExpandedFieldId) => (prevExpandedFieldId === field.id ? undefined : field.id));
    },
    [readonly],
  );

  // TODO(burdon): Check if mutable; variant of useCallback that return undefined if readonly?

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    const field = projection.createFieldProjection();
    setExpandedField(field.id);
  }, [schema, projection, readonly]);

  const handleUpdate = useCallback(
    ({ typename }: ViewMetaType) => {
      invariant(!readonly);
      requestAnimationFrame(() => {
        if (view.query.typename !== typename && !readonly) {
          onTypenameChanged?.(typename);
        }
      });
    },
    [view.query.typename, onTypenameChanged, readonly],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      invariant(!readonly);
      if (fieldId === expandedField) {
        setExpandedField(undefined);
      }

      onDelete?.(fieldId);
    },
    [expandedField, onDelete, readonly],
  );

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      invariant(!readonly);
      // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
      const fields = [...view.projection.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      view.projection.fields = fields;
    },
    [view.projection.fields, readonly],
  );

  const handleClose = useCallback(() => setExpandedField(undefined), []);

  const hiddenProperties = projection.getHiddenProperties();

  const handleHide = useCallback(
    (fieldId: string) => {
      setExpandedField(undefined);
      projection.hideFieldProjection(fieldId);
    },
    [projection],
  );

  const handleShow = useCallback(
    (property: string) => {
      setExpandedField(undefined);
      projection.showFieldProjection(property as JsonProp);
    },
    [projection],
  );

  return (
    <div role='none' className={mx(classNames)}>
      {readonly && (
        <Callout.Root
          valence='info'
          classNames={['is-full mlb-cardSpacingBlock', outerSpacing && 'mli-cardSpacingInline']}
        >
          <Callout.Title>{t('system schema description')}</Callout.Title>
        </Callout.Root>
      )}

      {/* TODO(burdon): Is the form read-only or just the schema? */}
      {/* TODO(burdon): Readonly fields should take up the same space as editable fields (just be ghosted). */}
      <Form<ViewMetaType>
        autoSave
        schema={ViewMetaSchema}
        values={viewValues}
        readonly={readonly}
        onSave={handleUpdate}
        outerSpacing={outerSpacing}
      />

      <div role='none' className={outerSpacing ? cardSpacing : 'mlb-cardSpacingBlock'}>
        <h2 className={mx(inputTextLabel)}>{t('fields label')}</h2>

        <List.Root<FieldType>
          items={view.projection.fields}
          isItem={Schema.is(FieldSchema)}
          getId={(field) => field.id}
          onMove={readonly ? undefined : handleMove}
          readonly={readonly}
        >
          {({ items: fields }) => (
            <>
              {showHeading && <h3 className='text-sm'>{t('field path label')}</h3>}

              <div role='list' className={listGrid}>
                {fields?.map((field) => (
                  <List.Item<FieldType>
                    key={field.id}
                    item={field}
                    classNames={listItemGrid}
                    aria-expanded={expandedField === field.id}
                  >
                    <div role='none' className={mx(subtleHover, listItemGrid, 'rounded-sm cursor-pointer min-bs-10')}>
                      <List.ItemDragHandle disabled={readonly} />
                      <List.ItemTitle onClick={() => handleToggleField(field)}>{field.path}</List.ItemTitle>
                      <List.ItemButton
                        label={t('hide field label')}
                        data-testid='hide-field-button'
                        icon='ph--eye-slash--regular'
                        autoHide={false}
                        // TDOO(burdon): Is this the correct test?
                        disabled={readonly || view.projection.fields.length <= 1}
                        onClick={() => handleHide(field.id)}
                      />
                      {/* TODO(burdon): Remove unless implement undo. */}
                      <List.ItemDeleteButton
                        label={t('delete field label')}
                        autoHide={false}
                        disabled={readonly || view.projection.fields.length <= 1}
                        onClick={() => handleDelete(field.id)}
                        data-testid='field.delete'
                      />
                      <IconButton
                        iconOnly
                        variant='ghost'
                        label={t('toggle expand label', { ns: 'os' })}
                        icon={expandedField === field.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                        onClick={() => handleToggleField(field)}
                      />
                    </div>
                    {expandedField === field.id && (
                      <div role='none' className='col-span-5'>
                        <FieldEditor
                          readonly={readonly}
                          projection={projection}
                          field={field}
                          registry={registry}
                          onSave={handleClose}
                        />
                      </div>
                    )}
                  </List.Item>
                ))}
              </div>
            </>
          )}
        </List.Root>

        {hiddenProperties.length > 0 && (
          <>
            <h2 className={mx(inputTextLabel)}>{t('hidden fields label')}</h2>

            <List.Root<string>
              items={hiddenProperties}
              isItem={(item): item is string => typeof item === 'string'}
              getId={(property) => property}
            >
              {({ items: properties }) => (
                <div role='list' className='grid grid-cols-[1fr_min-content]'>
                  {properties?.map((property) => (
                    <List.Item<string>
                      key={property}
                      item={property}
                      classNames={mx('grid grid-cols-subgrid col-span-2 rounded-sm', subtleHover)}
                    >
                      <List.ItemTitle>{property}</List.ItemTitle>
                      <List.ItemButton
                        label={t('show field label')}
                        disabled={readonly}
                        icon='ph--eye--regular'
                        onClick={() => handleShow(property)}
                        data-testid='show-field-button'
                      />
                    </List.Item>
                  ))}
                </div>
              )}
            </List.Root>
          </>
        )}
      </div>

      {!readonly && !expandedField && (
        <div role='none' className={outerSpacing ? cardSpacing : 'mlb-cardSpacingBlock'}>
          <IconButton
            icon='ph--plus--regular'
            label={t('button add property')}
            onClick={readonly ? undefined : handleAdd}
            // TODO(burdon): Show field limit in ux (not tooltip).
            disabled={view.projection.fields.length >= VIEW_FIELD_LIMIT}
            classNames='is-full'
          />
        </div>
      )}
    </div>
  );
};
