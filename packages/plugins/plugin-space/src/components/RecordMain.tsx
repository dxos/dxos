//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { type JsonPath, setValue } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { getSpace } from '@dxos/react-client/echo';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';

export const RecordMain = ({ record }: { record: Obj.Any }) => {
  const space = getSpace(record);
  const schema = Obj.getSchema(record);
  invariant(schema, 'Record has no schema.');

  const handleRefQueryLookup = useRefQueryLookupHandler({ space });

  const handleSave = useCallback(
    (values: any, { changed }: { changed: Record<JsonPath, boolean> }) => {
      const id = values.id;
      invariant(typeof id === 'string');

      const changedPaths = Object.keys(changed).filter((path) => changed[path as JsonPath]) as JsonPath[];
      for (const path of changedPaths) {
        const value = values[path];
        setValue(record, path, value);
      }
    },
    [record],
  );

  return (
    <div role='none' className='container-max-width flex flex-col p-2 gap-1 overflow-y-auto'>
      <div key={record.id} className='border border-separator rounded'>
        <Form autoSave schema={schema} values={record} onSave={handleSave} onQueryRefOptions={handleRefQueryLookup} />
      </div>
    </div>
  );
};

export default RecordMain;
