//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Magazine } from '#types';

export const MagazineProperties = ({ subject }: AppSurface.ObjectPropertiesProps<Magazine.Magazine>) => {
  const { t } = useTranslation(meta.id);
  // Resolve the topic-instructions Ref<Text> → Snapshot<Text> + update callback.
  const [text, updateText] = useObject(subject.instructions.source);

  const setContent = useCallback(
    (value: string) =>
      updateText((t) => {
        t.content = value;
      }),
    [updateText],
  );

  if (!text) {
    return null;
  }

  return (
    <Input.Root>
      <Input.Label>{t('topic-instructions.label')}</Input.Label>
      <Input.TextArea
        value={text.content ?? ''}
        rows={4}
        onChange={(event) => setContent(event.target.value)}
        placeholder={t('topic-instructions.placeholder')}
        classNames='resize-none'
      />
    </Input.Root>
  );
};

MagazineProperties.displayName = 'MagazineProperties';
