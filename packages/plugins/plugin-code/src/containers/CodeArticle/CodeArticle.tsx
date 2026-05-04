//
// Copyright 2025 DXOS.org
//

import React, { forwardRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Panel, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';
import { type CodeProject } from '#types';

export type CodeArticleProps = AppSurface.ObjectArticleProps<CodeProject.CodeProject>;

/**
 * Placeholder surface for a CodeProject. The Spec is edited via SpecArticle;
 * this surface will eventually show build status and generated artifacts from
 * the EDGE build service.
 */
export const CodeArticle = forwardRef<HTMLDivElement, CodeArticleProps>(({ role }, forwardedRef) => {
  const { t } = useTranslation(meta.id);

  return (
    <Panel.Root role={role} ref={forwardedRef}>
      <Panel.Content asChild>
        <div role='none' className='flex items-center justify-center text-description p-4'>
          {t('view.code.placeholder')}
        </div>
      </Panel.Content>
    </Panel.Root>
  );
});
