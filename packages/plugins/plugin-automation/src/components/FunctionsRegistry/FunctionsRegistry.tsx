//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as EffectFunction from 'effect/Function';
import * as Order from 'effect/Order';
import * as Schema from 'effect/Schema';
import { useState } from 'react';
import React, { useCallback } from 'react';

import { Obj } from '@dxos/echo';
import { Function } from '@dxos/functions';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';
import { useClient } from '@dxos/react-client';
import { Filter, Query, type Space, useQuery } from '@dxos/react-client/echo';
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

  const state = (func: Function.Function) => {
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
    const functions = await getDeployedFunctions(client);
    setFunctions(functions);
    setLoading(false);
  }, []);

  const dedupedFunctions = EffectFunction.pipe(
    functions,
    Array.filter((_) => _.key !== undefined),
    Array.sort(Order.reverse(Order.mapInput(Order.string, (_: Function.Function) => _.updated ?? ''))),
    Array.dedupeWith((self, that) => self.key === that.key),
    Array.sort(Order.mapInput(Order.string, (_: Function.Function) => _.key ?? '')),
  );

  const hanleImportOrUpdate = useCallback(
    async (func: Function.Function) => {
      const {
        objects: [existingFunc],
      } = await space.db.query(Query.type(Function.Function, { key: func.key })).run();
      if (!existingFunc) {
        space.db.add(func);
        return;
      }
      existingFunc.version = func.version;
      existingFunc.updated = func.updated;
      existingFunc.name = func.name;
      existingFunc.description = func.description;
      // TODO(dmaretskyi): A workaround for an ECHO bug.
      existingFunc.inputSchema = JSON.parse(JSON.stringify(func.inputSchema));
      existingFunc.outputSchema = JSON.parse(JSON.stringify(func.outputSchema));
      Obj.getMeta(existingFunc).keys = JSON.parse(JSON.stringify(Obj.getMeta(func).keys));
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
            <div role='list' className='flex flex-col is-full'>
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
                    icon={state(func) === 'update' ? 'ph--arrows-clockwise--regular' : 'ph--download--regular'}
                    label={
                      state(func) === 'update' ? t('update function button label') : t('import function button label')
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

      {dedupedFunctions.length === 0 && !loading && (
        <div className='text-center plb-4 text-gray-500'>{t('no functions found')}</div>
      )}
      {loading && <div className='text-center plb-4 text-gray-500'>{t('loading functions')}</div>}
    </div>
  );
};
