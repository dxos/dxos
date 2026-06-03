//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Magazine } from '#types';

export const MagazineProperties = ({ subject }: AppSurface.ObjectPropertiesProps<Magazine.Magazine>) => {
  const { t } = useTranslation(meta.id);
  const [magazine] = useObject(subject);
  const routine = useMemo(() => magazine.routine?.target, [magazine.routine]);
  const textObj = useMemo(() => routine?.instructions?.target, [routine]);
  const [content, setContent] = useObject(textObj, 'content');

  if (!routine || !textObj) {
    return null;
  }

  return (
    <Input.Root>
      <Input.Label>{t('routine-instructions.label')}</Input.Label>
      <Input.TextArea
        value={content ?? ''}
        rows={4}
        onChange={(event) => setContent(event.target.value)}
        placeholder={t('routine-instructions.placeholder')}
        classNames='resize-none'
      />
    </Input.Root>
  );
};

MagazineProperties.displayName = 'MagazineProperties';
