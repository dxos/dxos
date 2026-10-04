//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
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
import { useObject, useQuery } from '@dxos/echo-react';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { invariant } from '@dxos/invariant';
import { QueryForm, type QueryFormProps } from '@dxos/react-ui-components';
import { OrderedList } from '@dxos/react-ui-list';
import * as Banner from '@dxos/react-ui/Banner';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';
import {
  ParentLabelAnnotation,
  ProjectionModel,
  VIEW_FIELD_LIMIT,
  createEchoChangeCallback,
  getTypeURIFromQuery,
} from '@dxos/schema';

import { translationKey } from '#translations';
import { type FormFieldMap, type FormFieldRendererProps } from '#types';

import { FieldEditor } from './FieldEditor.tsx';
import { Form } from './Form.tsx';
import { FormField } from './FormField.tsx';
import { type FormRootProps } from './FormRoot.tsx';

export type ViewEditorProps = {
  type?: Type.AnyEntity;
  view: View.View;
  mode?: 'schema' | 'tag';
  registry?: Registry.Registry;
  onQueryChanged?: (query: QueryAST.Query, target?: EID.EID) => void;
  onDelete?: (fieldId: string) => void;
} & Pick<QueryFormProps, 'types' | 'tags'> &
  Pick<FormRootProps<any>, 'readonly' | 'db'>;

const isJsonProp = Schema.is(SchemaEx.JsonProp);

/** The view's projection model: edits write through to the ECHO view, and to the type when its schema is mutable. */
const useProjectionModel = (type: Type.AnyEntity | undefined, view: View.View) => {
  const atomRegistry = useContext(RegistryContext);
  return useMemo(
    () =>
      type
        ? new ProjectionModel({
            registry: atomRegistry,
            view,
            baseSchema: type.jsonSchema,
            change: createEchoChangeCallback(view, Type.getDatabase(type) != null ? type : undefined),
          })
        : null,
    [atomRegistry, type, view],
  );
};

/**
 * Edits a view on `react-ui-form`: its query (a record type, or in `tag` mode a query and target feed) and the
 * ordered list of its field projections, each opening to a `FieldEditor`. A system (read-only) schema is announced in
 * a `Banner`.
 */
