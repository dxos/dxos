//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { TemplateEditor } from '@dxos/plugin-assistant/components';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { Magazine } from '#types';

export const MagazineProperties = ({ subject }: AppSurface.ObjectPropertiesProps<Magazine.Magazine>) => {
  const { t } = useTranslation(meta.id);
  return (
    <div role='none' className='flex flex-col gap-1'>
      <span className='text-sm text-description'>{t('topic-instructions.label')}</span>
      <TemplateEditor id={Obj.getURI(subject)} source={subject.instructions.source} lineNumbers={false} />
    </div>
  );
};

MagazineProperties.displayName = 'MagazineProperties';
