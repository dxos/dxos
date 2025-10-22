//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Surface } from '@dxos/app-framework';
import { Filter, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import { type DataType, getTypenameFromQuery } from '@dxos/schema';

const Item = ({ data }: { data: any }) => {
  return <Surface role='card' limit={1} data={{ subject: data }} />;
};

export const MasonryContainer = ({ view, role }: { view: DataType.View; role?: string }) => {
  const client = useClient();
  const space = getSpace(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();

  useEffect(() => {
    const staticSchema = client.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema as TypedObject<any, any>);
    } else if (typename && space) {
      const query = space.db.schemaRegistry.query({ typename });
      const unsubscribe = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            setCardSchema(schema);
          } else {
            setCardSchema(undefined);
          }
        },
        { fire: true },
      );
      return unsubscribe;
    }
  }, [typename, space]);

  const objects = useQuery(space, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  // TODO(wittjosiah): This currently explodes if items are removed from the list.
  return (
    <Masonry.Root
      items={filteredObjects}
      render={Item as any}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
      intrinsicHeight={role === 'section'}
    />
  );
};
