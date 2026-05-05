//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback } from 'react';

import { getUserFunctionIdInMetadata } from '@dxos/compute';
import { type Script } from '@dxos/compute';
import { Operation } from '@dxos/compute';
import { Filter, Obj, Ref } from '@dxos/echo';
import { getInvocationUrl } from '@dxos/functions-runtime';
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Clipboard, Input, useControlledState, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type FunctionBindingProps = { object: Script.Script };

export const FunctionBinding = ({ object }: FunctionBindingProps) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const db = Obj.getDatabase(object);

  const [fn] = useQuery(db, Filter.type(Operation.PersistentOperation, { source: Ref.make(object) }));
  const functionId = fn && getUserFunctionIdInMetadata(Obj.getMeta(fn));
  const functionUrl =
    functionId &&
    getInvocationUrl(functionId, client.config.values.runtime?.services?.edge?.url ?? '', {
      spaceId: db?.spaceId,
    });

  const [binding, setBinding] = useControlledState(fn?.binding ?? '');
  const handleBindingChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setBinding(event.target.value),
    [setBinding],
  );

  const handleBindingBlur = useCallback(() => {
    if (fn) {
      Obj.update(fn, (fn) => {
        fn.binding = binding;
      });
    }
  }, [fn, binding]);

  if (!fn) {
    return null;
  }

  return (
    <div role='none' className='flex flex-col'>
      <Form.Section label={t('remote-function-settings.heading')} />

      {functionUrl && (
        <Input.Root>
          <Input.Label>{t('function-url.label')}</Input.Label>
          <Input.TextInput
            disabled
            value={functionUrl}
            onChange={(event) => {
              Obj.update(fn, (fn) => {
                fn.name = event.target.value;
              });
            }}
          />
          <Clipboard.IconButton value={functionUrl} />
        </Input.Root>
      )}

      <Input.Root>
        <Input.Label>{t('function-binding.label')}</Input.Label>
        <Input.TextInput
          placeholder={t('function-binding.placeholder')}
          value={binding}
          onChange={handleBindingChange}
          onBlur={handleBindingBlur}
        />
      </Input.Root>
    </div>
  );
};
