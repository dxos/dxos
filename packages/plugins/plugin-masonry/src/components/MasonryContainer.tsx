//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { Filter, Type } from '@dxos/echo';
import { EchoSchema, type TypedObject } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery } from '@dxos/react-client/echo';
import { Masonry } from '@dxos/react-ui-masonry';
import { ProjectionModel, type View, getTypenameFromQuery } from '@dxos/schema';

const Item = ({ data }: { data: any }) => {
  return <Surface role='card' limit={1} data={{ subject: data }} />;
};

export const MasonryContainer = ({ view, role }: { view: View.View; role: string }) => {
  const client = useClient();
  const space = getSpace(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;

  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();
  const [projection, setProjection] = useState<ProjectionModel>();

  const jsonSchema = useMemo(() => {
    if (!cardSchema) return undefined;
    return cardSchema instanceof EchoSchema ? cardSchema.jsonSchema : Type.toJsonSchema(cardSchema);
  }, [cardSchema]);

  useEffect(() => {
    const staticSchema = client.graph.schemaRegistry.schemas.find((schema) => Type.getTypename(schema) === typename);
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
  }, [typename, space]);

  useEffect(() => {
    if (jsonSchema) {
      setProjection(new ProjectionModel(jsonSchema, view.projection));
    }
  }, [view.projection, JSON.stringify(jsonSchema)]);

  const objects = useQuery(space, cardSchema ? Filter.type(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  return (
    <Masonry.Root
      items={filteredObjects}
      render={Item as any}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
    />
  );
};
