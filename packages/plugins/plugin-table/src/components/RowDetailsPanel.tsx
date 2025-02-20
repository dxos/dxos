//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { type EchoSchema } from '@dxos/echo-schema';
import { getSpace, Filter, type Space } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useSelectedItems } from '@dxos/react-ui-attention';
import { type TableType } from '@dxos/react-ui-table';
import { Form } from '@dxos/react-ui-form';
import { Select } from '@dxos/react-ui';

export const useSchema = (space: Space | undefined, typename: string | undefined) => {
  const [schema, setSchema] = useState<EchoSchema>();

  useEffect(() => {
    if (typename && space) {
      const query = space.db.schemaRegistry.query({ typename });
      const unsubscribe = query.subscribe(
        () => {
          const [schema] = query.results;
          if (schema) {
            setSchema(schema);
          }
        },
        { fire: true },
      );
      return unsubscribe;
    }
  }, [typename, space]);

  return schema;
};

type RowDetailsPanelProps = {
  table: TableType;
};

const RowDetailsPanel = ({ table }: RowDetailsPanelProps) => {
  const selectedRows = useSelectedItems(table.id);
  const space = getSpace(table);
  const schema = useSchema(space, table.view?.target?.query?.type);
  const effectSchema = useMemo(() => schema?.getSchemaSnapshot(), [JSON.stringify(schema?.jsonSchema)]);

  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const selectedObjects = queriedObjects.filter((obj) => selectedRows.has(obj.id));

  return (
    <div role='none'>
      {effectSchema &&
        selectedObjects.map((object) => (
          <div key={object.id} className='border-b border-separator'>
            <Form schema={effectSchema} values={object} autoSave />
          </div>
        ))}
    </div>
  );
};

export default RowDetailsPanel;
