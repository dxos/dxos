//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { Filter, Obj, Query, type QueryAST, Ref, Type } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { cardChrome, cardText } from '@dxos/react-ui-stack';
import { inputTextLabel, mx, subtleHover } from '@dxos/react-ui-theme';
import { DataType, type ProjectionModel, createView } from '@dxos/schema';
import { arrayMove } from '@dxos/util';

import { resolveSchemaWithClientAndSpace } from '../helpers';
import { meta } from '../meta';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

export type ProjectSettingsProps = ThemedClassName<{
  project: DataType.Project;
}>;

/**
 * ProjectSettings allows for editing the views of a project.
 */
export const ProjectSettings = ({ project, classNames }: ProjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = getSpace(project);
  const views = project.collections.map((ref) => ref.target).filter((object) => Obj.instanceOf(DataType.View, object));
  const [expandedId, setExpandedId] = useState<DataType.View['id']>();
  const view = useMemo(() => views.find((view) => view.id === expandedId), [views, expandedId]);
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>();
  const projectionRef = useRef<ProjectionModel>(null);

  useAsyncEffect(async () => {
    if (!view?.query || !space) {
      return;
    }

    let query: QueryAST.Query;
    if (view.query.kind === 'grammar') {
      const builder = new QueryBuilder();
      const filter = builder.build(view.query.grammar) ?? Filter.nothing();
      query = Query.select(filter).ast;
    } else {
      query = view.query.ast;
    }

    const foundSchema = await resolveSchemaWithClientAndSpace(client, space, query);
    if (foundSchema !== schema) {
      setSchema(() => foundSchema);
    }
  }, [client, space, view, schema]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => arrayMove(project.collections, fromIndex, toIndex),
    [project.collections],
  );

  const updateViewQuery = useCallback(
    async (newQueryString: string) => {
      if (!view || !space || view.query.kind === 'ast') {
        return;
      }

      view.query.grammar = newQueryString;

      const builder = new QueryBuilder();
      const filter = builder.build(newQueryString) ?? Filter.nothing();
      const newQuery = Query.select(filter);
      const newSchema = await resolveSchemaWithClientAndSpace(client, space, newQuery.ast);
      if (!newSchema) {
        return;
      }

      const newView = createView({
        query: newQueryString,
        jsonSchema: Type.toJsonSchema(newSchema),
        presentation: Obj.make(Type.Expando, {}),
      });
      view.projection = Obj.getSnapshot(newView).projection;
      setSchema(() => newSchema);
    },
    [view, schema],
  );

  const handleToggleField = useCallback((view: DataType.View) => {
    setExpandedId((prevExpandedId) => (prevExpandedId === view.id ? undefined : view.id));
  }, []);

  const handleDelete = useCallback(
    (view: DataType.View) => {
      if (view.id === expandedId) {
        setExpandedId(undefined);
      }

      const index = project.collections.findIndex((ref) => ref.target === view);
      project.collections.splice(index, 1);
      space?.db.remove(view);
    },
    [expandedId, project.collections, space],
  );

  const handleAdd = useCallback(() => {
    const view = createView({
      query: Query.select(Filter.type(DataType.Task)),
      jsonSchema: Type.toJsonSchema(DataType.Task),
      presentation: Obj.make(DataType.Collection, { objects: [] }),
    });
    project.collections.push(Ref.make(view));
    setExpandedId(view.id);
  }, [project]);

  return (
    <div role='none' className={mx('plb-cardSpacingBlock overflow-y-auto', classNames)}>
      <h2 className={mx(inputTextLabel, cardText)}>{t('views label')}</h2>

      <List.Root<DataType.View>
        items={views}
        isItem={Schema.is(DataType.View)}
        getId={(view) => view.id}
        onMove={handleMove}
      >
        {({ items: views }) => (
          <>
            <div role='list' className={mx(listGrid, cardChrome)}>
              {views.map((view) => (
                <List.Item<DataType.View>
                  key={view.id}
                  item={view}
                  classNames={listItemGrid}
                  aria-expanded={expandedId === view.id}
                >
                  <div role='none' className={mx(subtleHover, listItemGrid, 'rounded-sm cursor-pointer min-bs-10')}>
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleToggleField(view)}>{view.name}</List.ItemTitle>
                    <List.ItemDeleteButton
                      label={t('delete view label')}
                      autoHide={false}
                      onClick={() => handleDelete(view)}
                      data-testid='view.delete'
                    />
                    <IconButton
                      iconOnly
                      variant='ghost'
                      label={t('toggle expand label', { ns: 'os' })}
                      icon={expandedId === view.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                      onClick={() => handleToggleField(view)}
                    />
                  </div>
                  {expandedId === view.id && view && schema && (
                    <div role='none' className='col-span-5 mbs-1 mbe-1 border border-separator rounded-md'>
                      <ViewEditor
                        ref={projectionRef}
                        mode='query'
                        schema={schema}
                        view={view}
                        registry={space?.db.schemaRegistry}
                        onQueryChanged={updateViewQuery}
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

export default ProjectSettings;
