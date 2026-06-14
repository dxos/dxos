//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface, useObjectMenuItems, useSchemaFilter } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query, type Ref, Type, type View } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Icon, Panel, Toolbar } from '@dxos/react-ui';
import { Masonry as MasonryComponent } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { SearchList, useSearchListResults } from '@dxos/react-ui-search';
import { getTagFromQuery, getTypeURIFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

export type MasonryContainerProps = {
  view: View.View;
  role?: string;
};

export const MasonryContainer = ({
  view: viewOrRef,
  role: _role,
}: {
  view: View.View | Ref.Ref<View.View>;
  role?: string;
}) => {
  const [view] = useObject(viewOrRef);
  const schemas = useCapabilities(AppCapabilities.Schema);
  const db = view && Obj.getDatabase(view);
  const typeUri = view?.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;

  const [cardSchema, setCardSchema] = useState<Type.AnyEntity>();

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getURI(schema) === typeUri);
    if (staticSchema) {
      setCardSchema(() => staticSchema);
      return;
    }
    if (typeUri && db) {
      const findInRegistry = () =>
        db.graph.registry
          .list()
          .filter(Type.isType)
          .find((t) => Type.getURI(t) === typeUri);
      setCardSchema(() => findInRegistry());
      return db.graph.registry.changed.on(() => {
        setCardSchema(() => findInRegistry());
      });
    }
    setCardSchema(undefined);
  }, [schemas, typeUri, db]);

  const baseFilter = useSchemaFilter(cardSchema);
  const query = useMemo(
    () => (tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter)),
    [baseFilter, tag],
  );
  const objects = useQuery(db, query);

  const sortedObjects = useMemo(
    () =>
      objects.filter(isNonNullable).toSorted((a, b) => (Obj.getLabel(a) ?? '').localeCompare(Obj.getLabel(b) ?? '')),
    [objects],
  );

  const { results, handleSearch } = useSearchListResults({
    items: sortedObjects,
    extract: (obj) => Obj.getLabel(obj) ?? '',
  });

  return (
    <MasonryComponent.Root Tile={Item}>
      <SearchList.Root onSearch={handleSearch}>
        <Panel.Root>
          <Panel.Toolbar asChild>
            <Toolbar.Root>
              <SearchList.Input placeholder='Search...' />
            </Toolbar.Root>
          </Panel.Toolbar>
          <Panel.Content>
            <MasonryComponent.Content>
              <MasonryComponent.Viewport items={results} getId={(data: any) => data?.id} />
            </MasonryComponent.Content>
          </Panel.Content>
        </Panel.Root>
      </SearchList.Root>
    </MasonryComponent.Root>
  );
};

const Item = ({ data }: { data: any }) => {
  const objectMenuItems = useObjectMenuItems(data);
  const icon = Obj.getIcon(data)?.icon ?? 'ph--circle-dashed--regular';

  return (
    <Menu.Root>
      <Card.Root>
        <Card.Header>
          <Card.Block>
            <Icon icon={icon} />
          </Card.Block>
          <Card.Title>{Obj.getLabel(data, { fallback: 'typename' })}</Card.Title>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <Card.Block end>
            <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
              <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
            </Menu.Trigger>
            <Menu.Content items={objectMenuItems} />
          </Card.Block>
        </Card.Header>
        <Surface.Surface
          type={AppSurface.Card}
          limit={1}
          data={{ subject: data } satisfies AppSurface.ObjectCardData}
        />
      </Card.Root>
    </Menu.Root>
  );
};
