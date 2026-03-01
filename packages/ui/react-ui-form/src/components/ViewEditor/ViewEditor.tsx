//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useState } from 'react';

import { Entity, Feed, Filter, Format, Obj, Query, QueryAST, Ref, type SchemaRegistry, Type } from '@dxos/echo';
import { EchoSchema, type JsonProp, isMutable, toJsonSchema } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Message, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import { List } from '@dxos/react-ui-list';
import {
  FieldSchema,
  type FieldType,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  type View,
  createEchoChangeCallback,
  getTypenameFromQuery,
} from '@dxos/schema';
import { mx, osTranslations, subtleHover } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { FieldEditor } from '../FieldEditor';
import {
  Form,
  type FormFieldComponent,
  type FormFieldComponentProps,
  FormFieldLabel,
  type FormFieldMap,
  type FormRootProps,
} from '../Form';

export type ViewEditorProps = ThemedClassName<
  {
    schema: Schema.Schema.AnyNoContext;
    view: View.View;
    mode?: 'schema' | 'tag';
    registry?: SchemaRegistry.SchemaRegistry;
    showHeading?: boolean;
    onQueryChanged?: (query: QueryAST.Query, target?: string) => void;
    onDelete?: (fieldId: string) => void;
  } & Pick<QueryFormProps, 'types' | 'tags'> &
    Pick<FormRootProps<any>, 'readonly' | 'db'>
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
      db,
      readonly,
      showHeading = false,
      types,
      tags,
      onQueryChanged,
      onDelete,
    },
    forwardedRef,
  ) => {
    const atomRegistry = useContext(RegistryContext);
    const schemaReadonly = !isMutable(schema);
    const { t } = useTranslation(translationKey);

    const projectionModel = useMemo(() => {
      // Use reactive and mutable version of json schema when schema is mutable.
      const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);

      // Always use createEchoChangeCallback since the view is ECHO-backed.
      // Pass schema only when mutable to allow schema mutations.
      const change = createEchoChangeCallback(view, schema instanceof EchoSchema ? schema : undefined);

      const model = new ProjectionModel({
        registry: atomRegistry,
        view,
        baseSchema: jsonSchema,
        change,
      });

      return model;
    }, [atomRegistry, schema, view]);

    useImperativeHandle(forwardedRef, () => projectionModel, [projectionModel]);

    const queueTarget = Match.value(view.query.ast).pipe(
      Match.when({ type: 'options' }, ({ options }) => {
        return Option.fromNullable(options.queues).pipe(
          Option.flatMap((queues) => Array.head(queues)),
          Option.getOrUndefined,
        );
      }),
      Match.orElse(() => undefined),
    );

    const feeds = useQuery(db, Filter.type(Type.Feed));

    const targetRef = useMemo(() => {
      if (!queueTarget) {
        return undefined;
      }
      const feed = feeds.find((feed) => Feed.getQueueDxn(feed)?.toString() === queueTarget);
      return feed ? Ref.fromDXN(Entity.getDXN(feed)) : undefined;
    }, [queueTarget, feeds]);

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
          target: Schema.optional(Type.Ref(Type.Feed).annotations({ title: 'Target Feed' })),
        }).pipe(Schema.mutable);
      }

      return base.pipe(Schema.mutable);
    }, [mode]);

    // TODO(burdon): Need to warn user of possible consequences of editing.
    // TODO(burdon): Settings should have domain name owned by user.
    const viewValues = useMemo(
      () => ({
        query: mode === 'schema' ? getTypenameFromQuery(view.query.ast) : view.query.ast,
        target: targetRef,
      }),
      [mode, view.query.ast, targetRef],
    );

    const fieldMap = useMemo<FormFieldMap | undefined>(
      () => (mode === 'tag' ? customFields({ types, tags }) : undefined),
      [mode, types, tags],
    );

    const handleUpdate = useCallback(
      (values: any) => {
        const targetValue = values.target;
        let queueDxn: string | undefined;

        if (Ref.isRef(targetValue)) {
          const feedDxn = targetValue.dxn.toString();
          const feed = feeds.find((feed) => Obj.getDXN(feed).toString() === feedDxn);
          if (feed) {
            queueDxn = Feed.getQueueDxn(feed)?.toString();
          }
        }

        // TODO(wittjosiah): Deep-clone the AST to plain JS or ECHO proxy arrays become objects with numeric keys.
        const query =
          mode === 'schema'
            ? Query.select(Filter.typename(values.query)).ast
            : JSON.parse(JSON.stringify(values.query));
        onQueryChanged?.(query, queueDxn);
      },
      [onQueryChanged, mode, feeds],
    );

    const handleDelete = useCallback(
      (fieldId: string) => {
        invariant(!readonly);
        onDelete?.(fieldId);
      },
      [onDelete, readonly],
    );

    return (
      <div role='none' className={mx(classNames)}>
        {/* If readonly is set, then the callout is not needed. */}
        {schemaReadonly && !readonly && (
          <Message.Root valence='info' classNames='my-form-padding'>
            <Message.Title>{t('system schema description')}</Message.Title>
          </Message.Root>
        )}

        {/* TODO(burdon): Is the form read-only or just the schema? */}
        <Form.Root schema={viewSchema} values={viewValues} fieldMap={fieldMap} db={db} onValuesChanged={handleUpdate}>
          <Form.FieldSet />

          <FormFieldLabel label={t('fields label')} asChild />
          <FieldList
            schema={schema}
            view={view}
            registry={registry}
            readonly={readonly}
            showHeading={showHeading}
            onDelete={handleDelete}
          />
        </Form.Root>
      </div>
    );
  },
);

