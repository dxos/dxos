//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/react';
import { Filter, Obj, Type } from '@dxos/echo';
import { type TypedObject } from '@dxos/echo/internal';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useQuery } from '@dxos/react-client/echo';
import { Masonry as MasonryComponent } from '@dxos/react-ui-masonry';
import { type View, getTypenameFromQuery } from '@dxos/schema';

const Item = ({ data }: { data: any }) => {
  return <Surface role='card' limit={1} data={{ subject: data }} />;
};

export const MasonryContainer = ({ view, role }: { view: View.View; role?: string }) => {
  const schemas = useCapabilities(Common.Capability.Schema);
  const db = Obj.getDatabase(view);
  const typename = view.query ? getTypenameFromQuery(view.query.ast) : undefined;

  const [cardSchema, setCardSchema] = useState<TypedObject<any, any>>();

  useEffect(() => {
    const staticSchema = schemas.flat().find((schema) => Type.getTypename(schema) === typename);
    if (staticSchema) {
      setCardSchema(() => staticSchema as TypedObject<any, any>);
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
  const filteredObjects = useGlobalFilteredObjects(objects);

  return (
    <MasonryComponent.Root
      items={filteredObjects}
      render={Item as any}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
    />
  );
};
