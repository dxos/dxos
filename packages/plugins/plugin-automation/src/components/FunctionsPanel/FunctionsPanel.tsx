//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useCallback, useMemo } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Filter, type Space, useQuery } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Settings } from '@dxos/react-ui-form';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/ui-theme';

import { meta } from '../../meta';

export type FunctionsPanelProps = {
  space: Space;
};

export const FunctionsPanel = ({ space }: FunctionsPanelProps) => {
  const { t } = useTranslation(meta.id);
  const functions = useQuery(space.db, Filter.type(Operation.PersistentOperation));
  const scripts = useQuery(space.db, Filter.type(Script.Script));
  const { invokePromise } = useOperationInvoker();

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
    (func: Operation.PersistentOperation) => {
      const script = functionToScriptMap[func.id];
      return script?.name;
    },
    [functionToScriptMap],
  );

  const handleGoToScript = useCallback(
    (func: Operation.PersistentOperation) => {
      const script = functionToScriptMap[func.id];
      if (script) {
        void invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(script)] });
      }
    },
    [functionToScriptMap, invokePromise],
  );

  const handleDelete = useCallback(
    (func: Operation.PersistentOperation) => invokePromise(SpaceOperation.RemoveObjects, { objects: [func] }),
    [invokePromise],
  );

  return (
    <Settings.Container>
      {functions.length > 0 && (
        <List.Root<Operation.PersistentOperation>
          items={functions}
          isItem={Schema.is(Operation.PersistentOperation)}
          getId={(func) => func.id}
        >
          {({ items }) => (
            <div role='list' className='flex flex-col w-full'>
              {items?.map((func) => (
                <List.Item<Operation.PersistentOperation>
                  key={func.id}
                  item={func}
                  classNames={mx(
                    'grid grid-cols-[1fr_min-content_auto] min-h-[2.5rem] min-h-[3rem] px-2 items-center',
                    ghostHover,
                  )}
                >
                  <div className='flex flex-col truncate'>
                    <List.ItemTitle classNames='truncate'>{func.name}</List.ItemTitle>
                    {getScriptName(func) && <p className='text-xs text-description truncate'>{getScriptName(func)}</p>}
                  </div>
                  {(functionToScriptMap[func.id] && (
                    <IconButton
                      icon='ph--arrow-square-out--regular'
                      iconOnly
                      label={t('show-source-button.label')}
                      onClick={() => handleGoToScript(func)}
                    />
                  )) || <div />}
                  <IconButton
                    icon='ph--trash--regular'
                    iconOnly
                    label={t('delete-function-button.label')}
                    onClick={() => handleDelete(func)}
                  />
                </List.Item>
              ))}
            </div>
          )}
        </List.Root>
      )}

      {functions.length === 0 && <div className='text-center py-4 text-description'>{t('no-functions-found')}</div>}
    </Settings.Container>
  );
};
