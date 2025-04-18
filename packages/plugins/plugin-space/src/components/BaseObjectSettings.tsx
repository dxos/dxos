//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { type ReactiveEchoObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export type BaseObjectSettingsProps = {
  object: ReactiveEchoObject<any>;
};

export const BaseObjectSettings = ({ object }: BaseObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const inputRef = useRef<HTMLInputElement>(null);

  // TODO(wittjosiah): This should be a form based on the schema of the object.
  //  The form should only include fields with a specific settings annotation.
  //  Perhaps also including the field of the title annotation as well.
  return (
    <form className='flex flex-col p-2 gap-4'>
      <Input.Root>
        <Input.Label>{t('name label')}</Input.Label>
        <Input.TextInput
          ref={inputRef}
          placeholder={t('name placeholder')}
          value={object.name ?? ''}
          onChange={(event) => {
            object.name = event.target.value;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              inputRef.current?.blur();
            }
          }}
        />
      </Input.Root>
    </form>
  );
};
