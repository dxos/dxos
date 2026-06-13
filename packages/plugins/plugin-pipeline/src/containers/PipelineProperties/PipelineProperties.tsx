//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { resolveSchemaWithRegistry } from '@dxos/app-toolkit/query';
import { useTypeOptions } from '@dxos/app-toolkit/ui';
import { EID, Filter, JsonSchema, Obj, Query, type QueryAST, Ref, Scope, Tag, type Type } from '@dxos/echo';
import { type Mutable } from '@dxos/echo/Obj';
import { SchemaEx } from '@dxos/effect';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form, ViewEditor } from '@dxos/react-ui-form';
import { OrderedList } from '@dxos/react-ui-list';
import { type ProjectionModel, ViewModel } from '@dxos/schema';
import { Pipeline } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

import { meta } from '#meta';

const ColumnFormSchema = Pipeline.Column.pipe(Schema.mutable, Schema.pick('name'));

export type PipelinePropertiesProps = ThemedClassName<{
  pipeline: Pipeline.Pipeline;
}>;

/**
 * Supports editing the pipeline view.
 */
export const PipelineProperties = ({ classNames, pipeline }: PipelinePropertiesProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(pipeline);
  const [expandedId, setExpandedId] = useState<string>();
  const [columns, updateColumns] = useObject(pipeline, 'columns');
  const column = useMemo(() => columns.find((column) => column.view.uri === expandedId), [columns, expandedId]);
  const [view, updateView] = useObject(column?.view);
  const [type, setType] = useState<Type.AnyEntity>();
  const projectionRef = useRef<ProjectionModel>(null);
  const tags = useQuery(db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    db,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
    },
  });

  useAsyncEffect(async () => {
    if (!view?.query || !db) {
      return;
    }

    const foundType = await resolveSchemaWithRegistry(db, view.query.ast);
    if (foundType && foundType !== type) {
      setType(() => foundType);
    }
  }, [db, view, type]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) =>
      updateColumns((columns) => {
        arrayMove(columns, fromIndex, toIndex);
      }),
    [updateColumns],
  );

  const handleQueryChanged = useCallback(
    async (newQuery: QueryAST.Query, target?: EID.EID) => {
      if (!view || !db) {
        return;
      }

      const queue = target;
      const query = queue ? Query.fromAst(newQuery).from([Scope.feed(String(queue))]) : Query.fromAst(newQuery);
      updateView((view) => {
        view.query.ast = query.ast as Mutable<typeof query.ast>;
      });
      const newType = await resolveSchemaWithRegistry(db, query.ast);
      if (!newType) {
        return;
      }

      const newView = ViewModel.make({
        query,
        jsonSchema: newType.jsonSchema,
      });
      updateView((view) => {
        view.projection = Obj.getSnapshot(newView).projection as Mutable<typeof view.projection>;
      });

      setType(() => newType);
    },
    [db, view, updateView, type],
  );

  const handleColumnValuesChanged = useCallback(
    (column: Pipeline.Column) =>
      (newValues: { name?: string }, { changed }: { changed: Record<SchemaEx.JsonPath, boolean> }) => {
        if (changed['name' as SchemaEx.JsonPath]) {
          const columnIndex = columns.findIndex((c) => c === column);
          if (columnIndex === -1) {
            return;
          }
          updateColumns((cols) => {
            cols[columnIndex].name = newValues.name ?? '';
          });
        }
      },
    [columns, updateColumns],
  );

  const handleDelete = useCallback(
    async (column: Pipeline.Column) => {
      if (column.view.uri === expandedId) {
        setExpandedId(undefined);
      }

      const index = columns.findIndex((l) => l === column);
      const viewToRemove = await column.view.load();
      updateColumns((columns) => {
        columns.splice(index, 1);
      });
      db?.remove(viewToRemove);
    },
    [expandedId, columns, updateColumns, db],
  );

  const handleAdd = useCallback(() => {
    if (!db) {
      return;
    }

    const newView = db.add(
      ViewModel.make({
        query: Query.select(Filter.nothing()),
        jsonSchema: JsonSchema.toJsonSchema(Schema.Struct({})),
      }),
    );

    updateColumns((columns) => {
      columns.push({
        name: '',
        // Type assertion needed due to QueryAST type variance.
        view: Ref.make(newView) as (typeof columns)[number]['view'],
        order: [],
      });
    });
    setExpandedId(newView.id);
  }, [db, updateColumns]);

  return (
    <div className={mx('py-form-padding overflow-y-auto', classNames)}>
      <h2 className='text-sm text-description py-1'>{t('views.label')}</h2>
      <OrderedList.Root<Pipeline.Column>
        items={columns}
        isItem={Schema.is(Pipeline.Column)}
        getId={(column) => column.view.uri}
        onMove={handleMove}
        expandedId={expandedId}
        onExpandedChange={setExpandedId}
      >
        {({ items }) => (
          <OrderedList.Content>
            {items.map((column) => (
              <OrderedList.Item<Pipeline.Column> key={column.view.uri} id={column.view.uri} item={column}>
                <OrderedList.Row>
                  <OrderedList.DragHandle />
                  <OrderedList.Title>{column.name || t('untitled-view.title')}</OrderedList.Title>
                  <OrderedList.DeleteButton
                    label={t('delete-view.label')}
                    onClick={() => handleDelete(column)}
                    data-testid='view.delete'
                  />
                  <OrderedList.ExpandCaret />
                </OrderedList.Row>
                {column.view.target && (
                  <OrderedList.Expanded classNames='my-2'>
                    <Form.Root
                      schema={ColumnFormSchema}
                      values={column}
                      onValuesChanged={handleColumnValuesChanged(column)}
                    >
                      <Form.Content>
                        <Form.FieldSet />
                      </Form.Content>
                    </Form.Root>
                    <ViewEditor
                      ref={projectionRef}
                      mode='tag'
                      readonly
                      type={type}
                      view={column.view.target}
                      registry={db?.graph.registry}
                      db={db}
                      tags={tags}
                      types={types}
                      onQueryChanged={handleQueryChanged}
                    />
                  </OrderedList.Expanded>
                )}
              </OrderedList.Item>
            ))}
          </OrderedList.Content>
        )}
      </OrderedList.Root>

      <div className='my-form-padding'>
        <IconButton icon='ph--plus--regular' label={t('add-view.label')} onClick={handleAdd} classNames='w-full' />
      </div>
    </div>
  );
};
