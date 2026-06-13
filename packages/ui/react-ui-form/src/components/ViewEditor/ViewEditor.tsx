//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import React, { forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useState } from 'react';

import {
  DXN,
  EID,
  Entity,
  Feed,
  Filter,
  Format,
  Obj,
  Query,
  QueryAST,
  Ref,
  type Registry,
  Type,
  View,
} from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, Input, Message, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import { List } from '@dxos/react-ui-list';
import {
  ParentLabelAnnotation,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  createEchoChangeCallback,
  getTypeURIFromQuery,
} from '@dxos/schema';
import { mx, osTranslations } from '@dxos/ui-theme';

import { translationKey } from '#translations';
import { type FormFieldRenderer, type FormFieldRendererProps, type FormFieldMap } from '#types';

import { FieldEditor } from '../FieldEditor';
import { Form, FormFieldLabel, type FormRootProps } from '../Form';

export type ViewEditorProps = ThemedClassName<
  {
    type?: Type.AnyEntity;
    view: View.View;
    mode?: 'schema' | 'tag';
    registry?: Registry.Registry;
    showHeading?: boolean;
    onQueryChanged?: (query: QueryAST.Query, target?: EID.EID) => void;
    onDelete?: (fieldId: string) => void;
  } & Pick<QueryFormProps, 'types' | 'tags'> &
    Pick<FormRootProps<any>, 'readonly' | 'db'>
>;

/**
 * View editor form.
 */
export const ViewEditor = forwardRef<ProjectionModel | null, ViewEditorProps>(
  (
    {
      classNames,
      type,
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
    const schemaReadonly = type == null || Type.getDatabase(type) == null;
    const { t } = useTranslation(translationKey);

    const projectionModel = useMemo(() => {
      if (!type) {
        return null;
      }

      const jsonSchema = type.jsonSchema;

      // Always use createEchoChangeCallback since the view is ECHO-backed.
      // Pass type only when mutable to allow schema mutations.
      const change = createEchoChangeCallback(view, Type.getDatabase(type) != null ? type : undefined);

      const model = new ProjectionModel({
        registry: atomRegistry,
        view,
        baseSchema: jsonSchema,
        change,
      });

      return model;
    }, [atomRegistry, type, view]);

    useImperativeHandle<ProjectionModel | null, ProjectionModel | null>(forwardedRef, () => projectionModel, [
      projectionModel,
    ]);

    const queueTarget = Match.value(view.query.ast).pipe(
      Match.when({ type: 'from' }, ({ from }) => {
        if (from._tag !== 'scope') {
          return undefined;
        }

        const feedScope = from.scopes.find((s) => s._tag === 'feed');
        return Option.fromNullable(feedScope).pipe(
          Option.map((s) => s.feedUri),
          Option.getOrUndefined,
        );
      }),
      Match.orElse(() => undefined),
    );

    const feeds = useQuery(db, Filter.type(Feed.Feed));

    const targetRef = useMemo(() => {
      if (!queueTarget) {
        return undefined;
      }
      const targetEid = EID.tryParse(queueTarget);
      const feed = feeds.find((feed) => {
        const feedEid = Feed.getQueueUri(feed);
        return feedEid != null && targetEid != null && EID.equals(feedEid, targetEid);
      });
      return feed ? Ref.fromURI(Entity.getURI(feed)) : undefined;
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
          // TODO(wittjosiah): Replace Type.Feed with Dataset.Dataset when Ref.Ref supports unions.
          target: Ref.Ref(Feed.Feed).pipe(
            Schema.annotations({ title: 'Target Feed' }),
            ParentLabelAnnotation.set(true),
            Schema.optional,
          ),
        }).pipe(Schema.mutable);
      }

      return base.pipe(Schema.mutable);
    }, [mode]);

    // TODO(burdon): Need to warn user of possible consequences of editing.
    // TODO(burdon): Settings should have domain name owned by user.
    const viewValues = useMemo(() => {
      // Schema mode edits a typename; show the version-less name of the type DXN.
      const typeUri = getTypeURIFromQuery(view.query.ast);
      const typeDxn = typeUri ? DXN.tryMake(typeUri) : undefined;
      return {
        query: mode === 'schema' ? (typeDxn ? DXN.getName(typeDxn) : (typeUri ?? '')) : view.query.ast,
        target: targetRef,
      };
    }, [mode, view.query.ast, targetRef]);

    const fieldMap = useMemo<FormFieldMap | undefined>(
      () => (mode === 'tag' ? customFields({ types, tags }) : undefined),
      [mode, types, tags],
    );

    const handleUpdate = useCallback(
      (values: any) => {
        const targetValue = values.target;
        let queueDxn: EID.EID | undefined;

        if (Ref.isRef(targetValue)) {
          const feedUri = targetValue.uri;
          const feed = feeds.find((feed) => Obj.getURI(feed) === feedUri);
          if (feed) {
            queueDxn = Feed.getQueueUri(feed);
          }
        }

        // TODO(wittjosiah): Deep-clone the AST to plain JS or ECHO proxy arrays become objects with numeric keys.
        // In schema mode, values.query is either a DXN name (static types) or a raw `echo:` EID
        // (db-backed types, which have no DXN). Preserve EIDs verbatim; wrap bare names as DXN.
        const query =
          mode === 'schema'
            ? Query.select(Filter.type(EID.isEID(values.query) ? (values.query as EID.EID) : DXN.make(values.query)))
                .ast
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
      <div className={mx(classNames)}>
        {/* TODO(burdon): Is the form read-only or just the schema? */}
        <Form.Root schema={viewSchema} values={viewValues} fieldMap={fieldMap} db={db} onValuesChanged={handleUpdate}>
          <Form.Viewport>
            <Form.Content>
              {/* If readonly is set, then the callout is not needed. */}
              {schemaReadonly && !readonly && (
                <Message.Root valence='info' classNames='my-form-padding'>
                  <Message.Title>{t('system-schema.description')}</Message.Title>
                </Message.Root>
              )}
              <Form.FieldSet />
              {type && (
                <>
                  <FormFieldLabel label={t('fields.label')} asChild />
                  <FieldList
                    type={type}
                    view={view}
                    registry={registry}
                    readonly={readonly}
                    showHeading={showHeading}
                    onDelete={handleDelete}
                  />
                </>
              )}
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </div>
    );
  },
);

