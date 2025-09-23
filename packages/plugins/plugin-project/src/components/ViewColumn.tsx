//
// Copyright 2025 DXOS.org
//

import { Array, Effect, Match, Option, type Schema, SchemaAST } from 'effect';
import React, { useMemo, useState } from 'react';

import { DXN, Obj, Query, type QueryAST, Type } from '@dxos/echo';
import {
  ReferenceAnnotationId,
  type ReferenceAnnotationValue,
  getTypeAnnotation,
  unwrapOptional,
} from '@dxos/echo-schema';
import { type Client, useClient } from '@dxos/react-client';
import { Filter, type Space, getSpace, useQuery } from '@dxos/react-client/echo';
import { IconButton, ToggleGroup, ToggleGroupIconItem, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { ViewEditor } from '@dxos/react-ui-form';
import { Card, CardStack, StackItem, cardStackHeading } from '@dxos/react-ui-stack';
import { ProjectionModel, type View } from '@dxos/schema';

import { meta } from '../meta';

import { useProject } from './Project';

export type ViewColumnProps = {
  view: View;
};

// This duplicates a lot of the same boilerplate as Kanban columns; is there an opportunity to DRY these out?
export const ViewColumn = ({ view }: ViewColumnProps) => {
  const client = useClient();
  const space = getSpace(view);
  const { t } = useTranslation(meta.id);
  const { Item, onAddItem } = useProject('ViewColumn');
  const [tab, setTab] = useState<'enumerating' | 'editing'>('enumerating');
  const [schema, setSchema] = useState<Schema.Schema.AnyNoContext>();
  const query = view?.query ? Query.fromAst(Obj.getSnapshot(view).query) : Query.select(Filter.nothing());

  useAsyncEffect(async () => {
    if (!query || !space) {
      return;
    }

    const schema = await resolveSchemaWithClientAndSpace(client, space, query.ast);
    setSchema(() => schema);
  }, [view.query]);

  const queryTarget = getQueryTarget(query.ast, space);
  const items = useQuery(queryTarget, query);
  const projectionModel = useMemo(
    () => (schema ? new ProjectionModel(Type.toJsonSchema(schema), view.projection) : undefined),
    [schema, view.projection],
  );

  if (!schema || !view || !view.query) {
    return null;
  }

  return (
    <CardStack.Root asChild>
      <StackItem.Root item={view} size={20} focusIndicatorVariant='group'>
        <CardStack.Content>
          <StackItem.Heading classNames={[cardStackHeading, 'pli-cardSpacingChrome']} separateOnScroll>
            <h3 className='grow'>{view.name ?? t('untitled view title')}</h3>
            <ToggleGroup
              type='single'
              value={tab}
              onValueChange={(nextValue: 'enumerating' | 'editing') => setTab(nextValue)}
            >
              <ToggleGroupIconItem
                iconOnly
                variant='ghost'
                value='enumerating'
                label={t('enumerating tab label')}
                icon='ph--rows-plus-bottom--regular'
              />
              <ToggleGroupIconItem
                iconOnly
                variant='ghost'
                value='editing'
                label={t('editing tab label')}
                icon='ph--pencil-simple-line--regular'
              />
            </ToggleGroup>
          </StackItem.Heading>
          <>
            {tab === 'enumerating' ? (
              <>
                <CardStack.Stack id={view.id} itemsCount={items.length}>
                  {items.map((liveMarker) => {
                    const item = liveMarker as unknown as Obj.Any;
                    return (
                      <CardStack.Item asChild key={item.id}>
                        <StackItem.Root item={item} focusIndicatorVariant='group'>
                          <Card.StaticRoot>
                            <Item item={item} projectionModel={projectionModel} />
                          </Card.StaticRoot>
                        </StackItem.Root>
                      </CardStack.Item>
                    );
                  })}
                </CardStack.Stack>
                <CardStack.Footer>
                  <IconButton
                    icon='ph--plus--regular'
                    label={t('add card label')}
                    classNames='is-full'
                    onClick={() => onAddItem?.(schema)}
                  />
                </CardStack.Footer>
              </>
            ) : (
              <ViewEditor view={view} schema={schema} classNames='overflow-y-auto row-span-2' />
            )}
          </>
        </CardStack.Content>
      </StackItem.Root>
    </CardStack.Root>
  );
};

const resolveSchemaWithClientAndSpace = (client: Client, space: Space, query: QueryAST.Query) => {
  const resolve = Effect.fn(function* (dxn: string) {
    const typename = DXN.parse(dxn).asTypeDXN()?.type;
    if (!typename) {
      return Option.none();
    }

    const staticSchema = client.graph.schemaRegistry.getSchema(typename);
    if (staticSchema) {
      return Option.some(staticSchema);
    }

    const query = space.db.schemaRegistry.query({ typename });
    const schemas = yield* Effect.promise(() => query.run());
    return Array.head(schemas).pipe(Option.map((schema) => schema.snapshot));
  });

  return resolveSchema(query, resolve).pipe(
    Effect.map((schema) => Option.getOrUndefined(schema)),
    Effect.runPromise,
  );
};

// TODO(wittjosiah): Factor out and add tests.
const resolveSchema = (
  query: QueryAST.Query,
  resolve: (dxn: string) => Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>>,
): Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>> => {
  return Match.value(query).pipe(
    Match.withReturnType<Effect.Effect<Option.Option<Schema.Schema.AnyNoContext>>>(),
    // TODO(wittjosiah): Reconcile with filter match?
    Match.when({ type: 'select' }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'filter' }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'reference-traversal' }, ({ anchor, property }) =>
      resolveSchema(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((schema) => SchemaAST.getPropertySignatures(schema.ast)),
            Option.flatMap((properties) => Array.findFirst(properties, (p) => p.name === property)),
            Option.flatMap((property) =>
              SchemaAST.getAnnotation<ReferenceAnnotationValue>(ReferenceAnnotationId)(unwrapOptional(property)),
            ),
            Option.map((annotation) => annotation.typename),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (typename) => resolve(DXN.fromTypename(typename).toString()),
          }),
        ),
      ),
    ),
    Match.when({ type: 'relation', filter: Match.defined }, ({ filter }) =>
      typenameFromFilter(filter).pipe(
        Option.map((typename) => resolve(typename)),
        Option.getOrElse(() => Effect.succeed(Option.none<Schema.Schema.AnyNoContext>())),
      ),
    ),
    Match.when({ type: 'relation-traversal' }, ({ anchor, direction }) =>
      resolveSchema(anchor, resolve).pipe(
        Effect.map((base) =>
          base.pipe(
            Option.map((schema) => getTypeAnnotation(schema)),
            Option.flatMap((annotation) =>
              Option.fromNullable(direction === 'source' ? annotation?.sourceSchema : annotation?.targetSchema),
            ),
          ),
        ),
        Effect.flatMap(
          Option.match({
            onNone: () => Effect.succeed(Option.none()),
            onSome: (typename) => resolve(typename),
          }),
        ),
      ),
    ),
    Match.when({ type: 'options' }, ({ query }) => resolveSchema(query, resolve)),
    Match.orElse((q) => {
      // TODO(wittjosiah): Implement other cases.
      return Effect.succeed(Option.none());
    }),
  );
};

const typenameFromFilter = (filter: QueryAST.Filter) =>
  Match.value(filter).pipe(
    Match.withReturnType<Option.Option<string>>(),
    Match.when({ type: 'object' }, ({ typename }) => Option.fromNullable(typename)),
    Match.orElse(() => Option.none()),
  );

const getQueryTarget = (query: QueryAST.Query, space?: Space) => {
  return Match.value(query).pipe(
    Match.when({ type: 'options' }, ({ options }) => {
      return Option.fromNullable(options.queues).pipe(
        Option.flatMap((queues) => Array.head(queues)),
        Option.flatMap((queueDxn) => Option.fromNullable(DXN.tryParse(queueDxn))),
        Option.flatMap((queueDxn) => Option.fromNullable(space?.queues.get(queueDxn))),
        Option.getOrElse(() => space),
      );
    }),
    Match.orElse(() => space),
  );
};
