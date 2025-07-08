//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type JsonPath, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { getSpace, Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';
import { type Projection } from '@dxos/schema';

import { TABLE_PLUGIN } from '../meta';

type RowDetailsPanelProps = { objectId: string; projection: Projection };

const ObjectDetailsPanel = ({ objectId, projection }: RowDetailsPanelProps) => {
  const { t } = useTranslation(TABLE_PLUGIN);
  const client = useClient();
  const space = getSpace(projection);
  const schema = useSchema(client, space, projection.query?.typename);

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

  if (selectedObjects.length === 0) {
    return (
      <div role='none' className='plb-cardSpacingBlock pli-cardSpacingInline'>
        <Callout.Root classNames='is-full'>
          <Callout.Title>{t('row details no selection label')}</Callout.Title>
        </Callout.Root>
      </div>
    );
  }

  return (
    <div role='none' className='bs-full is-full flex flex-col p-2 gap-1 overflow-y-auto'>
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
