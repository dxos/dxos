//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { useState } from 'react';
import React, { useCallback } from 'react';

import { Context } from '@dxos/context';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';
import * as OperationModule from '@dxos/operation';
import { useClient } from '@dxos/react-client';
import { Filter, Query, type Space, useQuery } from '@dxos/react-client/echo';
import { IconButton, useAsyncEffect, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/ui-theme';

import { meta } from '#meta';

const grid = 'grid grid-cols-[1fr_1fr_auto] min-h-[2.5rem]';

type FunctionsRegistryProps = {
  space: Space;
};

export const FunctionsRegistry = ({ space }: FunctionsRegistryProps) => {
  const client = useClient();
  const [loading, setLoading] = useState(true);
  const [functions, setFunctions] = useState<OperationModule.Operation.PersistentOperation[]>([]);
  const { t } = useTranslation(meta.id);

  const dbFunctions = useQuery(space.db, Filter.type(OperationModule.Operation.PersistentOperation));

  const state = (func: OperationModule.Operation.PersistentOperation) => {
    const dbFunction = dbFunctions.find((f) => f.key === func.key);
    if (!dbFunction) {
      return 'import';
    }
    if (dbFunction.version === func.version && dbFunction.updated === func.updated) {
      return 'none';
    }
    return 'update';
  };

  useAsyncEffect(async () => {
    setLoading(true);
    const functions = await getDeployedFunctions(Context.default(), client, true);
    setFunctions(functions);
    setLoading(false);
  }, []);

  const hanleImportOrUpdate = useCallback(
    async (func: OperationModule.Operation.PersistentOperation) => {
      const functions = await space.db
        .query(Query.type(OperationModule.Operation.PersistentOperation, { key: func.key }))
        .run();
      const [existingFunc] = functions;
      if (!existingFunc) {
        space.db.add(func);
        return;
      }
      OperationModule.Operation.setFrom(existingFunc, func);
    },
    [space],
  );

  return (
    <Settings.Panel>
      {functions.length > 0 && (
        <List.Root<OperationModule.Operation.PersistentOperation>
          items={functions}
          isItem={Schema.is(OperationModule.Operation.PersistentOperation)}
          getId={(func) => func.id}
        >
          {({ items }) => (
            <div role='list' className='flex flex-col w-full'>
              {items?.map((func) => (
                <List.Item<OperationModule.Operation.PersistentOperation>
                  key={func.id}
                  item={func}
                  classNames={mx(grid, ghostHover, 'items-center', 'px-2', 'min-h-[3rem]')}
                >
                  <div className='flex flex-col truncate'>
                    <List.ItemTitle classNames='truncate'>{func.name}</List.ItemTitle>
                    <div className='text-xs text-description truncate'>{func.key}</div>
                  </div>
                  <div className='flex flex-col truncate'>
                    <div className='text-xs text-description truncate'>{func.version}</div>
                    <div className='text-xs text-description truncate'>
                      {func.updated ? `Uploaded ${new Date(func.updated).toLocaleString()}` : ''}
                    </div>
                  </div>

                  <IconButton
                    iconOnly
                    icon={state(func) === 'update' ? 'ph--arrows-clockwise--regular' : 'ph--download--regular'}
                    label={
                      state(func) === 'update' ? t('update-function-button.label') : t('import-function-button.label')
                    }
                    disabled={state(func) === 'none'}
                    onClick={() => hanleImportOrUpdate(func)}
                  />
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>
      )}

      {loading && <div className='text-center py-4 text-gray-500'>{t('loading-functions.message')}</div>}
    </Settings.Panel>
  );
};
