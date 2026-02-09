//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { Surface, useCapabilities } from '@dxos/app-framework/react';
import { Filter, Obj, type Ref, Type } from '@dxos/echo';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useObject, useQuery } from '@dxos/react-client/echo';
import { Masonry as MasonryComponent } from '@dxos/react-ui-masonry';
import { Card } from '@dxos/react-ui-mosaic';
import { type View, getTypenameFromQuery } from '@dxos/schema';

export type MasonryContainerProps = {
  view: View.View;
  role?: string;
};

export const MasonryContainer = ({
  view: viewOrRef,
  role,
}: {
  view: View.View | Ref.Ref<View.View>;
  role?: string;
}) => {
  const [view] = useObject(viewOrRef);
  const schemas = useCapabilities(Common.Capability.Schema);
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
  const filteredObjects = useGlobalFilteredObjects(objects);

  return (
    <MasonryComponent.Root
      items={filteredObjects}
      render={Item as any}
      classNames='is-full max-is-full bs-full max-bs-full overflow-y-auto p-4'
    />
  );
};

const Item = ({ data }: { data: any }) => {
  return (
    <Card.Root>
      <Card.Toolbar>
        <span />
        <Card.Title>{Obj.getLabel(data)}</Card.Title>
        <Card.Menu />
      </Card.Toolbar>
      <Surface role='card--content' limit={1} data={{ subject: data }} />
    </Card.Root>
  );
};
