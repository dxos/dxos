//
// Copyright 2024 DXOS.org
//

import * as Array from 'effect/Array';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';

import { Filter, Query, QueryAST, type SchemaRegistry } from '@dxos/echo';
import { EchoSchema, Format, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo/internal';
import {} from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { Callout, IconButton, Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import { List } from '@dxos/react-ui-list';
import { cardSpacing } from '@dxos/react-ui-stack';
import { mx, subtleHover } from '@dxos/react-ui-theme';
import {
  FieldSchema,
  type FieldType,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  type View,
  getTypenameFromQuery,
} from '@dxos/schema';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import {
  type FormFieldComponent,
  type FormFieldComponentProps,
  FormFieldLabel,
  type FormFieldMap,
  type FormProps,
  NewForm,
} from '../Form';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

export type ViewEditorProps = ThemedClassName<
  {
    schema: Schema.Schema.AnyNoContext;
    view: View.View;
    mode?: 'schema' | 'tag';
    registry?: SchemaRegistry.SchemaRegistry;
    readonly?: boolean;
    showHeading?: boolean;
    onQueryChanged?: (query: QueryAST.Query, target?: string) => void;
    onDelete?: (fieldId: string) => void;
  } & (Pick<FormProps<any>, 'outerSpacing'> & Pick<QueryFormProps, 'types' | 'tags'>)
>;

/**
 * Schema-based object form.
 */
export const ViewEditor = forwardRef<ProjectionModel, ViewEditorProps>(
  (
    {
      classNames,
      schema,
      view,
      mode = 'schema',
      registry,
      readonly,
      showHeading = false,
      types,
      tags,
      onQueryChanged,
      onDelete,
      outerSpacing = true,
    },
    forwardedRef,
  ) => {
    const schemaReadonly = !isMutable(schema);
    const { t } = useTranslation(translationKey);
    const projectionModel = useMemo(() => {
      // Use reactive and mutable version of json schema when schema is mutable.
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
      return new ProjectionModel(jsonSchema, view.projection);
    }, [schema, JSON.stringify(view.projection)]);
    useImperativeHandle(forwardedRef, () => projectionModel, [projectionModel]);
    const [expandedField, setExpandedField] = useState<FieldType['id']>();

    const queueTarget = Match.value(view.query.ast).pipe(
      Match.when({ type: 'options' }, ({ options }) => {
        return Option.fromNullable(options.queues).pipe(
          Option.flatMap((queues) => Array.head(queues)),
          Option.getOrUndefined,
        );
      }),
      Match.orElse(() => undefined),
    );

    const viewSchema = useMemo(() => {
      const base = Schema.Struct({
        query:
          mode === 'schema'
            ? Format.URL.annotations({ title: 'Record type' })
            : QueryAST.Query.annotations({ title: 'Query' }),
      });

      if (mode === 'tag') {
        return Schema.Struct({
          ...base.fields,
          target: Schema.optional(Schema.String.annotations({ title: 'Target Queue' })),
        }).pipe(Schema.mutable);
      }

      return base.pipe(Schema.mutable);
    }, [mode]);

    // TODO(burdon): Need to warn user of possible consequences of editing.
    // TODO(burdon): Settings should have domain name owned by user.
    const viewValues = useMemo(
      () => ({
        query: mode === 'schema' ? getTypenameFromQuery(view.query.ast) : view.query.ast,
        target: queueTarget,
      }),
      [mode, view.query.ast, queueTarget],
    );

    const fieldMap = useMemo<FormFieldMap | undefined>(
      () => (mode === 'tag' ? customFields({ types, tags }) : undefined),
      [mode, types, tags],
    );

    // TODO(burdon): Check if mutable.
    const handleAdd = useCallback(() => {
      invariant(!readonly);
      const field = projectionModel.createFieldProjection();
      setExpandedField(field.id);
    }, [schema, projectionModel, readonly]);

    const handleUpdate = useCallback(
      (values: any) => {
        requestAnimationFrame(() => {
          const query = mode === 'schema' ? Query.select(Filter.typename(values.query)).ast : values.query;
          onQueryChanged?.(query, values.target);
        });
      },
      [onQueryChanged, view, queueTarget, mode],
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

    return (
      <div role='none' className={mx(classNames)}>
        {/* If readonly is set, then the callout is not needed. */}
        {schemaReadonly && !readonly && (
          <Callout.Root valence='info' classNames={['mlb-cardSpacingBlock', outerSpacing && 'mli-cardSpacingInline']}>
            <Callout.Title>{t('system schema description')}</Callout.Title>
          </Callout.Root>
        )}

        {/* TODO(burdon): Is the form read-only or just the schema? */}
        <NewForm.Root autoSave schema={viewSchema} values={viewValues} fieldMap={fieldMap} onSave={handleUpdate}>
          <NewForm.Content>
            <NewForm.FieldSet />

            <FormFieldLabel label={t('fields label')} asChild />
            <FieldList
              schema={schema}
              view={view}
              registry={registry}
              readonly={readonly}
              showHeading={showHeading}
              onDelete={handleDelete}
            />
          </NewForm.Content>
        </NewForm.Root>

        {!readonly && !expandedField && (
          <div role='none' className={outerSpacing ? cardSpacing : 'mlb-cardSpacingBlock'}>
            <IconButton
              icon='ph--plus--regular'
              label={t('add property button label')}
              onClick={readonly ? undefined : handleAdd}
              // TODO(burdon): Show field limit in ux (not tooltip).
              disabled={view.projection.fields.length >= VIEW_FIELD_LIMIT}
              classNames='is-full'
            />
          </div>
        )}
      </div>
    );
  },
);

type FieldListProps = Pick<ViewEditorProps, 'schema' | 'view' | 'registry' | 'readonly' | 'showHeading' | 'onDelete'>;

const FieldList = ({ schema, view, registry, readonly, showHeading = false, onDelete }: FieldListProps) => {
  const schemaReadonly = !isMutable(schema);
  const { t } = useTranslation(translationKey);
  const projectionModel = useMemo(() => {
    // Use reactive and mutable version of json schema when schema is mutable.
    const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);
    return new ProjectionModel(jsonSchema, view.projection);
  }, [schema, JSON.stringify(view.projection)]);
  const [expandedField, setExpandedField] = useState<FieldType['id']>();

  const handleToggleField = useCallback(
    (field: FieldType) => {
      setExpandedField((prevExpandedFieldId) => (prevExpandedFieldId === field.id ? undefined : field.id));
    },
    [readonly],
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

  return (
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
                    <List.ItemDragHandle disabled={readonly || schemaReadonly} />
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
                    {!readonly && (
                      <>
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
                      </>
                    )}
                  </div>
                  {expandedField === field.id && !readonly && (
                    <div role='none' className='col-span-5 mbs-1 mbe-1 border border-separator rounded-md'>
                      <FieldEditor
                        // TODO(burdon): Is this right?
                        readonly={readonly || schemaReadonly}
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
  );
};

const customFields = ({
  types,
  tags,
}: Pick<ViewEditorProps, 'types' | 'tags'>): Record<string, FormFieldComponent> => ({
  query: ({ readonly, label, getValue, onValueChange }: FormFieldComponentProps) => {
    const handleChange = useCallback<NonNullable<QueryFormProps['onChange']>>(
      (query) => onValueChange('object', query.ast),
      [onValueChange],
    );

    return (
      <Input.Root>
        <FormFieldLabel readonly={readonly} label={label} />
        <QueryForm initialQuery={getValue()} types={types} tags={tags} onChange={handleChange} />
      </Input.Root>
    );
  },
});
