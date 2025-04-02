//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export type BaseObjectSettingsProps = {
  object: ReactiveEchoObject<any>;
};

export const BaseObjectSettings = ({ object }: BaseObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // TODO(wittjosiah): This should be a form based on the schema of the object.
  //  The form should only include fields with a specific settings annotation.
  //  Perhaps also including the field of the title annotation as well.
  return (
    <div role='form' className='flex flex-col w-full p-2 gap-1'>
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
    </div>
  );
};
