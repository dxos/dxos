//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type JsonPath, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { getSpace, Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';
import { type ViewType } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

type RowDetailsPanelProps = { objectId: string; view: ViewType };

const ObjectDetailsPanel = ({ objectId, view }: RowDetailsPanelProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const client = useClient();
  const space = getSpace(view);
  const schema = useSchema(client, space, view.query?.typename);

  // NOTE(ZaymonFC): Since selection is currently a set, the order of these objects may not
  //  match the order in the selected context.
  // TODO(burdon): Implement ordered set.
  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = queriedObjects.filter((obj) => selectedRows.includes(obj.id));

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

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
    <div role='none' className='bs-full is-full flex flex-col gap-1 overflow-y-auto p-1'>
      {selectedObjects.length === 0 && (
        // TODO(burdon): Standardize treatment of these messages.
        <div className='flex p-2 justify-center text-subdued'>{t('row details no selection label')}</div>
      )}
      {schema &&
        selectedObjects.map((object) => (
          <div key={object.id} className='border border-separator rounded'>
            <Form
              autoSave
              schema={schema}
              values={object}
              onSave={handleSave}
              onQueryRefOptions={handleRefQueryLookup}
            />
          </div>
        ))}
    </div>
  );
};

export default ObjectDetailsPanel;