type FieldListProps = Omit<
  Pick<ViewEditorProps, 'type' | 'view' | 'registry' | 'readonly' | 'showHeading' | 'onDelete'>,
  'type'
> & {
  type: Type.AnyEntity;
};

const FieldList = ({ type, view, registry, readonly, showHeading = false, onDelete }: FieldListProps) => {
  const atomRegistry = useContext(RegistryContext);
  const schemaReadonly = Type.getDatabase(type) == null;
  const { t } = useTranslation(translationKey);

  // Subscribe to view changes for reactivity.
  const [viewSnapshot] = useObject(view);

  const projectionModel = useMemo(() => {
    const jsonSchema = type.jsonSchema;

    // Always use createEchoChangeCallback since the view is ECHO-backed.
    // Pass type only when mutable to allow schema mutations.
    const change = createEchoChangeCallback(view, Type.getDatabase(type) != null ? type : undefined);

    const model = new ProjectionModel({
      registry: atomRegistry,
      view,
      baseSchema: jsonSchema,
      change,
    });

    return model;
  }, [atomRegistry, type, view]);

  const [expandedField, setExpandedField] = useState<View.FieldType['id']>();

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    const field = projectionModel.createFieldProjection();
    setExpandedField(field.id);
  }, [projectionModel, readonly]);

  const handleToggleField = useCallback(
    (field: View.FieldType) => {
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
      Obj.update(view, (view) => {
        // NOTE(ZaymonFC): Using arrayMove here causes a race condition with the kanban model.
        const fields = [...view.projection.fields];
        const [moved] = fields.splice(fromIndex, 1);
        fields.splice(toIndex, 0, moved);
        view.projection.fields = fields;
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
      projectionModel.showFieldProjection(property as SchemaEx.JsonProp);
    },
    [projectionModel],
  );

  if (!viewSnapshot) {
    return null;
  }

  return (
    <List.Root<View.FieldType>
      items={viewSnapshot.projection.fields as View.FieldType[]}
      isItem={Schema.is(View.FieldSchema)}
      getId={(field) => field.id}
      onMove={readonly ? undefined : handleMove}
      readonly={readonly}
    >
      {({ items: fields }) => (
        <>
          {showHeading && <h3 className='text-sm'>{t('field-path.label')}</h3>}
          <div role='list' className='grid grid-cols-[min-content_1fr_min-content_min-content_min-content]'>
            {fields?.map((field) => {
              const hidden = field.visible === false;
              return (
                <List.Item<View.FieldType>
                  key={field.id}
                  item={field}
                  classNames={'grid grid-cols-subgrid col-span-5'}
                  aria-expanded={expandedField === field.id}
                >
                  <div className='grid grid-cols-subgrid col-span-5 rounded-xs cursor-pointer min-h-10 dx-hover'>
                    <List.ItemDragHandle disabled={readonly || schemaReadonly} />
                    <List.ItemTitle classNames={hidden && 'text-subdued'} onClick={() => handleToggleField(field)}>
                      {field.path}
                    </List.ItemTitle>
                    <List.ItemIconButton
                      label={t(hidden ? 'show-field.label' : 'hide-field.label')}
                      data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                      icon={hidden ? 'ph--eye-closed--regular' : 'ph--eye--regular'}
                      autoHide={false}
                      disabled={readonly || (!hidden && projectionModel.getFields().length <= 1)}
                      onClick={() => (hidden ? handleShow(field.path) : handleHide(field.id))}
                    />
                    {!readonly && (
                      <>
                        <List.ItemDeleteButton
                          label={t('delete-field.label')}
                          autoHide={false}
                          disabled={readonly || schemaReadonly || viewSnapshot.projection.fields.length <= 1}
                          onClick={() => handleDelete(field.id)}
                          data-testid='field.delete'
                        />
                        <List.ItemIconButton
                          iconOnly
                          variant='ghost'
                          label={t('toggle-expand.label', { ns: osTranslations })}
                          icon={expandedField === field.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                          onClick={() => handleToggleField(field)}
                          data-testid='field.toggle'
                        />
                      </>
                    )}
                  </div>
                  {expandedField === field.id && !readonly && (
                    <div className='col-span-full mt-1 mb-1 border border-separator rounded-sm'>
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
            <div className='my-form-padding'>
              <IconButton
                icon='ph--plus--regular'
                label={t('add-property-button.label')}
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

const customFields = ({ types, tags }: Pick<ViewEditorProps, 'types' | 'tags'>): Record<string, FormFieldRenderer> => ({
  query: ({ type, readonly, label, getValue, onValueChange }: FormFieldRendererProps) => {
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
