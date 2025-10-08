//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type JsonPath, setValue } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Callout, useTranslation } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { Form, useRefQueryLookupHandler } from '@dxos/react-ui-form';
import { type DataType } from '@dxos/schema';
import { typenameFromQuery } from '@dxos/schema';
import { isNonNullable } from '@dxos/util';

import { meta } from '../meta';

type RowDetailsPanelProps = { objectId: string; view: DataType.View };

const ObjectDetailsPanel = ({ objectId, view }: RowDetailsPanelProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = getSpace(view);
  const typename = view.query ? typenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(client, space, typename);

  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const selectedRows = useSelected(objectId, 'multi');
  const selectedObjects = selectedRows.map((id) => queriedObjects.find((obj) => obj.id === id)).filter(isNonNullable);

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
