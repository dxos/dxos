//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Function, Script } from '@dxos/functions';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, fullyQualifiedId, useQuery } from '@dxos/react-client/echo';
import { Button, IconButton, useTranslation } from '@dxos/react-ui';
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
  const functions = useQuery(space, Filter.type(Function.Function));
  const scripts = useQuery(space, Filter.type(Script.Script));
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
        {} as Record<string, Script.Script>,
      ),
    [functions, scripts],
  );

  const getScriptName = useCallback(
    (func: Function.Function) => {
      const script = functionToScriptMap[func.id];
      return script?.name;
    },
    [functionToScriptMap],
  );

  const handleGoToScript = useCallback(
    (func: Function.Function) => {
      const script = functionToScriptMap[func.id];
      if (script) {
        void dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(script)] }));
      }
    },
    [functionToScriptMap, dispatch],
  );

  const handleDelete = useCallback(
    (func: Function.Function) => dispatch(createIntent(SpaceAction.RemoveObjects, { objects: [func] })),
    [dispatch],
  );

  return (
    <div role='none' className={mx(controlItemClasses)}>
      {functions.length > 0 && (
        <List.Root<Function.Function> items={functions} isItem={Schema.is(Function.Function)} getId={(func) => func.id}>
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
                    {getScriptName(func) && (
                      <div className='text-xs text-description truncate'>{getScriptName(func)}</div>
                    )}
                  </div>
                  {functionToScriptMap[func.id] && (
                    <Button onClick={() => handleGoToScript(func)}>{t('go to function source button label')}</Button>
                  )}
                  <IconButton
                    iconOnly
                    icon='ph--trash--regular'
                    label={t('delete function button label')}
                    onClick={() => handleDelete(func)}
                  />
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
