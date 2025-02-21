//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useSyncExternalStore } from 'react';

import { type JsonPath, type EchoSchema, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSpace, Filter, type Space } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { useSelectedItems } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { type TableType } from '@dxos/react-ui-table';

import { TABLE_PLUGIN } from '../meta';

export const useSchema = (space: Space | undefined, typename: string | undefined): EchoSchema | undefined => {
  const { subscribe, getSchema } = useMemo(() => {
    if (!typename || !space) {
      return {
        subscribe: () => () => {},
        getSchema: () => undefined,
      };
    }

    const query = space.db.schemaRegistry.query({ typename });
    const initialResult = query.runSync()[0];
    let currentSchema = initialResult;

    return {
      subscribe: (onStoreChange: () => void) => {
        const unsubscribe = query.subscribe(() => {
          currentSchema = query.results[0];
          onStoreChange();
        });
        return unsubscribe;
      },
      getSchema: () => currentSchema,
    };
  }, [typename, space]);

  return useSyncExternalStore(subscribe, getSchema);
};

type RowDetailsPanelProps = {
  table: TableType;
};

const ObjectDetailsPanel = ({ table }: RowDetailsPanelProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const selectedRows = useSelectedItems(table.id);
  const space = getSpace(table);
  const schema = useSchema(space, table.view?.target?.query?.type);
  const effectSchema = useMemo(() => schema?.getSchemaSnapshot(), [JSON.stringify(schema?.jsonSchema)]);

  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const selectedObjects = queriedObjects.filter((obj) => selectedRows.has(obj.id));

  // TODO(ZaymonFC): This is a bit unsophisticated.
  const handleSave = (values: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
    const id = values.id;
    invariant(typeof id === 'string');
    const object = queriedObjects.find((obj) => obj.id === id);
    invariant(object);

    const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
    for (const path of changedPaths) {
      const value = values[path];
      setValue(object, path, value);
    }
  };

  return (
    <div role='none'>
      {selectedObjects.length === 0 && <div className='p-2 text-sm'>{t('row details no selection label')}</div>}
      {effectSchema &&
        selectedObjects.map((object) => (
          <div key={object.id} className='border-b border-separator'>
            <Form schema={effectSchema} values={object} onSave={handleSave} autoSave />
          </div>
        ))}
    </div>
  );
};

export default ObjectDetailsPanel;
