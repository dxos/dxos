//
// Copyright 2024 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useCallback } from 'react';

import { useClient } from '@dxos/react-client';
import { Filter, getMeta, getSpace, useQuery } from '@dxos/react-client/echo';
import { Button, Icon, Input, useControlledValue, useTranslation } from '@dxos/react-ui';

import { SCRIPT_PLUGIN } from '../meta';
import { FunctionType, type ScriptType } from '../types';
import { getInvocationUrl, getUserFunctionUrlInMetadata } from '../edge';

export type ScriptSettingsPanelProps = {
  script: ScriptType;
};

export const ScriptSettingsPanel = ({ script }: ScriptSettingsPanelProps) => {
  const { t } = useTranslation(SCRIPT_PLUGIN);
  const client = useClient();
  const space = getSpace(script);
  // TODO(dmaretskyi): Parametric query.
  const [fn] = useQuery(
    space,
    Filter.schema(FunctionType, (fn) => fn.source === script),
  );

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      script.name = event.target.value;
    },
    [script],
  );

  const [binding, setBinding] = useControlledValue(fn?.binding ?? '');
  const handleBindingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setBinding(event.target.value);
    },
    [setBinding],
  );
  const handleBindingBlur = useCallback(() => {
    fn.binding = binding;
  }, [fn, binding]);

  const functionPath = fn && getUserFunctionUrlInMetadata(getMeta(fn));
  const functionUrl =
    functionPath &&
    getInvocationUrl(functionPath, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: space?.id,
    });

  // TODO(wittjosiah): Use ClipboardProvider.
  const handleCopy = useCallback(() => {
    functionUrl && navigator.clipboard.writeText(functionUrl);
  }, [functionUrl]);

  return (
    <div role='form' className='flex flex-col w-full p-2 gap-4'>
      <Input.Root>
        <div role='none' className='flex flex-col gap-1'>
          <Input.Label>{t('name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object title placeholder')}
            value={script.name ?? ''}
            onChange={handleNameChange}
          />
        </div>
      </Input.Root>
      {fn && (
        <>
          <hr className='border-separator' />
          <h2>{t('remote function settings heading')}</h2>
          <Input.Root>
            <div role='none' className='flex flex-col gap-1'>
              <Input.Label>{t('function url label')}</Input.Label>
              <div role='none' className='flex gap-1'>
                <Input.TextInput
                  disabled
                  value={functionUrl}
                  onChange={(event) => {
                    fn.name = event.target.value;
                  }}
                />
                <Button onClick={handleCopy}>
                  <Icon icon='ph--copy--regular' size={4} />
                </Button>
              </div>
            </div>
          </Input.Root>
          <Input.Root>
            <div role='none' className='flex flex-col gap-1'>
              <Input.Label>{t('function binding label')}</Input.Label>
              <Input.TextInput
                placeholder={t('function binding placeholder')}
                value={binding}
                onChange={handleBindingChange}
                onBlur={handleBindingBlur}
              />
            </div>
          </Input.Root>
        </>
      )}
    </div>
  );
};
