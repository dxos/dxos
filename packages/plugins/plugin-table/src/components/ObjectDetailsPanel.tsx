//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useSyncExternalStore } from 'react';

import { type JsonPath, type EchoSchema, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSpace, Filter, type Space } from '@dxos/react-client/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { useSelectedItems } from '@dxos/react-ui-attention';
import { Form } from '@dxos/react-ui-form';
import { type ViewType } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

// TODO(ZaymonFC): Factor this out and use it where we query for schemas with typename.
const useSchema = (space: Space | undefined, typename: string | undefined): EchoSchema | undefined => {
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

type RowDetailsPanelProps = { objectId: string; view: ViewType };

const ObjectDetailsPanel = ({ objectId, view }: RowDetailsPanelProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const selectedRows = useSelectedItems(objectId);
  const space = getSpace(view);
  const schema = useSchema(space, view.query?.type);
  const effectSchema = useMemo(() => schema?.getSchemaSnapshot(), [JSON.stringify(schema?.jsonSchema)]);

  // NOTE(ZaymonFC): Since selection is currently a set, the order these objects show
  //   up in will not necessarily match the order in the selected context.
  const queriedObjects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const selectedObjects = queriedObjects.filter((obj) => selectedRows.has(obj.id));

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
      const id = values.id;
      invariant(typeof id === 'string');
      const object = queriedObjects.find((obj) => obj.id === id);
      invariant(object);

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        const value = values[path];
        setValue(object, path, value);
      }
    },
    [queriedObjects],
  );

  return (
    <div role='none' className='p-1 flex flex-col gap-1'>
      {selectedObjects.length === 0 && <div className='text-sm'>{t('row details no selection label')}</div>}
      {effectSchema &&
        selectedObjects.map((object) => (
          <div key={object.id} className='border border-separator rounded-sm'>
            <Form schema={effectSchema} values={object} onSave={handleSave} autoSave />
          </div>
        ))}
    </div>
  );
};

export default ObjectDetailsPanel;