export const ViewEditor = forwardRef<ProjectionModel | null, ViewEditorProps>(
  ({ type, view, mode = 'schema', registry, db, readonly, types, tags, onQueryChanged, onDelete }, forwardedRef) => {
    const { t } = Hooks.useTranslation(translationKey);
    const schemaReadonly = type == null || Type.getDatabase(type) == null;
    const projectionModel = useProjectionModel(type, view);
    useImperativeHandle<ProjectionModel | null, ProjectionModel | null>(forwardedRef, () => projectionModel, [
      projectionModel,
    ]);

    const feedTarget = Match.value(view.query.ast).pipe(
      Match.when({ type: 'from' }, ({ from }) =>
        from._tag === 'scope'
          ? Option.fromNullishOr(from.scopes.find((scope) => scope._tag === 'feed')).pipe(
              Option.map((scope) => scope.feedUri),
              Option.getOrUndefined,
            )
          : undefined,
      ),
      Match.orElse(() => undefined),
    );

    const feeds = useQuery(db, Filter.type(Feed.Feed));
    const targetRef = useMemo(() => {
      const targetEid = feedTarget ? EID.tryParse(feedTarget) : undefined;
      const feed = targetEid
        ? feeds.find((feed) => {
            const feedEid = Feed.getFeedUri(feed);
            return feedEid != null && EID.equals(feedEid, targetEid);
          })
        : undefined;
      return feed ? Ref.fromURI(Entity.getURI(feed)) : undefined;
    }, [feedTarget, feeds]);

    const viewSchema = useMemo(() => {
      const base = Schema.Struct({
        query:
          mode === 'schema'
            ? Format.URL.annotate({ title: 'Record type' })
            : QueryAST.Query.annotate({ title: 'Query' }),
      });

      // `Schema.mutable` is arrays-only in v4; a struct's fields are made mutable key by key.
      return mode === 'tag'
        ? Schema.Struct({
            ...base.fields,
            target: Ref.Ref(Feed.Feed).pipe(
              Schema.annotate({ title: 'Target Feed' }),
              ParentLabelAnnotation.set(true),
              Schema.optional,
            ),
          }).mapFields(Struct.map(Schema.mutableKey))
        : base.mapFields(Struct.map(Schema.mutableKey));
    }, [mode]);

    const viewValues = useMemo(() => {
      // Schema mode edits a typename: the version-less name of the type DXN.
      const typeUri = getTypeURIFromQuery(view.query.ast);
      const typeDxn = typeUri ? DXN.tryMake(typeUri) : undefined;
      return {
        query: mode === 'schema' ? (typeDxn ? DXN.getName(typeDxn) : (typeUri ?? '')) : view.query.ast,
        target: targetRef,
      };
    }, [mode, view.query.ast, targetRef]);

    const fieldMap = useMemo<FormFieldMap | undefined>(
      () => (mode === 'tag' ? { query: (props) => <QueryField {...props} types={types} tags={tags} /> } : undefined),
      [mode, types, tags],
    );

    const handleUpdate = useCallback(
      (values: { query?: unknown; target?: unknown }) => {
        const feed = Ref.isRef(values.target)
          ? feeds.find((feed) => Ref.isRef(values.target) && Obj.getURI(feed) === values.target.uri)
          : undefined;
        const feedDxn = feed ? Feed.getFeedUri(feed) : undefined;
        if (mode === 'schema') {
          // A db-backed type has no DXN, so its `echo:` EID is kept verbatim; a bare name is wrapped as a DXN.
          const typename = typeof values.query === 'string' ? values.query : '';
          onQueryChanged?.(Query.select(Filter.type(EID.isEID(typename) ? typename : DXN.make(typename))).ast, feedDxn);
        } else if (Schema.is(QueryAST.Query)(values.query)) {
          // A plain copy: the form's value may hold ECHO proxy arrays, which serialize as objects with numeric keys.
          onQueryChanged?.(Schema.decodeUnknownSync(QueryAST.Query)(JSON.parse(JSON.stringify(values.query))), feedDxn);
        }
      },
      [onQueryChanged, mode, feeds],
    );

    return (
      <Form.Root schema={viewSchema} values={viewValues} fieldMap={fieldMap} db={db} onValuesChanged={handleUpdate}>
        <Form.Content>
          {/* A read-only editor needs no notice that the schema is read-only. */}
          {schemaReadonly && !readonly && (
            <Banner.Root valence='info'>
              <Banner.Title>{t('system-schema.description')}</Banner.Title>
            </Banner.Root>
          )}
          <Form.Fields />
          {type && projectionModel && (
            <FieldList
              type={type}
              view={view}
              projectionModel={projectionModel}
              registry={registry}
              readonly={readonly}
              onDelete={(fieldId) => {
                invariant(!readonly);
                onDelete?.(fieldId);
              }}
            />
          )}
        </Form.Content>
      </Form.Root>
    );
  },
);

ViewEditor.displayName = 'ViewEditor';

/** The `tag` mode's query: the query builder in a standalone form row. */
const QueryField = ({
  type,
  label,
  getValue,
  onValueChange,
  types,
  tags,
}: FormFieldRendererProps & Pick<QueryFormProps, 'types' | 'tags'>) => (
  <FormField label={label} standalone>
    <QueryForm
      initialQuery={getValue()}
      types={types}
      tags={tags}
      onChange={(query) => onValueChange(type, query.ast)}
    />
  </FormField>
);

type FieldListProps = {
  type: Type.AnyEntity;
  view: View.View;
  projectionModel: ProjectionModel;
  registry?: Registry.Registry;
  readonly?: boolean;
  onDelete: (fieldId: string) => void;
};

