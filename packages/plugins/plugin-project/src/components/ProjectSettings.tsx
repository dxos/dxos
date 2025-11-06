//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { DXN, Filter, Obj, Query, type QueryAST, Ref, Tag, Type } from '@dxos/echo';
import { useTypeOptions } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { IconButton, type ThemedClassName, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { cardChrome, cardText } from '@dxos/react-ui-stack';
import { inputTextLabel, mx, subtleHover } from '@dxos/react-ui-theme';
import { Collection, ProjectionModel, View } from '@dxos/schema';
import { type Project, Task } from '@dxos/types';
import { arrayMove } from '@dxos/util';

import { resolveSchemaWithClientAndSpace } from '../helpers';
import { meta } from '../meta';

const listGrid = 'grid grid-cols-[min-content_1fr_min-content_min-content_min-content]';
const listItemGrid = 'grid grid-cols-subgrid col-span-5';

// TODO(burdon): Standardize Object/Plugin settings.
export type ProjectObjectSettingsProps = ThemedClassName<{
  project: Project.Project;
}>;

/**
 * Supports editing the project view.
 */
export const ProjectObjectSettings = ({ classNames, project }: ProjectObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = getSpace(project);
  const views = project.collections.map((ref) => ref.target).filter((object) => Obj.instanceOf(View.View, object));
  const [expandedId, setExpandedId] = useState<View.View['id']>();
  const view = useMemo(() => views.find((view) => view.id === expandedId), [views, expandedId]);
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>(() => Schema.Struct({}));
  const projectionRef = useRef<ProjectionModel>(null);
  const tags = useQuery(space, Filter.type(Tag.Tag));
  const types = useTypeOptions({ space, annotation: ['dynamic', 'limited-static', 'object-form'] });

  useAsyncEffect(async () => {
    if (!view?.query || !space) {
      return;
    }

    const foundSchema = await resolveSchemaWithClientAndSpace(client, space, view.query.ast);
    if (foundSchema && foundSchema !== schema) {
      setSchema(() => foundSchema);
    }
  }, [client, space, view, schema]);

  const handleMove = useCallback(
    (fromIndex: number, toIndex: number) => arrayMove(project.collections, fromIndex, toIndex),
    [project.collections],
  );

  const handleQueryChanged = useCallback(
    async (newQuery: QueryAST.Query, target?: string) => {
      if (!view || !space) {
        return;
      }

      const queue = target && DXN.tryParse(target) ? target : undefined;
      const query = queue ? Query.fromAst(newQuery).options({ queues: [queue] }) : Query.fromAst(newQuery);
      view.query.ast = query.ast;
      const newSchema = await resolveSchemaWithClientAndSpace(client, space, query.ast);
      if (!newSchema) {
        return;
      }

      const newView = View.make({
        query,
        jsonSchema: Type.toJsonSchema(newSchema),
        presentation: Obj.make(Type.Expando, {}),
      });
      view.projection = Obj.getSnapshot(newView).projection;

      setSchema(() => newSchema);
    },
    [view, schema],
  );

  const handleToggleField = useCallback((view: View.View) => {
    setExpandedId((prevExpandedId) => (prevExpandedId === view.id ? undefined : view.id));
  }, []);

  const handleDelete = useCallback(
    (view: View.View) => {
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
    const view = View.make({
      query: Query.select(Filter.type(Task.Task)),
      jsonSchema: Type.toJsonSchema(Task.Task),
      presentation: Obj.make(Collection.Collection, { objects: [] }),
    });
    project.collections.push(Ref.make(view));
    setExpandedId(view.id);
  }, [project]);

  return (
    <div role='none' className={mx('plb-cardSpacingBlock overflow-y-auto', classNames)}>
      <h2 className={mx(inputTextLabel, cardText)}>{t('views label')}</h2>

      <List.Root<View.View> items={views} isItem={Schema.is(View.View)} getId={(view) => view.id} onMove={handleMove}>
        {({ items: views }) => (
          <>
            <div role='list' className={mx(listGrid, cardChrome)}>
              {views.map((view) => (
                <List.Item<View.View>
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
                  {expandedId === view.id && view && (
                    <div role='none' className='col-span-5 mbs-1 mbe-1 border border-separator rounded-md'>
                      <ViewEditor
                        ref={projectionRef}
                        mode='query'
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
