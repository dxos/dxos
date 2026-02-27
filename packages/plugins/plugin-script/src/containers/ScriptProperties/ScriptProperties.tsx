//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { type Script } from '@dxos/functions';
import { Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type ScriptPropertiesProps = {
  object: Script.Script;
};

export const ScriptProperties = ({ object }: ScriptPropertiesProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Input.Root>
      <Input.Label>{t('description label')}</Input.Label>
      <Input.TextInput
        placeholder={t('description placeholder')}
        value={object.description ?? ''}
        onChange={(event) => {
          Obj.change(object, (o) => {
            o.description = event.target.value;
          });
        }}
      />
    </Input.Root>
  );
};