/** The view's field projections: reorderable rows that hide, show or delete a field and open to its editor. */
const FieldList = ({ type, view, projectionModel, registry, readonly, onDelete }: FieldListProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const schemaReadonly = Type.getDatabase(type) == null;
  // Subscribe to the view, so edits from elsewhere re-render the list.
  const [snapshot] = useObject(view);
  const [expandedId, setExpandedId] = useState<string>();
  const fields = useMemo(
    () => (snapshot?.projection.fields ?? []).filter(Schema.is(View.FieldSchema)),
    [snapshot?.projection.fields],
  );

  const handleAdd = useCallback(() => {
    invariant(!readonly);
    setExpandedId(projectionModel.createFieldProjection().id);
  }, [projectionModel, readonly]);

  const handleMove = useCallback(
    (from: number, to: number) => {
      invariant(!readonly);
      Obj.update(view, (view) => {
        // Splice a copy rather than `arrayMove` in place, which races the kanban model.
        const next = [...view.projection.fields];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        view.projection.fields = next;
      });
    },
    [view, readonly],
  );

  const handleDelete = useCallback(
    (fieldId: string) => {
      setExpandedId((expanded) => (expanded === fieldId ? undefined : expanded));
      onDelete(fieldId);
    },
    [onDelete],
  );

  return (
    <>
      <Field.Header>
        <Typography.Text truncate>{t('fields.label')}</Typography.Text>
        {!readonly && (
          <Button.Root
            iconOnly
            variant='ghost'
            icon='ph--plus--regular'
            label={t('add-property-button.label')}
            disabled={fields.length >= VIEW_FIELD_LIMIT}
            onClick={handleAdd}
          />
        )}
      </Field.Header>
      <OrderedList.Root
        items={fields}
        getId={(field) => field.id}
        getLabel={(field) => field.path}
        onMove={handleMove}
        readonly={!!readonly || schemaReadonly}
      >
        {({ items }) => (
          <OrderedList.Content scroll={false} gutter='inherit' aria-label={t('fields.label')}>
            {items.map((field) => {
              const hidden = field.visible === false;
              return (
                <OrderedList.Item
                  key={field.id}
                  id={field.id}
                  canDrag={!readonly && !schemaReadonly}
                  collapsible={!readonly}
                  open={expandedId === field.id}
                  onOpenChange={(open) => setExpandedId(open ? field.id : undefined)}
                >
                  <OrderedList.DragHandle />
                  <OrderedList.ItemText tone={hidden ? 'muted' : undefined}>{field.path}</OrderedList.ItemText>
                  <Button.Toggle
                    iconOnly
                    variant='ghost'
                    pressed={hidden}
                    icon='ph--eye--regular'
                    activeIcon='ph--eye-closed--regular'
                    label={t(hidden ? 'show-field.label' : 'hide-field.label')}
                    disabled={readonly || (!hidden && projectionModel.getFields().length <= 1)}
                    onPressedChange={() => {
                      setExpandedId(undefined);
                      if (hidden) {
                        // A hidden field is a schema property, so its path is a property name.
                        if (isJsonProp(field.path)) {
                          projectionModel.showFieldProjection(field.path);
                        }
                      } else {
                        projectionModel.hideFieldProjection(field.id);
                      }
                    }}
                    data-testid={hidden ? 'show-field-button' : 'hide-field-button'}
                  />
                  {!readonly && (
                    <Button.Root
                      iconOnly
                      variant='ghost'
                      icon='ph--x--regular'
                      label={t('delete-field.label')}
                      disabled={schemaReadonly || fields.length <= 1}
                      onClick={() => handleDelete(field.id)}
                      data-testid='field.delete'
                    />
                  )}
                  {!readonly && (
                    <OrderedList.Detail>
                      <FieldEditor
                        readonly={readonly || schemaReadonly}
                        registry={registry}
                        projection={projectionModel}
                        field={field}
                        onSave={() => setExpandedId(undefined)}
                      />
                    </OrderedList.Detail>
                  )}
                </OrderedList.Item>
              );
            })}
          </OrderedList.Content>
        )}
      </OrderedList.Root>
    </>
  );
};
