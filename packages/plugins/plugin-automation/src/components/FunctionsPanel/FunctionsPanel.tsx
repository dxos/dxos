//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { FunctionType, ScriptType } from '@dxos/functions';
import { Filter, type Space, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { Button, useTranslation } from '@dxos/react-ui';
import { controlItemClasses } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

import { meta } from '../../meta';

const grid = 'grid grid-cols-[1fr_auto] min-bs-[2.5rem]';

export type FunctionsPanelProps = {
  space: Space;
};

export const FunctionsPanel = ({ space }: FunctionsPanelProps) => {
  const { t } = useTranslation(meta.id);
  const functions = useQuery(space, Filter.type(FunctionType));
  const scripts = useQuery(space, Filter.type(ScriptType));
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
    <div role='none' className={mx(controlItemClasses)}>
      {functions.length > 0 && (
        <List.Root<FunctionType> items={functions} isItem={Schema.is(FunctionType)} getId={(func) => func.id}>
          {({ items }) => (
            <div role='list' className='flex flex-col w-full'>
              {items?.map((func) => (
                <List.Item<FunctionType>
                  key={func.id}
                  item={func}
                  classNames={mx(grid, ghostHover, 'items-center', 'pli-2', 'min-bs-[3rem]')}
                >
                  <div className='flex flex-col truncate'>
                    <List.ItemTitle classNames='truncate'>{func.name}</List.ItemTitle>
                    {getScriptName(func) && (
                      <div className='text-xs text-description truncate'>{getScriptName(func)}</div>
                    )}
                  </div>
                  {functionToScriptMap[func.id] && (
                    <Button onClick={() => handleGoToScript(func)}>{t('go to function source button label')}</Button>
                  )}
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>
      )}

      {functions.length === 0 && <div className='text-center plb-4 text-gray-500'>{t('no functions found')}</div>}
    </div>
  );
};
