//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';
import React, { useEffect, useMemo, useState } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { useObjectMenuItems } from '@dxos/app-toolkit/ui';
import { Annotation, Filter, Obj, type Ref, Type } from '@dxos/echo';
import { type View } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { Masonry as MasonryComponent } from '@dxos/react-ui-masonry';
import { Menu } from '@dxos/react-ui-menu';
import { SearchList, useSearchListResults } from '@dxos/react-ui-searchlist';
import { getTypenameFromQuery } from '@dxos/schema';
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
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;

  const [cardSchema, setCardSchema] = useState<Schema.Schema.AnyNoContext>();

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema);
    }
    if (!staticSchema && typename && db) {
      const query = db.schemaRegistry.query({ typename });
      const unsubscribe = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            setCardSchema(schema);
          }
        },
        { fire: true },
      );
      return unsubscribe;
    }
  }, [schemas, typename, db]);

  const objects = useQuery(db, cardSchema ? Filter.type(cardSchema) : Filter.nothing());

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
            <MasonryComponent.Content items={results} getId={(data: any) => data?.id} />
          </Panel.Content>
        </Panel.Root>
      </SearchList.Root>
    </MasonryComponent.Root>
  );
};

const Item = ({ data }: { data: any }) => {
  const objectMenuItems = useObjectMenuItems(data);
  const icon = Function.pipe(
    Obj.getSchema(data),
    Option.fromNullable,
    Option.flatMap(Annotation.IconAnnotation.get),
    Option.map(({ icon }) => icon),
    Option.getOrElse(() => 'ph--placeholder--regular'),
  );

  return (
    <Menu.Root>
      <Card.Root>
        <Card.Toolbar>
          <Card.Icon icon={icon} />
          <Card.Title>{Obj.getLabel(data)}</Card.Title>
          {/* TODO(wittjosiah): Reconcile with Card.Menu. */}
          <Menu.Trigger asChild disabled={!objectMenuItems?.length}>
            <Toolbar.IconButton iconOnly variant='ghost' icon='ph--dots-three-vertical--regular' label='Actions' />
          </Menu.Trigger>
          <Menu.Content items={objectMenuItems} />
        </Card.Toolbar>
        <Surface.Surface role='card--content' limit={1} data={{ subject: data }} />
      </Card.Root>
    </Menu.Root>
  );
};
