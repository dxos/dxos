//
// Copyright 2024 DXOS.org
//

import { Match, Schema } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { type SchemaRegistry } from '@dxos/echo-db';
import { EchoSchema, Format, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { Callout, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { QueryBox, QuerySerializer, createExpression } from '@dxos/react-ui-components';
import { List } from '@dxos/react-ui-list';
import { cardSpacing } from '@dxos/react-ui-stack';
import { inputTextLabel, mx, subtleHover } from '@dxos/react-ui-theme';
import {
  type DataType,
  FieldSchema,
  type FieldType,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  typenameFromQuery,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import { Form, type FormProps, type InputComponent, type InputProps } from '../Form';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

export type ViewEditorProps = ThemedClassName<
  {
    schema: Schema.Schema.AnyNoContext;
    view: DataType.View;
    kind?: 'basic' | 'advanced';
    registry?: SchemaRegistry;
    readonly?: boolean;
    showHeading?: boolean;
    onQueryChanged?: (query: string) => void;
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
  kind = 'basic',
  registry,
  readonly,
  showHeading = false,
  onQueryChanged,
  onDelete,
  outerSpacing = true,
}: ViewEditorProps) => {
  const space = getSpace(view);
  const schemaReadonly = !isMutable(schema);
  const { t } = useTranslation(translationKey);
  const projectionModel = useMemo(() => {
    // Use reactive and mutable version of json schema when schema is mutable.
    const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
    return new ProjectionModel(jsonSchema, view.projection);
  }, [schema, view.projection]);
  const [expandedField, setExpandedField] = useState<FieldType['id']>();

  const serializedQuery = Match.value(kind).pipe(
    Match.when('basic', () => typenameFromQuery(view.query)),
    Match.when('advanced', () => {
      if (view.query.type !== 'select') {
        return '';
      }

      const serializer = new QuerySerializer();
      return serializer.serialize(createExpression(view.query.filter));
    }),
    Match.exhaustive,
  );

  const viewSchema = useMemo(() => {
    return Schema.Struct({
      query:
        kind === 'basic'
          ? Format.URL.annotations({ title: 'Record type' })
          : Schema.String.annotations({ title: 'Query' }),
    }).pipe(Schema.mutable);
  }, [kind]);
  // TODO(burdon): Need to warn user of possible consequences of editing.
  // TODO(burdon): Settings should have domain name owned by user.
  const viewValues = useMemo(() => ({ query: serializedQuery }), [serializedQuery]);

  const handleToggleField = useCallback(
    (field: FieldType) => {
      setExpandedField((prevExpandedFieldId) => (prevExpandedFieldId === field.id ? undefined : field.id));
    },
    [readonly],
  );

  // TODO(burdon): Check if mutable; variant of useCallback that return undefined if readonly?

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    const field = projectionModel.createFieldProjection();
    setExpandedField(field.id);
  }, [schema, projectionModel, readonly]);

  const handleUpdate = useCallback(
    ({ query }: Schema.Schema.Type<typeof viewSchema>) => {
      invariant(!readonly);
      requestAnimationFrame(() => {
        if (serializedQuery !== query && !readonly) {
          onQueryChanged?.(query);
        }
      });
    },
    [serializedQuery, onQueryChanged, readonly],
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

  const handleHide = useCallback(
    (fieldId: string) => {
      setExpandedField(undefined);
      projectionModel.hideFieldProjection(fieldId);
    },
    [projectionModel],
  );

  const handleShow = useCallback(
    (property: string) => {
      setExpandedField(undefined);
      projectionModel.showFieldProjection(property as JsonProp);
    },
    [projectionModel],
  );

  const custom: Partial<Record<string, InputComponent>> = useMemo(
    () =>
      kind === 'advanced'
        ? {
            ['query' satisfies keyof Schema.Schema.Type<typeof viewSchema>]: (props: InputProps) => {
              const handleChange = useCallback(
                (text: string) => props.onValueChange('string', text),
                [props.onValueChange],
              );

              // TODO(wittjosiah): Add label & input styles.
              return <QueryBox space={space} initialValue={props.getValue()} onChange={handleChange} />;
            },
          }
        : {},
    [],
  );

  return (
    <div role='none' className={mx(classNames)}>
      {schemaReadonly && (
        <Callout.Root valence='info' classNames={['mlb-cardSpacingBlock', outerSpacing && 'mli-cardSpacingInline']}>
          <Callout.Title>{t('system schema description')}</Callout.Title>
        </Callout.Root>
      )}

      {/* TODO(burdon): Is the form read-only or just the schema? */}
      {/* TODO(burdon): Readonly fields should take up the same space as editable fields (just be ghosted). */}
      <Form<Schema.Schema.Type<typeof viewSchema>>
        autoSave
        schema={viewSchema}
        values={viewValues}
        readonly={readonly ? 'disabled-input' : false}
        onSave={handleUpdate}
        outerSpacing={outerSpacing}
        Custom={custom}
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
                {fields?.map((field) => {
                  const hidden = field.visible === false;
                  return (
                    <List.Item<FieldType>
                      key={field.id}
                      item={field}
                      classNames={listItemGrid}
                      aria-expanded={expandedField === field.id}
                    >
                      <div role='none' className={mx(subtleHover, listItemGrid, 'rounded-sm cursor-pointer min-bs-10')}>
                        <List.ItemDragHandle disabled={readonly} />
                        <List.ItemTitle classNames={hidden && 'text-subdued'} onClick={() => handleToggleField(field)}>
                          {field.path}
                        </List.ItemTitle>
                        <List.ItemButton
                          label={t(hidden ? 'show field label' : 'hide field label')}
                          data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                          icon={hidden ? 'ph--eye-closed--regular' : 'ph--eye--regular'}
                          autoHide={false}
                          disabled={readonly || (!hidden && projectionModel.fields.length <= 1)}
                          onClick={() => (hidden ? handleShow(field.path) : handleHide(field.id))}
                        />
                        {/* TODO(burdon): Remove unless implement undo. */}
                        <List.ItemDeleteButton
                          label={t('delete field label')}
                          autoHide={false}
                          disabled={readonly || schemaReadonly || view.projection.fields.length <= 1}
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
                        <div role='none' className='col-span-5 mbs-1 mbe-1 border border-separator rounded-md'>
                          <FieldEditor
                            readonly={readonly || schemaReadonly ? 'disabled-input' : false}
                            projection={projectionModel}
                            field={field}
                            registry={registry}
                            onSave={handleClose}
                          />
                        </div>
                      )}
                    </List.Item>
                  );
                })}
              </div>
            </>
          )}
        </List.Root>
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
