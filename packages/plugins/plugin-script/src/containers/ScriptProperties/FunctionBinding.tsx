//
// Copyright 2024 DXOS.org
//

import React, { type ChangeEvent, useCallback } from 'react';

import { getUserFunctionIdInMetadata } from '@dxos/compute-runtime';
import { getInvocationUrl } from '@dxos/compute-runtime';
import * as Operation from '@dxos/compute/Operation';
import type * as Script from '@dxos/compute/Script';
import { Filter, Obj, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useClient } from '@dxos/react-client';
import { Clipboard, Field, Flex, useControlledState, useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type FunctionBindingProps = { object: Script.Script };

export const FunctionBinding = ({ object }: FunctionBindingProps) => {
  const { t } = useTranslation(meta.profile.key);
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
    <Flex column>
      <Form.Section title={t('remote-function-settings.heading')} />

      {functionUrl && (
        <Field.Root>
          <Field.Label>{t('function-url.label')}</Field.Label>
          <Field.Input
            disabled
            value={functionUrl}
            onChange={(event) => {
              Obj.update(fn, (fn) => {
                fn.name = event.target.value;
              });
            }}
          />
          <Clipboard.IconButton value={functionUrl} />
        </Field.Root>
      )}

      <Field.Root>
        <Field.Label>{t('function-binding.label')}</Field.Label>
        <Field.Input
          placeholder={t('function-binding.placeholder')}
          value={binding}
          onChange={handleBindingChange}
          onBlur={handleBindingBlur}
        />
      </Field.Root>
    </Flex>
  );
};

FunctionBinding.displayName = 'FunctionBinding';
