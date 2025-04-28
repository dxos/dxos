//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { FunctionType, ScriptType } from '@dxos/functions/types';
import { Filter, fullyQualifiedId, useQuery, type Space } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { AUTOMATION_PLUGIN } from '../../meta';

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

export type FunctionsPanelProps = {
  space: Space;
};

export const FunctionsPanel = ({ space }: FunctionsPanelProps) => {
  const { t } = useTranslation(AUTOMATION_PLUGIN);
  const functions = useQuery(space, Filter.schema(FunctionType));
  const scripts = useQuery(space, Filter.schema(ScriptType));
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const functionToScriptMap = useMemo(
    () =>
      functions.reduce(
        (map, func) => {
          const scriptId = func.source?.target?.id;
          if (scriptId) {
            const script = scripts.find((s) => s.id === scriptId);
            if (script) {
              map[func.id] = script;
            }
          }
          return map;
        },
        {} as Record<string, ScriptType>,
      ),
    [functions, scripts],
  );

  const getScriptName = useCallback(
    (func: FunctionType) => {
      const script = functionToScriptMap[func.id];
      return script?.name;
    },
    [functionToScriptMap],
  );

  const handleGoToScript = useCallback(
    (func: FunctionType) => {
      const script = functionToScriptMap[func.id];
      if (script) {
        void dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(script)] }));
      }
    },
    [functionToScriptMap, dispatch],
  );

  return (
    <div className='flex flex-col w-full'>
      <div role='none' className={controlItemClasses}>
        <List.Root<FunctionType> items={functions} isItem={S.is(FunctionType)} getId={(func) => func.id}>
          {({ items }) => (
            <div role='list' className='flex flex-col w-full'>
              {items?.map((func) => (
                <List.Item<FunctionType>
                  key={func.id}
                  item={func}
                  classNames={mx(grid, ghostHover, 'items-center', 'px-2', 'min-bs-[3rem]')}
                >
                  <div className='flex flex-col px-1'>
                    <List.ItemTitle classNames='truncate'>{func.name}</List.ItemTitle>
                    {getScriptName(func) && <div className='text-xs text-gray-500 truncate'>{getScriptName(func)}</div>}
                  </div>
                  {functionToScriptMap[func.id] && (
                    <Button onClick={() => handleGoToScript(func)}>{t('go to function source button label')}</Button>
                  )}
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>

        {functions.length === 0 && <div className='text-center py-4 text-gray-500'>{t('no functions found')}</div>}
      </div>
    </div>
  );
};
