//
// Copyright 2025 DXOS.org
//

import React, { useState, useEffect } from 'react';

import { type EchoSchema } from '@dxos/echo-schema';
import { type Space } from '@dxos/react-client/echo';
import { controlItemClasses } from '@dxos/react-ui-form';
import { StackItem } from '@dxos/react-ui-stack';

type SchemaPanelProps = { space: Space };

// TODO(ZaymonFC):
//   - Support deleting Schema. This should tie in to some sort of
//     'DangerZone™️' / 'Are you really sure?' / 'this might have consequences' component.

/**
 * Subscribe to and retrieve all schemas from a space's schema registry.
 */
export const useQuerySpaceSchemas = (space: Space): EchoSchema[] => {
  const [schemas, setSchemas] = useState<EchoSchema[]>([]);

  useEffect(() => {
    const query = space.db.schemaRegistry.query();
    const initialResults = query.runSync();
    setSchemas(initialResults);

    const unsubscribe = query.subscribe(() => setSchemas(query.results));
    return () => unsubscribe();
  }, [space]);

  return schemas;
};

export const SchemaPanel = ({ space }: SchemaPanelProps) => {
  const schemas = useQuerySpaceSchemas(space);

  return (
    <StackItem.Content classNames='block overflow-y-auto'>
      <div role='none' className={controlItemClasses}>
        {schemas.map((schema) => (
          <div key={schema.id}>
            <div>{schema.typename}</div>
          </div>
        ))}
      </div>
    </StackItem.Content>
  );
};