type FieldListProps = Pick<ViewEditorProps, 'schema' | 'view' | 'registry' | 'readonly' | 'showHeading' | 'onDelete'>;

const FieldList = ({ schema, view, registry, readonly, showHeading = false, onDelete }: FieldListProps) => {
  const atomRegistry = useContext(RegistryContext);
  const schemaReadonly = !isMutable(schema);
  const { t } = useTranslation(translationKey);

  // Subscribe to view changes for reactivity.
  const [viewSnapshot] = useObject(view);

  const projectionModel = useMemo(() => {
    // Use reactive and mutable version of json schema when schema is mutable.
    const jsonSchema = schema instanceof EchoSchema ? schema.jsonSchema : toJsonSchema(schema);

    // Always use createEchoChangeCallback since the view is ECHO-backed.
    // Pass schema only when mutable to allow schema mutations.
    const change = createEchoChangeCallback(view, schema instanceof EchoSchema ? schema : undefined);

    const model = new ProjectionModel({
      registry: atomRegistry,
      view,
      baseSchema: jsonSchema,
      change,
    });

    return model;
  }, [atomRegistry, schema, view]);

  const [expandedField, setExpandedField] = useState<FieldType['id']>();

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    const field = projectionModel.createFieldProjection();
    setExpandedField(field.id);
  }, [projectionModel, readonly]);

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
      Obj.change(view, (v) => {
        // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
        const fields = [...v.projection.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        v.projection.fields = fields;
      });
    },
    [view, readonly],
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

  if (!viewSnapshot) {
    return null;
  }

  return (
    <List.Root<FieldType>
      items={viewSnapshot.projection.fields as FieldType[]}
      isItem={Schema.is(FieldSchema)}
      getId={(field) => field.id}
      onMove={readonly ? undefined : handleMove}
      readonly={readonly}
    >
      {({ items: fields }) => (
        <>
          {showHeading && <h3 className='text-sm'>{t('field path label')}</h3>}
          <div role='list' className='grid grid-cols-[min-content_1fr_min-content_min-content_min-content]'>
            {fields?.map((field) => {
              const hidden = field.visible === false;
              return (
                <List.Item<FieldType>
                  key={field.id}
                  item={field}
                  classNames={'grid grid-cols-subgrid col-span-5'}
                  aria-expanded={expandedField === field.id}
                >
                  <div
                    role='none'
                    className={mx(
                      subtleHover,
                      'grid grid-cols-subgrid col-span-5',
                      'rounded-xs cursor-pointer min-h-10',
                    )}
                  >
                    <List.ItemDragHandle disabled={readonly || schemaReadonly} />
                    <List.ItemTitle classNames={hidden && 'text-subdued'} onClick={() => handleToggleField(field)}>
                      {field.path}
                    </List.ItemTitle>
                    <List.ItemButton
                      label={t(hidden ? 'show field label' : 'hide field label')}
                      data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                      icon={hidden ? 'ph--eye-closed--regular' : 'ph--eye--regular'}
                      autoHide={false}
                      disabled={readonly || (!hidden && projectionModel.getFields().length <= 1)}
                      onClick={() => (hidden ? handleShow(field.path) : handleHide(field.id))}
                    />
                    {!readonly && (
                      <>
                        <List.ItemDeleteButton
                          label={t('delete field label')}
                          autoHide={false}
                          disabled={readonly || schemaReadonly || viewSnapshot.projection.fields.length <= 1}
                          onClick={() => handleDelete(field.id)}
                          data-testid='field.delete'
                        />
                        <IconButton
                          iconOnly
                          variant='ghost'
                          label={t('toggle expand label', { ns: osTranslations })}
                          icon={expandedField === field.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                          onClick={() => handleToggleField(field)}
                          data-testid='field.toggle'
                        />
                      </>
                    )}
                  </div>
                  {expandedField === field.id && !readonly && (
                    <div role='none' className='col-span-5 mt-1 mb-1 border border-separator rounded-md'>
                      <FieldEditor
                        readonly={readonly || schemaReadonly}
                        registry={registry}
                        projection={projectionModel}
                        field={field}
                        onSave={handleClose}
                      />
                    </div>
                  )}
                </List.Item>
              );
            })}
          </div>
          {!readonly && !expandedField && (
            <div role='none' className='my-form-padding'>
              <IconButton
                icon='ph--plus--regular'
                label={t('add property button label')}
                onClick={handleAdd}
                disabled={viewSnapshot.projection.fields.length >= VIEW_FIELD_LIMIT}
                classNames='w-full'
              />
            </div>
          )}
        </>
      )}
    </List.Root>
  );
};

const customFields = ({
  types,
  tags,
}: Pick<ViewEditorProps, 'types' | 'tags'>): Record<string, FormFieldComponent> => ({
  query: ({ type, readonly, label, getValue, onValueChange }: FormFieldComponentProps) => {
    const handleChange = useCallback<NonNullable<QueryFormProps['onChange']>>(
      (query) => onValueChange(type, query.ast),
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
