//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Stack as StackProto } from '@braneframe/types';
import { Button, useTranslation } from '@dxos/aurora';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

export type StackMainProps = {
  role?: string;
  data?: StackProto;
};

export const StackMain = observer(({ data: stack }: StackMainProps) => {
  const { t } = useTranslation('plugin-stack');
  return (
    <article>
      {stack?.sections.map(({ object }) => (
        <Surface key={object.id} role='section' data={object} />
      ))}
      <Button onClick={() => {}}>{t('add section label')}</Button>
    </article>
  );
});
