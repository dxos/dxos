//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { DXN, Filter, Obj, Query, type QueryAST, Ref, Tag, Type } from '@dxos/echo';
import { useTypeOptions } from '@dxos/plugin-space';
import { resolveSchemaWithRegistry } from '@dxos/plugin-space';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Form, ViewEditor } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
// import { cardChrome, cardText } from '@dxos/react-ui-mosaic';
import { type ProjectionModel, View } from '@dxos/schema';
import { Project, Task } from '@dxos/types';
import { inputTextLabel, mx, osTranslations, subtleHover } from '@dxos/ui-theme';
import { arrayMove } from '@dxos/util';

import { meta } from '../meta';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

const ColumnFormSchema = Project.Column.pipe(Schema.mutable, Schema.pick('name'));

// TODO(burdon): Standardize Object/Plugin settings.
export type ProjectObjectSettingsProps = ThemedClassName<{
  project: Project.Project;
}>;

/**
 * Supports editing the project view.
 */
export const ProjectObjectSettings = ({ classNames, project }: ProjectObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(project);
  const [expandedId, setExpandedId] = useState<string>();
  const column = useMemo(
    () => project.columns.find((column) => column.view.dxn.toString() === expandedId),
    [project.columns, expandedId],
  );
  const view = column?.view.target;
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>(() => Schema.Struct({}));
  const projectionRef = useRef<ProjectionModel>(null);
  const tags = useQuery(space?.db, Filter.type(Tag.Tag));
  const types = useTypeOptions({
    space,
    annotation: {
      location: ['database', 'runtime'],
      kind: ['user'],
      registered: ['registered', 'unregistered'],
    },
  });

  useAsyncEffect(async () => {
    if (!view?.query || !space) {
      return;
    }

    const foundSchema = await resolveSchemaWithRegistry(space.db.schemaRegistry, view.query.ast);
    if (foundSchema && foundSchema !== schema) {
      setSchema(() => foundSchema);
    }
  }, [space, view, schema]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) =>
      Obj.change(project, (p) => {
        arrayMove(p.columns, fromIndex, toIndex);
      }),
    [project],
  );

  const handleQueryChanged = useCallback(
    async (newQuery: QueryAST.Query, target?: string) => {
      if (!view || !space) {
        return;
      }

      const queue = target && DXN.tryParse(target) ? target : undefined;
      const query = queue ? Query.fromAst(newQuery).options({ queues: [queue] }) : Query.fromAst(newQuery);
      Obj.change(view, () => {
        view.query.ast = query.ast;
      });
      const newSchema = await resolveSchemaWithRegistry(space.db.schemaRegistry, query.ast);
      if (!newSchema) {
        return;
      }

      const newView = View.make({
        query,
        jsonSchema: Type.toJsonSchema(newSchema),
      });
      Obj.change(view, () => {
        view.projection = Obj.getSnapshot(newView).projection;
      });

      setSchema(() => newSchema);
    },
    [view, schema],
  );

  const handleToggleField = useCallback((column: Project.Column) => {
    setExpandedId((prevExpandedId) =>
      prevExpandedId === column.view.dxn.toString() ? undefined : column.view.dxn.toString(),
    );
  }, []);

  const handleDelete = useCallback(
    async (column: Project.Column) => {
      if (column.view.dxn.toString() === expandedId) {
        setExpandedId(undefined);
      }

      const index = project.columns.findIndex((l) => l === column);
      const viewToRemove = await column.view.load();
      Obj.change(project, (p) => {
        p.columns.splice(index, 1);
      });
      space?.db.remove(viewToRemove);
    },
    [expandedId, project.columns, space],
  );

  const handleAdd = useCallback(() => {
    const newView = View.make({
      query: Query.select(Filter.type(Task.Task)),
      jsonSchema: Type.toJsonSchema(Task.Task),
    });
    Obj.change(project, (p) => {
      p.columns.push({
        name: 'Tasks',
        // Type assertion needed due to QueryAST type variance.
        view: Ref.make(newView) as (typeof p.columns)[number]['view'],
        order: [],
      });
    });
    setExpandedId(newView.id);
  }, [project]);

  const handleColumnSave = useCallback(
    (values: Schema.Schema.Type<typeof ColumnFormSchema>) => {
      if (column) {
        const columnIndex = project.columns.findIndex((c) => c === column);
        Obj.change(project, (project) => {
          project.columns[columnIndex].name = values.name;
        });
      }
    },
    [column, project],
  );

  return (
    <div role='none' className={mx('plb-cardSpacingBlock overflow-y-auto', classNames)}>
      <h2 className={mx(inputTextLabel)}>{t('views label')}</h2>

      <List.Root<Project.Column>
        items={project.columns}
        isItem={Schema.is(Project.Column)}
        getId={(column) => column.view.dxn.toString()}
        onMove={handleMove}
      >
        {({ items: columns }) => (
          <>
            <div role='list' className={mx(listGrid)}>
              {columns.map((column) => (
                <List.Item<Project.Column>
                  key={column.view.dxn.toString()}
                  item={column}
                  classNames={listItemGrid}
                  aria-expanded={expandedId === column.view.dxn.toString()}
                >
                  <div role='none' className={mx(subtleHover, listItemGrid, 'rounded-sm cursor-pointer min-bs-10')}>
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleToggleField(column)}>{column.name}</List.ItemTitle>
                    <List.ItemDeleteButton
                      label={t('delete view label')}
                      autoHide={false}
                      onClick={() => handleDelete(column)}
                      data-testid='view.delete'
                    />
                    <IconButton
                      iconOnly
                      variant='ghost'
                      label={t('toggle expand label', { ns: osTranslations })}
                      icon={
                        expandedId === column.view.dxn.toString()
                          ? 'ph--caret-down--regular'
                          : 'ph--caret-right--regular'
                      }
                      onClick={() => handleToggleField(column)}
                    />
                  </div>
                  {expandedId === column.view.dxn.toString() && view && (
                    <div role='none' className='col-span-5 mlb-2 border border-separator rounded-md'>
                      <Form.Root schema={ColumnFormSchema} values={column} autoSave onSave={handleColumnSave}>
                        <Form.Content>
                          <Form.FieldSet />
                        </Form.Content>
                      </Form.Root>
                      <ViewEditor
                        ref={projectionRef}
                        mode='tag'
                        readonly
                        schema={schema}
                        view={view}
                        registry={space?.db.schemaRegistry}
                        tags={tags}
                        types={types}
                        onQueryChanged={handleQueryChanged}
                      />
                    </div>
                  )}
                </List.Item>
              ))}
            </div>
          </>
        )}
      </List.Root>

      <div role='none' className='mlb-cardSpacingBlock'>
        <IconButton icon='ph--plus--regular' label={t('add view label')} onClick={handleAdd} classNames='is-full' />
      </div>
    </div>
  );
};

export default ProjectObjectSettings;
