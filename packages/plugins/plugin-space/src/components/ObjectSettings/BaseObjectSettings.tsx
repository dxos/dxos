//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren, useRef } from 'react';

import { type Obj } from '@dxos/echo';
import { Input, type ThemedClassName, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export type BaseObjectSettingsProps = ThemedClassName<
  PropsWithChildren<{
    object: Obj.Any;
  }>
>;

export const BaseObjectSettings = ({ classNames, children, object }: BaseObjectSettingsProps) => {
  const { t } = useTranslation(meta.id);
  const inputRef = useRef<HTMLInputElement>(null);

  // TODO(wittjosiah): This should be a form based on the schema of the object.
  //  The form should only include fields with a specific settings annotation.
  //  Perhaps also including the field of the title annotation as well.
  return (
    <>
      <Input.Root>
        <Input.Label>{t('name label')}</Input.Label>
        <Input.TextInput
          ref={inputRef}
          placeholder={t('name placeholder')}
          // TODO(burdon): Use annotation to get the name field.
          value={(object as any).name ?? ''}
          onChange={(event) => {
            (object as any).name = event.target.value;
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              inputRef.current?.blur();
            }
          }}
        />
      </Input.Root>
      {children}
    </>
  );
};
