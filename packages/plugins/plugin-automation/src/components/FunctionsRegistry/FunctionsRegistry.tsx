//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as EffectFunction from 'effect/Function';
import * as Schema from 'effect/Schema';
import { useState } from 'react';
import React, { useCallback } from 'react';

import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';
import { useClient } from '@dxos/react-client';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

const grid = 'grid grid-cols-[1fr_1fr_auto] min-bs-[2.5rem]';

type FunctionsRegistryProps = {
  space: Space;
};

export const FunctionsRegistry = ({ space }: FunctionsRegistryProps) => {
  const client = useClient();
  const [loading, setLoading] = useState(true);
  const [functions, setFunctions] = useState<Function.Function[]>([]);
  const { t } = useTranslation(meta.id);

  const dbFunctions = useQuery(space, Filter.type(Function.Function));

  const isImported = (func: Function.Function) =>
    dbFunctions.some((f) => f.key === func.key && func.version === f.version && func.updated === f.updated);

  useAsyncEffect(async () => {
    setLoading(true);
    const functions = await getDeployedFunctions(client);
    setFunctions(functions);
    setLoading(false);
  }, []);

  const dedupedFunctions = EffectFunction.pipe(
    functions,
    // TODO(dmaretskyi): Sory by updated
    Array.filter((_) => _.key !== undefined),
    Array.dedupeWith((self, that) => self.key === that.key),
    // TODO(dmaretskyi): Sort by name
  );

  const hanleImport = useCallback(
    (func: Function.Function) => {
      space.db.add(func);
    },
    [space],
  );

  return (
    <div role='none' className={mx(controlItemClasses)}>
      {dedupedFunctions.length > 0 && (
        <List.Root<Function.Function>
          items={dedupedFunctions}
          isItem={Schema.is(Function.Function)}
          getId={(func) => func.id}
        >
          {({ items }) => (
            <div role='list' className='flex flex-col w-full'>
              {items?.map((func) => (
                <List.Item<Function.Function>
                  key={func.id}
                  item={func}
                  classNames={mx(grid, ghostHover, 'items-center', 'pli-2', 'min-bs-[3rem]')}
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
                    icon='ph--download--regular'
                    label={t('delete function button label')}
                    disabled={isImported(func)}
                    onClick={() => hanleImport(func)}
                  />
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>
      )}

      {dedupedFunctions.length === 0 && !loading && (
        <div className='text-center plb-4 text-gray-500'>{t('no functions found')}</div>
      )}
      {loading && <div className='text-center plb-4 text-gray-500'>{t('loading functions')}</div>}
    </div>
  );
};
