//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/react';
import { Filter, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { ClientCapabilities } from '@dxos/plugin-client';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Masonry as MasonryComponent } from '@dxos/react-ui-masonry';
import { getTypenameFromQuery } from '@dxos/schema';

import { type Masonry } from '../types';

const Item = ({ data }: { data: any }) => {
  return <Surface role='card' limit={1} data={{ subject: data }} />;
};

export const MasonryContainer = ({ object, role }: { object: Masonry.Masonry; role?: string }) => {
  const schemas = useCapabilities(ClientCapabilities.Schema);
  const space = getSpace(object);
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;

  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema as TypedObject<any, any>);
    }
    if (!staticSchema && typename && space) {
      const query = space.db.schemaRegistry.query({ typename });
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
  }, [schemas, typename, space]);

  const objects = useQuery(space, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  return (
    <MasonryComponent.Root
      items={filteredObjects}
      render={Item as any}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
    />
  );
};
