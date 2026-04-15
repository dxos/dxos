//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel, useTranslation } from '@dxos/react-ui';

import { ActionItems, DayAhead, Permissions, ProfileGrid, ProfileSummary } from '#components';
import { meta } from '#meta';

export type SidekickArticleProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

export const SidekickArticle = ({ role, subject: _agent, attendableId: _attendableId }: SidekickArticleProps) => {
  const { t } = useTranslation(meta.id);

  const sections = useMemo(
    () => [
      { key: 'day-ahead', title: t('day-ahead.title') },
      { key: 'action-items', title: t('action-items.title') },
      { key: 'profiles', title: t('profiles.title') },
      { key: 'user-profile', title: t('user-profile.title') },
      { key: 'permissions', title: t('permissions.title') },
    ],
    [t],
  );

  return (
    <Panel.Root role={role} className='dx-document overflow-y-auto'>
      <Panel.Content>
        <h1 className='text-lg font-semibold mb-4'>{t('dashboard.title')}</h1>

        {sections.map((section) => (
          <div key={section.key} className='mb-6'>
            <h2 className='text-sm font-medium text-description mb-2'>{section.title}</h2>
            {section.key === 'day-ahead' && <DayAhead />}
            {section.key === 'action-items' && <ActionItems items={[]} />}
            {section.key === 'profiles' && <ProfileGrid profiles={[]} />}
            {section.key === 'user-profile' && <ProfileSummary />}
            {section.key === 'permissions' && <Permissions entries={[]} />}
          </div>
        ))}
      </Panel.Content>
    </Panel.Root>
  );
};
