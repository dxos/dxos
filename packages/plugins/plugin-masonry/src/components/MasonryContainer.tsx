//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { Surface, useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
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
  const filteredObjects = useGlobalFilteredObjects(objects);

  return (
    <MasonryComponent.Root
      items={filteredObjects}
      render={Item as any}
      classNames='inline-full max-inline-full block-full max-block-full overflow-y-auto p-4'
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
      <Surface.Surface role='card--content' limit={1} data={{ subject: data }} />
    </Card.Root>
  );
};
